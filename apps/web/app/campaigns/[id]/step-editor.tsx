"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@sales-agent/ui/components/primitives/button";
import { Input } from "@sales-agent/ui/components/primitives/input";
import { Badge } from "@sales-agent/ui/components/primitives/badge";
import {
  Plus,
  Mail,
  Clock,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { addStep, updateStep, deleteStep } from "../../actions/campaigns";
import type { CampaignStep } from "@sales-agent/db/schema";

interface StepEditorProps {
  campaignId: string;
  steps: CampaignStep[];
}

export function StepEditor({ campaignId, steps }: StepEditorProps) {
  const router = useRouter();
  const [expandedStep, setExpandedStep] = React.useState<string | null>(
    steps.length > 0 ? steps[0].id : null
  );
  const [saving, setSaving] = React.useState<string | null>(null);

  const handleAddEmail = async () => {
    await addStep(campaignId, {
      type: "email",
      subject: "",
      body: "",
    });
    router.refresh();
  };

  const handleAddWait = async () => {
    await addStep(campaignId, {
      type: "wait",
      waitDays: 3,
    });
    router.refresh();
  };

  const handleUpdateStep = async (
    stepId: string,
    data: Partial<{ subject: string; body: string; waitDays: number }>
  ) => {
    setSaving(stepId);
    await updateStep(stepId, data);
    setSaving(null);
    router.refresh();
  };

  const handleDeleteStep = async (stepId: string) => {
    if (!confirm("Delete this step?")) return;
    await deleteStep(stepId);
    router.refresh();
  };

  return (
    <div className="space-y-3">
      {/* Step timeline */}
      <div className="space-y-0">
        {steps.map((step, index) => {
          const isExpanded = expandedStep === step.id;
          const isEmail = step.type === "email";
          const isSaving = saving === step.id;

          return (
            <div key={step.id} className="relative">
              {/* Timeline connector */}
              {index < steps.length - 1 && (
                <div className="absolute left-5 top-12 bottom-0 w-px bg-border" />
              )}

              <div className="flex gap-3">
                {/* Timeline dot */}
                <div className="relative z-10 mt-3 flex h-6 w-6 shrink-0 items-center justify-center">
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                      isEmail
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-muted text-muted-foreground"
                    }`}
                  >
                    {isEmail ? <Mail size={12} /> : <Clock size={12} />}
                  </div>
                </div>

                {/* Step card */}
                <div className="flex-1 mb-3 rounded-lg border border-border">
                  {/* Step header */}
                  <button
                    onClick={() =>
                      setExpandedStep(isExpanded ? null : step.id)
                    }
                    className="flex w-full items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors rounded-t-lg"
                  >
                    <div className="flex items-center gap-2.5">
                      <GripVertical
                        size={14}
                        className="text-muted-foreground"
                      />
                      <Badge variant="outline" className="text-[10px]">
                        Step {step.stepNumber}
                      </Badge>
                      <span className="text-sm font-medium">
                        {isEmail
                          ? step.subject || "Untitled email"
                          : `Wait ${step.waitDays ?? 0} day${(step.waitDays ?? 0) !== 1 ? "s" : ""}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isSaving && (
                        <span className="text-xs text-muted-foreground">
                          Saving...
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronUp size={14} className="text-muted-foreground" />
                      ) : (
                        <ChevronDown
                          size={14}
                          className="text-muted-foreground"
                        />
                      )}
                    </div>
                  </button>

                  {/* Step body (expanded) */}
                  {isExpanded && (
                    <div className="border-t border-border p-3 space-y-3">
                      {isEmail ? (
                        <EmailStepForm
                          step={step}
                          onSave={(data) => handleUpdateStep(step.id, data)}
                        />
                      ) : (
                        <WaitStepForm
                          step={step}
                          onSave={(data) => handleUpdateStep(step.id, data)}
                        />
                      )}
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteStep(step.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 size={13} className="mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add step buttons */}
      <div className="flex items-center gap-2 pl-9">
        <Button size="sm" variant="outline" onClick={handleAddEmail}>
          <Plus size={14} className="mr-1" />
          <Mail size={13} className="mr-1" />
          Email Step
        </Button>
        <Button size="sm" variant="outline" onClick={handleAddWait}>
          <Plus size={14} className="mr-1" />
          <Clock size={13} className="mr-1" />
          Wait Step
        </Button>
      </div>

      {/* Variable reference */}
      {steps.some((s) => s.type === "email") && (
        <div className="ml-9 rounded-md bg-muted p-3">
          <p className="text-xs font-medium text-muted-foreground mb-1.5">
            Available variables
          </p>
          <div className="flex flex-wrap gap-1.5">
            {[
              "firstName",
              "lastName",
              "fullName",
              "email",
              "title",
              "company",
              "industry",
            ].map((v) => (
              <code
                key={v}
                className="rounded bg-background border border-border px-1.5 py-0.5 text-[11px] font-mono"
              >
                {`{{${v}}}`}
              </code>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Email step form
// ---------------------------------------------------------------------------

function EmailStepForm({
  step,
  onSave,
}: {
  step: CampaignStep;
  onSave: (data: { subject: string; body: string }) => void;
}) {
  const [subject, setSubject] = React.useState(step.subject ?? "");
  const [body, setBody] = React.useState(step.body ?? "");
  const [showPreview, setShowPreview] = React.useState(false);

  const isDirty =
    subject !== (step.subject ?? "") || body !== (step.body ?? "");

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Subject
        </label>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Email subject line..."
          className="text-sm"
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-muted-foreground">
            Body (HTML)
          </label>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPreview ? "Edit" : "Preview"}
          </button>
        </div>
        {showPreview ? (
          <div
            className="rounded-md border border-border p-3 text-sm min-h-[120px] prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: body }}
          />
        ) : (
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="<p>Hi {{firstName}},</p><p>...</p>"
            className="w-full rounded-md border border-border bg-transparent p-2.5 text-sm font-mono resize-none focus:border-foreground outline-none"
            rows={6}
          />
        )}
      </div>
      {isDirty && (
        <Button size="sm" onClick={() => onSave({ subject, body })}>
          Save Changes
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Wait step form
// ---------------------------------------------------------------------------

function WaitStepForm({
  step,
  onSave,
}: {
  step: CampaignStep;
  onSave: (data: { waitDays: number }) => void;
}) {
  const [days, setDays] = React.useState(step.waitDays ?? 3);
  const isDirty = days !== (step.waitDays ?? 3);

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Wait duration (days)
        </label>
        <Input
          type="number"
          min={1}
          max={90}
          value={days}
          onChange={(e) => setDays(parseInt(e.target.value) || 1)}
          className="w-32 text-sm"
        />
      </div>
      {isDirty && (
        <Button size="sm" onClick={() => onSave({ waitDays: days })}>
          Save Changes
        </Button>
      )}
    </div>
  );
}
