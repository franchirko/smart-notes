import type { Block, NoteContent, Run } from "./types.ts";

// Kept independent of the editor runtime so persisted documents can be tested in Node.
export type EditorNode = { type: string; attrs?: Record<string, unknown>; content?: EditorNode[]; text?: string; marks?: { type: string }[] };
function inline(runs: Run[]): EditorNode[] {
  return runs.flatMap(run => {
    const marks = [...(run.bold ? [{ type: "bold" }] : []), ...(run.italic ? [{ type: "italic" }] : [])];
    return run.text.split("\n").flatMap((text, i) => [
      ...(i ? [{ type: "hardBreak", marks }] : []),
      ...(text ? [{ type: "text", text, marks }] : []),
    ]);
  });
}
export function toEditor(content: NoteContent): EditorNode {
  const nodes: EditorNode[] = [];
  for (const block of content.blocks) {
    const paragraph: EditorNode = { type: block.type === "heading" ? "heading" : "paragraph", attrs: { blockId: block.id, originalRuns: block.runs, ...(block.type === "heading" ? { level: 2 } : {}) }, content: inline(block.runs) };
    if (block.type === "image") nodes.push({ type: "noteImage", attrs: { blockId: block.id, imageId: block.imageId, runs: block.runs } });
    else if (block.type === "quote") nodes.push({ type: "blockquote", content: [paragraph] });
    else if (block.type === "bullet") {
      const item = { type: "listItem", content: [paragraph] };
      if (nodes.at(-1)?.type === "bulletList") nodes.at(-1)!.content!.push(item);
      else nodes.push({ type: "bulletList", content: [item] });
    } else nodes.push(paragraph);
  }
  return { type: "doc", content: nodes.length ? nodes : [{ type: "paragraph", content: [] }] };
}
function readRuns(node: EditorNode): Run[] {
  const runs: Run[] = [];
  for (const child of node.content ?? []) {
    const text = child.type === "hardBreak" ? "\n" : child.text ?? "";
    const bold = child.marks?.some(m => m.type === "bold");
    const italic = child.marks?.some(m => m.type === "italic");
    const last = runs.at(-1);
    if (last && !!last.bold === !!bold && !!last.italic === !!italic) last.text += text;
    else runs.push({ text, ...(bold ? { bold: true } : {}), ...(italic ? { italic: true } : {}) });
  }
  const original = node.attrs?.originalRuns as Run[] | undefined;
  // Preserve empty runs, explicit false marks and original run boundaries on unchanged blocks.
  if (original && JSON.stringify(readRuns({ type: "paragraph", content: inline(original) })) === JSON.stringify(runs.length ? runs : [{ text: "" }] )) return original;
  return runs.length ? runs : [{ text: "" }];
}
export function fromEditor(doc: EditorNode, createId = () => crypto.randomUUID()): NoteContent {
  const blocks: Block[] = [];
  const ids = new Set<string>();
  function visit(node: EditorNode, type?: "bullet" | "quote") {
    if (["paragraph", "heading", "noteImage"].includes(node.type)) {
      let id = node.attrs?.blockId as string | undefined;
      if (!id || ids.has(id)) id = createId();
      ids.add(id);
      blocks.push(node.type === "noteImage"
        ? { id, type: "image", imageId: node.attrs?.imageId as string, runs: node.attrs?.runs as Run[] ?? [] }
        : { id, type: type ?? (node.type === "heading" ? "heading" : "paragraph"), runs: readRuns(node) });
    } else for (const child of node.content ?? []) visit(child, node.type === "bulletList" ? "bullet" : node.type === "blockquote" ? "quote" : type);
  }
  visit(doc);
  return { blocks };
}
