import type { PublicUser } from "@/db/repositories/social.repository";

export type Comment = {
  id: string;
  exerciseId: string;
  workoutId: string | null;
  text: string;
  createdAt: Date | string;
  authorId: string;
  author: PublicUser;
};

export type ListCommentsResult = { items: Comment[] };
