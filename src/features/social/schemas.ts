import { z } from "zod";

import { USERNAME_REGEX } from "@/features/social/username";

export const searchUsersQuerySchema = z.object({
  q: z.string().trim().min(1).max(64),
});

export const updateSocialProfileSchema = z
  .object({
    username: z
      .string()
      .trim()
      .transform((value) => value.toLowerCase())
      .pipe(z.string().regex(USERNAME_REGEX, "Invalid username"))
      .optional(),
    isPrivate: z.boolean().optional(),
  })
  .refine(
    (value) => value.username !== undefined || value.isPrivate !== undefined,
    { message: "No changes" },
  );

export type UpdateSocialProfileInput = z.infer<typeof updateSocialProfileSchema>;
