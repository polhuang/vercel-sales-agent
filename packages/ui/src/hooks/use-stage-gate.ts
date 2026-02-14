import { useMemo } from "react";

/**
 * Computes which cells should be highlighted for stage-gate validation.
 *
 * @param data - Array of opportunity-like records with `id` and `stage`.
 * @param getMissingFieldsFn - Function that returns missing field names for a given stage and record.
 * @returns A Map where keys are record IDs and values are Sets of field names that are missing.
 *          Only records with at least one missing field are included.
 */
export function useStageGate(
  data: Array<Record<string, unknown> & { id: string; stage: string | null }>,
  getMissingFieldsFn: (
    stage: string | null,
    record: Record<string, unknown>
  ) => string[]
): Map<string, Set<string>> {
  return useMemo(() => {
    const result = new Map<string, Set<string>>();

    for (const record of data) {
      const missing = getMissingFieldsFn(record.stage, record);
      if (missing.length > 0) {
        result.set(record.id, new Set(missing));
      }
    }

    return result;
  }, [data, getMissingFieldsFn]);
}
