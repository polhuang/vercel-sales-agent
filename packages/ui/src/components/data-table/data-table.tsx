"use client";

import * as React from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type OnChangeFn,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { DataTableHeader } from "./data-table-header";
import { DataTableRow } from "./data-table-row";
import type { CommitReason } from "./cell-editors";

const ROW_HEIGHT = 36;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, any>[];
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  columnFilters?: ColumnFiltersState;
  onColumnFiltersChange?: OnChangeFn<ColumnFiltersState>;
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: OnChangeFn<VisibilityState>;
  globalFilter?: string;
  onGlobalFilterChange?: OnChangeFn<string>;
  onRowClick?: (row: TData) => void;
  /** Called when a cell edit is committed. rowId is the row's id, columnId the accessor key. */
  onCellEdit?: (rowId: string, columnId: string, value: unknown) => void;
  /** Column IDs (accessor keys) that support inline editing. */
  editableColumns?: string[];
  /** Extract a unique ID from each row for editing. Defaults to row index. */
  getRowId?: (row: TData) => string;
  /** Returns extra class name(s) for a cell, keyed by row ID and column ID (e.g. stage-gate validation). */
  cellClassName?: (rowId: string, columnId: string) => string | undefined;
}

interface ActiveCell {
  rowIndex: number;
  columnIndex: number;
}

export function DataTable<TData>({
  data,
  columns,
  sorting = [],
  onSortingChange,
  columnFilters = [],
  onColumnFiltersChange,
  columnVisibility = {},
  onColumnVisibilityChange,
  globalFilter = "",
  onGlobalFilterChange,
  onRowClick,
  onCellEdit,
  editableColumns,
  getRowId,
  cellClassName,
}: DataTableProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    ...(getRowId ? { getRowId } : {}),
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
    onSortingChange,
    onColumnFiltersChange,
    onColumnVisibilityChange,
    onGlobalFilterChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    columnResizeMode: "onChange",
  });

  const { rows } = table.getRowModel();
  const visibleColumnCount = table.getVisibleFlatColumns().length;

  const parentRef = React.useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 20,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();

  const paddingTop =
    virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? rowVirtualizer.getTotalSize() -
        virtualRows[virtualRows.length - 1].end
      : 0;

  // --- Active cell state ---
  const [activeCell, setActiveCell] = React.useState<ActiveCell | null>(null);

  // Clamp or reset active cell when data or visible columns change
  React.useEffect(() => {
    if (!activeCell) return;
    if (rows.length === 0 || visibleColumnCount === 0) {
      setActiveCell(null);
      return;
    }
    const clampedRow = Math.min(activeCell.rowIndex, rows.length - 1);
    const clampedCol = Math.min(activeCell.columnIndex, visibleColumnCount - 1);
    if (clampedRow !== activeCell.rowIndex || clampedCol !== activeCell.columnIndex) {
      setActiveCell({ rowIndex: clampedRow, columnIndex: clampedCol });
    }
  }, [rows.length, visibleColumnCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ref for the active cell's <td>, used to focus it after navigation
  const activeCellTdRef = React.useRef<HTMLTableCellElement>(null);

  // --- Editing state ---
  const [editingCell, setEditingCell] = React.useState<{
    rowId: string;
    columnId: string;
  } | null>(null);

  const editableSet = React.useMemo(
    () => new Set(editableColumns ?? []),
    [editableColumns]
  );

  // Helper: get column ID from column index
  const getColumnId = React.useCallback(
    (colIndex: number): string | undefined => {
      const cols = table.getVisibleFlatColumns();
      return cols[colIndex]?.id;
    },
    [table]
  );

  const handleStartEdit = React.useCallback(
    (rowId: string, columnId: string) => {
      if (editableSet.has(columnId)) {
        setEditingCell({ rowId, columnId });
      }
    },
    [editableSet]
  );

  // Helper to advance active cell after commit
  const advanceActiveCell = React.useCallback(
    (reason: CommitReason | undefined) => {
      if (!activeCell) return;
      if (reason === "enter") {
        // Move down
        const nextRow = Math.min(activeCell.rowIndex + 1, rows.length - 1);
        setActiveCell({ rowIndex: nextRow, columnIndex: activeCell.columnIndex });
      } else if (reason === "tab") {
        // Move right, wrap to next row
        let nextCol = activeCell.columnIndex + 1;
        let nextRow = activeCell.rowIndex;
        if (nextCol >= visibleColumnCount) {
          nextCol = 0;
          nextRow = Math.min(nextRow + 1, rows.length - 1);
        }
        setActiveCell({ rowIndex: nextRow, columnIndex: nextCol });
      }
      // "blur" — don't move
    },
    [activeCell, rows.length, visibleColumnCount]
  );

  const handleCommit = React.useCallback(
    (rowId: string, columnId: string, value: unknown, reason?: CommitReason) => {
      setEditingCell(null);
      onCellEdit?.(rowId, columnId, value);
      advanceActiveCell(reason);
    },
    [onCellEdit, advanceActiveCell]
  );

  const handleCancel = React.useCallback(() => {
    setEditingCell(null);
  }, []);

  const handleCellClick = React.useCallback(
    (rowIndex: number, columnIndex: number) => {
      setActiveCell({ rowIndex, columnIndex });
    },
    []
  );

  // Scroll into view and focus when active cell changes
  React.useEffect(() => {
    if (activeCell == null) return;
    rowVirtualizer.scrollToIndex(activeCell.rowIndex, { align: "auto" });
  }, [activeCell, rowVirtualizer]);

  // Focus the active cell's <td> after render
  React.useEffect(() => {
    if (activeCell == null) return;
    // Use requestAnimationFrame to ensure DOM has updated after virtualization scroll
    const raf = requestAnimationFrame(() => {
      const td = activeCellTdRef.current;
      if (td && document.activeElement !== td) {
        // Don't steal focus from an editor input inside the td
        const activeEl = document.activeElement;
        if (!activeEl || !td.contains(activeEl)) {
          td.focus({ preventScroll: true });
        }
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [activeCell]);

  // --- Keyboard navigation ---
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      // If we're editing, let the editor handle keys
      if (editingCell) return;

      const { key, shiftKey } = e;

      // If no active cell, set one on first navigation key
      if (!activeCell) {
        if (
          rows.length > 0 &&
          visibleColumnCount > 0 &&
          (key === "ArrowUp" ||
            key === "ArrowDown" ||
            key === "ArrowLeft" ||
            key === "ArrowRight" ||
            key === "Tab" ||
            key === "Enter")
        ) {
          e.preventDefault();
          setActiveCell({ rowIndex: 0, columnIndex: 0 });
        }
        return;
      }

      const { rowIndex, columnIndex } = activeCell;
      const maxRow = rows.length - 1;
      const maxCol = visibleColumnCount - 1;

      switch (key) {
        case "ArrowUp":
          e.preventDefault();
          if (rowIndex > 0) {
            setActiveCell({ rowIndex: rowIndex - 1, columnIndex });
          }
          break;

        case "ArrowDown":
          e.preventDefault();
          if (rowIndex < maxRow) {
            setActiveCell({ rowIndex: rowIndex + 1, columnIndex });
          }
          break;

        case "ArrowLeft":
          e.preventDefault();
          if (columnIndex > 0) {
            setActiveCell({ rowIndex, columnIndex: columnIndex - 1 });
          }
          break;

        case "ArrowRight":
          e.preventDefault();
          if (columnIndex < maxCol) {
            setActiveCell({ rowIndex, columnIndex: columnIndex + 1 });
          }
          break;

        case "Tab":
          e.preventDefault();
          if (shiftKey) {
            // Move left, wrap to previous row
            let nextCol = columnIndex - 1;
            let nextRow = rowIndex;
            if (nextCol < 0) {
              nextCol = maxCol;
              nextRow = Math.max(nextRow - 1, 0);
            }
            setActiveCell({ rowIndex: nextRow, columnIndex: nextCol });
          } else {
            // Move right, wrap to next row
            let nextCol = columnIndex + 1;
            let nextRow = rowIndex;
            if (nextCol > maxCol) {
              nextCol = 0;
              nextRow = Math.min(nextRow + 1, maxRow);
            }
            setActiveCell({ rowIndex: nextRow, columnIndex: nextCol });
          }
          break;

        case "Enter": {
          e.preventDefault();
          const row = rows[rowIndex];
          const colId = getColumnId(columnIndex);
          if (row && colId && editableSet.has(colId)) {
            handleStartEdit(row.id, colId);
          }
          break;
        }

        case "F2": {
          e.preventDefault();
          const row = rows[rowIndex];
          const colId = getColumnId(columnIndex);
          if (row && colId && editableSet.has(colId)) {
            handleStartEdit(row.id, colId);
          }
          break;
        }

        case "Escape":
          e.preventDefault();
          setActiveCell(null);
          break;
      }
    },
    [editingCell, activeCell, rows, visibleColumnCount, getColumnId, editableSet, handleStartEdit]
  );

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-md border border-border">
      <div
        ref={parentRef}
        className="flex-1 overflow-auto outline-none"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <table
          className="w-full border-collapse"
          style={{ width: table.getCenterTotalSize() }}
        >
          <thead className="sticky top-0 z-10 bg-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <DataTableHeader key={headerGroup.id} headerGroup={headerGroup} />
            ))}
          </thead>
          <tbody>
            {paddingTop > 0 && (
              <tr>
                <td style={{ height: `${paddingTop}px` }} />
              </tr>
            )}
            {virtualRows.map((virtualRow) => {
              const row = rows[virtualRow.index];
              const rowIdx = virtualRow.index;
              return (
                <DataTableRow
                  key={row.id}
                  row={row}
                  rowIndex={rowIdx}
                  onClick={
                    onRowClick
                      ? () => onRowClick(row.original)
                      : undefined
                  }
                  editingColumnId={
                    editingCell?.rowId === row.id
                      ? editingCell.columnId
                      : null
                  }
                  editableColumns={editableSet}
                  onStartEdit={(columnId) =>
                    handleStartEdit(row.id, columnId)
                  }
                  onCommit={(columnId, value, reason) =>
                    handleCommit(row.id, columnId, value, reason)
                  }
                  onCancel={handleCancel}
                  activeColumnIndex={
                    activeCell?.rowIndex === rowIdx
                      ? activeCell.columnIndex
                      : null
                  }
                  onCellClick={handleCellClick}
                  activeCellRef={
                    activeCell?.rowIndex === rowIdx
                      ? activeCellTdRef
                      : undefined
                  }
                  cellClassName={cellClassName}
                />
              );
            })}
            {paddingBottom > 0 && (
              <tr>
                <td style={{ height: `${paddingBottom}px` }} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
        <span>
          {rows.length} {rows.length === 1 ? "row" : "rows"}
        </span>
      </div>
    </div>
  );
}
