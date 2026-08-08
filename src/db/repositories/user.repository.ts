import "server-only";

import { asc } from "drizzle-orm";

import { db } from "@/db";
import { user } from "@/db/schema";

export async function listUsersForWorkflowFilter() {
  return db
    .select({
      id: user.id,
      email: user.email,
    })
    .from(user)
    .orderBy(asc(user.email));
}
