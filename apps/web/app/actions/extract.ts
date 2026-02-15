"use server";

import Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "../../lib/db";
import {
  notes,
  opportunities,
  accounts,
  updateFieldWithLog,
} from "@sales-agent/db";

interface Extraction {
  fieldName: string;
  suggestedValue: string;
  confidence: number;
  reasoning: string;
}

const OPP_FIELDS = [
  { key: "metrics", desc: "Quantifiable business metrics/KPIs the solution impacts" },
  { key: "economicBuyer", desc: "Person with budget authority" },
  { key: "decisionCriteria", desc: "Criteria used to evaluate solutions" },
  { key: "decisionProcess", desc: "Steps/timeline for making the decision" },
  { key: "identifiedPain", desc: "Customer's stated pain points" },
  { key: "implicatedPain", desc: "Broader business implications of the pain" },
  { key: "champion", desc: "Internal advocate for the solution" },
  { key: "competition", desc: "Competitive solutions being considered" },
  { key: "valueDriver", desc: "Key value proposition for the customer" },
  { key: "techStack", desc: "Customer's technology stack" },
  { key: "technicalWinStatus", desc: "Status of technical evaluation" },
  { key: "paperProcess", desc: "Legal/procurement process status" },
  { key: "nextStep", desc: "Agreed next action" },
  { key: "amount", desc: "Deal value in dollars" },
  { key: "closeDate", desc: "Expected close date (YYYY-MM-DD)" },
  { key: "probability", desc: "Win probability percentage (0-100)" },
];

const ACCT_FIELDS = [
  { key: "industry", desc: "Industry sector" },
  { key: "website", desc: "Company website URL" },
  { key: "employeeCount", desc: "Number of employees" },
  { key: "description", desc: "Company description" },
];

const ACCT_FIELD_KEYS = new Set(ACCT_FIELDS.map((f) => f.key));
const NUMERIC_FIELDS = new Set(["amount", "probability", "employeeCount"]);

export async function extractFieldsFromNote(noteId: string): Promise<{
  extractions: Extraction[];
  error?: string;
}> {
  const db = getDb();

  const [note] = await db
    .select()
    .from(notes)
    .where(eq(notes.id, noteId))
    .limit(1);
  if (!note) return { extractions: [], error: "Note not found" };
  if (!note.content || !note.opportunityId) {
    return {
      extractions: [],
      error: "Note must have content and be linked to an opportunity",
    };
  }

  const [opp] = await db
    .select()
    .from(opportunities)
    .where(eq(opportunities.id, note.opportunityId))
    .limit(1);
  if (!opp) return { extractions: [], error: "Linked opportunity not found" };

  let acct = null;
  if (opp.accountId) {
    const [a] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, opp.accountId))
      .limit(1);
    acct = a ?? null;
  }

  const oppRecord = opp as Record<string, unknown>;
  const acctRecord = acct as Record<string, unknown> | null;

  const currentOpp = OPP_FIELDS.map(
    (f) => `- ${f.key}: ${oppRecord[f.key] ?? "(empty)"}`
  ).join("\n");

  const currentAcct = acctRecord
    ? ACCT_FIELDS.map(
        (f) => `- ${f.key}: ${acctRecord[f.key] ?? "(empty)"}`
      ).join("\n")
    : "(no linked account)";

  const availableFields = [...OPP_FIELDS, ...ACCT_FIELDS]
    .map((f) => `- ${f.key}: ${f.desc}`)
    .join("\n");

  try {
    const client = new Anthropic();
    const message = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 2048,
      system: `You are a CRM field extraction assistant. Analyze sales meeting notes and extract structured field updates for opportunity and account records.

Extract ONLY information clearly stated or strongly implied in the notes. Do not assume.

Respond with a JSON array. Each item:
- fieldName: exact field key from the available fields list
- suggestedValue: extracted value as a string
- confidence: 0.0 to 1.0
- reasoning: brief explanation

Only include extractions with confidence >= 0.6. Prefer updating empty fields.`,
      messages: [
        {
          role: "user",
          content: `## Note content
${note.content}

## Current opportunity fields
${currentOpp}

## Current account fields
${currentAcct}

## Available fields
${availableFields}

Extract field updates from the note. Return ONLY a JSON array.`,
        },
      ],
    });

    const text =
      message.content[0]?.type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return { extractions: [] };

    const extractions: Extraction[] = JSON.parse(jsonMatch[0]);

    await db
      .update(notes)
      .set({
        extractedFields: extractions,
        extractionStatus: "extracted",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(notes.id, noteId));

    return { extractions };
  } catch (err) {
    console.error("Extraction failed:", err);

    await db
      .update(notes)
      .set({
        extractionStatus: "failed",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(notes.id, noteId));

    return {
      extractions: [],
      error: err instanceof Error ? err.message : "Extraction failed",
    };
  }
}

export async function applyExtraction(
  noteId: string,
  fieldName: string,
  value: string
) {
  const db = getDb();

  const [note] = await db
    .select()
    .from(notes)
    .where(eq(notes.id, noteId))
    .limit(1);
  if (!note || !note.opportunityId) {
    throw new Error("Note or linked opportunity not found");
  }

  const isAccountField = ACCT_FIELD_KEYS.has(fieldName);

  if (isAccountField) {
    const [opp] = await db
      .select({ accountId: opportunities.accountId })
      .from(opportunities)
      .where(eq(opportunities.id, note.opportunityId))
      .limit(1);

    if (opp?.accountId) {
      const [acct] = await db
        .select()
        .from(accounts)
        .where(eq(accounts.id, opp.accountId))
        .limit(1);

      if (acct) {
        const oldValue = (acct as Record<string, unknown>)[fieldName] ?? null;
        const finalValue = NUMERIC_FIELDS.has(fieldName) ? Number(value) : value;
        await updateFieldWithLog(db, {
          entityType: "account",
          entityId: opp.accountId,
          fieldName,
          oldValue,
          newValue: finalValue,
          source: "ai_extraction",
          sourceDetail: `Note: ${note.title}`,
        });
      }
    }
  } else {
    const [opp] = await db
      .select()
      .from(opportunities)
      .where(eq(opportunities.id, note.opportunityId))
      .limit(1);

    if (!opp) throw new Error("Opportunity not found");

    const oldValue = (opp as Record<string, unknown>)[fieldName] ?? null;
    const finalValue = NUMERIC_FIELDS.has(fieldName) ? Number(value) : value;

    await updateFieldWithLog(db, {
      entityType: "opportunity",
      entityId: note.opportunityId,
      fieldName,
      oldValue,
      newValue: finalValue,
      source: "ai_extraction",
      sourceDetail: `Note: ${note.title}`,
    });
  }

  // Remove the applied extraction from the note
  if (note.extractedFields) {
    const remaining = (note.extractedFields as Extraction[]).filter(
      (e) => e.fieldName !== fieldName
    );
    await db
      .update(notes)
      .set({
        extractedFields: remaining.length > 0 ? remaining : null,
        extractionStatus: remaining.length > 0 ? "extracted" : "applied",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(notes.id, noteId));
  }

  revalidatePath("/notes");
  revalidatePath("/opportunities");
  revalidatePath("/accounts");
}
