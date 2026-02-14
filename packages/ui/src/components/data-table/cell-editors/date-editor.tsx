"use client";

import * as React from "react";
import { cn } from "../../../lib/utils";
import type { CellEditorProps, CommitReason } from "./text-editor";

export function DateEditor({ value, onCommit, onCancel }: CellEditorProps) {
  // Convert ISO date string to YYYY-MM-DD for the date input
  const toDateInputValue = (v: unknown): string => {
    if (v == null || v === "") return "";
    const str = String(v);
    // Handle ISO 8601 strings — take the date portion
    return str.slice(0, 10);
  };

  const [localValue, setLocalValue] = React.useState(toDateInputValue(value));
  const inputRef = React.useRef<HTMLInputElement>(null);
  const committedRef = React.useRef(false);

  React.useEffect(() => {
    const el = inputRef.current;
    if (el) {
      el.focus();
    }
  }, []);

  const commit = (reason: CommitReason) => {
    if (committedRef.current) return;
    committedRef.current = true;
    onCommit(localValue || null, reason);
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
      type="date"
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
