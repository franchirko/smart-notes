"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isConfigured, supabaseServer } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
const credentials = z.object({ email:z.email(),password:z.string().min(8).max(128) });
export async function authenticate(form:FormData):Promise<ActionResult> {
  if (!isConfigured()) return {ok:false,error:"Prijava još nije konfigurirana. Postavite Supabase varijable u .env.local."};
  const parsed = credentials.safeParse({email:form.get("email"),password:form.get("password")});
  if (!parsed.success) return {ok:false,error:"Unesite valjan e-mail i lozinku s najmanje 8 znakova."};
  const supabase = await supabaseServer();
  const {error}=await supabase.auth.signInWithPassword({email:parsed.data.email,password:parsed.data.password});
  if(error) return {ok:false,error:"Prijava nije uspjela. Provjerite e-mail i lozinku demo računa."};
  redirect("/biljeske");
}
export async function signOut() {
  const supabase=await supabaseServer();
  await supabase.auth.signOut();
  redirect("/");
}
