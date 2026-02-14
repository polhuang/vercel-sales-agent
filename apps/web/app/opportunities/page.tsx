import { getRecords } from "../actions/records";
import { OpportunitiesTable } from "./opportunities-table";
import type { Opportunity } from "@sales-agent/db/schema";

export const dynamic = "force-dynamic";

export default async function OpportunitiesPage() {
  const data = (await getRecords("opportunity")) as Opportunity[];

  return <OpportunitiesTable data={data} />;
}
