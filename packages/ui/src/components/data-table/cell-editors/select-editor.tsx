"use client";

import * as React from "react";
import { cn } from "../../../lib/utils";
import type { CellEditorProps, CommitReason } from "./text-editor";

export function SelectEditor({
  value,
  onCommit,
  onCancel,
  options = [],
}: CellEditorProps) {
  const [localValue, setLocalValue] = React.useState(
    value != null ? String(value) : ""
  );
  const selectRef = React.useRef<HTMLSelectElement>(null);
  const committedRef = React.useRef(false);

  React.useEffect(() => {
    const el = selectRef.current;
    if (el) {
      el.focus();
    }
  }, []);

  const commit = (val: string, reason: CommitReason) => {
    if (committedRef.current) return;
    committedRef.current = true;
    onCommit(val || null, reason);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLSelectElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit(localValue, "enter");
    } else if (e.key === "Escape") {
      e.preventDefault();
      committedRef.current = true;
      onCancel();
    } else if (e.key === "Tab") {
      e.preventDefault();
      commit(localValue, "tab");
    }
  };

  const handleBlur = () => {
    commit(localValue, "blur");
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newVal = e.target.value;
    setLocalValue(newVal);
    // Commit immediately on selection for better UX
    commit(newVal, "enter");
  };

  return (
    <select
      ref={selectRef}
      value={localValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      className={cn(
        "h-9 w-full border-0 bg-background px-1.5 text-sm outline-none ring-2 ring-inset ring-primary"
      )}
    >
      <option value="">--</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}
