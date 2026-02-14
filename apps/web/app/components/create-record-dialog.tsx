"use client";

import * as React from "react";
import { Dialog } from "@sales-agent/ui/components/primitives/dialog";
import { Input } from "@sales-agent/ui/components/primitives/input";
import { Button } from "@sales-agent/ui/components/primitives/button";
import { createRecord } from "../actions/records";

interface FieldDef {
  key: string;
  label: string;
  type?: "text" | "number" | "select";
  required?: boolean;
  options?: string[];
  placeholder?: string;
}

interface CreateRecordDialogProps {
  open: boolean;
  onClose: () => void;
  entityType: "opportunity" | "account" | "contact";
  title: string;
  fields: FieldDef[];
}

export function CreateRecordDialog({
  open,
  onClose,
  entityType,
  title,
  fields,
}: CreateRecordDialogProps) {
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      setValues({});
      setError(null);
    }
  }, [open]);

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    // Validate required fields
    for (const field of fields) {
      if (field.required && !values[field.key]?.trim()) {
        setError(`${field.label} is required`);
        return;
      }
    }

    // Build the data object, converting numbers
    const data: Record<string, unknown> = {};
    for (const field of fields) {
      const raw = values[field.key]?.trim();
      if (!raw) continue;
      if (field.type === "number") {
        const num = Number(raw);
        if (!isNaN(num)) data[field.key] = num;
      } else {
        data[field.key] = raw;
      }
    }

    setSaving(true);
    try {
      await createRecord(entityType, data);
      onClose();
    } catch (err) {
      console.error("Failed to create record:", err);
      setError("Failed to create record. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {fields.map((field) => (
          <div key={field.key}>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              {field.label}
              {field.required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            {field.type === "select" && field.options ? (
              <select
                value={values[field.key] ?? ""}
                onChange={(e) => handleChange(field.key, e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">--</option>
                {field.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                type={field.type === "number" ? "number" : "text"}
                value={values[field.key] ?? ""}
                onChange={(e) => handleChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="h-9 text-sm"
              />
            )}
          </div>
        ))}

        {error && (
          <p className="text-xs text-red-500">{error}</p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? "Creating..." : "Create"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
