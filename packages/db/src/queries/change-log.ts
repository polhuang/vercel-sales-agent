import { eq } from "drizzle-orm";
import { ulid } from "ulid";
import type { Database } from "../client";
import {
  opportunities,
  accounts,
  contacts,
  notes,
  changeLog,
} from "../schema";

type EntityType = "opportunity" | "account" | "contact" | "note";

const tableMap = {
  opportunity: opportunities,
  account: accounts,
  contact: contacts,
  note: notes,
} as const;

export interface UpdateFieldWithLogParams {
  entityType: EntityType;
  entityId: string;
  fieldName: string;
  oldValue: unknown;
  newValue: unknown;
  source: "manual" | "ai_extraction" | "sf_sync" | "chatbot" | "campaign";
  sourceDetail?: string;
}

/**
 * Updates a field on an entity and records the change in the change_log table,
 * all within a single transaction.
 */
export async function updateFieldWithLog(
  db: Database,
  params: UpdateFieldWithLogParams
): Promise<{ changeLogId: string }> {
  const {
    entityType,
    entityId,
    fieldName,
    oldValue,
    newValue,
    source,
    sourceDetail,
  } = params;

  const table = tableMap[entityType];
  const now = new Date().toISOString();
  const changeLogId = ulid();

  await db.transaction(async (tx) => {
    // Update the field on the entity using raw SQL for the dynamic column name
    // We also update the updatedAt timestamp
    await tx
      .update(table)
      .set({
        [fieldName]: newValue,
        updatedAt: now,
      } as Record<string, unknown>)
      .where(eq(table.id, entityId));

    // Insert the change log entry
    await tx.insert(changeLog).values({
      id: changeLogId,
      entityType,
      entityId,
      fieldName,
      oldValue: oldValue as null,
      newValue: newValue as null,
      source,
      sourceDetail: sourceDetail ?? null,
      isReverted: false,
      createdAt: now,
    });
  });

  return { changeLogId };
}

/**
 * Reverts a change by reading the change_log entry, restoring the old value
 * on the entity, creating a new change_log entry for the revert, and marking
 * the original entry as reverted. All within a transaction.
 */
export async function revertChange(
  db: Database,
  changeLogId: string
): Promise<{ revertChangeLogId: string }> {
  const revertId = ulid();
  const now = new Date().toISOString();

  // Read the original change log entry
  const original = await db
    .select()
    .from(changeLog)
    .where(eq(changeLog.id, changeLogId))
    .limit(1);

  if (original.length === 0) {
    throw new Error(`Change log entry not found: ${changeLogId}`);
  }

  const entry = original[0]!;

  if (entry.isReverted) {
    throw new Error(`Change log entry already reverted: ${changeLogId}`);
  }

  const table = tableMap[entry.entityType as EntityType];

  await db.transaction(async (tx) => {
    // Restore the old value on the entity
    await tx
      .update(table)
      .set({
        [entry.fieldName]: entry.oldValue,
        updatedAt: now,
      } as Record<string, unknown>)
      .where(eq(table.id, entry.entityId));

    // Create a new change_log entry for the revert
    await tx.insert(changeLog).values({
      id: revertId,
      entityType: entry.entityType,
      entityId: entry.entityId,
      fieldName: entry.fieldName,
      oldValue: entry.newValue,
      newValue: entry.oldValue,
      source: entry.source,
      sourceDetail: `Revert of ${changeLogId}`,
      isReverted: false,
      createdAt: now,
    });

    // Mark the original entry as reverted
    await tx
      .update(changeLog)
      .set({
        isReverted: true,
        revertedBy: revertId,
      })
      .where(eq(changeLog.id, changeLogId));
  });

  return { revertChangeLogId: revertId };
}
