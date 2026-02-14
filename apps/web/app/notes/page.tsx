import { StickyNote } from "lucide-react";

export default function NotesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Notes</h1>
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
        <StickyNote size={40} className="mb-3 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No notes yet. Notes will be available after Phase 4 implementation.
        </p>
      </div>
    </div>
  );
}
