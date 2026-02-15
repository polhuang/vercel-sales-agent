"use server";

import { eq, and, desc, sql, count, asc } from "drizzle-orm";
import { ulid } from "ulid";
import { revalidatePath } from "next/cache";
import { getDb } from "../../lib/db";
import {
  campaigns,
  campaignSteps,
  campaignEnrollments,
  campaignEvents,
  contacts,
} from "@sales-agent/db";

// ---------------------------------------------------------------------------
// Campaign CRUD
// ---------------------------------------------------------------------------

export async function createCampaign(data: {
  name: string;
  description?: string;
}) {
  const db = getDb();
  const now = new Date().toISOString();
  const id = ulid();

  await db.insert(campaigns).values({
    id,
    name: data.name,
    description: data.description ?? null,
    status: "draft",
    createdAt: now,
    updatedAt: now,
  });

  revalidatePath("/campaigns");
  return { id };
}

export async function getCampaigns() {
  const db = getDb();
  return db.select().from(campaigns).orderBy(desc(campaigns.updatedAt));
}

export async function getCampaign(id: string) {
  const db = getDb();

  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, id))
    .limit(1);

  if (!campaign) return null;

  const steps = await db
    .select()
    .from(campaignSteps)
    .where(eq(campaignSteps.campaignId, id))
    .orderBy(asc(campaignSteps.stepNumber));

  return { ...campaign, steps };
}

export async function updateCampaign(
  id: string,
  data: Partial<{ name: string; description: string; status: string }>
) {
  const db = getDb();
  const now = new Date().toISOString();

  await db
    .update(campaigns)
    .set({ ...data, updatedAt: now } as never)
    .where(eq(campaigns.id, id));

  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${id}`);
  return { updated: true };
}

export async function deleteCampaign(id: string) {
  const db = getDb();

  // Delete events, enrollments, steps, then campaign
  const enrollments = await db
    .select({ id: campaignEnrollments.id })
    .from(campaignEnrollments)
    .where(eq(campaignEnrollments.campaignId, id));

  for (const e of enrollments) {
    await db
      .delete(campaignEvents)
      .where(eq(campaignEvents.enrollmentId, e.id));
  }
  await db
    .delete(campaignEnrollments)
    .where(eq(campaignEnrollments.campaignId, id));
  await db
    .delete(campaignSteps)
    .where(eq(campaignSteps.campaignId, id));
  await db.delete(campaigns).where(eq(campaigns.id, id));

  revalidatePath("/campaigns");
  return { deleted: true };
}

// ---------------------------------------------------------------------------
// Activate / Pause
// ---------------------------------------------------------------------------

export async function activateCampaign(id: string) {
  return updateCampaign(id, { status: "active" });
}

export async function pauseCampaign(id: string) {
  return updateCampaign(id, { status: "paused" });
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

export async function addStep(
  campaignId: string,
  data: {
    type: "email" | "wait" | "condition";
    subject?: string;
    body?: string;
    waitDays?: number;
  }
) {
  const db = getDb();
  const now = new Date().toISOString();
  const id = ulid();

  // Get next step number
  const existing = await db
    .select({ max: sql<number>`MAX(${campaignSteps.stepNumber})` })
    .from(campaignSteps)
    .where(eq(campaignSteps.campaignId, campaignId));

  const stepNumber = (existing[0]?.max ?? 0) + 1;

  await db.insert(campaignSteps).values({
    id,
    campaignId,
    stepNumber,
    type: data.type,
    subject: data.subject ?? null,
    body: data.body ?? null,
    waitDays: data.waitDays ?? null,
    createdAt: now,
  });

  // Update campaign timestamp
  await db
    .update(campaigns)
    .set({ updatedAt: now })
    .where(eq(campaigns.id, campaignId));

  revalidatePath(`/campaigns/${campaignId}`);
  return { id, stepNumber };
}

export async function updateStep(
  stepId: string,
  data: Partial<{
    type: string;
    subject: string;
    body: string;
    waitDays: number;
  }>
) {
  const db = getDb();

  await db
    .update(campaignSteps)
    .set(data as never)
    .where(eq(campaignSteps.id, stepId));

  // Get campaign ID for revalidation
  const [step] = await db
    .select({ campaignId: campaignSteps.campaignId })
    .from(campaignSteps)
    .where(eq(campaignSteps.id, stepId))
    .limit(1);

  if (step) {
    const now = new Date().toISOString();
    await db
      .update(campaigns)
      .set({ updatedAt: now })
      .where(eq(campaigns.id, step.campaignId));
    revalidatePath(`/campaigns/${step.campaignId}`);
  }

  return { updated: true };
}

export async function deleteStep(stepId: string) {
  const db = getDb();

  // Get step info before deleting
  const [step] = await db
    .select()
    .from(campaignSteps)
    .where(eq(campaignSteps.id, stepId))
    .limit(1);

  if (!step) return { deleted: false };

  // Delete events referencing this step
  await db.delete(campaignEvents).where(eq(campaignEvents.stepId, stepId));

  await db.delete(campaignSteps).where(eq(campaignSteps.id, stepId));

  // Renumber remaining steps
  const remaining = await db
    .select()
    .from(campaignSteps)
    .where(eq(campaignSteps.campaignId, step.campaignId))
    .orderBy(asc(campaignSteps.stepNumber));

  for (let i = 0; i < remaining.length; i++) {
    await db
      .update(campaignSteps)
      .set({ stepNumber: i + 1 })
      .where(eq(campaignSteps.id, remaining[i].id));
  }

  const now = new Date().toISOString();
  await db
    .update(campaigns)
    .set({ updatedAt: now })
    .where(eq(campaigns.id, step.campaignId));

  revalidatePath(`/campaigns/${step.campaignId}`);
  return { deleted: true };
}

export async function reorderSteps(
  campaignId: string,
  stepIds: string[]
) {
  const db = getDb();

  for (let i = 0; i < stepIds.length; i++) {
    await db
      .update(campaignSteps)
      .set({ stepNumber: i + 1 })
      .where(eq(campaignSteps.id, stepIds[i]));
  }

  const now = new Date().toISOString();
  await db
    .update(campaigns)
    .set({ updatedAt: now })
    .where(eq(campaigns.id, campaignId));

  revalidatePath(`/campaigns/${campaignId}`);
  return { reordered: true };
}

// ---------------------------------------------------------------------------
// Enrollments
// ---------------------------------------------------------------------------

export async function enrollContacts(
  campaignId: string,
  contactIds: string[]
) {
  const db = getDb();
  const now = new Date().toISOString();

  // Get first step
  const [firstStep] = await db
    .select()
    .from(campaignSteps)
    .where(eq(campaignSteps.campaignId, campaignId))
    .orderBy(asc(campaignSteps.stepNumber))
    .limit(1);

  const enrollmentIds: string[] = [];
  for (const contactId of contactIds) {
    // Skip if already enrolled
    const [existing] = await db
      .select()
      .from(campaignEnrollments)
      .where(
        and(
          eq(campaignEnrollments.campaignId, campaignId),
          eq(campaignEnrollments.contactId, contactId),
          eq(campaignEnrollments.status, "active")
        )
      )
      .limit(1);

    if (existing) continue;

    const id = ulid();
    await db.insert(campaignEnrollments).values({
      id,
      campaignId,
      contactId,
      currentStepId: firstStep?.id ?? null,
      status: "active",
      nextSendAt: now,
      enrolledAt: now,
    });
    enrollmentIds.push(id);
  }

  revalidatePath(`/campaigns/${campaignId}`);
  return { enrolled: enrollmentIds.length, enrollmentIds };
}

export async function unenrollContact(enrollmentId: string) {
  const db = getDb();

  const [enrollment] = await db
    .select()
    .from(campaignEnrollments)
    .where(eq(campaignEnrollments.id, enrollmentId))
    .limit(1);

  if (!enrollment) return { unenrolled: false };

  await db
    .update(campaignEnrollments)
    .set({ status: "unsubscribed" })
    .where(eq(campaignEnrollments.id, enrollmentId));

  revalidatePath(`/campaigns/${enrollment.campaignId}`);
  return { unenrolled: true };
}

export async function getEnrollments(campaignId: string) {
  const db = getDb();

  const rows = await db
    .select({
      enrollment: campaignEnrollments,
      contactFirstName: contacts.firstName,
      contactLastName: contacts.lastName,
      contactEmail: contacts.email,
    })
    .from(campaignEnrollments)
    .innerJoin(contacts, eq(campaignEnrollments.contactId, contacts.id))
    .where(eq(campaignEnrollments.campaignId, campaignId))
    .orderBy(desc(campaignEnrollments.enrolledAt));

  return rows;
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export async function getCampaignStats(campaignId: string) {
  const db = getDb();

  // Get enrollment IDs for this campaign
  const enrollments = await db
    .select({ id: campaignEnrollments.id })
    .from(campaignEnrollments)
    .where(eq(campaignEnrollments.campaignId, campaignId));

  if (enrollments.length === 0) {
    return { sent: 0, opens: 0, clicks: 0, replies: 0, bounces: 0, openRate: 0, clickRate: 0, replyRate: 0, bounceRate: 0 };
  }

  const enrollmentIds = enrollments.map((e) => e.id);

  // Count events by type
  const events = await db
    .select({
      type: campaignEvents.type,
      count: count(),
    })
    .from(campaignEvents)
    .where(
      sql`${campaignEvents.enrollmentId} IN (${sql.join(
        enrollmentIds.map((id) => sql`${id}`),
        sql`, `
      )})`
    )
    .groupBy(campaignEvents.type);

  const eventMap = Object.fromEntries(
    events.map((e) => [e.type, e.count])
  );

  const sent = eventMap.sent ?? 0;
  const opens = eventMap.opened ?? 0;
  const clicks = eventMap.clicked ?? 0;
  const replies = eventMap.replied ?? 0;
  const bounces = eventMap.bounced ?? 0;

  return {
    sent,
    opens,
    clicks,
    replies,
    bounces,
    openRate: sent > 0 ? Math.round((opens / sent) * 100) : 0,
    clickRate: sent > 0 ? Math.round((clicks / sent) * 100) : 0,
    replyRate: sent > 0 ? Math.round((replies / sent) * 100) : 0,
    bounceRate: sent > 0 ? Math.round((bounces / sent) * 100) : 0,
  };
}

// ---------------------------------------------------------------------------
// Campaign list with stats (for list page)
// ---------------------------------------------------------------------------

export async function getCampaignsWithStats() {
  const db = getDb();

  const allCampaigns = await db
    .select()
    .from(campaigns)
    .orderBy(desc(campaigns.updatedAt));

  const result = await Promise.all(
    allCampaigns.map(async (campaign) => {
      const [enrollCount] = await db
        .select({ count: count() })
        .from(campaignEnrollments)
        .where(eq(campaignEnrollments.campaignId, campaign.id));

      const [stepCount] = await db
        .select({ count: count() })
        .from(campaignSteps)
        .where(eq(campaignSteps.campaignId, campaign.id));

      const stats = await getCampaignStats(campaign.id);

      return {
        ...campaign,
        enrolledCount: enrollCount?.count ?? 0,
        stepCount: stepCount?.count ?? 0,
        openRate: stats.openRate,
        replyRate: stats.replyRate,
      };
    })
  );

  return result;
}
