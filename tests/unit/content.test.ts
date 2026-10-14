import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyContent,plainText,splitText,runsToHtml,readableError } from "../../src/lib/content.ts";
import { contentSchema,saveSchema,searchSchema } from "../../src/lib/validation.ts";
test("Rich text is flattened without image metadata contaminating the note text",()=>{
  assert.equal(plainText({blocks:[{id:"1",type:"paragraph",runs:[{text:"Keramička ",bold:true},{text:"šalica"}]},
    {id:"2",type:"image",imageId:"938e852e-8b05-4549-9355-49dfaa50fa7e",runs:[{text:"privatni naziv datoteke"}]}]}),"Keramička šalica");
});
test("User content is escaped before the editor inserts trusted markup",()=>{
  assert.equal(runsToHtml([{text:'<img src=x onerror="alert(1)">',bold:true}]),'<strong>&lt;img src=x onerror=&quot;alert(1)&quot;&gt;</strong>');
  assert.equal(runsToHtml([{text:"prvi\ndrugi",italic:true}]),"<em>prvi<br>drugi</em>");
});
test("Chunking preserves Unicode, overlap and complete input coverage",()=>{
  const input="🎁čaša👩‍🌾".repeat(100);
  const chunks=splitText(input);
  assert.ok(chunks.length>1);assert.ok(chunks.every(c=>Array.from(c).length<=500));
  const reconstructed=chunks[0]+chunks.slice(1).map(c=>Array.from(c).slice(64).join("")).join("");
  assert.equal(reconstructed,input);
  assert.deepEqual(splitText("  "),[]);assert.throws(()=>splitText("test",4,4));
});
test("Validation rejects invalid image references, limits and malformed query input",()=>{
  assert.equal(contentSchema.safeParse(emptyContent()).success,true);
  assert.equal(contentSchema.safeParse({blocks:[{id:"1",type:"image",runs:[]}]}).success,false);
  assert.equal(contentSchema.safeParse({blocks:[{id:"1",type:"script",runs:[]}]}).success,false);
  assert.equal(searchSchema.safeParse({query:"a"}).success,false);
  assert.equal(searchSchema.safeParse({query:"x".repeat(501)}).success,false);
  assert.equal(searchSchema.parse({query:"  ideje za mamu  "}).query,"ideje za mamu");
  assert.equal(saveSchema.safeParse({id:"938e852e-8b05-4549-9355-49dfaa50fa7e",title:"x",content:emptyContent(),version:0}).success,false);
  assert.equal(saveSchema.safeParse({id:"938e852e-8b05-4549-9355-49dfaa50fa7e",title:"x".repeat(121),content:emptyContent(),version:1}).success,false);
});
test("Conflict and permission failures produce actionable messages",()=>{
  assert.match(readableError("40001"),/promijenio/);
  assert.match(readableError("42501"),/pravo/);
});
