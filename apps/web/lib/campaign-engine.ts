/**
 * Campaign execution engine — processes due enrollments, sends emails, detects replies.
 */

import { eq, and, lte, asc, desc, sql } from "drizzle-orm";
import { ulid } from "ulid";
import { getDb } from "./db";
import { sendEmail, getThread } from "./gmail";
import {
  interpolateTemplate,
  injectTracking,
  buildVariablesFromContact,
} from "./email-template";
import {
  campaigns,
  campaignSteps,
  campaignEnrollments,
  campaignEvents,
  contacts,
  accounts,
} from "@sales-agent/db";

const MAX_SENDS_PER_RUN = parseInt(process.env.MAX_SENDS_PER_RUN ?? "50", 10);

// ---------------------------------------------------------------------------
// Process due enrollments
// ---------------------------------------------------------------------------

export async function processDueEnrollments(): Promise<{
  processed: number;
  errors: number;
}> {
  const db = getDb();
  const now = new Date().toISOString();
  const baseUrl = process.env.APP_URL ?? "http://localhost:3000";

  // Find active enrollments that are due
  const dueEnrollments = await db
    .select()
    .from(campaignEnrollments)
    .where(
      and(
        eq(campaignEnrollments.status, "active"),
        lte(campaignEnrollments.nextSendAt, now)
      )
    )
    .limit(MAX_SENDS_PER_RUN);

  let processed = 0;
  let errors = 0;

  for (const enrollment of dueEnrollments) {
    try {
      if (!enrollment.currentStepId) {
        // No step to process — mark completed
        await db
          .update(campaignEnrollments)
          .set({ status: "completed", nextSendAt: null })
          .where(eq(campaignEnrollments.id, enrollment.id));
        processed++;
        continue;
      }

      // Check campaign is still active
      const [campaign] = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, enrollment.campaignId))
        .limit(1);

      if (!campaign || campaign.status !== "active") continue;

      // Get current step
      const [step] = await db
        .select()
        .from(campaignSteps)
        .where(eq(campaignSteps.id, enrollment.currentStepId))
        .limit(1);

      if (!step) continue;

      // Idempotency: check if we already sent for this step
      const [existingSent] = await db
        .select()
        .from(campaignEvents)
        .where(
          and(
            eq(campaignEvents.enrollmentId, enrollment.id),
            eq(campaignEvents.stepId, step.id),
            eq(campaignEvents.type, "sent")
          )
        )
        .limit(1);

      if (existingSent) {
        // Already sent, advance to next step
        await advanceToNextStep(enrollment.id, enrollment.campaignId, step.stepNumber);
        processed++;
        continue;
      }

      if (step.type === "email") {
        // Get contact + account for template vars
        const [contact] = await db
          .select()
          .from(contacts)
          .where(eq(contacts.id, enrollment.contactId))
          .limit(1);

        if (!contact || !contact.email) {
          errors++;
          continue;
        }

        const [account] = contact.accountId
          ? await db
              .select()
              .from(accounts)
              .where(eq(accounts.id, contact.accountId))
              .limit(1)
          : [null];

        const variables = buildVariablesFromContact(contact, account);
        const subject = interpolateTemplate(step.subject ?? "", variables);
        let htmlBody = interpolateTemplate(step.body ?? "", variables);

        // Inject tracking
        htmlBody = injectTracking(htmlBody, enrollment.id, step.id, baseUrl);

        const unsubscribeUrl = `${baseUrl}/api/unsubscribe?eid=${enrollment.id}`;

        // Send via Gmail
        const result = await sendEmail({
          to: contact.email,
          subject,
          htmlBody,
          threadId: enrollment.threadId ?? undefined,
          replyToMessageId: enrollment.gmailMessageId ?? undefined,
          unsubscribeUrl,
        });

        // Store Gmail IDs on enrollment
        await db
          .update(campaignEnrollments)
          .set({
            threadId: result.threadId,
            gmailMessageId: result.messageId,
          })
          .where(eq(campaignEnrollments.id, enrollment.id));

        // Record sent event
        await db.insert(campaignEvents).values({
          id: ulid(),
          enrollmentId: enrollment.id,
          stepId: step.id,
          type: "sent",
          metadata: { messageId: result.messageId, threadId: result.threadId },
          createdAt: new Date().toISOString(),
        });

        // Advance to next step
        await advanceToNextStep(enrollment.id, enrollment.campaignId, step.stepNumber);
        processed++;
      } else if (step.type === "wait") {
        // Wait step: advance immediately (wait period was already accounted for in nextSendAt)
        await advanceToNextStep(enrollment.id, enrollment.campaignId, step.stepNumber);
        processed++;
      }
    } catch (err) {
      console.error(`Error processing enrollment ${enrollment.id}:`, err);
      errors++;
    }
  }

  return { processed, errors };
}

// ---------------------------------------------------------------------------
// Advance to next step
// ---------------------------------------------------------------------------

async function advanceToNextStep(
  enrollmentId: string,
  campaignId: string,
  currentStepNumber: number
) {
  const db = getDb();

  // Find next step
  const [nextStep] = await db
    .select()
    .from(campaignSteps)
    .where(
      and(
        eq(campaignSteps.campaignId, campaignId),
        sql`${campaignSteps.stepNumber} > ${currentStepNumber}`
      )
    )
    .orderBy(asc(campaignSteps.stepNumber))
    .limit(1);

  if (!nextStep) {
    // Campaign complete for this enrollment
    await db
      .update(campaignEnrollments)
      .set({ status: "completed", currentStepId: null, nextSendAt: null })
      .where(eq(campaignEnrollments.id, enrollmentId));
    return;
  }

  // Calculate next send time
  let nextSendAt = new Date().toISOString();
  if (nextStep.type === "wait" && nextStep.waitDays) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + nextStep.waitDays);
    nextSendAt = futureDate.toISOString();
  }

  await db
    .update(campaignEnrollments)
    .set({ currentStepId: nextStep.id, nextSendAt })
    .where(eq(campaignEnrollments.id, enrollmentId));
}

// ---------------------------------------------------------------------------
// Check for replies (via Gmail thread API)
// ---------------------------------------------------------------------------

export async function checkForReplies(): Promise<{
  repliesFound: number;
}> {
  const db = getDb();
  let repliesFound = 0;

  // Get active enrollments with a threadId
  const enrollments = await db
    .select()
    .from(campaignEnrollments)
    .where(
      and(
        eq(campaignEnrollments.status, "active"),
        sql`${campaignEnrollments.threadId} IS NOT NULL`
      )
    );

  for (const enrollment of enrollments) {
    if (!enrollment.threadId) continue;

    try {
      const thread = await getThread(enrollment.threadId);

      // If thread has more messages than we sent, it means someone replied
      const sentEvents = await db
        .select()
        .from(campaignEvents)
        .where(
          and(
            eq(campaignEvents.enrollmentId, enrollment.id),
            eq(campaignEvents.type, "sent")
          )
        );

      if (thread.messages.length > sentEvents.length) {
        // Check we haven't already recorded this reply
        const [existingReply] = await db
          .select()
          .from(campaignEvents)
          .where(
            and(
              eq(campaignEvents.enrollmentId, enrollment.id),
              eq(campaignEvents.type, "replied")
            )
          )
          .limit(1);

        if (!existingReply) {
          // Get the latest step for the reply event
          const latestSent = await db
            .select()
            .from(campaignEvents)
            .where(
              and(
                eq(campaignEvents.enrollmentId, enrollment.id),
                eq(campaignEvents.type, "sent")
              )
            )
            .orderBy(desc(campaignEvents.createdAt))
            .limit(1);

          if (latestSent[0]) {
            await db.insert(campaignEvents).values({
              id: ulid(),
              enrollmentId: enrollment.id,
              stepId: latestSent[0].stepId,
              type: "replied",
              createdAt: new Date().toISOString(),
            });

            // Update enrollment status
            await db
              .update(campaignEnrollments)
              .set({ status: "replied" })
              .where(eq(campaignEnrollments.id, enrollment.id));

            repliesFound++;
          }
        }
      }
    } catch (err) {
      console.error(`Error checking replies for enrollment ${enrollment.id}:`, err);
    }
  }

  return { repliesFound };
}
