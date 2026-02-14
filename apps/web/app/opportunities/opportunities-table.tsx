"use client";

import * as React from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { DataTable } from "@sales-agent/ui/components/data-table/data-table";
import { DataTableToolbar } from "@sales-agent/ui/components/data-table/data-table-toolbar";
import { useTableStore } from "@sales-agent/ui/stores/table-store";
import { useUIStore } from "@sales-agent/ui/stores/ui-store";
import { Badge } from "@sales-agent/ui/components/primitives/badge";
import type { Opportunity } from "@sales-agent/db/schema";
import { Button } from "@sales-agent/ui/components/primitives/button";
import { Plus } from "lucide-react";
import { updateRecord } from "../actions/records";
import { RecordDetailPanel } from "../components/record-detail-panel";
import { CreateRecordDialog } from "../components/create-record-dialog";
import { useStageGate } from "@sales-agent/ui/hooks/use-stage-gate";
import { getMissingFields } from "../../../../config/stage-gates";
import type { ColumnInfo } from "@sales-agent/ui/components/data-table/column-visibility-dropdown";

const columnHelper = createColumnHelper<Opportunity>();

const STAGE_OPTIONS = [
  "Discovery",
  "Qualification",
  "Technical Win",
  "Business Case",
  "Negotiation",
  "Closed Won",
  "Closed Lost",
];

const columns = [
  columnHelper.accessor("name", {
    header: "Name",
    size: 250,
    meta: { editorType: "text" },
  }),
  columnHelper.accessor("stage", {
    header: "Stage",
    size: 150,
    meta: { editorType: "select", options: STAGE_OPTIONS },
    cell: (info) => {
      const stage = info.getValue();
      if (!stage) return null;
      return <Badge variant="secondary">{stage}</Badge>;
    },
  }),
  columnHelper.accessor("amount", {
    header: "Amount",
    size: 120,
    meta: { editorType: "currency" },
    cell: (info) => {
      const val = info.getValue();
      if (val == null) return null;
      return `$${val.toLocaleString()}`;
    },
  }),
  columnHelper.accessor("closeDate", {
    header: "Close Date",
    size: 120,
    meta: { editorType: "date" },
  }),
  columnHelper.accessor("probability", {
    header: "Prob %",
    size: 80,
    meta: { editorType: "number" },
    cell: (info) => {
      const val = info.getValue();
      if (val == null) return null;
      return `${val}%`;
    },
  }),
  columnHelper.accessor("owner", {
    header: "Owner",
    size: 150,
    meta: { editorType: "text" },
  }),
  columnHelper.accessor("nextStep", {
    header: "Next Step",
    size: 200,
    meta: { editorType: "text" },
  }),
  columnHelper.accessor("syncStatus", {
    header: "Sync",
    size: 80,
    cell: (info) => {
      const status = info.getValue();
      if (!status) return null;
      const variant = status === "synced" ? "secondary" : "outline";
      return <Badge variant={variant}>{status}</Badge>;
    },
  }),
];

const COLUMN_INFO: ColumnInfo[] = [
  { id: "name", label: "Name" },
  { id: "stage", label: "Stage" },
  { id: "amount", label: "Amount" },
  { id: "closeDate", label: "Close Date" },
  { id: "probability", label: "Prob %" },
  { id: "owner", label: "Owner" },
  { id: "nextStep", label: "Next Step" },
  { id: "syncStatus", label: "Sync" },
];

const EDITABLE_COLUMNS = [
  "name",
  "stage",
  "amount",
  "closeDate",
  "probability",
  "owner",
  "nextStep",
];

interface OpportunitiesTableProps {
  data: Opportunity[];
}

const CREATE_FIELDS = [
  { key: "name", label: "Name", required: true, placeholder: "Opportunity name" },
  {
    key: "stage",
    label: "Stage",
    type: "select" as const,
    options: STAGE_OPTIONS,
  },
  { key: "amount", label: "Amount", type: "number" as const, placeholder: "0" },
  { key: "closeDate", label: "Close Date", placeholder: "YYYY-MM-DD" },
  { key: "owner", label: "Owner", placeholder: "Owner name" },
];

export function OpportunitiesTable({ data }: OpportunitiesTableProps) {
  const [localData, setLocalData] = React.useState(data);
  const [createOpen, setCreateOpen] = React.useState(false);

  // Sync with server data when it changes (e.g. after revalidation)
  React.useEffect(() => {
    setLocalData(data);
  }, [data]);

  const {
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
    columnVisibility,
    setColumnVisibility,
    globalFilter,
    setGlobalFilter,
  } = useTableStore();

  const { detailPanelOpen, detailPanelRecordId, openDetailPanel, closeDetailPanel } =
    useUIStore();

  // Stage-gate validation: compute missing fields per opportunity
  const stageGateMap = useStageGate(localData, getMissingFields);

  const cellClassName = React.useCallback(
    (rowId: string, columnId: string): string | undefined => {
      const missingFields = stageGateMap.get(rowId);
      if (missingFields?.has(columnId)) {
        return "border border-stage-gate-warning-border bg-stage-gate-warning";
      }
      return undefined;
    },
    [stageGateMap]
  );

  const handleRowClick = React.useCallback(
    (row: Opportunity) => {
      openDetailPanel(row.id);
    },
    [openDetailPanel]
  );

  const handleCellEdit = React.useCallback(
    async (rowId: string, columnId: string, value: unknown) => {
      // Optimistic update
      setLocalData((prev) =>
        prev.map((row) =>
          row.id === rowId
            ? { ...row, [columnId]: value }
            : row
        )
      );

      try {
        await updateRecord("opportunity", rowId, columnId, value);
      } catch (error) {
        console.error("Failed to update record:", error);
        // Revert on error
        setLocalData((prev) =>
          prev.map((row) => {
            if (row.id === rowId) {
              const original = data.find((d) => d.id === rowId);
              return original ?? row;
            }
            return row;
          })
        );
      }
    },
    [data]
  );

  return (
    <div className="flex h-full flex-col">
      <DataTableToolbar
        title="Opportunities"
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        columns={COLUMN_INFO}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={setColumnVisibility}
        columnFilters={columnFilters}
        onColumnFiltersChange={setColumnFilters}
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus size={14} className="mr-1.5" />
            New
          </Button>
        }
      />
      <div className="flex-1">
        <DataTable
          data={localData}
          columns={columns}
          sorting={sorting}
          onSortingChange={setSorting}
          columnFilters={columnFilters}
          onColumnFiltersChange={setColumnFilters}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
          globalFilter={globalFilter}
          onGlobalFilterChange={setGlobalFilter}
          onCellEdit={handleCellEdit}
          editableColumns={EDITABLE_COLUMNS}
          getRowId={(row) => row.id}
          onRowClick={handleRowClick}
          cellClassName={cellClassName}
        />
      </div>
      <RecordDetailPanel
        entityType="opportunity"
        recordId={detailPanelRecordId}
        open={detailPanelOpen}
        onClose={closeDetailPanel}
      />
      <CreateRecordDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        entityType="opportunity"
        title="New Opportunity"
        fields={CREATE_FIELDS}
      />
    </div>
  );
}
