"use client";

import * as React from "react";
import { cn } from "../../../lib/utils";

export type CommitReason = "enter" | "tab" | "blur";

export interface CellEditorProps {
  value: unknown;
  onCommit: (newValue: unknown, reason?: CommitReason) => void;
  onCancel: () => void;
  options?: string[];
}

export function TextEditor({ value, onCommit, onCancel }: CellEditorProps) {
  const [localValue, setLocalValue] = React.useState(
    value != null ? String(value) : ""
  );
  const inputRef = React.useRef<HTMLInputElement>(null);
  const committedRef = React.useRef(false);

  React.useEffect(() => {
    const el = inputRef.current;
    if (el) {
      el.focus();
      el.select();
    }
  }, []);

  const commit = (reason: CommitReason) => {
    if (committedRef.current) return;
    committedRef.current = true;
    onCommit(localValue, reason);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit("enter");
    } else if (e.key === "Escape") {
      e.preventDefault();
      committedRef.current = true;
      onCancel();
    } else if (e.key === "Tab") {
      e.preventDefault();
      commit("tab");
    }
  };

  const handleBlur = () => {
    commit("blur");
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      className={cn(
        "h-9 w-full border-0 bg-background px-2 text-sm outline-none ring-2 ring-inset ring-primary"
      )}
    />
  );
}
