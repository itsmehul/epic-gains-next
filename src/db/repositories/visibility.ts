import "server-only";

import { and, eq, exists, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { follow, set as workoutSet } from "@/db/schema";

/** Sets and comments: author is the viewer, or the viewer follows the author. */
export function performanceVisibleToViewer(viewerId: string, authorIdColumn: typeof workoutSet.userId) {
  return or(
    eq(authorIdColumn, viewerId),
    exists(
      db
        .select({ one: sql`1` })
        .from(follow)
        .where(
          and(
            eq(follow.followerId, viewerId),
            eq(follow.followingId, authorIdColumn),
          ),
        ),
    ),
  )!;
}
