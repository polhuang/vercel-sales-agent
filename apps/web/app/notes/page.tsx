import { getNotes, getLinkableEntities } from "../actions/notes";
import { NotesView } from "./notes-view";
import type { Note } from "@sales-agent/db/schema";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const [notesData, linkableEntities] = await Promise.all([
    getNotes(),
    getLinkableEntities(),
  ]);

  return (
    <NotesView
      initialNotes={notesData as Note[]}
      linkableEntities={linkableEntities}
    />
  );
}
