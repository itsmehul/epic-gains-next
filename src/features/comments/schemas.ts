import { z } from "zod";

export const listCommentsQuerySchema = z.object({
  exerciseId: z.string().min(1),
  workoutId: z.string().min(1).optional(),
});

export const createCommentSchema = z.object({
  exerciseId: z.string().min(1),
  workoutId: z.string().min(1).nullable().optional(),
  parentId: z.string().min(1).nullable().optional(),
  text: z.string().trim().min(1).max(2000),
});

export type ListCommentsQuery = z.infer<typeof listCommentsQuerySchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
