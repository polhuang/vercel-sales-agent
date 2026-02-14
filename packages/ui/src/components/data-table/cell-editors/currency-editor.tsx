"use client";

import * as React from "react";
import { cn } from "../../../lib/utils";
import type { CellEditorProps, CommitReason } from "./text-editor";

export function CurrencyEditor({ value, onCommit, onCancel }: CellEditorProps) {
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
    const parsed = localValue === "" ? null : Number(localValue);
    onCommit(parsed != null && isNaN(parsed) ? null : parsed, reason);
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
    <div className="relative flex h-9 w-full items-center ring-2 ring-inset ring-primary">
      <span className="pointer-events-none pl-2 text-sm text-muted-foreground">
        $
      </span>
      <input
        ref={inputRef}
        type="number"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className={cn(
          "h-full w-full border-0 bg-background px-1 text-sm outline-none",
          "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        )}
      />
    </div>
  );
}
