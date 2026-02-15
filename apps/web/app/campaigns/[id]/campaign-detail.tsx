"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@sales-agent/ui/components/primitives/badge";
import { Button } from "@sales-agent/ui/components/primitives/button";
import {
  ArrowLeft,
  Play,
  Pause,
  Trash2,
  Mail,
  MousePointerClick,
  MessageSquareReply,
  Send,
} from "lucide-react";
import {
  updateCampaign,
  activateCampaign,
  pauseCampaign,
  deleteCampaign,
} from "../../actions/campaigns";
import { StepEditor } from "./step-editor";
import { EnrollmentPanel } from "./enrollment-panel";
import { AnalyticsTab } from "./analytics-tab";
import type { Campaign, CampaignStep, Contact } from "@sales-agent/db/schema";

type Tab = "steps" | "enrollments" | "analytics";

interface CampaignWithSteps extends Campaign {
  steps: CampaignStep[];
}

interface EnrollmentRow {
  enrollment: {
    id: string;
    campaignId: string;
    contactId: string;
    currentStepId: string | null;
    status: string | null;
    nextSendAt: string | null;
    enrolledAt: string;
    threadId: string | null;
    gmailMessageId: string | null;
  };
  contactFirstName: string | null;
  contactLastName: string | null;
  contactEmail: string | null;
}

interface Stats {
  sent: number;
  opens: number;
  clicks: number;
  replies: number;
  bounces: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
  bounceRate: number;
}

interface CampaignDetailProps {
  campaign: CampaignWithSteps;
  stats: Stats;
  enrollments: EnrollmentRow[];
  allContacts: Contact[];
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  active: "default",
  draft: "outline",
  paused: "secondary",
  completed: "secondary",
};

export function CampaignDetail({
  campaign,
  stats,
  enrollments,
  allContacts,
}: CampaignDetailProps) {
  const router = useRouter();
  const [tab, setTab] = React.useState<Tab>("steps");
  const [name, setName] = React.useState(campaign.name);
  const [description, setDescription] = React.useState(
    campaign.description ?? ""
  );
  const [isEditing, setIsEditing] = React.useState(false);

  const handleSave = async () => {
    await updateCampaign(campaign.id, { name, description });
    setIsEditing(false);
    router.refresh();
  };

  const handleActivate = async () => {
    await activateCampaign(campaign.id);
    router.refresh();
  };

  const handlePause = async () => {
    await pauseCampaign(campaign.id);
    router.refresh();
  };

  const handleDelete = async () => {
    if (!confirm("Delete this campaign? This cannot be undone.")) return;
    await deleteCampaign(campaign.id);
    router.push("/campaigns");
  };

  const statCards = [
    { label: "Sent", value: stats.sent, icon: Send },
    { label: "Open Rate", value: `${stats.openRate}%`, icon: Mail },
    { label: "Click Rate", value: `${stats.clickRate}%`, icon: MousePointerClick },
    { label: "Reply Rate", value: `${stats.replyRate}%`, icon: MessageSquareReply },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <button
            onClick={() => router.push("/campaigns")}
            className="mt-1 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            {isEditing ? (
              <div className="space-y-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-xl font-semibold bg-transparent border-b border-border focus:border-foreground outline-none pb-0.5"
                  autoFocus
                />
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Campaign description..."
                  className="block w-full text-sm text-muted-foreground bg-transparent border rounded-md border-border p-2 focus:border-foreground outline-none resize-none"
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSave}>
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setName(campaign.name);
                      setDescription(campaign.description ?? "");
                      setIsEditing(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2.5">
                  <h1
                    className="text-xl font-semibold cursor-pointer hover:text-muted-foreground transition-colors"
                    onClick={() => setIsEditing(true)}
                  >
                    {campaign.name}
                  </h1>
                  <Badge variant={STATUS_VARIANT[campaign.status ?? "draft"]}>
                    {campaign.status ?? "draft"}
                  </Badge>
                </div>
                {campaign.description && (
                  <p
                    className="mt-1 text-sm text-muted-foreground cursor-pointer"
                    onClick={() => setIsEditing(true)}
                  >
                    {campaign.description}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {campaign.status === "draft" || campaign.status === "paused" ? (
            <Button size="sm" onClick={handleActivate}>
              <Play size={14} className="mr-1.5" />
              Activate
            </Button>
          ) : campaign.status === "active" ? (
            <Button size="sm" variant="outline" onClick={handlePause}>
              <Pause size={14} className="mr-1.5" />
              Pause
            </Button>
          ) : null}
          <Button size="sm" variant="outline" onClick={handleDelete}>
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-border p-3"
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <card.icon size={13} />
              {card.label}
            </div>
            <div className="mt-1 text-lg font-semibold tabular-nums">
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-0">
          {(["steps", "enrollments", "analytics"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === "steps" && (
                <span className="ml-1.5 text-xs text-muted-foreground">
                  ({campaign.steps.length})
                </span>
              )}
              {t === "enrollments" && (
                <span className="ml-1.5 text-xs text-muted-foreground">
                  ({enrollments.length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === "steps" && (
        <StepEditor campaignId={campaign.id} steps={campaign.steps} />
      )}
      {tab === "enrollments" && (
        <EnrollmentPanel
          campaignId={campaign.id}
          enrollments={enrollments}
          allContacts={allContacts}
        />
      )}
      {tab === "analytics" && (
        <AnalyticsTab campaignId={campaign.id} stats={stats} />
      )}
    </div>
  );
}
