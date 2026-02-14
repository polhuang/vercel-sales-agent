"use client";

import { flexRender, type HeaderGroup } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "../../lib/utils";

interface DataTableHeaderProps<TData> {
  headerGroup: HeaderGroup<TData>;
}

export function DataTableHeader<TData>({
  headerGroup,
}: DataTableHeaderProps<TData>) {
  return (
    <tr>
      {headerGroup.headers.map((header) => {
        const canSort = header.column.getCanSort();
        const sorted = header.column.getIsSorted();

        return (
          <th
            key={header.id}
            className={cn(
              "relative h-9 border-b border-r border-border px-2 text-left text-xs font-medium text-muted-foreground select-none",
              canSort && "cursor-pointer hover:bg-muted/80"
            )}
            style={{ width: header.getSize() }}
            onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
          >
            <div className="flex items-center gap-1">
              {header.isPlaceholder
                ? null
                : flexRender(
                    header.column.columnDef.header,
                    header.getContext()
                  )}
              {canSort && (
                <span className="ml-auto">
                  {sorted === "asc" ? (
                    <ArrowUp size={14} />
                  ) : sorted === "desc" ? (
                    <ArrowDown size={14} />
                  ) : (
                    <ArrowUpDown size={14} className="opacity-30" />
                  )}
                </span>
              )}
            </div>

            {/* Column resize handle */}
            <div
              onMouseDown={header.getResizeHandler()}
              onTouchStart={header.getResizeHandler()}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none",
                header.column.getIsResizing()
                  ? "bg-primary"
                  : "hover:bg-primary/50"
              )}
            />
          </th>
        );
      })}
    </tr>
  );
}
