import "server-only";
import { redirect } from "next/navigation";
import { supabaseServer } from "./supabase/server";
export async function requireUser() {
  const supabase = await supabaseServer();
  const { data: {user}, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/prijava");
  return {supabase,user};
}
