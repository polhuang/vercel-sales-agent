"use client";

import * as React from "react";
import { SlidersHorizontal, Plus, X } from "lucide-react";
import type { ColumnFiltersState, OnChangeFn } from "@tanstack/react-table";
import { Button } from "../primitives/button";
import { Input } from "../primitives/input";
import { cn } from "../../lib/utils";
import type { ColumnInfo } from "./column-visibility-dropdown";

interface FilterPanelProps {
  columns: ColumnInfo[];
  columnFilters: ColumnFiltersState;
  onColumnFiltersChange: OnChangeFn<ColumnFiltersState>;
}

export function FilterPanel({
  columns,
  columnFilters,
  onColumnFiltersChange,
}: FilterPanelProps) {
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

  const activeFilterCount = columnFilters.length;

  // Get columns that don't already have an active filter
  const availableColumns = columns.filter(
    (col) => !columnFilters.some((f) => f.id === col.id)
  );

  const getColumnLabel = (columnId: string): string => {
    const col = columns.find((c) => c.id === columnId);
    return col?.label ?? columnId;
  };

  const addFilter = (columnId: string) => {
    onColumnFiltersChange((prev: ColumnFiltersState) => [
      ...prev,
      { id: columnId, value: "" },
    ]);
  };

  const removeFilter = (columnId: string) => {
    onColumnFiltersChange((prev: ColumnFiltersState) =>
      prev.filter((f) => f.id !== columnId)
    );
  };

  const updateFilterValue = (columnId: string, value: string) => {
    onColumnFiltersChange((prev: ColumnFiltersState) =>
      prev.map((f) => (f.id === columnId ? { ...f, value } : f))
    );
  };

  const clearAll = () => {
    onColumnFiltersChange([]);
  };

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(open && "bg-accent")}
      >
        <SlidersHorizontal size={14} className="mr-1.5" />
        Filters
        {activeFilterCount > 0 && (
          <span className="ml-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
            {activeFilterCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded-md border border-border bg-popover p-3 shadow-md">
          {/* Header */}
          <div className="flex items-center justify-between pb-2">
            <span className="text-sm font-medium text-popover-foreground">
              Filters
            </span>
            {activeFilterCount > 0 && (
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-popover-foreground"
                onClick={clearAll}
              >
                Clear all
              </button>
            )}
          </div>

          {/* Active filters */}
          {columnFilters.length > 0 && (
            <div className="flex flex-col gap-2 pb-2">
              {columnFilters.map((filter) => (
                <div
                  key={filter.id}
                  className="flex items-center gap-2"
                >
                  <select
                    className="h-8 w-28 shrink-0 rounded-md border border-input bg-transparent px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={filter.id}
                    onChange={(e) => {
                      const newColumnId = e.target.value;
                      // Replace this filter with the new column, reset value
                      onColumnFiltersChange((prev: ColumnFiltersState) =>
                        prev.map((f) =>
                          f.id === filter.id
                            ? { id: newColumnId, value: "" }
                            : f
                        )
                      );
                    }}
                  >
                    <option value={filter.id}>
                      {getColumnLabel(filter.id)}
                    </option>
                    {availableColumns.map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.label}
                      </option>
                    ))}
                  </select>
                  <Input
                    placeholder="Filter value..."
                    value={(filter.value as string) ?? ""}
                    onChange={(e) =>
                      updateFilterValue(filter.id, e.target.value)
                    }
                    className="h-8 flex-1 text-xs"
                  />
                  <button
                    type="button"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    onClick={() => removeFilter(filter.id)}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add filter button */}
          {availableColumns.length > 0 && (
            <>
              {activeFilterCount > 0 && (
                <div className="my-1 border-t border-border" />
              )}
              <AddFilterButton
                availableColumns={availableColumns}
                onAdd={addFilter}
              />
            </>
          )}

          {/* Empty state */}
          {activeFilterCount === 0 && availableColumns.length > 0 && (
            <p className="pb-1 pt-1 text-xs text-muted-foreground">
              No active filters. Add a filter to narrow results.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * A small sub-component that shows a column picker when you click "+ Add filter".
 * This avoids needing a second dropdown and keeps the UX simple.
 */
function AddFilterButton({
  availableColumns,
  onAdd,
}: {
  availableColumns: ColumnInfo[];
  onAdd: (columnId: string) => void;
}) {
  const [picking, setPicking] = React.useState(false);

  if (picking) {
    return (
      <div className="flex flex-col gap-0.5 pt-1">
        <span className="pb-1 text-xs text-muted-foreground">
          Select a column:
        </span>
        <div className="max-h-40 overflow-y-auto">
          {availableColumns.map((col) => (
            <button
              key={col.id}
              type="button"
              className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground"
              onClick={() => {
                onAdd(col.id);
                setPicking(false);
              }}
            >
              {col.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="flex items-center gap-1.5 rounded-sm px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      onClick={() => setPicking(true)}
    >
      <Plus size={14} />
      <span>Add filter</span>
    </button>
  );
}
