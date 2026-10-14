import { randomUUID,createHash } from "node:crypto";
import sharp from "sharp";
import { NextResponse } from "next/server";
import { apiUser,apiFailure,ApiError } from "@/lib/api";
import { uuidSchema } from "@/lib/validation";
export const maxDuration=60;
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}) {
  try {
    const {supabase,user}=await apiUser(request);
    const {id}=await params;
    if(!uuidSchema.safeParse(id).success) throw new ApiError("Neispravna bilješka.");
    const {data:note}=await supabase.from("notes").select("owner_id").eq("id",id).single();
    if(!note) throw new ApiError("Bilješka nije dostupna.",404);
    if(note.owner_id!==user.id) {
      const {data:share}=await supabase.from("note_shares").select("permission").eq("note_id",id).eq("user_id",user.id).single();
      if(share?.permission!=="edit") throw new ApiError("Nemate pravo uređivanja.",403);
    }
    const form=await request.formData();
    const file=form.get("file");
    if(!(file instanceof File) || file.size>4*1024*1024 || file.size===0) throw new ApiError("Slika nakon kompresije mora biti manja od 4 MB.");
    const input=Buffer.from(await file.arrayBuffer());
    const processor=sharp(input,{limitInputPixels:20000000});
    const metadata=await processor.metadata();
    if(!["jpeg","png","webp"].includes(metadata.format||"") || (metadata.pages||1)>1) throw new ApiError("Podržane su statične JPEG, PNG i WebP slike.");
    const bytes=await processor.rotate().resize(1600,1600,{fit:"inside",withoutEnlargement:true}).webp({quality:82}).toBuffer();
    const imageId=randomUUID(),path=`${id}/${imageId}.webp`;
    const {error:uploadError}=await supabase.storage.from("note-images").upload(path,bytes,{contentType:"image/webp",upsert:false});
    if(uploadError) throw new ApiError("Upload nije uspio. Provjerite prava pristupa i pokušajte ponovno.",503);
    const {error}=await supabase.rpc("register_note_image",{p_note:id,p_id:imageId,p_checksum:createHash("sha256").update(bytes).digest("hex")});
    if(error) {
      await supabase.storage.from("note-images").remove([path]);
      throw new ApiError(error.code==="P0001"?error.message:"Slika nije spremljena.");
    }
    return NextResponse.json({id:imageId},{headers:{"Cache-Control":"no-store"}});
  } catch(error) {return apiFailure(error);}
}
