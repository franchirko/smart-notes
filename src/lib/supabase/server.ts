import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
export function isConfigured() {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
}
export async function supabaseServer() {
  if (!isConfigured()) throw new Error("Supabase nije konfiguriran. Postavite .env.local prema .env.example.");
  const jar = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: values => { try { values.forEach(({name,value,options}) => jar.set(name,value,options)); } catch { /* Proxy refreshes cookies for server components. */ } },
    },
  });
}
