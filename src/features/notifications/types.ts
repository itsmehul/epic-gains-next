import type { PublicUser } from "@/db/repositories/social.repository";
import type { NotificationType } from "@/db/schema/social-schema";

export type MentionNotification = {
  id: string;
  type: NotificationType;
  readAt: string | null;
  createdAt: string;
  href: string | null;
  actor: PublicUser;
  comment: {
    id: string;
    text: string;
    exerciseId: string;
    workoutId: string | null;
  };
  exercise: {
    id: string;
    name: string;
  };
  workout: {
    id: string;
    name: string;
  } | null;
};

export type ListNotificationsResult = {
  items: MentionNotification[];
  unreadCount: number;
};

export function notificationHref(options: {
  workoutId: string | null;
  exerciseId: string;
}): string | null {
  if (!options.workoutId) return null;
  const params = new URLSearchParams({
    exercise: options.exerciseId,
    tab: "comments",
  });
  return `/workouts/${options.workoutId}?${params}`;
}
