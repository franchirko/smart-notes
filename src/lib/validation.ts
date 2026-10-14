import { z } from "zod";
export const uuidSchema = z.uuid();
const runSchema = z.object({ text: z.string().max(30000), bold: z.boolean().optional(), italic: z.boolean().optional() });
export const contentSchema = z.object({ blocks: z.array(z.object({
  id: z.string().min(1).max(100), type: z.enum(["paragraph","heading","bullet","quote","image"]),
  runs: z.array(runSchema).max(300), imageId: z.uuid().optional(),
}).refine(b => b.type !== "image" || !!b.imageId, "Slika mora imati identifikator.")).max(100) })
  .refine(c => JSON.stringify(c).length <= 100000, "Bilješka je prevelika.");
export const saveSchema = z.object({ id: uuidSchema, title: z.string().trim().min(1).max(120),
  content: contentSchema, version: z.number().int().positive() });
export const searchSchema = z.object({ query: z.string().trim().min(2).max(500) });
