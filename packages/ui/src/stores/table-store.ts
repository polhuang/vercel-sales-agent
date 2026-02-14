import { create } from "zustand";
import type {
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  OnChangeFn,
} from "@tanstack/react-table";

interface TableState {
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  columnVisibility: VisibilityState;
  globalFilter: string;
  setSorting: OnChangeFn<SortingState>;
  setColumnFilters: OnChangeFn<ColumnFiltersState>;
  setColumnVisibility: OnChangeFn<VisibilityState>;
  setGlobalFilter: OnChangeFn<string>;
}

export const useTableStore = create<TableState>((set) => ({
  sorting: [],
  columnFilters: [],
  columnVisibility: {},
  globalFilter: "",
  setSorting: (updater) =>
    set((s) => ({
      sorting: typeof updater === "function" ? updater(s.sorting) : updater,
    })),
  setColumnFilters: (updater) =>
    set((s) => ({
      columnFilters:
        typeof updater === "function" ? updater(s.columnFilters) : updater,
    })),
  setColumnVisibility: (updater) =>
    set((s) => ({
      columnVisibility:
        typeof updater === "function" ? updater(s.columnVisibility) : updater,
    })),
  setGlobalFilter: (updater) =>
    set((s) => ({
      globalFilter:
        typeof updater === "function" ? updater(s.globalFilter) : updater,
    })),
}));
