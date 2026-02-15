"use server";

import { eq, desc } from "drizzle-orm";
import { ulid } from "ulid";
import { revalidatePath } from "next/cache";
import { getDb } from "../../lib/db";
import { notes, opportunities, accounts, contacts } from "@sales-agent/db";

export async function createNote(data: {
  title: string;
  content?: string;
  opportunityId?: string | null;
  accountId?: string | null;
  contactId?: string | null;
}) {
  const db = getDb();
  const now = new Date().toISOString();
  const id = ulid();

  await db.insert(notes).values({
    id,
    title: data.title,
    content: data.content ?? "",
    opportunityId: data.opportunityId ?? null,
    accountId: data.accountId ?? null,
    contactId: data.contactId ?? null,
    extractionStatus: "pending",
    isPinned: false,
    createdAt: now,
    updatedAt: now,
  });

  revalidatePath("/notes");
  revalidatePath("/");
  return { id };
}

export async function saveNoteContent(id: string, content: string) {
  const db = getDb();
  const now = new Date().toISOString();

  await db
    .update(notes)
    .set({ content, updatedAt: now })
    .where(eq(notes.id, id));
}

export async function updateNoteTitle(id: string, title: string) {
  const db = getDb();
  const now = new Date().toISOString();

  await db
    .update(notes)
    .set({ title, updatedAt: now })
    .where(eq(notes.id, id));

  revalidatePath("/notes");
}

export async function toggleNotePin(id: string) {
  const db = getDb();
  const [existing] = await db
    .select({ isPinned: notes.isPinned })
    .from(notes)
    .where(eq(notes.id, id))
    .limit(1);
  if (!existing) throw new Error("Note not found");

  const newValue = !existing.isPinned;
  const now = new Date().toISOString();

  await db
    .update(notes)
    .set({ isPinned: newValue, updatedAt: now })
    .where(eq(notes.id, id));

  revalidatePath("/notes");
  return { isPinned: newValue };
}

export async function linkNote(
  id: string,
  field: "opportunityId" | "accountId" | "contactId",
  entityId: string | null
) {
  const db = getDb();
  const now = new Date().toISOString();

  await db
    .update(notes)
    .set({ [field]: entityId, updatedAt: now } as Record<string, unknown>)
    .where(eq(notes.id, id));

  revalidatePath("/notes");
}

export async function deleteNote(id: string) {
  const db = getDb();
  await db.delete(notes).where(eq(notes.id, id));
  revalidatePath("/notes");
  revalidatePath("/");
}

export async function getNotes() {
  const db = getDb();
  return db.select().from(notes).orderBy(desc(notes.updatedAt));
}

export async function getLinkableEntities() {
  const db = getDb();
  const [opps, accts, conts] = await Promise.all([
    db
      .select({ id: opportunities.id, name: opportunities.name })
      .from(opportunities)
      .orderBy(opportunities.name),
    db
      .select({ id: accounts.id, name: accounts.name })
      .from(accounts)
      .orderBy(accounts.name),
    db
      .select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
      })
      .from(contacts)
      .orderBy(contacts.lastName),
  ]);

  return {
    opportunities: opps,
    accounts: accts,
    contacts: conts.map((c) => ({
      id: c.id,
      name: `${c.firstName} ${c.lastName}`,
    })),
  };
}
