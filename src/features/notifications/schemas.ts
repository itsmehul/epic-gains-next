import { z } from "zod";

export const markNotificationsReadSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).optional(),
  commentIds: z.array(z.string().min(1)).min(1).optional(),
  all: z.literal(true).optional(),
});

export type MarkNotificationsReadInput = z.infer<
  typeof markNotificationsReadSchema
>;
