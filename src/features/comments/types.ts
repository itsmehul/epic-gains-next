import type { PublicUser } from "@/db/repositories/social.repository";
import type { CommentMention, CommentRole } from "@/db/schema/workout-schema";
import type { PublicTrainerEscalation } from "@/features/agent/escalation";

export type Comment = {
  id: string;
  exerciseId: string;
  workoutId: string | null;
  text: string;
  role: CommentRole;
  mentions: CommentMention[];
  trainerEscalation?: PublicTrainerEscalation | null;
  createdAt: Date | string;
  parentId: string | null;
  authorId: string;
  author: PublicUser;
  unread?: boolean;
};

export type ListCommentsResult = { items: Comment[] };
