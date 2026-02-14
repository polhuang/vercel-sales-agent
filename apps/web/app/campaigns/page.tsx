import { Mail } from "lucide-react";

export default function CampaignsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Campaigns</h1>
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
        <Mail size={40} className="mb-3 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No campaigns yet. Email campaigns will be available after Phase 5
          implementation.
        </p>
      </div>
    </div>
  );
}
