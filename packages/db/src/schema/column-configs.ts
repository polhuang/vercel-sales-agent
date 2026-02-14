import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const columnConfigs = sqliteTable("column_configs", {
  id: text("id").primaryKey(),
  viewType: text("view_type", {
    enum: ["opportunities", "accounts", "contacts"],
  }).notNull(),
  fieldKey: text("field_key").notNull(),
  label: text("label").notNull(),
  dataType: text("data_type", {
    enum: ["text", "number", "currency", "date", "select", "url", "boolean"],
  }).notNull(),
  options: text("options", { mode: "json" }).$type<string[]>(),
  position: integer("position").notNull(),
  isVisible: integer("is_visible", { mode: "boolean" }).default(true),
  width: integer("width").default(150),
  createdAt: text("created_at").notNull(),
});

export type ColumnConfig = typeof columnConfigs.$inferSelect;
export type NewColumnConfig = typeof columnConfigs.$inferInsert;
