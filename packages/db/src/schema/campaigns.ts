import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { contacts } from "./contacts";

export const campaigns = sqliteTable("campaigns", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status", {
    enum: ["draft", "active", "paused", "completed"],
  }).default("draft"),
  description: text("description"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const campaignSteps = sqliteTable("campaign_steps", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id")
    .notNull()
    .references(() => campaigns.id),
  stepNumber: integer("step_number").notNull(),
  type: text("type", { enum: ["email", "wait", "condition"] }).notNull(),
  subject: text("subject"),
  body: text("body"),
  waitDays: integer("wait_days"),
  createdAt: text("created_at").notNull(),
});

export const campaignEnrollments = sqliteTable("campaign_enrollments", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id")
    .notNull()
    .references(() => campaigns.id),
  contactId: text("contact_id")
    .notNull()
    .references(() => contacts.id),
  currentStepId: text("current_step_id").references(() => campaignSteps.id),
  status: text("status", {
    enum: ["active", "completed", "replied", "bounced", "unsubscribed"],
  }).default("active"),
  nextSendAt: text("next_send_at"),
  enrolledAt: text("enrolled_at").notNull(),
});

export const campaignEvents = sqliteTable("campaign_events", {
  id: text("id").primaryKey(),
  enrollmentId: text("enrollment_id")
    .notNull()
    .references(() => campaignEnrollments.id),
  stepId: text("step_id")
    .notNull()
    .references(() => campaignSteps.id),
  type: text("type", {
    enum: ["sent", "delivered", "opened", "clicked", "replied", "bounced"],
  }).notNull(),
  metadata: text("metadata", { mode: "json" }).$type<
    Record<string, unknown>
  >(),
  createdAt: text("created_at").notNull(),
});

export type Campaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;
export type CampaignStep = typeof campaignSteps.$inferSelect;
export type CampaignEnrollment = typeof campaignEnrollments.$inferSelect;
export type CampaignEvent = typeof campaignEvents.$inferSelect;
