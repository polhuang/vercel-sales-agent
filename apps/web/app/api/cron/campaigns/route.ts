import { NextRequest, NextResponse } from "next/server";
import { processDueEnrollments, checkForReplies } from "../../../../lib/campaign-engine";

export async function GET(request: NextRequest) {
  // Verify CRON_SECRET
  const authHeader = request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [enrollmentResult, replyResult] = await Promise.all([
      processDueEnrollments(),
      checkForReplies(),
    ]);

    return NextResponse.json({
      success: true,
      enrollments: enrollmentResult,
      replies: replyResult,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Cron job error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Cron job failed" },
      { status: 500 }
    );
  }
}
