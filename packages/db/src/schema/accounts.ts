import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  sfId: text("sf_id").unique(),
  name: text("name").notNull(),
  industry: text("industry"),
  website: text("website"),
  employeeCount: integer("employee_count"),
  annualRevenue: integer("annual_revenue"),
  billingCity: text("billing_city"),
  billingState: text("billing_state"),
  billingCountry: text("billing_country"),
  owner: text("owner"),
  description: text("description"),
  techStack: text("tech_stack", { mode: "json" }).$type<string[]>(),
  customFields: text("custom_fields", { mode: "json" }).$type<
    Record<string, unknown>
  >(),
  syncStatus: text("sync_status", {
    enum: ["synced", "pending", "error", "local_only"],
  }).default("local_only"),
  sfLastModified: text("sf_last_modified"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
