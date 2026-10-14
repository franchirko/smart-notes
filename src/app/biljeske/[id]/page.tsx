import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isConfigured } from "@/lib/supabase/server";
import { uuidSchema,contentSchema } from "@/lib/validation";
import { NoteWorkspace } from "@/components/note-workspace";
import type { Note,NoteImage,Share } from "@/lib/types";
export default async function NotePage({params}:{params:Promise<{id:string}>}) {
  if(!isConfigured())return null;
  const {id}=await params;
  if(!uuidSchema.safeParse(id).success)notFound();
  const {supabase,user}=await requireUser();
  const {data,error}=await supabase.from("notes").select("*").eq("id",id).single();
  if(error||!data)notFound();
  const note=data as Note;
  if(!contentSchema.safeParse(note.content).success)throw new Error("Sadržaj bilješke nije valjan.");
  const owner=note.owner_id===user.id;
  const {data:images}=await supabase.from("note_images").select("*").eq("note_id",id);
  let shares:Share[]=[],canEdit=owner;
  if(owner) {
    const {data:shareData}=await supabase.rpc("list_note_shares",{p_note:id});
    shares=(shareData||[]) as Share[];
  } else {
    const {data:share}=await supabase.from("note_shares").select("permission").eq("note_id",id).eq("user_id",user.id).single();
    canEdit=share?.permission==="edit";
  }
  return <NoteWorkspace initialNote={note} initialImages={(images||[]) as NoteImage[]} initialShares={shares} isOwner={owner} canEdit={canEdit}/>;
}
