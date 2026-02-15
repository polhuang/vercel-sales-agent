"use client";

import * as React from "react";
import {
  Plus,
  Search,
  Pin,
  PinOff,
  Trash2,
  Target,
  Building2,
  Users,
  X,
  StickyNote,
} from "lucide-react";
import { Button } from "@sales-agent/ui/components/primitives/button";
import { Input } from "@sales-agent/ui/components/primitives/input";
import { Badge } from "@sales-agent/ui/components/primitives/badge";
import { NoteEditor } from "@sales-agent/ui/components/note-editor/note-editor";
import { cn } from "@sales-agent/ui/lib/utils";
import type { Note } from "@sales-agent/db/schema";
import {
  createNote,
  saveNoteContent,
  updateNoteTitle,
  toggleNotePin,
  linkNote,
  deleteNote,
} from "../actions/notes";
import { ExtractionPanel } from "./extraction-panel";

interface LinkableEntities {
  opportunities: { id: string; name: string }[];
  accounts: { id: string; name: string }[];
  contacts: { id: string; name: string }[];
}

interface NotesViewProps {
  initialNotes: Note[];
  linkableEntities: LinkableEntities;
}

export function NotesView({ initialNotes, linkableEntities }: NotesViewProps) {
  const [notes, setNotes] = React.useState(initialNotes);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<"all" | "pinned">("all");
  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout>>(undefined);

  React.useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);

  const selectedNote = notes.find((n) => n.id === selectedId) ?? null;

  const filteredNotes = React.useMemo(() => {
    let result = notes;
    if (filter === "pinned") {
      result = result.filter((n) => n.isPinned);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          (n.content ?? "").toLowerCase().includes(q)
      );
    }
    return [...result].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }, [notes, filter, search]);

  const handleCreate = async () => {
    const { id } = await createNote({ title: "Untitled Note" });
    const newNote: Note = {
      id,
      title: "Untitled Note",
      content: "",
      opportunityId: null,
      accountId: null,
      contactId: null,
      extractedFields: null,
      extractionStatus: "pending",
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setNotes((prev) => [newNote, ...prev]);
    setSelectedId(id);
  };

  const handleContentChange = (html: string) => {
    if (!selectedId) return;
    setNotes((prev) =>
      prev.map((n) =>
        n.id === selectedId
          ? { ...n, content: html, updatedAt: new Date().toISOString() }
          : n
      )
    );
    clearTimeout(saveTimerRef.current);
    const noteId = selectedId;
    saveTimerRef.current = setTimeout(() => {
      saveNoteContent(noteId, html);
    }, 800);
  };

  const handleTitleChange = (title: string) => {
    if (!selectedId) return;
    setNotes((prev) =>
      prev.map((n) => (n.id === selectedId ? { ...n, title } : n))
    );
    clearTimeout(saveTimerRef.current);
    const noteId = selectedId;
    saveTimerRef.current = setTimeout(() => {
      updateNoteTitle(noteId, title);
    }, 500);
  };

  const handleTogglePin = async () => {
    if (!selectedId) return;
    setNotes((prev) =>
      prev.map((n) =>
        n.id === selectedId ? { ...n, isPinned: !n.isPinned } : n
      )
    );
    await toggleNotePin(selectedId);
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    const idToDelete = selectedId;
    setNotes((prev) => prev.filter((n) => n.id !== idToDelete));
    setSelectedId(null);
    await deleteNote(idToDelete);
  };

  const handleLink = async (
    field: "opportunityId" | "accountId" | "contactId",
    entityId: string | null
  ) => {
    if (!selectedId) return;
    setNotes((prev) =>
      prev.map((n) =>
        n.id === selectedId ? { ...n, [field]: entityId } : n
      )
    );
    await linkNote(selectedId, field, entityId);
  };

  const getEntityNames = (note: Note) => {
    const names: string[] = [];
    if (note.opportunityId) {
      const opp = linkableEntities.opportunities.find(
        (o) => o.id === note.opportunityId
      );
      if (opp) names.push(opp.name);
    }
    if (note.accountId) {
      const acc = linkableEntities.accounts.find(
        (a) => a.id === note.accountId
      );
      if (acc) names.push(acc.name);
    }
    if (note.contactId) {
      const con = linkableEntities.contacts.find(
        (c) => c.id === note.contactId
      );
      if (con) names.push(con.name);
    }
    return names;
  };

  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, "").trim();

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    if (diff < 60_000) return "Just now";
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="flex h-[calc(100vh-3rem)]">
      {/* Notes list */}
      <div className="flex w-72 shrink-0 flex-col border-r border-border">
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold">Notes</h1>
            <span className="text-xs text-muted-foreground">
              {notes.length}
            </span>
          </div>
          <Button size="sm" variant="ghost" onClick={handleCreate}>
            <Plus size={14} />
          </Button>
        </div>

        <div className="px-3 py-2">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes..."
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        <div className="flex gap-1 px-3 pb-2">
          <button
            onClick={() => setFilter("all")}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs transition-colors",
              filter === "all"
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            All
          </button>
          <button
            onClick={() => setFilter("pinned")}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs transition-colors",
              filter === "pinned"
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Pinned
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredNotes.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-muted-foreground">
              {search ? "No matching notes" : "No notes yet"}
            </div>
          ) : (
            filteredNotes.map((note) => (
              <button
                key={note.id}
                onClick={() => setSelectedId(note.id)}
                className={cn(
                  "flex w-full flex-col gap-1 border-b border-border px-3 py-2.5 text-left transition-colors",
                  selectedId === note.id ? "bg-muted" : "hover:bg-muted/50"
                )}
              >
                <div className="flex items-center gap-1.5">
                  {note.isPinned && (
                    <Pin
                      size={10}
                      className="shrink-0 text-muted-foreground"
                    />
                  )}
                  <span className="truncate text-xs font-medium">
                    {note.title || "Untitled"}
                  </span>
                </div>
                {note.content && stripHtml(note.content) && (
                  <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                    {stripHtml(note.content).slice(0, 120)}
                  </p>
                )}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground">
                    {formatDate(note.updatedAt)}
                  </span>
                  {getEntityNames(note).map((name) => (
                    <Badge
                      key={name}
                      variant="secondary"
                      className="px-1.5 py-0 text-[10px]"
                    >
                      {name}
                    </Badge>
                  ))}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex flex-1 flex-col min-w-0">
        {selectedNote ? (
          <>
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
              <input
                type="text"
                value={selectedNote.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="flex-1 bg-transparent text-base font-semibold outline-none placeholder:text-muted-foreground"
                placeholder="Note title..."
              />
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleTogglePin}
                  title={selectedNote.isPinned ? "Unpin" : "Pin"}
                >
                  {selectedNote.isPinned ? (
                    <PinOff size={14} />
                  ) : (
                    <Pin size={14} />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDelete}
                  className="text-destructive hover:text-destructive"
                  title="Delete note"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
              <EntityLink
                icon={Target}
                label="Opportunity"
                value={selectedNote.opportunityId}
                options={linkableEntities.opportunities}
                onChange={(id) => handleLink("opportunityId", id)}
              />
              <EntityLink
                icon={Building2}
                label="Account"
                value={selectedNote.accountId}
                options={linkableEntities.accounts}
                onChange={(id) => handleLink("accountId", id)}
              />
              <EntityLink
                icon={Users}
                label="Contact"
                value={selectedNote.contactId}
                options={linkableEntities.contacts}
                onChange={(id) => handleLink("contactId", id)}
              />
            </div>

            <ExtractionPanel key={`ext-${selectedNote.id}`} note={selectedNote} />

            <div className="flex-1 overflow-hidden">
              <NoteEditor
                key={selectedNote.id}
                content={selectedNote.content ?? ""}
                onUpdate={handleContentChange}
                placeholder="Start writing your note..."
                className="h-full"
              />
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
            <StickyNote size={40} />
            <p className="text-sm">Select a note or create a new one</p>
            <Button size="sm" onClick={handleCreate}>
              <Plus size={14} className="mr-1.5" />
              New Note
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function EntityLink({
  icon: Icon,
  label,
  value,
  options,
  onChange,
}: {
  icon: React.ComponentType<{ size: number; className?: string }>;
  label: string;
  value: string | null;
  options: { id: string; name: string }[];
  onChange: (id: string | null) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.id === value);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (selected) {
    return (
      <Badge variant="secondary" className="gap-1 text-xs">
        <Icon size={10} />
        <span className="max-w-[120px] truncate">{selected.name}</span>
        <button
          onClick={() => onChange(null)}
          className="ml-0.5 rounded-sm hover:bg-muted"
        >
          <X size={10} />
        </button>
      </Badge>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 rounded-md border border-dashed border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
      >
        <Icon size={10} />
        {label}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-48 w-56 overflow-y-auto rounded-md border border-border bg-background shadow-lg">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              No {label.toLowerCase()}s found
            </div>
          ) : (
            options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  onChange(opt.id);
                  setOpen(false);
                }}
                className="flex w-full px-3 py-1.5 text-left text-xs transition-colors hover:bg-muted"
              >
                {opt.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
