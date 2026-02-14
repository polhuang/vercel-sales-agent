import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { accounts } from "./accounts";
import { contacts } from "./contacts";

export const opportunities = sqliteTable("opportunities", {
  id: text("id").primaryKey(),
  sfId: text("sf_id").unique(),
  accountId: text("account_id").references(() => accounts.id),
  name: text("name").notNull(),
  stage: text("stage"),
  stageNumber: integer("stage_number"),
  amount: real("amount"),
  closeDate: text("close_date"),
  probability: integer("probability"),
  type: text("type"),
  primaryContactId: text("primary_contact_id").references(() => contacts.id),
  owner: text("owner"),
  nextStep: text("next_step"),

  // MEDDPICC fields
  metrics: text("metrics"),
  economicBuyer: text("economic_buyer"),
  decisionCriteria: text("decision_criteria"),
  decisionCriteriaQuality: text("decision_criteria_quality"),
  decisionProcess: text("decision_process"),
  identifiedPain: text("identified_pain"),
  implicatedPain: text("implicated_pain"),
  painQuality: text("pain_quality"),
  champion: text("champion"),
  competition: text("competition"),
  competitors: text("competitors", { mode: "json" }).$type<string[]>(),
  valueDriver: text("value_driver"),
  partnerIdentified: text("partner_identified"),
  techStack: text("tech_stack"),
  workloadUrl: text("workload_url"),
  technicalWinStatus: text("technical_win_status"),
  paperProcess: text("paper_process"),
  paperProcessQuality: text("paper_process_quality"),
  winReason: text("win_reason"),
  vercelSolution: text("vercel_solution"),
  closedWonChecklist: text("closed_won_checklist"),
  prospector: text("prospector"),

  customFields: text("custom_fields", { mode: "json" }).$type<
    Record<string, unknown>
  >(),
  syncStatus: text("sync_status", {
    enum: ["synced", "pending", "error", "local_only"],
  }).default("local_only"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export type Opportunity = typeof opportunities.$inferSelect;
export type NewOpportunity = typeof opportunities.$inferInsert;
