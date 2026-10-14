"use client";
import Link from "next/link";
import { useState,useTransition } from "react";
import { Plus,Search,Sparkles,ArrowRight,Image as ImageIcon,Users,NotebookPen,LoaderCircle,Clock,SlidersHorizontal } from "lucide-react";
import { createNote } from "@/app/actions/notes";
import type { Note,SearchResult } from "@/lib/types";
import { Button,Alert } from "./ui";
const colors=["butter","lavender","mint","peach","sky"];
export function NotesDashboard({notes,userId,name,initialFilter}:{notes:Note[];userId:string;name:string;initialFilter?:string}) {
  const [filter,setFilter]=useState(initialFilter||"sve");
  const [query,setQuery]=useState("");
  const [ai,setAi]=useState(true);
  const [results,setResults]=useState<SearchResult[]|null>(null);
  const [error,setError]=useState("");
  const [searching,setSearching]=useState(false);
  const [creating,startCreate]=useTransition();
  const visible=notes.filter(note=>(filter==="moje"?note.owner_id===userId:filter==="dijeljene"?note.owner_id!==userId:true)
    && (ai || !query || `${note.title} ${note.plain_text}`.toLocaleLowerCase("hr").includes(query.toLocaleLowerCase("hr"))));
  async function search(event:React.FormEvent) {
    event.preventDefault();setError("");
    if(!ai) return;
    if(query.trim().length<2) {setResults(null);return;}
    setSearching(true);
    try {
      const response=await fetch("/api/pretraga",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query})});
      const data=await response.json();
      if(!response.ok) throw new Error(data.error);
      setResults(data.results);
    } catch(error){setError(error instanceof Error?error.message:"Pretraga nije uspjela.");setResults(null);}
    finally{setSearching(false);}
  }
  return <><header className="app-topbar"><span>Tvoj prostor <span className="topbar-divider">/</span><strong>Bilješke</strong></span><span className="topbar-private"><ShieldIcon/>Privatno i sigurno</span></header>
    <main className="page-body"><div className="dashboard-heading"><div><span className="eyebrow">MALO PROSTORA ZA VELIKE IDEJE</span><h1>{name?`Bok, ${name.split(" ")[0]}.`:"Tvoje bilješke."} <span className="wave">✦</span></h1><p>Što ti je danas na pameti?</p></div>
      <Button onClick={()=>startCreate(async()=>{try{await createNote();}catch(error){if(error instanceof Error&&error.message.includes("NEXT_REDIRECT"))throw error;setError("Bilješka nije stvorena. Pokušajte ponovno.");}})} disabled={creating}>{creating?<LoaderCircle size={17} className="spin"/>:<Plus size={18}/>}Nova bilješka</Button></div>
    <form className="search-panel" onSubmit={search}><div className="search-input">{ai?<Sparkles size={22}/>:<Search size={22}/>}<input aria-label="Pretraži bilješke" placeholder={ai?"Opiši što tražiš… npr. ideje za mamin poklon":"Pretraži naslov ili tekst…"} value={query} maxLength={500} onChange={e=>{setQuery(e.target.value);if(!e.target.value)setResults(null);}}/><Button type="submit" disabled={searching}>{searching?<LoaderCircle size={17} className="spin"/>:<ArrowRight size={19}/>}<span className="search-button-label">Pronađi</span></Button></div>
      <div className="search-hint"><span>{ai?"Pretraži značenje teksta i sadržaj slika.":"Doslovno podudaranje naslova i teksta."}</span><button type="button" className={`ai-toggle ${ai?"active":""}`} aria-pressed={ai} onClick={()=>{setAi(!ai);setResults(null);setError("");}}><Sparkles size={13}/>{ai?"AI uključen":"AI isključen"}<span/></button></div></form>
    {error&&<Alert>{error}</Alert>}
    <div className="notes-toolbar"><div className="tabs" role="group" aria-label="Prikaz bilježaka">{[{id:"sve",name:"Sve bilješke"},{id:"moje",name:"Moje"},{id:"dijeljene",name:"Podijeljene"}].map(t=><button key={t.id} className={filter===t.id?"selected":""} onClick={()=>setFilter(t.id)}>{t.name}{t.id==="sve"&&<span>{notes.length}</span>}</button>)}</div><span className="sort-label"><SlidersHorizontal size={14}/>Najnovije izmjene</span></div>
    {results!==null?<section aria-live="polite"><div className="results-heading"><h2>Pronađeno po značenju <span>{results.length}</span></h2><button className="text-link" onClick={()=>{setResults(null);setQuery("");}}>Očisti pretragu</button></div>{results.length===0?<Empty title="Još nema podudaranja." text="Pokušaj drugačiji opis. Provjeri jesu li bilješke obrađene za AI pretragu."/>:<div className="results-list">{results.filter(r=>filter==="sve"||notes.some(n=>n.id===r.note_id&&(filter==="moje"?n.owner_id===userId:n.owner_id!==userId))).map(result=><Link href={`/biljeske/${result.note_id}`} key={result.note_id} className="search-result"><span className="result-icon">{result.source==="image"?<ImageIcon size={22}/>:<NotebookPen size={22}/>}</span><div><h3>{result.title}</h3><p>{result.snippet}</p><small>{result.source==="image"?"Podudaranje sadržaja slike":"Podudaranje teksta"}</small></div><ArrowRight size={20}/></Link>)}</div>}</section>:
    visible.length===0?<Empty title={notes.length?"Nema bilježaka u ovom prikazu.":"Prva ideja počinje ovdje."} text={notes.length?"Promijeni prikaz ili upit pretrage.":"Klikni „Nova bilješka”, zapiši misao i dodaj joj sliku."}/>:
    <section className="notes-grid" aria-label="Bilješke">{visible.map((note,i)=><Link className={`note-card ${colors[i%colors.length]}`} href={`/biljeske/${note.id}`} key={note.id}><div className="note-card-top"><NotebookPen size={18}/><span className={`index-dot ${note.index_status}`} title={note.index_status==="ready"?"Spremno za AI pretragu":"Čeka AI obradu"}/></div><h2>{note.title}</h2><p>{note.plain_text||"Ovdje počinje nova ideja…"}</p><div className="note-card-bottom"><span><Clock size={12}/>{new Date(note.updated_at).toLocaleDateString("hr-HR",{day:"numeric",month:"short"})}</span><span>{note.content.blocks.some(b=>b.type==="image")&&<ImageIcon size={14}/>} {note.owner_id!==userId&&<Users size={14}/>}</span></div></Link>)}<button className="new-note-card" disabled={creating} onClick={()=>startCreate(async()=>{try{await createNote();}catch(error){if(error instanceof Error&&error.message.includes("NEXT_REDIRECT"))throw error;setError("Bilješka nije stvorena.");}})}><span><Plus size={22}/></span><strong>Nova misao?</strong><small>Daj joj svoje mjesto.</small></button></section>}
    <p className="dashboard-footnote"><Sparkles size={13}/>Dobre ideje ne moraju biti savršeno organizirane. Samo sačuvane.</p></main></>;
}
function Empty({title,text}:{title:string;text:string}){return <div className="empty-state"><span><NotebookPen size={30}/></span><h2>{title}</h2><p>{text}</p></div>;}
function ShieldIcon(){return <span aria-hidden="true" className="status-dot"/>;}
