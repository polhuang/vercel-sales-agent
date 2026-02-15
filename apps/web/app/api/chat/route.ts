import Anthropic from "@anthropic-ai/sdk";
import { getDb } from "../../../lib/db";
import {
  opportunities,
  accounts,
  contacts,
  changeLog,
  updateFieldWithLog,
} from "@sales-agent/db";
import { like, or, eq, desc, and } from "drizzle-orm";
import { getMissingFields } from "../../../../../config/stage-gates";

const tools: Anthropic.Tool[] = [
  {
    name: "search_records",
    description:
      "Search across opportunities, accounts, and contacts by keyword",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search keyword" },
        entity_type: {
          type: "string",
          enum: ["opportunity", "account", "contact", "all"],
          description: "Entity type to search. Default: all",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_record",
    description: "Get a specific record with all its fields",
    input_schema: {
      type: "object" as const,
      properties: {
        entity_type: {
          type: "string",
          enum: ["opportunity", "account", "contact"],
        },
        id: { type: "string", description: "Record ID" },
      },
      required: ["entity_type", "id"],
    },
  },
  {
    name: "update_field",
    description:
      "Update a field on a record. Always confirm with the user before updating.",
    input_schema: {
      type: "object" as const,
      properties: {
        entity_type: {
          type: "string",
          enum: ["opportunity", "account", "contact"],
        },
        id: { type: "string", description: "Record ID" },
        field_name: { type: "string", description: "Field name (camelCase)" },
        new_value: { type: "string", description: "New value" },
      },
      required: ["entity_type", "id", "field_name", "new_value"],
    },
  },
  {
    name: "check_stage_gate",
    description:
      "Check stage-gate requirements for an opportunity. Returns required and missing fields.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "Opportunity ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "get_change_history",
    description: "Get the change history for a record",
    input_schema: {
      type: "object" as const,
      properties: {
        entity_type: {
          type: "string",
          enum: ["opportunity", "account", "contact"],
        },
        entity_id: { type: "string", description: "Record ID" },
        limit: {
          type: "number",
          description: "Max entries to return. Default: 10",
        },
      },
      required: ["entity_type", "entity_id"],
    },
  },
];

async function executeTool(
  name: string,
  input: Record<string, unknown>
): Promise<string> {
  const db = getDb();

  switch (name) {
    case "search_records": {
      const query = input.query as string;
      const entityType = (input.entity_type as string) ?? "all";
      const pattern = `%${query}%`;
      const results: unknown[] = [];

      if (entityType === "all" || entityType === "opportunity") {
        const opps = await db
          .select()
          .from(opportunities)
          .where(
            or(
              like(opportunities.name, pattern),
              like(opportunities.owner, pattern),
              like(opportunities.nextStep, pattern)
            )
          )
          .limit(5);
        results.push(
          ...opps.map((o) => ({
            type: "opportunity",
            id: o.id,
            name: o.name,
            stage: o.stage,
            amount: o.amount,
            owner: o.owner,
          }))
        );
      }
      if (entityType === "all" || entityType === "account") {
        const accts = await db
          .select()
          .from(accounts)
          .where(
            or(
              like(accounts.name, pattern),
              like(accounts.industry, pattern)
            )
          )
          .limit(5);
        results.push(
          ...accts.map((a) => ({
            type: "account",
            id: a.id,
            name: a.name,
            industry: a.industry,
          }))
        );
      }
      if (entityType === "all" || entityType === "contact") {
        const conts = await db
          .select()
          .from(contacts)
          .where(
            or(
              like(contacts.firstName, pattern),
              like(contacts.lastName, pattern),
              like(contacts.email, pattern)
            )
          )
          .limit(5);
        results.push(
          ...conts.map((c) => ({
            type: "contact",
            id: c.id,
            name: `${c.firstName} ${c.lastName}`,
            email: c.email,
            title: c.title,
          }))
        );
      }

      return JSON.stringify(
        results.length > 0 ? results : { message: "No records found" }
      );
    }

    case "get_record": {
      const entityType = input.entity_type as string;
      const id = input.id as string;
      const tableMap = {
        opportunity: opportunities,
        account: accounts,
        contact: contacts,
      };
      const table = tableMap[entityType as keyof typeof tableMap];
      if (!table) return JSON.stringify({ error: "Invalid entity type" });

      const [record] = await db
        .select()
        .from(table)
        .where(eq(table.id, id))
        .limit(1);
      return JSON.stringify(record ?? { error: "Record not found" });
    }

    case "update_field": {
      const entityType = input.entity_type as string;
      const id = input.id as string;
      const fieldName = input.field_name as string;
      const newValue = input.new_value as string;

      const tableMap = {
        opportunity: opportunities,
        account: accounts,
        contact: contacts,
      };
      const table = tableMap[entityType as keyof typeof tableMap];
      if (!table) return JSON.stringify({ error: "Invalid entity type" });

      const [record] = await db
        .select()
        .from(table)
        .where(eq(table.id, id))
        .limit(1);
      if (!record) return JSON.stringify({ error: "Record not found" });

      const oldValue = (record as Record<string, unknown>)[fieldName] ?? null;

      let finalValue: unknown = newValue;
      if (
        fieldName === "amount" ||
        fieldName === "probability" ||
        fieldName === "employeeCount"
      ) {
        finalValue = Number(newValue);
      }

      const { changeLogId } = await updateFieldWithLog(db, {
        entityType: entityType as
          | "opportunity"
          | "account"
          | "contact"
          | "note",
        entityId: id,
        fieldName,
        oldValue,
        newValue: finalValue,
        source: "chatbot",
      });

      return JSON.stringify({
        success: true,
        changeLogId,
        field: fieldName,
        oldValue,
        newValue: finalValue,
      });
    }

    case "check_stage_gate": {
      const id = input.id as string;
      const [opp] = await db
        .select()
        .from(opportunities)
        .where(eq(opportunities.id, id))
        .limit(1);
      if (!opp) return JSON.stringify({ error: "Opportunity not found" });

      const missing = getMissingFields(
        opp.stage ?? "",
        opp as Record<string, unknown>
      );
      return JSON.stringify({
        opportunity: opp.name,
        stage: opp.stage,
        missingFields: missing,
        readyToAdvance: missing.length === 0,
      });
    }

    case "get_change_history": {
      const entityType = input.entity_type as string;
      const entityId = input.entity_id as string;
      const limit = (input.limit as number) ?? 10;

      const entries = await db
        .select()
        .from(changeLog)
        .where(
          and(
            eq(
              changeLog.entityType,
              entityType as "opportunity" | "account" | "contact" | "note"
            ),
            eq(changeLog.entityId, entityId)
          )
        )
        .orderBy(desc(changeLog.createdAt))
        .limit(limit);

      return JSON.stringify(
        entries.map((e) => ({
          field: e.fieldName,
          oldValue: e.oldValue,
          newValue: e.newValue,
          source: e.source,
          date: e.createdAt,
        }))
      );
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

export async function POST(request: Request) {
  const { messages } = (await request.json()) as {
    messages: Array<{ role: "user" | "assistant"; content: string }>;
  };

  const client = new Anthropic();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        let anthropicMessages: Anthropic.MessageParam[] = messages.map(
          (m) => ({
            role: m.role,
            content: m.content,
          })
        );

        let looping = true;
        while (looping) {
          looping = false;

          const response = await client.messages.create({
            model: "claude-sonnet-4-5-20250929",
            max_tokens: 4096,
            system: `You are a helpful CRM assistant for a B2B sales team. You help sales reps manage their pipeline, update records, check deal progress, and analyze data.

You have tools to search records, view details, update fields, check stage-gate requirements, and view change history.

Guidelines:
- Be concise and actionable
- When updating fields, confirm what you changed
- When searching, summarize results clearly
- Use tools proactively to answer questions about the pipeline
- Format amounts as currency and dates readably`,
            tools,
            messages: anthropicMessages,
          });

          for (const block of response.content) {
            if (block.type === "text") {
              send({ type: "text", content: block.text });
            }
          }

          if (response.stop_reason === "tool_use") {
            const toolUseBlocks = response.content.filter(
              (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
            );

            const toolResults: Anthropic.ToolResultBlockParam[] = [];
            for (const block of toolUseBlocks) {
              send({
                type: "tool_use",
                name: block.name,
                input: block.input,
              });
              const result = await executeTool(
                block.name,
                block.input as Record<string, unknown>
              );
              send({
                type: "tool_result",
                name: block.name,
                result: JSON.parse(result),
              });
              toolResults.push({
                type: "tool_result",
                tool_use_id: block.id,
                content: result,
              });
            }

            anthropicMessages = [
              ...anthropicMessages,
              { role: "assistant", content: response.content },
              { role: "user", content: toolResults },
            ];
            looping = true;
          }
        }

        send({ type: "done" });
      } catch (err) {
        send({
          type: "error",
          message: err instanceof Error ? err.message : "Chat failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
