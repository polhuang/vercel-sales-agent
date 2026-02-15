import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "../../../lib/db";
import { campaignEnrollments } from "@sales-agent/db";

export async function GET(request: NextRequest) {
  const eid = request.nextUrl.searchParams.get("eid");

  if (!eid) {
    return new NextResponse("Missing enrollment ID", { status: 400 });
  }

  try {
    const db = getDb();

    await db
      .update(campaignEnrollments)
      .set({ status: "unsubscribed" })
      .where(eq(campaignEnrollments.id, eid));
  } catch {
    // Don't expose errors to user
  }

  const baseUrl = request.nextUrl.origin;
  return NextResponse.redirect(`${baseUrl}/unsubscribe`, 302);
}

// Support List-Unsubscribe-Post one-click
export async function POST(request: NextRequest) {
  const eid = request.nextUrl.searchParams.get("eid");

  if (!eid) {
    return new NextResponse("Missing enrollment ID", { status: 400 });
  }

  try {
    const db = getDb();
    await db
      .update(campaignEnrollments)
      .set({ status: "unsubscribed" })
      .where(eq(campaignEnrollments.id, eid));
  } catch {
    // Don't expose errors
  }

  return new NextResponse("Unsubscribed", { status: 200 });
}
