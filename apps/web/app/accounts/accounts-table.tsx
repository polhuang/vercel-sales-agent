"use client";

import * as React from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { DataTable } from "@sales-agent/ui/components/data-table/data-table";
import { DataTableToolbar } from "@sales-agent/ui/components/data-table/data-table-toolbar";
import { useTableStore } from "@sales-agent/ui/stores/table-store";
import { useUIStore } from "@sales-agent/ui/stores/ui-store";
import type { Account } from "@sales-agent/db/schema";
import { Button } from "@sales-agent/ui/components/primitives/button";
import { Plus } from "lucide-react";
import { updateRecord } from "../actions/records";
import { RecordDetailPanel } from "../components/record-detail-panel";
import { CreateRecordDialog } from "../components/create-record-dialog";
import type { ColumnInfo } from "@sales-agent/ui/components/data-table/column-visibility-dropdown";

const columnHelper = createColumnHelper<Account>();

const columns = [
  columnHelper.accessor("name", {
    header: "Name",
    size: 250,
    meta: { editorType: "text" },
  }),
  columnHelper.accessor("industry", {
    header: "Industry",
    size: 150,
    meta: { editorType: "text" },
  }),
  columnHelper.accessor("website", {
    header: "Website",
    size: 200,
    meta: { editorType: "text" },
  }),
  columnHelper.accessor("employeeCount", {
    header: "Employees",
    size: 100,
    meta: { editorType: "number" },
    cell: (info) => {
      const val = info.getValue();
      if (val == null) return null;
      return val.toLocaleString();
    },
  }),
  columnHelper.accessor("annualRevenue", {
    header: "Revenue",
    size: 120,
    meta: { editorType: "currency" },
    cell: (info) => {
      const val = info.getValue();
      if (val == null) return null;
      return `$${val.toLocaleString()}`;
    },
  }),
  columnHelper.accessor("owner", {
    header: "Owner",
    size: 150,
    meta: { editorType: "text" },
  }),
  columnHelper.accessor("billingCity", {
    header: "City",
    size: 120,
    meta: { editorType: "text" },
  }),
  columnHelper.accessor("billingState", {
    header: "State",
    size: 80,
    meta: { editorType: "text" },
  }),
];

const COLUMN_INFO: ColumnInfo[] = [
  { id: "name", label: "Name" },
  { id: "industry", label: "Industry" },
  { id: "website", label: "Website" },
  { id: "employeeCount", label: "Employees" },
  { id: "annualRevenue", label: "Revenue" },
  { id: "owner", label: "Owner" },
  { id: "billingCity", label: "City" },
  { id: "billingState", label: "State" },
];

const EDITABLE_COLUMNS = [
  "name",
  "industry",
  "website",
  "employeeCount",
  "annualRevenue",
  "owner",
  "billingCity",
  "billingState",
];

const CREATE_FIELDS = [
  { key: "name", label: "Name", required: true, placeholder: "Account name" },
  { key: "industry", label: "Industry", placeholder: "e.g. Technology" },
  { key: "website", label: "Website", placeholder: "https://..." },
  { key: "owner", label: "Owner", placeholder: "Owner name" },
  { key: "billingCity", label: "City", placeholder: "City" },
  { key: "billingState", label: "State", placeholder: "State" },
];

interface AccountsTableProps {
  data: Account[];
}

export function AccountsTable({ data }: AccountsTableProps) {
  const [localData, setLocalData] = React.useState(data);
  const [createOpen, setCreateOpen] = React.useState(false);

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

  const handleRowClick = React.useCallback(
    (row: Account) => {
      openDetailPanel(row.id);
    },
    [openDetailPanel]
  );

  const handleCellEdit = React.useCallback(
    async (rowId: string, columnId: string, value: unknown) => {
      setLocalData((prev) =>
        prev.map((row) =>
          row.id === rowId
            ? { ...row, [columnId]: value }
            : row
        )
      );

      try {
        await updateRecord("account", rowId, columnId, value);
      } catch (error) {
        console.error("Failed to update record:", error);
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
        title="Accounts"
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
        />
      </div>
      <RecordDetailPanel
        entityType="account"
        recordId={detailPanelRecordId}
        open={detailPanelOpen}
        onClose={closeDetailPanel}
      />
      <CreateRecordDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        entityType="account"
        title="New Account"
        fields={CREATE_FIELDS}
      />
    </div>
  );
}
