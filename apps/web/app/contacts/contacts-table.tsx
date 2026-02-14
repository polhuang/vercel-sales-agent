"use client";

import * as React from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { DataTable } from "@sales-agent/ui/components/data-table/data-table";
import { DataTableToolbar } from "@sales-agent/ui/components/data-table/data-table-toolbar";
import { useTableStore } from "@sales-agent/ui/stores/table-store";
import { useUIStore } from "@sales-agent/ui/stores/ui-store";
import type { Contact } from "@sales-agent/db/schema";
import { Button } from "@sales-agent/ui/components/primitives/button";
import { Plus } from "lucide-react";
import { updateRecord } from "../actions/records";
import { RecordDetailPanel } from "../components/record-detail-panel";
import { CreateRecordDialog } from "../components/create-record-dialog";
import type { ColumnInfo } from "@sales-agent/ui/components/data-table/column-visibility-dropdown";

const columnHelper = createColumnHelper<Contact>();

const ROLE_OPTIONS = [
  "Champion",
  "Economic Buyer",
  "Technical Evaluator",
  "End User",
  "Executive Sponsor",
  "Influencer",
  "Blocker",
];

const columns = [
  columnHelper.accessor("firstName", {
    header: "First Name",
    size: 150,
    meta: { editorType: "text" },
  }),
  columnHelper.accessor("lastName", {
    header: "Last Name",
    size: 150,
    meta: { editorType: "text" },
  }),
  columnHelper.accessor("email", {
    header: "Email",
    size: 250,
    meta: { editorType: "text" },
  }),
  columnHelper.accessor("phone", {
    header: "Phone",
    size: 140,
    meta: { editorType: "text" },
  }),
  columnHelper.accessor("title", {
    header: "Title",
    size: 200,
    meta: { editorType: "text" },
  }),
  columnHelper.accessor("department", {
    header: "Department",
    size: 150,
    meta: { editorType: "text" },
  }),
  columnHelper.accessor("role", {
    header: "Role",
    size: 120,
    meta: { editorType: "select", options: ROLE_OPTIONS },
  }),
];

const COLUMN_INFO: ColumnInfo[] = [
  { id: "firstName", label: "First Name" },
  { id: "lastName", label: "Last Name" },
  { id: "email", label: "Email" },
  { id: "phone", label: "Phone" },
  { id: "title", label: "Title" },
  { id: "department", label: "Department" },
  { id: "role", label: "Role" },
];

const EDITABLE_COLUMNS = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "title",
  "department",
  "role",
];

const CREATE_FIELDS = [
  { key: "firstName", label: "First Name", placeholder: "First name" },
  { key: "lastName", label: "Last Name", required: true, placeholder: "Last name" },
  { key: "email", label: "Email", placeholder: "email@example.com" },
  { key: "phone", label: "Phone", placeholder: "+1..." },
  { key: "title", label: "Title", placeholder: "e.g. VP Engineering" },
  {
    key: "role",
    label: "Role",
    type: "select" as const,
    options: ROLE_OPTIONS,
  },
];

interface ContactsTableProps {
  data: Contact[];
}

export function ContactsTable({ data }: ContactsTableProps) {
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
    (row: Contact) => {
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
        await updateRecord("contact", rowId, columnId, value);
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
        title="Contacts"
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
        entityType="contact"
        recordId={detailPanelRecordId}
        open={detailPanelOpen}
        onClose={closeDetailPanel}
      />
      <CreateRecordDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        entityType="contact"
        title="New Contact"
        fields={CREATE_FIELDS}
      />
    </div>
  );
}
