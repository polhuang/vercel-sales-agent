"use client";

import * as React from "react";
import type { Row } from "@tanstack/react-table";
import { cn } from "../../lib/utils";
import { DataTableCell } from "./data-table-cell";
import type { CommitReason } from "./cell-editors";

interface DataTableRowProps<TData> {
  row: Row<TData>;
  rowIndex: number;
  onClick?: () => void;
  editingColumnId: string | null;
  editableColumns: Set<string>;
  onStartEdit: (columnId: string) => void;
  onCommit: (columnId: string, value: unknown, reason?: CommitReason) => void;
  onCancel: () => void;
  /** The column index of the active cell in this row, or null if none */
  activeColumnIndex: number | null;
  /** Called when a cell is clicked */
  onCellClick: (rowIndex: number, columnIndex: number) => void;
  /** Ref callback for the active cell's <td> */
  activeCellRef?: React.Ref<HTMLTableCellElement>;
  /** Returns extra class name(s) for a specific cell, keyed by row ID and column ID */
  cellClassName?: (rowId: string, columnId: string) => string | undefined;
}

export function DataTableRow<TData>({
  row,
  rowIndex,
  onClick,
  editingColumnId,
  editableColumns,
  onStartEdit,
  onCommit,
  onCancel,
  activeColumnIndex,
  onCellClick,
  activeCellRef,
  cellClassName,
}: DataTableRowProps<TData>) {
  const visibleCells = row.getVisibleCells();

  return (
    <tr
      className={cn(
        "border-b border-border transition-colors hover:bg-muted/50",
        onClick && "cursor-pointer"
      )}
      style={{ height: 36 }}
      onClick={onClick}
    >
      {visibleCells.map((cell, colIndex) => (
        <DataTableCell
          key={cell.id}
          cell={cell}
          isEditing={editingColumnId === cell.column.id}
          isEditable={editableColumns.has(cell.column.id)}
          isActive={activeColumnIndex === colIndex}
          onStartEdit={() => onStartEdit(cell.column.id)}
          onCommit={(value, reason) => onCommit(cell.column.id, value, reason)}
          onCancel={onCancel}
          onCellClick={() => onCellClick(rowIndex, colIndex)}
          tdRef={activeColumnIndex === colIndex ? activeCellRef : undefined}
          extraClassName={cellClassName?.(row.id, cell.column.id)}
        />
      ))}
    </tr>
  );
}
