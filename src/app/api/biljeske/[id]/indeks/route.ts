import { NextResponse } from "next/server";
import { apiUser,apiFailure,ApiError } from "@/lib/api";
import { describeImage,embeddings,quota } from "@/lib/ai";
import { splitText,plainText } from "@/lib/content";
import { contentSchema,uuidSchema } from "@/lib/validation";
import type { Note,NoteImage } from "@/lib/types";
export const maxDuration=60;
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}) {
  let failed: (()=>Promise<void>) | undefined;
  try {
    const {supabase,user}=await apiUser(request);
    const {id}=await params;
    if(!uuidSchema.safeParse(id).success) throw new ApiError("Neispravna bilješka.");
    const {data,error}=await supabase.from("notes").select("*").eq("id",id).single();
    if(error || !data) throw new ApiError("Bilješka nije dostupna.",404);
    const note=data as Note;
    if(note.owner_id!==user.id) {
      const {data:share}=await supabase.from("note_shares").select("permission").eq("note_id",id).eq("user_id",user.id).single();
      if(share?.permission!=="edit") throw new ApiError("Nemate pravo uređivanja.",403);
    }
    if(note.indexed_version===note.version && note.index_status==="ready") return NextResponse.json({status:"ready",version:note.version});
    const content=contentSchema.safeParse(note.content);
    if(!content.success) throw new ApiError("Sadržaj bilješke nije valjan.");
    const admin=await quota(user.id,"index");
    const {data:claimed,error:claimError}=await admin.rpc("claim_note_index",{p_note:id,p_version:note.version});
    if(claimError) throw new ApiError("Indeksiranje nije spremno.",503);
    if(!claimed) throw new ApiError("Obrada je već pokrenuta ili je bilješka promijenjena. Pokušajte za dvije minute.",409);
    failed=async()=>{await admin.from("notes").update({index_status:"failed",index_error:"Obrada nije uspjela. Pokušajte ponovno."}).eq("id",id).eq("version",note.version);};
    const imageIds=content.data.blocks.filter(b=>b.type==="image").map(b=>b.imageId!);
    const {data:imageData,error:imagesError}=await supabase.from("note_images").select("*").eq("note_id",id);
    if(imagesError) throw new ApiError("Slike nisu dostupne.",403);
    const images=(imageData as NoteImage[]).filter(image=>imageIds.includes(image.id));
    if(imageIds.some(imageId=>!images.some(image=>image.id===imageId))) throw new ApiError("Slika nije dostupna.");
    const imageChunks=await Promise.all(images.map(async image=>{
      let description=image.description;
      if(!description) {
        const {data:file,error:downloadError}=await supabase.storage.from("note-images").download(image.object_path);
        if(downloadError || !file) throw new ApiError("Slika nije dostupna.",403);
        description=await describeImage(Buffer.from(await file.arrayBuffer()));
        const {error:updateError}=await admin.from("note_images").update({description}).eq("id",image.id).eq("checksum",image.checksum);
        if(updateError) throw new ApiError("Opis slike nije spremljen.",503);
      }
      return splitText(`${note.title}\n${description}`).map(text=>({source:"image",image_id:image.id,content:text}));
    }));
    const chunks=[...splitText(`${note.title}\n${plainText(content.data)}`).map(text=>({source:"text",image_id:null,content:text})),...imageChunks.flat()];
    const vectors=await embeddings(chunks.map(chunk=>chunk.content));
    // Re-check edit rights after AI processing: sharing may have changed meanwhile.
    const {data:current}=await supabase.from("notes").select("owner_id,version").eq("id",id).single();
    if(!current || current.version!==note.version) throw new ApiError("Bilješka je promijenjena; ponovno pokrenite obradu.",409);
    if(current.owner_id!==user.id) {
      const {data:share}=await supabase.from("note_shares").select("permission").eq("note_id",id).eq("user_id",user.id).single();
      if(share?.permission!=="edit") throw new ApiError("Pristup je ukinut.",403);
    }
    const {data:committed,error:commitError}=await admin.rpc("commit_note_index",{p_note:id,p_version:note.version,
      p_chunks:chunks.map((chunk,i)=>({...chunk,embedding:JSON.stringify(vectors[i])}))});
    if(commitError) throw new ApiError("Indeks nije spremljen.",503);
    if(!committed) throw new ApiError("Bilješka je promijenjena; ponovno pokrenite obradu.",409);
    return NextResponse.json({status:"ready",version:note.version},{headers:{"Cache-Control":"no-store"}});
  } catch(error) {if(failed) await failed(); return apiFailure(error);}
}
