import "server-only";

import {
  isFollowing,
  isTrainerOf,
} from "@/db/repositories/social.repository";
import type { PublicUser } from "@/db/repositories/social.repository";

export async function canViewUserWorkouts(
  viewerId: string,
  owner: PublicUser,
): Promise<boolean> {
  if (viewerId === owner.id) return true;
  if (await isTrainerOf(viewerId, owner.id)) return true;
  if (!owner.isPrivate) return true;
  return isFollowing(viewerId, owner.id);
}
