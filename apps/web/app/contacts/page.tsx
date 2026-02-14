import { getRecords } from "../actions/records";
import { ContactsTable } from "./contacts-table";
import type { Contact } from "@sales-agent/db/schema";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const data = (await getRecords("contact")) as Contact[];

  return <ContactsTable data={data} />;
}
