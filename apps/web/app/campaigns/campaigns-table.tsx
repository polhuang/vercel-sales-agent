"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createColumnHelper } from "@tanstack/react-table";
import { DataTable } from "@sales-agent/ui/components/data-table/data-table";
import { DataTableToolbar } from "@sales-agent/ui/components/data-table/data-table-toolbar";
import { useTableStore } from "@sales-agent/ui/stores/table-store";
import { Badge } from "@sales-agent/ui/components/primitives/badge";
import { Button } from "@sales-agent/ui/components/primitives/button";
import { Input } from "@sales-agent/ui/components/primitives/input";
import { Dialog } from "@sales-agent/ui/components/primitives/dialog";
import { Plus } from "lucide-react";
import { createCampaign } from "../actions/campaigns";
import type { ColumnInfo } from "@sales-agent/ui/components/data-table/column-visibility-dropdown";

interface CampaignRow {
  id: string;
  name: string;
  status: string | null;
  description: string | null;
  stepCount: number;
  enrolledCount: number;
  openRate: number;
  replyRate: number;
  updatedAt: string;
}

const columnHelper = createColumnHelper<CampaignRow>();

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  active: "default",
  draft: "outline",
  paused: "secondary",
  completed: "secondary",
};

const columns = [
  columnHelper.accessor("name", {
    header: "Name",
    size: 280,
  }),
  columnHelper.accessor("status", {
    header: "Status",
    size: 100,
    cell: (info) => {
      const status = info.getValue();
      if (!status) return null;
      return (
        <Badge variant={STATUS_VARIANT[status] ?? "outline"}>
          {status}
        </Badge>
      );
    },
  }),
  columnHelper.accessor("stepCount", {
    header: "Steps",
    size: 80,
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("enrolledCount", {
    header: "Enrolled",
    size: 90,
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("openRate", {
    header: "Open Rate",
    size: 100,
    cell: (info) => {
      const val = info.getValue();
      return val > 0 ? `${val}%` : "—";
    },
  }),
  columnHelper.accessor("replyRate", {
    header: "Reply Rate",
    size: 100,
    cell: (info) => {
      const val = info.getValue();
      return val > 0 ? `${val}%` : "—";
    },
  }),
  columnHelper.accessor("updatedAt", {
    header: "Updated",
    size: 140,
    cell: (info) => {
      const val = info.getValue();
      if (!val) return null;
      return new Date(val).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    },
  }),
];

const COLUMN_INFO: ColumnInfo[] = [
  { id: "name", label: "Name" },
  { id: "status", label: "Status" },
  { id: "stepCount", label: "Steps" },
  { id: "enrolledCount", label: "Enrolled" },
  { id: "openRate", label: "Open Rate" },
  { id: "replyRate", label: "Reply Rate" },
  { id: "updatedAt", label: "Updated" },
];

interface CampaignsTableProps {
  data: CampaignRow[];
}

export function CampaignsTable({ data }: CampaignsTableProps) {
  const router = useRouter();
  const [localData, setLocalData] = React.useState(data);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [creating, setCreating] = React.useState(false);

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

  const handleRowClick = React.useCallback(
    (row: CampaignRow) => {
      router.push(`/campaigns/${row.id}`);
    },
    [router]
  );

  const handleCreate = React.useCallback(async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { id } = await createCampaign({ name: newName.trim() });
      setCreateOpen(false);
      setNewName("");
      router.push(`/campaigns/${id}`);
    } finally {
      setCreating(false);
    }
  }, [newName, router]);

  return (
    <div className="flex h-full flex-col">
      <DataTableToolbar
        title="Campaigns"
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
            New Campaign
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
          getRowId={(row) => row.id}
          onRowClick={handleRowClick}
        />
      </div>
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New Campaign"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCreate();
          }}
          className="space-y-4"
        >
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Campaign Name
            </label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Q1 Outbound Sequence"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!newName.trim() || creating}>
              {creating ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
