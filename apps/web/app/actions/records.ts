"use server";

import { eq, and, desc } from "drizzle-orm";
import { ulid } from "ulid";
import { revalidatePath } from "next/cache";
import { getDb } from "../../lib/db";
import {
  opportunities,
  accounts,
  contacts,
  notes,
  changeLog,
  updateFieldWithLog,
} from "@sales-agent/db";

type EntityType = "opportunity" | "account" | "contact" | "note";

const tableMap = {
  opportunity: opportunities,
  account: accounts,
  contact: contacts,
  note: notes,
} as const;

const pathMap: Record<EntityType, string> = {
  opportunity: "/opportunities",
  account: "/accounts",
  contact: "/contacts",
  note: "/notes",
};

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createRecord(
  entityType: EntityType,
  data: Record<string, unknown>
) {
  const db = getDb();
  const table = tableMap[entityType];
  const now = new Date().toISOString();
  const id = ulid();

  const record = {
    ...data,
    id,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(table).values(record as never);

  revalidatePath(pathMap[entityType]);
  revalidatePath("/");
  return { id };
}

// ---------------------------------------------------------------------------
// Read (list)
// ---------------------------------------------------------------------------

export async function getRecords(entityType: EntityType) {
  const db = getDb();
  const table = tableMap[entityType];

  const rows = await db
    .select()
    .from(table)
    .orderBy(desc(table.updatedAt));

  return rows;
}

// ---------------------------------------------------------------------------
// Read (single)
// ---------------------------------------------------------------------------

export async function getRecord(entityType: EntityType, id: string) {
  const db = getDb();
  const table = tableMap[entityType];

  const rows = await db
    .select()
    .from(table)
    .where(eq(table.id, id))
    .limit(1);

  return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Update (single field, with change log)
// ---------------------------------------------------------------------------

export async function updateRecord(
  entityType: EntityType,
  id: string,
  fieldName: string,
  newValue: unknown
) {
  const db = getDb();

  // Read the current value so we can log the old value
  const table = tableMap[entityType];
  const rows = await db
    .select()
    .from(table)
    .where(eq(table.id, id))
    .limit(1);

  if (rows.length === 0) {
    throw new Error(`${entityType} not found: ${id}`);
  }

  const currentRecord = rows[0] as Record<string, unknown>;
  const oldValue = currentRecord[fieldName] ?? null;

  const { changeLogId } = await updateFieldWithLog(db, {
    entityType,
    entityId: id,
    fieldName,
    oldValue,
    newValue,
    source: "manual",
  });

  revalidatePath(pathMap[entityType]);
  revalidatePath("/");
  return { changeLogId };
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export async function deleteRecord(entityType: EntityType, id: string) {
  const db = getDb();
  const table = tableMap[entityType];

  await db.delete(table).where(eq(table.id, id));

  revalidatePath(pathMap[entityType]);
  revalidatePath("/");
  return { deleted: true };
}

// ---------------------------------------------------------------------------
// Change log
// ---------------------------------------------------------------------------

export async function getChangeLog(entityType: EntityType, entityId: string) {
  const db = getDb();

  const rows = await db
    .select()
    .from(changeLog)
    .where(
      and(
        eq(changeLog.entityType, entityType),
        eq(changeLog.entityId, entityId)
      )
    )
    .orderBy(desc(changeLog.createdAt));

  return rows;
}
