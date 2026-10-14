import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { NoteWorkspace } from "@/components/note-workspace";
import type { Note } from "@/lib/types";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function EditorFixture({searchParams}:{searchParams:Promise<{readonly?:string}>}) {
  if(process.env.NODE_ENV!=="development"||process.env.ENABLE_TEST_FIXTURES!=="1")notFound();
  const params=await searchParams;
  const note:Note={id:"938e852e-8b05-4549-9355-49dfaa50fa7e",owner_id:"938e852e-8b05-4549-9355-49dfaa50fa7e",title:"Ideje koje vrijedi sačuvati",
    content:{blocks:[{id:"1",type:"heading",runs:[{text:"Mali znakovi pažnje"}]},
      {id:"2",type:"paragraph",runs:[{text:"Keramička šalica iz lokalnog ateljea i ",bold:false},{text:"tečaj vrtlarenja",bold:true}]},
      {id:"3",type:"bullet",runs:[{text:"Odabrati nešto osobno i korisno."}]},
      {id:"4",type:"quote",runs:[{text:"Najbolje ideje dolaze kad ih najmanje očekuješ."}]}]},
    plain_text:"",version:1,index_status:"pending",indexed_version:null,index_error:null,created_at:"2026-10-14T10:00:00Z",updated_at:"2026-10-14T10:00:00Z"};
  return <AppShell name="Fran" email="primjer@example.invalid"><NoteWorkspace initialNote={note} initialImages={[]} initialShares={[]} isOwner={!params.readonly} canEdit={!params.readonly}/></AppShell>;
}
