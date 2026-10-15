import { apiUser,apiFailure,ApiError } from "@/lib/api";
import { uuidSchema } from "@/lib/validation";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}) {
  try {
    const {supabase}=await apiUser();
    const {id}=await params;
    if(!uuidSchema.safeParse(id).success) throw new ApiError("Slika nije dostupna.",404);
    const {data:image}=await supabase.from("note_images").select("object_path").eq("id",id).single();
    if(!image) throw new ApiError("Slika nije dostupna.",404);
    const {data:file,error}=await supabase.storage.from("note-images").download(image.object_path);
    if(error || !file) throw new ApiError("Slika nije dostupna.",404);
    return new Response(await file.arrayBuffer(),{headers:{"Content-Type":"image/webp","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
  } catch(error) {return apiFailure(error);}
}
