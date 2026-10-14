export type Run = { text: string; bold?: boolean; italic?: boolean };
export type Block = { id: string; type: "paragraph" | "heading" | "bullet" | "quote" | "image"; runs: Run[]; imageId?: string };
export type NoteContent = { blocks: Block[] };
export type Note = {
  id: string; owner_id: string; title: string; content: NoteContent; plain_text: string;
  version: number; index_status: "pending" | "processing" | "ready" | "failed";
  indexed_version: number | null; index_error: string | null; created_at: string; updated_at: string;
};
export type NoteImage = { id: string; note_id: string; object_path: string; checksum: string; description: string | null };
export type Share = { user_id: string; email: string; permission: "read" | "edit" };
export type SearchResult = { note_id: string; title: string; snippet: string; source: "text" | "image"; score: number };
export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };
