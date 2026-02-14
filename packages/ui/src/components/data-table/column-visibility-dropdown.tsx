"use client";

import * as React from "react";
import { Columns3, Check, RotateCcw } from "lucide-react";
import type { VisibilityState, OnChangeFn } from "@tanstack/react-table";
import { Button } from "../primitives/button";
import { cn } from "../../lib/utils";

export interface ColumnInfo {
  id: string;
  label: string;
}

interface ColumnVisibilityDropdownProps {
  columns: ColumnInfo[];
  columnVisibility: VisibilityState;
  onColumnVisibilityChange: OnChangeFn<VisibilityState>;
}

export function ColumnVisibilityDropdown({
  columns,
  columnVisibility,
  onColumnVisibilityChange,
}: ColumnVisibilityDropdownProps) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close on click outside
  React.useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    // Use mousedown to close before any other click handler fires
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Close on Escape
  React.useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const isColumnVisible = (columnId: string): boolean => {
    // TanStack Table treats missing keys as visible (true)
    return columnVisibility[columnId] !== false;
  };

  const toggleColumn = (columnId: string) => {
    onColumnVisibilityChange((prev: VisibilityState) => ({
      ...prev,
      [columnId]: !isColumnVisible(columnId),
    }));
  };

  const showAll = () => {
    // Set all columns to visible by clearing the visibility state
    onColumnVisibilityChange({});
  };

  const hiddenCount = columns.filter((col) => !isColumnVisible(col.id)).length;

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(open && "bg-accent")}
      >
        <Columns3 size={14} className="mr-1.5" />
        Columns
        {hiddenCount > 0 && (
          <span className="ml-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
            {hiddenCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-md border border-border bg-popover p-1 shadow-md">
          <div className="max-h-64 overflow-y-auto">
            {columns.map((col) => {
              const visible = isColumnVisible(col.id);
              return (
                <button
                  key={col.id}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground"
                  onClick={() => toggleColumn(col.id)}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-input",
                      visible && "border-primary bg-primary text-primary-foreground"
                    )}
                  >
                    {visible && <Check size={12} />}
                  </span>
                  <span className="truncate">{col.label}</span>
                </button>
              );
            })}
          </div>

          {hiddenCount > 0 && (
            <>
              <div className="my-1 border-t border-border" />
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                onClick={showAll}
              >
                <RotateCcw size={12} />
                <span>Show all columns</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
