"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { saveSchema,uuidSchema,contentSchema } from "@/lib/validation";
import { plainText,readableError } from "@/lib/content";
import type { ActionResult,Note,NoteContent,Share } from "@/lib/types";
export async function createNote() {
  const {supabase,user}=await requireUser();
  const {data,error}=await supabase.from("notes").insert({owner_id:user.id,title:"Nova bilješka"}).select("id").single();
  if(error || !data) throw new Error("Bilješka nije stvorena. Provjerite SQL migracije i pokušajte ponovno.");
  revalidatePath("/biljeske");
  redirect(`/biljeske/${data.id}`);
}
export async function saveNote(input:{id:string;title:string;content:NoteContent;version:number}):Promise<ActionResult<Note>> {
  const parsed=saveSchema.safeParse(input);
  if(!parsed.success) return {ok:false,error:"Provjerite naslov i sadržaj bilješke (najviše 120 znakova u naslovu)."};
  const text=plainText(parsed.data.content);
  if(text.length>30000) return {ok:false,error:"Tekst može imati najviše 30.000 znakova."};
  const {supabase}=await requireUser();
  const imageIds=parsed.data.content.blocks.filter(b=>b.type==="image").map(b=>b.imageId!);
  if(imageIds.length>3) return {ok:false,error:"Najviše tri slike po bilješci."};
  if(imageIds.length) {
    const {data:images,error}=await supabase.from("note_images").select("id").eq("note_id",input.id).in("id",imageIds);
    if(error || imageIds.some(id=>!images?.some(image=>image.id===id))) return {ok:false,error:"Slika ne pripada ovoj bilješci."};
  }
  const {data,error}=await supabase.rpc("save_note",{p_id:input.id,p_title:parsed.data.title,p_content:parsed.data.content,p_plain_text:text,p_version:input.version}).single<Note>();
  if(error) return {ok:false,error:readableError(error.code)};
  revalidatePath("/biljeske");
  return {ok:true,data:data as Note};
}
export async function deleteNote(id:string):Promise<ActionResult> {
  if(!uuidSchema.safeParse(id).success) return {ok:false,error:"Neispravna bilješka."};
  const {supabase,user}=await requireUser();
  const {data:note}=await supabase.from("notes").select("owner_id").eq("id",id).single();
  if(!note || note.owner_id!==user.id) return {ok:false,error:"Samo vlasnik može obrisati bilješku."};
  const {data:images}=await supabase.from("note_images").select("object_path").eq("note_id",id);
  if(images?.length) {
    const {error}=await supabase.storage.from("note-images").remove(images.map(image=>image.object_path));
    if(error) return {ok:false,error:"Slike nisu obrisane. Pokušajte ponovno."};
  }
  const {error}=await supabase.from("notes").delete().eq("id",id).eq("owner_id",user.id);
  if(error) return {ok:false,error:readableError(error.code)};
  revalidatePath("/biljeske");
  return {ok:true,data:undefined};
}
export async function shareNote(id:string,email:string,permission:"read"|"edit"):Promise<ActionResult<Share[]>> {
  if(!uuidSchema.safeParse(id).success || !["read","edit"].includes(permission) || email.length>254 || !email.includes("@"))
    return {ok:false,error:"Unesite valjan e-mail i ovlast."};
  const {supabase}=await requireUser();
  const {error}=await supabase.rpc("share_note",{p_note:id,p_email:email,p_permission:permission});
  if(error) return {ok:false,error:error.code==="P0001"?error.message:readableError(error.code)};
  const {data,error:listError}=await supabase.rpc("list_note_shares",{p_note:id});
  if(listError) return {ok:false,error:readableError(listError.code)};
  return {ok:true,data:data as Share[]};
}
export async function unshareNote(id:string,userId:string):Promise<ActionResult<Share[]>> {
  if(!uuidSchema.safeParse(id).success || !uuidSchema.safeParse(userId).success) return {ok:false,error:"Neispravan pristup."};
  const {supabase}=await requireUser();
  const {error}=await supabase.rpc("unshare_note",{p_note:id,p_user:userId});
  if(error) return {ok:false,error:readableError(error.code)};
  const {data,error:listError}=await supabase.rpc("list_note_shares",{p_note:id});
  if(listError) return {ok:false,error:readableError(listError.code)};
  return {ok:true,data:data as Share[]};
}
export async function removeImage(noteId:string,imageId:string,version:number):Promise<ActionResult<Note>> {
  if(!uuidSchema.safeParse(noteId).success || !uuidSchema.safeParse(imageId).success || !Number.isInteger(version))
    return {ok:false,error:"Neispravna slika."};
  const {supabase}=await requireUser();
  const {data:image}=await supabase.from("note_images").select("object_path").eq("note_id",noteId).eq("id",imageId).single();
  if(!image) return {ok:false,error:"Slika nije dostupna."};
  const {data,error}=await supabase.rpc("remove_note_image",{p_note:noteId,p_id:imageId,p_version:version}).single<Note>();
  if(error) return {ok:false,error:readableError(error.code)};
  await supabase.storage.from("note-images").remove([image.object_path]);
  const parsed=contentSchema.safeParse(data.content);
  if(!parsed.success) return {ok:false,error:"Sadržaj nije valjan."};
  revalidatePath("/biljeske");
  return {ok:true,data:data as Note};
}
