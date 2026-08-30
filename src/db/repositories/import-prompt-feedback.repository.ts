import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { importPromptFeedback } from "@/db/schema";
import type { ImportPromptAnnotation } from "@/db/schema/workout-schema";

export type ImportPromptFeedbackInsert = typeof importPromptFeedback.$inferInsert;

export async function insertImportPromptFeedback(values: {
  workoutId: string;
  userId: string;
  promptVersion: string;
  annotations: ImportPromptAnnotation[];
  comment: string | null;
  videoTimestamp: number;
}) {
  const [row] = await db
    .insert(importPromptFeedback)
    .values({
      id: crypto.randomUUID(),
      workoutId: values.workoutId,
      userId: values.userId,
      promptVersion: values.promptVersion,
      annotations: values.annotations,
      comment: values.comment,
      videoTimestamp: values.videoTimestamp,
    })
    .returning();

  return row ?? null;
}

export async function getLatestImportPromptFeedbackForUser(options: {
  workoutId: string;
  userId: string;
}) {
  const [row] = await db
    .select()
    .from(importPromptFeedback)
    .where(
      and(
        eq(importPromptFeedback.workoutId, options.workoutId),
        eq(importPromptFeedback.userId, options.userId),
      ),
    )
    .orderBy(desc(importPromptFeedback.createdAt))
    .limit(1);

  return row ?? null;
}
