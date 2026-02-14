import {
  Target,
  Building2,
  Users,
  DollarSign,
} from "lucide-react";
import { getRecords } from "./actions/records";
import { SeedButton } from "./seed-button";
import type { Opportunity } from "@sales-agent/db/schema";

export const dynamic = "force-dynamic";

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const [opportunitiesRaw, accountsData, contactsData] = await Promise.all([
    getRecords("opportunity"),
    getRecords("account"),
    getRecords("contact"),
  ]);

  const opportunities = opportunitiesRaw as Opportunity[];

  // Open opportunities: not Closed Won or Closed Lost
  const openOpportunities = opportunities.filter(
    (o) => o.stage !== "Closed Won" && o.stage !== "Closed Lost"
  );

  // Pipeline value: sum of amounts for open opportunities
  const pipelineValue = openOpportunities.reduce(
    (sum, o) => sum + (o.amount ?? 0),
    0
  );

  const totalRecords =
    opportunities.length + accountsData.length + contactsData.length;
  const showSeedButton = totalRecords === 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Open Opportunities"
          value={String(openOpportunities.length)}
          icon={<Target size={18} />}
        />
        <StatCard
          label="Accounts"
          value={String(accountsData.length)}
          icon={<Building2 size={18} />}
        />
        <StatCard
          label="Contacts"
          value={String(contactsData.length)}
          icon={<Users size={18} />}
        />
        <StatCard
          label="Pipeline Value"
          value={`$${pipelineValue.toLocaleString()}`}
          icon={<DollarSign size={18} />}
        />
      </div>
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          Welcome to Sales Agent. Use the sidebar to navigate to your
          opportunities, accounts, contacts, notes, or campaigns.
        </p>
      </div>
      {showSeedButton && (
        <div className="rounded-lg border border-dashed border-border bg-card p-6">
          <p className="mb-3 text-sm text-muted-foreground">
            No data found. Seed the database with sample records to get started.
          </p>
          <SeedButton />
        </div>
      )}
    </div>
  );
}
