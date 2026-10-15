"use client";
import { useEffect, useRef, useState, useImperativeHandle, type Ref } from "react";
import { Extension, Node, mergeAttributes, type Editor } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Plugin, TextSelection } from "@tiptap/pm/state";
import { Slice, Fragment } from "@tiptap/pm/model";
import { Bold, Italic, List, Quote, ImagePlus, Undo2, Redo2 } from "lucide-react";
import type { NoteContent, Run } from "@/lib/types";
import { toEditor, fromEditor } from "@/lib/editor-adapter";
import { contentSchema } from "@/lib/validation";

const NoteImage = Node.create({
  name: "noteImage", group: "block", atom: true, draggable: false,
  addAttributes: () => ({ blockId: { default: null }, imageId: { default: null }, runs: { default: [] } }),
  parseHTML: () => [],
  renderHTML({ node, HTMLAttributes }) {
    const caption = (node.attrs.runs as Run[]).map(r => r.text).join("");
    return ["figure", mergeAttributes(HTMLAttributes, { class: "document-image", contenteditable: "false" }),
      ["img", { src: `/api/slike/${node.attrs.imageId}`, alt: caption || "Slika u bilješci" }], ["figcaption", {}, caption]];
  },
});
export type EditorHandle = { rememberSelection: () => void; insertImage: (id: string, caption?: string) => boolean };
export function RichEditor({ value, onChange, editable, disabled = false, onAddImage, canAddImage = true, historyKey = 0, editorRef }: {
  value: NoteContent; onChange: (value: NoteContent) => void; editable: boolean; disabled?: boolean;
  onAddImage: () => void; canAddImage?: boolean; historyKey?: number; editorRef?: Ref<EditorHandle>;
}) {
  const [error, setError] = useState("");
  const [, redraw] = useState(0);
  const savedSelection = useRef<{ from: number; to: number } | null>(null);
  const current = useRef({ value, onChange });
  useEffect(() => { current.current = { value, onChange }; }, [value, onChange]);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({ heading: { levels: [2] }, code: false, codeBlock: false, horizontalRule: false,
      orderedList: false, strike: false, underline: false, link: false, trailingNode: false }), NoteImage,
      Extension.create({
        name: "persistedBlocks",
        addGlobalAttributes: () => [{ types: ["paragraph", "heading"], attributes: {
          blockId: { default: null, rendered: false }, originalRuns: { default: null, rendered: false },
        } }],
        addKeyboardShortcuts() { return { Tab: () => true, "Shift-Tab": () => true }; },
        addProseMirrorPlugins() { return [new Plugin({
          filterTransaction(tr) {
            if (!tr.docChanged) return true;
            let supported = true;
            tr.doc.descendants(node => {
              if (node.type.name === "listItem" && (node.childCount !== 1 || node.firstChild?.type.name !== "paragraph")) supported = false;
              if (node.type.name === "blockquote") node.forEach(child => { if (child.type.name !== "paragraph") supported = false; });
            });
            if (!supported) { setError("U popisu i citatu podržan je samo jednostavan tekst."); return false; }
            const valid = contentSchema.safeParse(fromEditor(tr.doc.toJSON())).success;
            if (!valid) setError("Izmjena nije prihvaćena: najviše 100 odlomaka, 300 tekstnih oznaka po odlomku i 100.000 znakova ukupno.");
            else setError("");
            return valid;
          },
          appendTransaction(transactions, _old, state) {
            if (!transactions.some(t => t.docChanged)) return null;
            const ids = new Set<string>();
            const tr = state.tr;
            state.doc.descendants((node, pos) => {
              if (!["paragraph", "heading", "noteImage"].includes(node.type.name)) return;
              let id = node.attrs.blockId;
              if (!id || ids.has(id)) { id = crypto.randomUUID(); tr.setNodeMarkup(pos, undefined, { ...node.attrs, blockId: id }); }
              ids.add(id);
            });
            return tr.docChanged ? tr : null;
          },
        })]; },
      })],
    content: toEditor(value), editable: editable && !disabled,
    editorProps: {
      attributes: { role: "textbox", "aria-label": "Sadržaj bilješke", "aria-multiline": "true" },
      handleDOMEvents: {
        // Chrome on Android skips Enter key handlers. Handle its native line-break
        // input so the trailing DOM break cannot become a second hardBreak.
        beforeinput(view, event) {
          const input = event as InputEvent;
          if (input.inputType !== "insertLineBreak" || input.isComposing || !view.editable) return false;
          event.preventDefault();
          view.dispatch(view.state.tr.replaceSelectionWith(view.state.schema.nodes.hardBreak.create(), true).scrollIntoView());
          return true;
        },
      },
      handleDrop: () => true,
      handlePaste(view, event) {
        event.preventDefault();
        const text = event.clipboardData?.getData("text/plain") ?? "";
        const paragraphs = text.replace(/\r\n?/g, "\n").split("\n").map(line => view.state.schema.nodes.paragraph.create(null, line ? view.state.schema.text(line) : undefined));
        view.dispatch(view.state.tr.replaceSelection(new Slice(Fragment.from(paragraphs), 1, 1)).scrollIntoView());
        return true;
      },
    },
    onUpdate: ({ editor }) => { current.current.onChange(fromEditor(editor.getJSON())); },
    onSelectionUpdate: ({ editor }) => { savedSelection.current = { from: editor.state.selection.from, to: editor.state.selection.to }; redraw(n => n + 1); },
    onTransaction: () => redraw(n => n + 1),
  }, [historyKey]);
  useEffect(() => { editor?.setEditable(editable && !disabled, false); }, [editor, editable, disabled]);
  useEffect(() => {
    if (editor && JSON.stringify(fromEditor(editor.getJSON())) !== JSON.stringify(value)) {
      editor.commands.setContent(toEditor(value), { emitUpdate: false });
    }
  }, [editor, value]);
  useImperativeHandle(editorRef, () => ({
    rememberSelection() { if (editor?.isFocused) savedSelection.current = { from: editor.state.selection.from, to: editor.state.selection.to }; },
    insertImage(id, caption = "") {
      if (!editor) return false;
      const selection = savedSelection.current;
      const position = selection ? Math.min(selection.from, editor.state.doc.content.size) : editor.state.doc.content.size;
      return editor.chain().focus().setTextSelection(TextSelection.near(editor.state.doc.resolve(position)).from)
        .insertContent({ type: "noteImage", attrs: { blockId: crypto.randomUUID(), imageId: id, runs: [{ text: caption }] } }).run();
    },
  }), [editor]);
  function tool(label: string, icon: React.ReactNode, action: (editor: Editor) => void, active = false, unavailable = false) {
    return <button type="button" className="icon-button" aria-label={label} title={label} aria-pressed={active} disabled={disabled || !editor || unavailable}
      onMouseDown={e => e.preventDefault()} onClick={() => editor && action(editor)}>{icon}</button>;
  }
  return <div className="rich-editor">
    {editable && <div className="editor-toolbar" role="toolbar" aria-label="Oblikovanje teksta">
      <select aria-label="Vrsta odlomka" disabled={disabled || !editor} value={editor?.isActive("heading") ? "heading" : "paragraph"} onChange={e => {
        if (!editor) return;
        const chain = editor.chain().focus();
        if (editor.isActive("bulletList")) chain.toggleBulletList();
        if (editor.isActive("blockquote")) chain.toggleBlockquote();
        if (e.target.value === "heading") chain.setHeading({ level: 2 }).run(); else chain.setParagraph().run();
      }}><option value="paragraph">Tekst</option><option value="heading">Naslov</option></select>
      {tool("Podebljaj označeni tekst", <Bold size={18}/>, e => e.chain().focus().toggleBold().run(), editor?.isActive("bold"))}
      {tool("Kurziv označenog teksta", <Italic size={18}/>, e => e.chain().focus().toggleItalic().run(), editor?.isActive("italic"))}
      {tool("Popis", <List size={18}/>, e => { const c=e.chain().focus(); if(e.isActive("blockquote"))c.toggleBlockquote(); c.toggleBulletList().run(); }, editor?.isActive("bulletList"))}
      {tool("Citat", <Quote size={18}/>, e => { const c=e.chain().focus(); if(e.isActive("bulletList"))c.toggleBulletList(); if(e.isActive("heading"))c.setParagraph(); c.toggleBlockquote().run(); }, editor?.isActive("blockquote"))}
      {tool("Dodaj sliku", <ImagePlus size={18}/>, () => onAddImage(), false, !canAddImage)}
      <span className="toolbar-separator"/>
      {tool("Poništi", <Undo2 size={18}/>, e => e.chain().focus().undo().run(), false, !editor?.can().undo())}
      {tool("Ponovi", <Redo2 size={18}/>, e => e.chain().focus().redo().run(), false, !editor?.can().redo())}
    </div>}
    {error && <div className="alert" role="alert">{error}</div>}
    <EditorContent editor={editor}/>
  </div>;
}
