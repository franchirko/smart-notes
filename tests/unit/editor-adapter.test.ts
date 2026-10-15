import { test } from "node:test";
import assert from "node:assert/strict";
import { toEditor, fromEditor } from "../../src/lib/editor-adapter.ts";
import type { NoteContent } from "../../src/lib/types.ts";

test("All persisted formats, IDs, empty runs, line breaks and image descriptions survive roundtrip", () => {
  const content: NoteContent = { blocks: [
    { id: "heading", type: "heading", runs: [{ text: "Naslov", bold: false }] },
    { id: "paragraph", type: "paragraph", runs: [{ text: "prvi\n", bold: true, italic: true }, { text: "drugi\n\ntreći", italic: true }, { text: "" }] },
    { id: "empty", type: "paragraph", runs: [{ text: "" }] },
    { id: "none", type: "paragraph", runs: [] },
    { id: "list-1", type: "bullet", runs: [{ text: "a" }] },
    { id: "list-2", type: "bullet", runs: [{ text: "b", bold: true }] },
    { id: "quote", type: "quote", runs: [{ text: "citat\nnovi red" }] },
    { id: "image", type: "image", imageId: "938e852e-8b05-4549-9355-49dfaa50fa7e", runs: [{ text: "Opis", italic: true }, { text: " slike" }] },
    { id: "last", type: "paragraph", runs: [{ text: "" }] },
  ] };
  assert.deepEqual(fromEditor(toEditor(content)), content);
});
test("Split and new paragraphs get unique identifiers while existing ones survive", () => {
  const node = toEditor({ blocks: [{ id: "existing", type: "paragraph", runs: [{ text: "tekst" }] }] });
  node.content!.push(structuredClone(node.content![0]), { type: "paragraph", content: [] });
  let serial = 0;
  const content = fromEditor(node, () => `new-${++serial}`);
  assert.deepEqual(content.blocks.map(b => b.id), ["existing", "new-1", "new-2"]);
});
test("Changed marks and hard breaks are serialized from edited text", () => {
  const doc = toEditor({ blocks: [{ id: "p", type: "paragraph", runs: [{ text: "old" }] }] });
  doc.content![0].content = [{ type: "text", text: "new", marks: [{ type: "bold" }] }, { type: "hardBreak" }, { type: "text", text: "line", marks: [{ type: "italic" }] }];
  assert.deepEqual(fromEditor(doc).blocks[0].runs, [{ text: "new", bold: true }, { text: "\n" }, { text: "line", italic: true }]);
});
