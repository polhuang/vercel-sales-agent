import { notFound } from "next/navigation";
import { getCampaign, getCampaignStats, getEnrollments } from "../../actions/campaigns";
import { getRecords } from "../../actions/records";
import { CampaignDetail } from "./campaign-detail";
import type { Contact } from "@sales-agent/db/schema";

export const dynamic = "force-dynamic";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [campaign, stats, enrollments, allContacts] = await Promise.all([
    getCampaign(id),
    getCampaignStats(id),
    getEnrollments(id),
    getRecords("contact") as Promise<Contact[]>,
  ]);

  if (!campaign) notFound();

  return (
    <CampaignDetail
      campaign={campaign}
      stats={stats}
      enrollments={enrollments}
      allContacts={allContacts}
    />
  );
}
