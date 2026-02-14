import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const changeLog = sqliteTable("change_log", {
  id: text("id").primaryKey(),
  entityType: text("entity_type", {
    enum: ["opportunity", "account", "contact", "note"],
  }).notNull(),
  entityId: text("entity_id").notNull(),
  fieldName: text("field_name").notNull(),
  oldValue: text("old_value", { mode: "json" }),
  newValue: text("new_value", { mode: "json" }),
  source: text("source", {
    enum: ["manual", "ai_extraction", "sf_sync", "chatbot", "campaign"],
  }).notNull(),
  sourceDetail: text("source_detail"),
  isReverted: integer("is_reverted", { mode: "boolean" }).default(false),
  revertedBy: text("reverted_by"),
  createdAt: text("created_at").notNull(),
});

export type ChangeLogEntry = typeof changeLog.$inferSelect;
export type NewChangeLogEntry = typeof changeLog.$inferInsert;
