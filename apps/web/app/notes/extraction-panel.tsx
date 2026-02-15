"use client";

import * as React from "react";
import { Sparkles, Check, X, Loader2 } from "lucide-react";
import { Button } from "@sales-agent/ui/components/primitives/button";
import { Badge } from "@sales-agent/ui/components/primitives/badge";
import type { Note } from "@sales-agent/db/schema";
import {
  extractFieldsFromNote,
  applyExtraction,
} from "../actions/extract";

interface ExtractionPanelProps {
  note: Note;
  onFieldApplied?: () => void;
}

interface Extraction {
  fieldName: string;
  suggestedValue: string;
  confidence: number;
  reasoning: string;
}

export function ExtractionPanel({ note, onFieldApplied }: ExtractionPanelProps) {
  const [loading, setLoading] = React.useState(false);
  const [extractions, setExtractions] = React.useState<Extraction[]>(
    (note.extractedFields as Extraction[] | null) ?? []
  );
  const [error, setError] = React.useState<string | null>(null);
  const [applying, setApplying] = React.useState<string | null>(null);

  // Sync when note changes
  React.useEffect(() => {
    setExtractions((note.extractedFields as Extraction[] | null) ?? []);
    setError(null);
  }, [note.id, note.extractedFields]);

  const canExtract = !!note.content && !!note.opportunityId;

  const handleExtract = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await extractFieldsFromNote(note.id);
      if (result.error) {
        setError(result.error);
      } else {
        setExtractions(result.extractions);
      }
    } catch {
      setError("Extraction failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (fieldName: string, value: string) => {
    setApplying(fieldName);
    try {
      await applyExtraction(note.id, fieldName, value);
      setExtractions((prev) => prev.filter((e) => e.fieldName !== fieldName));
      onFieldApplied?.();
    } catch {
      setError(`Failed to apply ${fieldName}`);
    } finally {
      setApplying(null);
    }
  };

  const handleDismiss = (fieldName: string) => {
    setExtractions((prev) => prev.filter((e) => e.fieldName !== fieldName));
  };

  if (!canExtract && extractions.length === 0) return null;

  return (
    <div className="border-b border-border">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles size={12} />
          <span>AI Field Extraction</span>
          {extractions.length > 0 && (
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
              {extractions.length}
            </Badge>
          )}
        </div>
        {canExtract && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleExtract}
            disabled={loading}
            className="h-7 text-xs"
          >
            {loading ? (
              <>
                <Loader2 size={12} className="mr-1.5 animate-spin" />
                Extracting...
              </>
            ) : (
              <>
                <Sparkles size={12} className="mr-1.5" />
                Extract Fields
              </>
            )}
          </Button>
        )}
      </div>

      {error && (
        <div className="px-4 pb-2">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {extractions.length > 0 && (
        <div className="space-y-1.5 px-4 pb-2">
          {extractions.map((ext) => (
            <div
              key={ext.fieldName}
              className="flex items-start gap-2 rounded-md border border-border bg-muted/30 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{ext.fieldName}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {Math.round(ext.confidence * 100)}%
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-foreground">
                  {ext.suggestedValue}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {ext.reasoning}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => handleAccept(ext.fieldName, ext.suggestedValue)}
                  disabled={applying === ext.fieldName}
                  className="rounded p-1 text-green-600 transition-colors hover:bg-green-50 disabled:opacity-50"
                  title="Accept"
                >
                  {applying === ext.fieldName ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                </button>
                <button
                  onClick={() => handleDismiss(ext.fieldName)}
                  className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted"
                  title="Dismiss"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
