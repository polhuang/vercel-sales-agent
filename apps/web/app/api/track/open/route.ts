import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { ulid } from "ulid";
import { getDb } from "../../../../lib/db";
import { campaignEvents, campaignEnrollments } from "@sales-agent/db";

// 1x1 transparent GIF
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(request: NextRequest) {
  const eid = request.nextUrl.searchParams.get("eid");
  const sid = request.nextUrl.searchParams.get("sid");

  if (eid && sid) {
    try {
      const db = getDb();

      // Verify enrollment exists
      const [enrollment] = await db
        .select()
        .from(campaignEnrollments)
        .where(eq(campaignEnrollments.id, eid))
        .limit(1);

      if (enrollment) {
        await db.insert(campaignEvents).values({
          id: ulid(),
          enrollmentId: eid,
          stepId: sid,
          type: "opened",
          createdAt: new Date().toISOString(),
        });
      }
    } catch {
      // Tracking should never fail the response
    }
  }

  return new Response(PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
