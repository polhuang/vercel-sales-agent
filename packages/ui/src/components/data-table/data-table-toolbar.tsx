"use client";

import { Search } from "lucide-react";
import type {
  VisibilityState,
  ColumnFiltersState,
  OnChangeFn,
} from "@tanstack/react-table";
import { Input } from "../primitives/input";
import {
  ColumnVisibilityDropdown,
  type ColumnInfo,
} from "./column-visibility-dropdown";
import { FilterPanel } from "./filter-panel";

interface DataTableToolbarProps {
  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;
  title?: string;
  actions?: React.ReactNode;
  /** Column metadata for the visibility dropdown and filter panel. If omitted, the dropdowns are not rendered. */
  columns?: ColumnInfo[];
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: OnChangeFn<VisibilityState>;
  columnFilters?: ColumnFiltersState;
  onColumnFiltersChange?: OnChangeFn<ColumnFiltersState>;
}

export function DataTableToolbar({
  globalFilter,
  onGlobalFilterChange,
  title,
  actions,
  columns,
  columnVisibility,
  onColumnVisibilityChange,
  columnFilters,
  onColumnFiltersChange,
}: DataTableToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-4 pb-3">
      <div className="flex items-center gap-3">
        {title && (
          <h1 className="text-lg font-semibold">{title}</h1>
        )}
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search..."
            value={globalFilter}
            onChange={(e) => onGlobalFilterChange(e.target.value)}
            className="h-8 w-64 pl-8 text-sm"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        {actions}
        {columns && columnVisibility !== undefined && onColumnVisibilityChange && (
          <ColumnVisibilityDropdown
            columns={columns}
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={onColumnVisibilityChange}
          />
        )}
        {columns && columnFilters !== undefined && onColumnFiltersChange && (
          <FilterPanel
            columns={columns}
            columnFilters={columnFilters}
            onColumnFiltersChange={onColumnFiltersChange}
          />
        )}
      </div>
    </div>
  );
}
