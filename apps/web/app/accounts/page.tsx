import { getRecords } from "../actions/records";
import { AccountsTable } from "./accounts-table";
import type { Account } from "@sales-agent/db/schema";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const data = (await getRecords("account")) as Account[];

  return <AccountsTable data={data} />;
}
