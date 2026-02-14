"use client";

import * as React from "react";
import { DetailPanel } from "@sales-agent/ui/components/detail-panel/detail-panel";
import type { ChangeLogItem } from "@sales-agent/ui/components/detail-panel/detail-panel";
import { getRecord, getChangeLog, updateRecord } from "../actions/records";

type EntityType = "opportunity" | "account" | "contact" | "note";

interface RecordDetailPanelProps {
  entityType: EntityType;
  recordId: string | null;
  open: boolean;
  onClose: () => void;
}

export function RecordDetailPanel({
  entityType,
  recordId,
  open,
  onClose,
}: RecordDetailPanelProps) {
  const [record, setRecord] = React.useState<Record<string, unknown> | null>(
    null
  );
  const [changeLogEntries, setChangeLogEntries] = React.useState<
    ChangeLogItem[]
  >([]);
  const [loading, setLoading] = React.useState(false);

  // Fetch record + change log when the panel opens (or record changes)
  React.useEffect(() => {
    if (!open || !recordId) {
      setRecord(null);
      setChangeLogEntries([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    Promise.all([
      getRecord(entityType, recordId),
      getChangeLog(entityType, recordId),
    ])
      .then(([rec, log]) => {
        if (cancelled) return;
        setRecord(rec as Record<string, unknown> | null);
        setChangeLogEntries(log as ChangeLogItem[]);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to fetch record detail:", err);
        setRecord(null);
        setChangeLogEntries([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, recordId, entityType]);

  const handleFieldUpdate = React.useCallback(
    async (fieldName: string, newValue: unknown) => {
      if (!recordId) return;

      // Optimistic update in the panel
      setRecord((prev) =>
        prev ? { ...prev, [fieldName]: newValue } : prev
      );

      try {
        await updateRecord(entityType, recordId, fieldName, newValue);
        // Refetch change log to include the new entry
        const log = await getChangeLog(entityType, recordId);
        setChangeLogEntries(log as ChangeLogItem[]);
      } catch (err) {
        console.error("Failed to update field:", err);
        // Refetch the record to revert
        try {
          const rec = await getRecord(entityType, recordId);
          setRecord(rec as Record<string, unknown> | null);
        } catch {
          // Ignore secondary fetch error
        }
      }
    },
    [entityType, recordId]
  );

  return (
    <DetailPanel
      open={open}
      onClose={onClose}
      entityType={entityType}
      recordId={recordId ?? ""}
      record={record}
      changeLog={changeLogEntries}
      onFieldUpdate={handleFieldUpdate}
      loading={loading}
    />
  );
}
