"use client";

import * as React from "react";
import {
  Send,
  Mail,
  MousePointerClick,
  MessageSquareReply,
  AlertTriangle,
} from "lucide-react";

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

interface AnalyticsTabProps {
  campaignId: string;
  stats: Stats;
}

export function AnalyticsTab({ stats }: AnalyticsTabProps) {
  const metrics = [
    {
      label: "Total Sent",
      value: stats.sent,
      icon: Send,
      color: "text-foreground",
    },
    {
      label: "Opens",
      value: stats.opens,
      sub: `${stats.openRate}% open rate`,
      icon: Mail,
      color: "text-foreground",
      bar: stats.openRate,
    },
    {
      label: "Clicks",
      value: stats.clicks,
      sub: `${stats.clickRate}% click rate`,
      icon: MousePointerClick,
      color: "text-foreground",
      bar: stats.clickRate,
    },
    {
      label: "Replies",
      value: stats.replies,
      sub: `${stats.replyRate}% reply rate`,
      icon: MessageSquareReply,
      color: "text-foreground",
      bar: stats.replyRate,
    },
    {
      label: "Bounces",
      value: stats.bounces,
      sub: `${stats.bounceRate}% bounce rate`,
      icon: AlertTriangle,
      color: stats.bounces > 0 ? "text-destructive" : "text-foreground",
      bar: stats.bounceRate,
    },
  ];

  if (stats.sent === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-12 text-center">
        <Send size={32} className="mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No emails sent yet. Analytics will appear once the campaign starts
          sending.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <div className="grid grid-cols-5 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <m.icon size={13} />
              {m.label}
            </div>
            <div className={`text-2xl font-semibold tabular-nums ${m.color}`}>
              {m.value}
            </div>
            {m.sub && (
              <p className="mt-1 text-xs text-muted-foreground">{m.sub}</p>
            )}
            {m.bar !== undefined && m.bar > 0 && (
              <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-foreground transition-all"
                  style={{ width: `${Math.min(m.bar, 100)}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Funnel visualization */}
      <div>
        <h3 className="mb-3 text-sm font-medium">Conversion Funnel</h3>
        <div className="space-y-2">
          {[
            { label: "Sent", value: stats.sent, pct: 100 },
            {
              label: "Opened",
              value: stats.opens,
              pct: stats.openRate,
            },
            {
              label: "Clicked",
              value: stats.clicks,
              pct: stats.clickRate,
            },
            {
              label: "Replied",
              value: stats.replies,
              pct: stats.replyRate,
            },
          ].map((stage) => (
            <div key={stage.label} className="flex items-center gap-3">
              <span className="w-16 text-xs text-muted-foreground text-right">
                {stage.label}
              </span>
              <div className="flex-1 h-7 bg-muted rounded overflow-hidden">
                <div
                  className="h-full bg-foreground/10 border-r border-foreground/20 flex items-center px-2 transition-all"
                  style={{
                    width: `${Math.max(stage.pct, 2)}%`,
                  }}
                >
                  <span className="text-[11px] font-medium tabular-nums whitespace-nowrap">
                    {stage.value} ({stage.pct}%)
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
