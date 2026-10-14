import type { NoteContent, Run } from "./types.ts";

export const emptyContent = (): NoteContent => ({ blocks: [{ id: "initial", type: "paragraph", runs: [{ text: "" }] }] });
export function plainText(content: NoteContent) {
  return content.blocks.filter(b => b.type !== "image").map(b => b.runs.map(r => r.text).join("")).join("\n");
}
// 500 Unicode code points are safely below the embedding model input limit,
// even when a character uses multiple UTF-8 bytes/tokens. Overlap preserves context.
export function splitText(text: string, size = 500, overlap = 64) {
  if (size <= 0 || overlap < 0 || overlap >= size) throw new Error("Neispravna veličina segmenta.");
  const chars = Array.from(text.trim());
  const chunks: string[] = [];
  for (let i = 0; i < chars.length; i += size - overlap) {
    chunks.push(chars.slice(i, i + size).join(""));
    if (i + size >= chars.length) break;
  }
  return chunks;
}
export function escapeHtml(text: string) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
export function runsToHtml(runs: Run[]) {
  return runs.map(run => {
    let html = escapeHtml(run.text).replaceAll("\n", "<br>");
    if (run.bold) html = `<strong>${html}</strong>`;
    if (run.italic) html = `<em>${html}</em>`;
    return html;
  }).join("");
}
export function readableError(code?: string) {
  if (code === "40001") return "Netko je promijenio bilješku. Kopirajte svoje izmjene i ponovno otvorite bilješku.";
  if (code === "42501") return "Nemate pravo za ovu radnju. Pristup je možda ukinut.";
  return "Radnja nije uspjela. Pokušajte ponovno.";
}
