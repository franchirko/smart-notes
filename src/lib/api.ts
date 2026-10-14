import "server-only";
import { NextResponse } from "next/server";
import { isConfigured,supabaseServer } from "./supabase/server";
export class ApiError extends Error { constructor(message:string,public status=400){super(message);} }
export async function apiUser(request?:Request) {
  if(request && request.method!=="GET") {
    const origin=request.headers.get("origin");
    let originUrl:URL|null=null;
    try { originUrl=origin?new URL(origin):null; } catch { /* Reject malformed origins. */ }
    // Next.js may normalize request.url to localhost behind its internal server.
    // The incoming Host header preserves the browser-facing deployment host.
    if(!originUrl || originUrl.host!==request.headers.get("host") || !["http:","https:"].includes(originUrl.protocol))
      throw new ApiError("Neispravan izvor zahtjeva.",403);
  }
  if(!isConfigured()) throw new ApiError("Supabase još nije konfiguriran.",503);
  const supabase=await supabaseServer();
  const {data:{user},error}=await supabase.auth.getUser();
  if(error || !user) throw new ApiError("Prijavite se za nastavak.",401);
  return {supabase,user};
}
export function apiFailure(error:unknown) {
  if(error instanceof ApiError) return NextResponse.json({error:error.message},{status:error.status,headers:{"Cache-Control":"no-store"}});
  console.error("API operation failed",error instanceof Error?error.name:"unknown");
  return NextResponse.json({error:"Obrada nije uspjela. Pokušajte ponovno."},{status:500,headers:{"Cache-Control":"no-store"}});
}
