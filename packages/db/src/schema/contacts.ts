import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { accounts } from "./accounts";

export const contacts = sqliteTable("contacts", {
  id: text("id").primaryKey(),
  sfId: text("sf_id").unique(),
  accountId: text("account_id").references(() => accounts.id),
  firstName: text("first_name"),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  title: text("title"),
  department: text("department"),
  linkedInUrl: text("linkedin_url"),
  role: text("role"),
  customFields: text("custom_fields", { mode: "json" }).$type<
    Record<string, unknown>
  >(),
  syncStatus: text("sync_status", {
    enum: ["synced", "pending", "error", "local_only"],
  }).default("local_only"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
