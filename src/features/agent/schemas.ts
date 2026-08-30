import { z } from "zod";

export const upsertGeminiKeySchema = z.object({
  apiKey: z.string().trim().min(20).max(200),
});

export type UpsertGeminiKeyInput = z.infer<typeof upsertGeminiKeySchema>;
