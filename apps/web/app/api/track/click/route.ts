import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { ulid } from "ulid";
import { getDb } from "../../../../lib/db";
import { campaignEvents, campaignEnrollments } from "@sales-agent/db";

export async function GET(request: NextRequest) {
  const eid = request.nextUrl.searchParams.get("eid");
  const sid = request.nextUrl.searchParams.get("sid");
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  if (eid && sid) {
    try {
      const db = getDb();

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
          type: "clicked",
          metadata: { url },
          createdAt: new Date().toISOString(),
        });
      }
    } catch {
      // Tracking should never fail the redirect
    }
  }

  return NextResponse.redirect(url, 302);
}
