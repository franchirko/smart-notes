import { NextResponse } from "next/server";
import { apiUser,apiFailure,ApiError } from "@/lib/api";
import { embeddings,quota } from "@/lib/ai";
import { searchSchema } from "@/lib/validation";
export const maxDuration=60;
export async function POST(request:Request) {
  try {
    const {supabase,user}=await apiUser(request);
    const parsed=searchSchema.safeParse(await request.json());
    if(!parsed.success) throw new ApiError("Upit mora sadržavati između 2 i 500 znakova.");
    await quota(user.id,"search");
    const [vector]=await embeddings([parsed.data.query]);
    // Use the user's client, not the admin client: RLS filters chunks and notes.
    const {data,error}=await supabase.rpc("search_notes",{p_embedding:JSON.stringify(vector),p_query:parsed.data.query});
    if(error) throw new ApiError("Pretraga nije uspjela. Provjerite SQL migracije.",503);
    return NextResponse.json({results:data||[]},{headers:{"Cache-Control":"private, no-store"}});
  } catch(error) {return apiFailure(error);}
}
