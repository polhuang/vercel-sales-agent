import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { opportunities } from "./opportunities";
import { accounts } from "./accounts";
import { contacts } from "./contacts";

export const notes = sqliteTable("notes", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content"),
  opportunityId: text("opportunity_id").references(() => opportunities.id),
  accountId: text("account_id").references(() => accounts.id),
  contactId: text("contact_id").references(() => contacts.id),
  extractedFields: text("extracted_fields", { mode: "json" }).$type<
    Array<{
      fieldName: string;
      suggestedValue: string;
      confidence: number;
      reasoning: string;
    }>
  >(),
  extractionStatus: text("extraction_status", {
    enum: ["pending", "extracted", "applied", "failed"],
  }).default("pending"),
  isPinned: integer("is_pinned", { mode: "boolean" }).default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
