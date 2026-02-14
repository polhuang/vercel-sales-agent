"use client";

import * as React from "react";
import { flexRender, type Cell } from "@tanstack/react-table";
import { cn } from "../../lib/utils";
import {
  TextEditor,
  NumberEditor,
  CurrencyEditor,
  DateEditor,
  SelectEditor,
  type CommitReason,
} from "./cell-editors";

interface DataTableCellProps<TData> {
  cell: Cell<TData, unknown>;
  isEditing: boolean;
  isEditable: boolean;
  isActive: boolean;
  onStartEdit: () => void;
  onCommit: (value: unknown, reason?: CommitReason) => void;
  onCancel: () => void;
  onCellClick: () => void;
  /** Ref forwarded so the parent can programmatically focus this cell */
  tdRef?: React.Ref<HTMLTableCellElement>;
  /** Additional class name(s) for this cell (e.g. stage-gate validation styling) */
  extraClassName?: string;
}

const editorMap = {
  text: TextEditor,
  number: NumberEditor,
  currency: CurrencyEditor,
  date: DateEditor,
  select: SelectEditor,
} as const;

export function DataTableCell<TData>({
  cell,
  isEditing,
  isEditable,
  isActive,
  onStartEdit,
  onCommit,
  onCancel,
  onCellClick,
  tdRef,
  extraClassName,
}: DataTableCellProps<TData>) {
  const meta = cell.column.columnDef.meta;
  const editorType = meta?.editorType;

  const handleDoubleClick = () => {
    if (isEditable && editorType) {
      onStartEdit();
    }
  };

  const handleMouseDown = () => {
    onCellClick();
  };

  if (isEditing && editorType) {
    const Editor = editorMap[editorType];
    return (
      <td
        ref={tdRef}
        className={cn(
          "h-9 border-r border-border p-0 text-sm",
          isActive && "ring-2 ring-ring ring-inset",
          extraClassName
        )}
        style={{ width: cell.column.getSize() }}
      >
        <Editor
          value={cell.getValue()}
          onCommit={onCommit}
          onCancel={onCancel}
          options={meta?.options}
        />
      </td>
    );
  }

  return (
    <td
      ref={tdRef}
      className={cn(
        "h-9 truncate border-r border-border px-2 text-sm",
        isEditable && editorType && "cursor-cell",
        isActive && "ring-2 ring-ring ring-inset",
        extraClassName
      )}
      style={{ width: cell.column.getSize() }}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
      tabIndex={isActive ? 0 : -1}
    >
      {flexRender(cell.column.columnDef.cell, cell.getContext())}
    </td>
  );
}
