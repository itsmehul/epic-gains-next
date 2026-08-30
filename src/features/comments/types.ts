import type { PublicUser } from "@/db/repositories/social.repository";
import type { CommentMention, CommentRole } from "@/db/schema/workout-schema";

export type Comment = {
  id: string;
  exerciseId: string;
  workoutId: string | null;
  text: string;
  role: CommentRole;
  mentions: CommentMention[];
  createdAt: Date | string;
  authorId: string;
  author: PublicUser;
};

export type ListCommentsResult = { items: Comment[] };
