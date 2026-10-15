"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect,useRef,useState } from "react";
import { ArrowLeft,Save,Share2,Trash2,MoreHorizontal,Sparkles,Check,LoaderCircle,Lock,Users,RefreshCw } from "lucide-react";
import type { Note,NoteContent,NoteImage,Share } from "@/lib/types";
import { deleteNote,saveNote,shareNote,unshareNote,removeImage } from "@/app/actions/notes";
import { Button,Alert,Avatar } from "./ui";
import { RichEditor, type EditorHandle } from "./rich-editor";
import { Modal } from "./modal";

async function compressImage(file:File):Promise<Blob> {
  if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>5*1024*1024)throw new Error("Odaberite JPEG, PNG ili WebP sliku do 5 MB.");
  const bitmap=await createImageBitmap(file);
  const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  const context=canvas.getContext("2d");
  if(!context){bitmap.close();throw new Error("Preglednik ne podržava obradu slika.");}
  context.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/webp",0.82));
  if(!blob||blob.size>4*1024*1024)throw new Error("Slika je prevelika nakon kompresije.");
  return blob;
}
export function NoteWorkspace({initialNote,initialImages,initialShares,isOwner,canEdit}:{initialNote:Note;initialImages:NoteImage[];initialShares:Share[];isOwner:boolean;canEdit:boolean}) {
  const router=useRouter();
  const [note,setNote]=useState(initialNote);
  const [content,setContent]=useState<NoteContent>(initialNote.content);
  const [title,setTitle]=useState(initialNote.title);
  const [images,setImages]=useState(initialImages);
  const [shares,setShares]=useState(initialShares);
  const [dirty,setDirty]=useState(false);
  const [busy,setBusy]=useState(false);
  const [indexing,setIndexing]=useState(false);
  const [error,setError]=useState("");
  const [indexMessage,setIndexMessage]=useState("");
  const [showShare,setShowShare]=useState(false);
  const [showDelete,setShowDelete]=useState(false);
  const [shareEmail,setShareEmail]=useState("");
  const [permission,setPermission]=useState<"read"|"edit">("read");
  const [shareBusy,setShareBusy]=useState(false);
  const [shareError,setShareError]=useState("");
  const [shareMessage,setShareMessage]=useState("");
  const editorRef=useRef<EditorHandle>(null);
  const [historyKey,setHistoryKey]=useState(0);
  const fileRef=useRef<HTMLInputElement>(null);
  useEffect(()=>{
    function preventClose(event:BeforeUnloadEvent){if(dirty){event.preventDefault();event.returnValue="";}}
    window.addEventListener("beforeunload",preventClose);return()=>window.removeEventListener("beforeunload",preventClose);
  },[dirty]);
  async function index(id:string) {
    setIndexing(true);setIndexMessage("");
    try{
      const response=await fetch(`/api/biljeske/${id}/indeks`,{method:"POST"});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error);
      setNote(n=>({...n,index_status:"ready",indexed_version:data.version}));
      setIndexMessage("Bilješka je spremna za AI pretragu.");
    }catch(error){setIndexMessage(error instanceof Error?error.message:"AI obrada nije uspjela.");setNote(n=>({...n,index_status:"failed"}));}
    finally{setIndexing(false);}
  }
  async function persist():Promise<Note|null> {
    const result=await saveNote({id:note.id,title,content,version:note.version});
    if(!result.ok){setError(result.error);return null;}
    setNote(result.data);setTitle(result.data.title);setDirty(false);return result.data;
  }
  async function save() {
    setBusy(true);setError("");
    try{const saved=await persist();if(saved)await index(saved.id);}catch{setError("Spremanje nije uspjelo. Pokušajte ponovno.");}
    finally{setBusy(false);}
  }
  async function upload(file:File) {
    setBusy(true);setError("");
    try{
      if(images.length>=3)throw new Error("Najviše tri slike po bilješci.");
      const blob=await compressImage(file);
      const form=new FormData();form.append("file",blob,"slika.webp");
      const response=await fetch(`/api/biljeske/${note.id}/slike`,{method:"POST",body:form});
      const data=await response.json();if(!response.ok)throw new Error(data.error);
      setImages(current=>[...current,{id:data.id,note_id:note.id,object_path:`${note.id}/${data.id}.webp`,checksum:"",description:null}]);
      if(!editorRef.current?.insertImage(data.id,file.name.slice(0,120)))setError("Slika je učitana. Umetnite je iz dostupnih privitaka.");
    }catch(error){setError(error instanceof Error?error.message:"Upload nije uspio.");}
    finally{setBusy(false);if(fileRef.current)fileRef.current.value="";}
  }
  async function remove(id:string) {
    setBusy(true);setError("");
    try{
      const current=dirty?await persist():note;
      if(!current)return;
      const result=await removeImage(note.id,id,current.version);
      if(!result.ok){setError(result.error);return;}
      setHistoryKey(key=>key+1);setNote(result.data);setContent(result.data.content);setImages(current=>current.filter(image=>image.id!==id));setDirty(false);
      await index(note.id);
    }catch{setError("Slika nije uklonjena. Pokušajte ponovno.");}
    finally{setBusy(false);}
  }
  async function share(event:React.FormEvent){
    event.preventDefault();setShareBusy(true);setShareError("");setShareMessage("");
    try{const result=await shareNote(note.id,shareEmail,permission);if(!result.ok){setShareError(result.error);return;}setShares(result.data);setShareEmail("");setShareMessage("Pristup je spremljen.");}
    catch{setShareError("Dijeljenje nije uspjelo.");}finally{setShareBusy(false);}
  }
  async function revoke(userId:string){
    setShareBusy(true);setShareError("");setShareMessage("");
    try{const result=await unshareNote(note.id,userId);if(!result.ok){setShareError(result.error);return;}setShares(result.data);setShareMessage("Pristup je ukinut.");}
    catch{setShareError("Pristup nije ukinut.");}finally{setShareBusy(false);}
  }
  const unattached=images.filter(image=>!content.blocks.some(block=>block.imageId===image.id));
  return <div className="note-editor-page"><header className="app-topbar document-topbar"><Link href="/biljeske" onClick={e=>{if(dirty&&!window.confirm("Imaš nespremljene izmjene. Želiš li napustiti bilješku?"))e.preventDefault();}} className="back-link"><ArrowLeft size={16}/>Sve bilješke</Link><span className="topbar-private">{canEdit?<><span className="status-dot"/>{busy?"Spremanje…":dirty?"Nespremljene izmjene":"Spremljeno"}</>:<><Lock size={14}/>Samo čitanje</>}</span><div className="document-actions">{isOwner&&<Button variant="secondary" onClick={()=>setShowShare(true)}><Share2 size={16}/>Podijeli</Button>}{canEdit&&<Button disabled={busy||indexing||!dirty} onClick={save}>{busy?<LoaderCircle size={16} className="spin"/>:<Save size={16}/>}Spremi</Button>}{isOwner&&<details className="document-menu"><summary className="icon-button" aria-label="Više radnji"><MoreHorizontal size={20}/></summary><button disabled={busy||indexing} onClick={()=>setShowDelete(true)}><Trash2 size={16}/>Obriši bilješku</button></details>}</div></header>
    <main className="workspace document-workspace"><article className="note-document">
      {error&&<Alert>{error}</Alert>}{!canEdit&&<div className="read-only-banner"><Lock size={15}/>Ova bilješka podijeljena je s tobom za čitanje.</div>}
      <input className="note-title-input" value={title} onChange={e=>{setTitle(e.target.value);setDirty(true);}} disabled={!canEdit||busy||indexing} maxLength={120} aria-label="Naslov bilješke" placeholder="Naslov bilješke"/>
      <div className="note-meta"><span className="document-privacy">{isOwner&&shares.length===0?<><Lock size={14}/>Privatna bilješka</>:<><Users size={14}/>Podijeljena bilješka</>}</span><span>Izmijenjeno {new Date(note.updated_at).toLocaleString("hr-HR",{day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"})}</span>{shares.length>0&&<span><Users size={14}/>{shares.length} {shares.length===1?"pristup":"pristupa"}</span>}</div>
      <RichEditor editorRef={editorRef} historyKey={historyKey} onAddImage={()=>{editorRef.current?.rememberSelection();fileRef.current?.click();}} canAddImage={images.length<3} value={content} editable={canEdit} disabled={busy||indexing} onChange={value=>{setContent(value);setDirty(true);}}/>
      {canEdit&&<input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Odaberi sliku" onChange={e=>{const file=e.target.files?.[0];if(file)void upload(file);}}/>}
      {canEdit&&images.some(image=>!unattached.includes(image))&&<details className="document-attachments"><summary>Privici · {images.length}/3</summary>{images.filter(image=>!unattached.includes(image)).map(image=><div key={image.id}><span>Slika u dokumentu</span><button className="button button-secondary" disabled={busy||indexing} onClick={()=>remove(image.id)}><Trash2 size={16}/>Trajno obriši sliku</button></div>)}</details>}
      {canEdit&&unattached.length>0&&<div className="unattached-images"><p>Učitane slike koje još nisu u sadržaju:</p>{unattached.map(image=><div key={image.id}><Button variant="secondary" disabled={busy||indexing} onClick={()=>{editorRef.current?.insertImage(image.id);}}>Umetni spremljenu sliku</Button><button className="icon-button" aria-label="Obriši spremljenu sliku" disabled={busy||indexing} onClick={()=>remove(image.id)}><Trash2 size={16}/></button></div>)}</div>}
      </article><aside className="index-panel" aria-live="polite"><span className="feature-icon lavender">{indexing?<LoaderCircle size={20} className="spin"/>:<Sparkles size={20}/>}</span><div><strong>{indexing?"AI povezuje tvoje ideje…":note.index_status==="ready"&&!dirty?"Spremno za pretragu po značenju":"Sačuvaj ideju, pronađi je po značenju"}</strong><p>{indexMessage||note.index_error||(note.index_status==="failed"?"AI obrada nije uspjela. Pokušajte ponovno.":"")||"Pri spremanju AI obrađuje tekst i sadržaj slika. Bilješka ostaje spremljena i ako obrada ne uspije."}</p></div>{canEdit&&!dirty&&<Button variant="ghost" disabled={busy||indexing} onClick={()=>index(note.id)}>{note.index_status==="ready"?<Check size={16}/>:<RefreshCw size={16}/>}Obradi</Button>}</aside>
    </main>
    {showShare&&<Modal title="Podijeli ideju" onClose={()=>setShowShare(false)}><p className="modal-description">Unesi e-mail korisnika koji već ima Smart Notes račun. Ti odlučuješ što može raditi.</p>{shareError&&<Alert>{shareError}</Alert>}{shareMessage&&<Alert success>{shareMessage}</Alert>}
      <form className="share-form" onSubmit={share}><label>E-mail korisnika<input type="email" required value={shareEmail} onChange={e=>setShareEmail(e.target.value)} maxLength={254} placeholder="korisnik@primjer.hr"/></label><label>Ovlast<select value={permission} onChange={e=>setPermission(e.target.value as "read"|"edit")}><option value="read">Može čitati</option><option value="edit">Može uređivati</option></select></label><Button disabled={shareBusy} type="submit">{shareBusy?<LoaderCircle size={15} className="spin"/>:<Share2 size={15}/>}Spremi pristup</Button></form>
      <div className="share-list"><h3>Tko ima pristup</h3><div className="share-person"><Avatar name="Ti"/><div><strong>Ti</strong><small>Vlasnik bilješke</small></div><span className="permission-badge">Vlasnik</span></div>{shares.map(s=><div className="share-person" key={s.user_id}><Avatar name={s.email}/><div><strong>{s.email}</strong><small>{s.permission==="edit"?"Može uređivati":"Može čitati"}</small></div><button className="icon-button" title="Ukini pristup" aria-label={`Ukini pristup za ${s.email}`} disabled={shareBusy} onClick={()=>revoke(s.user_id)}><Trash2 size={16}/></button></div>)}</div><p className="modal-footnote"><Lock size={13}/>Za promjenu ovlasti ponovno upiši isti e-mail.</p></Modal>}
    {showDelete&&<Modal title="Obrisati bilješku?" onClose={()=>setShowDelete(false)}><p className="modal-description">Bilješka „{title}”, slike i podijeljeni pristupi bit će trajno obrisani.</p><div className="dialog-actions"><Button variant="secondary" onClick={()=>setShowDelete(false)}>Odustani</Button><Button variant="danger" disabled={busy} onClick={async()=>{setBusy(true);try{const result=await deleteNote(note.id);if(!result.ok){setError(result.error);setShowDelete(false);return;}router.push("/biljeske");router.refresh();}catch{setError("Brisanje nije uspjelo.");setShowDelete(false);}finally{setBusy(false);}}}>Obriši bilješku</Button></div></Modal>}
  </div>;
}
