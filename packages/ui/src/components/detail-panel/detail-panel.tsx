"use client";

import * as React from "react";
import { Sheet } from "../primitives/sheet";
import { Badge } from "../primitives/badge";
import { Input } from "../primitives/input";
import { cn } from "../../lib/utils";

// ---- Types ----------------------------------------------------------------

export interface ChangeLogItem {
  id: string;
  entityType: string;
  entityId: string;
  fieldName: string;
  oldValue: unknown;
  newValue: unknown;
  source: string;
  sourceDetail: string | null;
  isReverted: boolean | null;
  revertedBy: string | null;
  createdAt: string;
}

export interface DetailPanelProps {
  open: boolean;
  onClose: () => void;
  entityType: string;
  recordId: string;
  /** The full record as a key-value object. */
  record: Record<string, unknown> | null;
  /** Change log entries, ordered most recent first. */
  changeLog: ChangeLogItem[];
  /** Called when a field value is edited inline. */
  onFieldUpdate?: (fieldName: string, newValue: unknown) => void;
  /** Whether data is currently loading. */
  loading?: boolean;
}

// Fields to hide from the editable fields list
const HIDDEN_FIELDS = new Set(["id", "createdAt", "updatedAt"]);

// ---- Sub-components -------------------------------------------------------

function FieldValue({
  fieldName,
  value,
  onSave,
}: {
  fieldName: string;
  value: unknown;
  onSave: (newValue: unknown) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const displayValue = value == null || value === "" ? "\u2014" : String(value);

  const startEdit = React.useCallback(() => {
    setDraft(value == null ? "" : String(value));
    setEditing(true);
  }, [value]);

  const commit = React.useCallback(() => {
    setEditing(false);
    const trimmed = draft.trim();
    // Only save if value actually changed
    if (trimmed !== (value == null ? "" : String(value))) {
      // Attempt to parse numbers
      const asNum = Number(trimmed);
      const finalValue = trimmed === "" ? null : !isNaN(asNum) && trimmed !== "" ? asNum : trimmed;
      onSave(finalValue);
    }
  }, [draft, value, onSave]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setEditing(false);
      }
    },
    [commit]
  );

  // Focus the input when entering edit mode
  React.useEffect(() => {
    if (editing) {
      // Slight delay so the input is mounted
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [editing]);

  if (editing) {
    return (
      <Input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        className="h-7 text-xs"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      className={cn(
        "w-full cursor-pointer rounded px-1.5 py-1 text-left text-xs transition-colors hover:bg-muted",
        value == null || value === ""
          ? "text-muted-foreground italic"
          : "text-foreground"
      )}
      title={`Click to edit ${fieldName}`}
    >
      {displayValue}
    </button>
  );
}

function FieldsSection({
  record,
  onFieldUpdate,
}: {
  record: Record<string, unknown>;
  onFieldUpdate?: (fieldName: string, newValue: unknown) => void;
}) {
  const fields = Object.entries(record).filter(
    ([key]) => !HIDDEN_FIELDS.has(key)
  );

  return (
    <div className="grid grid-cols-[140px_1fr] gap-x-3 gap-y-1 p-4">
      {fields.map(([key, value]) => (
        <React.Fragment key={key}>
          <label className="flex items-center text-xs font-medium text-muted-foreground py-1">
            {formatFieldName(key)}
          </label>
          <FieldValue
            fieldName={key}
            value={value}
            onSave={(newValue) => onFieldUpdate?.(key, newValue)}
          />
        </React.Fragment>
      ))}
    </div>
  );
}

function HistorySection({ changeLog }: { changeLog: ChangeLogItem[] }) {
  if (changeLog.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-xs text-muted-foreground">
        No change history yet.
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="relative border-l-2 border-border pl-4 space-y-4">
        {changeLog.map((entry) => (
          <div key={entry.id} className="relative">
            {/* Timeline dot */}
            <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-border bg-background" />

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground">
                  {formatFieldName(entry.fieldName)}
                </span>
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0"
                >
                  {entry.source}
                </Badge>
                {entry.isReverted && (
                  <Badge
                    variant="destructive"
                    className="text-[10px] px-1.5 py-0"
                  >
                    reverted
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="line-through">
                  {formatValue(entry.oldValue)}
                </span>
                <span className="text-foreground">&rarr;</span>
                <span className="font-medium text-foreground">
                  {formatValue(entry.newValue)}
                </span>
              </div>

              <div className="text-[10px] text-muted-foreground">
                {formatTimestamp(entry.createdAt)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Helpers --------------------------------------------------------------

function formatFieldName(name: string): string {
  // camelCase → Title Case with spaces
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function formatValue(value: unknown): string {
  if (value == null || value === "") return "(empty)";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

// ---- Main component -------------------------------------------------------

export function DetailPanel({
  open,
  onClose,
  entityType,
  recordId,
  record,
  changeLog,
  onFieldUpdate,
  loading = false,
}: DetailPanelProps) {
  const [activeTab, setActiveTab] = React.useState<"fields" | "history">(
    "fields"
  );

  // Reset to fields tab when opening a different record
  React.useEffect(() => {
    if (open) setActiveTab("fields");
  }, [open, recordId]);

  const title = record
    ? (record.name as string) ??
      (record.firstName
        ? `${record.firstName} ${record.lastName ?? ""}`
        : formatFieldName(entityType))
    : formatFieldName(entityType);

  return (
    <Sheet open={open} onClose={onClose} title={title} width="lg">
      {loading ? (
        <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
          Loading...
        </div>
      ) : !record ? (
        <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
          Record not found.
        </div>
      ) : (
        <>
          {/* Tab bar */}
          <div className="flex border-b border-border px-4">
            <button
              type="button"
              className={cn(
                "px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px",
                activeTab === "fields"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setActiveTab("fields")}
            >
              Fields
            </button>
            <button
              type="button"
              className={cn(
                "px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px",
                activeTab === "history"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setActiveTab("history")}
            >
              History
              {changeLog.length > 0 && (
                <span className="ml-1.5 text-[10px] text-muted-foreground">
                  ({changeLog.length})
                </span>
              )}
            </button>
          </div>

          {/* Tab content */}
          {activeTab === "fields" ? (
            <FieldsSection record={record} onFieldUpdate={onFieldUpdate} />
          ) : (
            <HistorySection changeLog={changeLog} />
          )}
        </>
      )}
    </Sheet>
  );
}
