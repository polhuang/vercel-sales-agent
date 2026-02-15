import { getCampaignsWithStats } from "../actions/campaigns";
import { CampaignsTable } from "./campaigns-table";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const data = await getCampaignsWithStats();
  return <CampaignsTable data={data} />;
}
