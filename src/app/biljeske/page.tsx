import { requireUser } from "@/lib/auth";
import { isConfigured } from "@/lib/supabase/server";
import { NotesDashboard } from "@/components/notes-dashboard";
import type { Note } from "@/lib/types";
export default async function NotesPage({searchParams}:{searchParams:Promise<{prikaz?:string}>}) {
  if(!isConfigured()) return null;
  const {supabase,user}=await requireUser();
  const {prikaz}=await searchParams;
  const {data,error}=await supabase.from("notes").select("*").order("updated_at",{ascending:false}).limit(200);
  if(error) return <div className="page-body"><h1>Bilješke još nisu dostupne.</h1><p>Provjerite SQL migracije i konfiguraciju Supabase projekta.</p></div>;
  return <NotesDashboard key={prikaz||"sve"} notes={(data||[]) as Note[]} userId={user.id} name={user.user_metadata.display_name||""} initialFilter={prikaz}/>;
}
