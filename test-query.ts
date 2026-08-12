import { db } from "./src/db";
import { exercise, workoutExercise } from "./src/db/schema";
import { eq, and, sql } from "drizzle-orm";

async function main() {
  const query = db
    .select({
      exerciseId: workoutExercise.exerciseId,
    })
    .from(workoutExercise)
    .innerJoin(exercise, eq(exercise.id, workoutExercise.exerciseId))
    .where(
      and(
        eq(exercise.userId, "test-user"),
        eq(workoutExercise.name, "test"),
        eq(workoutExercise.videoUrl, "http://test.com"),
        sql`${workoutExercise.metaData}->>'videoStartTime' = ${"0"}`,
      ),
    )
    .limit(1);
    
  console.log(query.toSQL());
}
main();
