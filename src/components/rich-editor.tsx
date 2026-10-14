"use client";
/* Native rich text editor. Persisted JSON contains text/marks, never arbitrary HTML. */
import { useEffect,useRef } from "react";
import { Bold,Italic,Plus,Trash2,GripVertical } from "lucide-react";
import type { Block,NoteContent,Run } from "@/lib/types";
import { runsToHtml } from "@/lib/content";
const styles={paragraph:"Tekst",heading:"Naslov",bullet:"Stavka popisa",quote:"Citat",image:"Slika"};
function domToRuns(element:HTMLElement):Run[] {
  const runs:Run[]=[];
  function visit(node:Node,bold=false,italic=false) {
    if(node.nodeType===Node.TEXT_NODE){runs.push({text:node.textContent||"",...(bold?{bold:true}:{}),...(italic?{italic:true}:{})});return;}
    if(!(node instanceof HTMLElement))return;
    const tag=node.tagName.toLowerCase();
    if(["script","style","iframe","svg","img"].includes(tag))return;
    if(tag==="br"){runs.push({text:"\n"});return;}
    const b=bold||tag==="b"||tag==="strong"||node.style.fontWeight==="bold"||Number(node.style.fontWeight)>=600;
    const i=italic||tag==="i"||tag==="em"||node.style.fontStyle==="italic";
    node.childNodes.forEach(child=>visit(child,b,i));
    if(tag==="div"&&node!==element)runs.push({text:"\n"});
  }
  element.childNodes.forEach(node=>visit(node));
  return runs.length?runs:[{text:""}];
}
function EditableBlock({block,onChange,editable}:{block:Block;onChange:(runs:Run[])=>void;editable:boolean}) {
  const ref=useRef<HTMLDivElement>(null);
  const initial=useRef(block.runs);
  useEffect(()=>{if(ref.current)ref.current.innerHTML=runsToHtml(initial.current);},[]);
  return <div ref={ref} className={`editor-text editor-${block.type}`} contentEditable={editable} suppressContentEditableWarning
    role={editable?"textbox":undefined} aria-label={styles[block.type]} aria-multiline={editable||undefined}
    data-placeholder={block.type==="heading"?"Naslov ideje…":"Zapiši što ti je na pameti…"}
    onInput={()=>{if(ref.current)onChange(domToRuns(ref.current));}}
    onPaste={event=>{event.preventDefault();document.execCommand("insertText",false,event.clipboardData.getData("text/plain"));}}
    onDrop={event=>event.preventDefault()}/>;
}
export function RichEditor({value,onChange,editable,onRemoveImage,disabled=false}:{value:NoteContent;onChange:(content:NoteContent)=>void;editable:boolean;onRemoveImage:(id:string)=>void;disabled?:boolean}) {
  function update(id:string,patch:Partial<Block>){onChange({blocks:value.blocks.map(b=>b.id===id?{...b,...patch}:b)});}
  function addBlock(){onChange({blocks:[...value.blocks,{id:crypto.randomUUID(),type:"paragraph",runs:[{text:""}]}]});}
  return <div className="rich-editor">{editable&&<div className="editor-toolbar"><button type="button" className="icon-button" title="Podebljano" aria-label="Podebljaj označeni tekst" onMouseDown={e=>e.preventDefault()} onClick={()=>document.execCommand("bold")}><Bold size={17}/></button><button type="button" className="icon-button" title="Kurziv" aria-label="Kurziv označenog teksta" onMouseDown={e=>e.preventDefault()} onClick={()=>document.execCommand("italic")}><Italic size={17}/></button><span className="toolbar-separator"/><span>Označi tekst za oblikovanje · odaberi vrstu odlomka</span></div>}
    <div className="editor-blocks">{value.blocks.map(block=><div className={`editor-block ${block.type==="image"?"editor-image-block":""}`} key={block.id}>
      {block.type==="image"?<figure><div className="note-image-wrapper">{/* Authenticated image proxy deliberately bypasses public Next image caches. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/slike/${block.imageId}`} alt={block.runs.map(r=>r.text).join("")||"Slika u bilješci"}/></div><figcaption>{block.runs.map(r=>r.text).join("")}</figcaption>{editable&&<button className="image-remove button button-secondary" disabled={disabled} onClick={()=>onRemoveImage(block.imageId!)}><Trash2 size={14}/>Ukloni sliku</button>}</figure>:
      <><div className="block-controls">{editable?<><GripVertical size={14}/><select aria-label="Vrsta odlomka" value={block.type} disabled={disabled} onChange={e=>update(block.id,{type:e.target.value as Block["type"]})}>{Object.entries(styles).filter(([key])=>key!=="image").map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></>:null}</div><div className="block-main">{block.type==="bullet"&&<span className="bullet-mark">•</span>}<EditableBlock block={block} editable={editable&&!disabled} onChange={runs=>update(block.id,{runs})}/></div>{editable&&<button className="icon-button block-delete" aria-label="Ukloni odlomak" title="Ukloni odlomak" disabled={disabled} onClick={()=>onChange({blocks:value.blocks.filter(b=>b.id!==block.id)})}><Trash2 size={14}/></button>}</>}
    </div>)}</div>{editable&&<button className="add-block" onClick={addBlock} disabled={disabled||value.blocks.length>=100}><Plus size={16}/>Dodaj odlomak</button>}
  </div>;
}
