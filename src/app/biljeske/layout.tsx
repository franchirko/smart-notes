import Link from "next/link";
import { isConfigured } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
export const dynamic="force-dynamic";
export const metadata={title:"Moje bilješke"};
export default async function NotesLayout({children}:{children:React.ReactNode}) {
  if(!isConfigured()) return <main className="setup-page"><span className="eyebrow">JOŠ JEDAN KORAK</span><h1>Povežimo tvoje bilješke.</h1><p>Za stvarne korisnike i privatne bilješke potrebno je povezati Supabase projekt.</p><ol><li>Kopiraj <code>.env.example</code> u <code>.env.local</code>.</li><li>Postavi Supabase URL i publishable ključ.</li><li>Pokreni SQL migraciju u Supabase SQL Editoru.</li><li>Dodaj serverski ključ i OpenAI API ključ za AI pretragu.</li><li>Ponovno pokreni aplikaciju.</li></ol><p>Detaljne upute nalaze se u README-u projekta.</p><Link href="/" className="button button-primary">Natrag na početnu</Link></main>;
  const {user}=await requireUser();
  return <AppShell name={user.user_metadata.display_name||""} email={user.email||""}>{children}</AppShell>;
}
