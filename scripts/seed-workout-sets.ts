import "dotenv/config";

import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import inquirer from "inquirer";
import { Pool } from "pg";

import {
  exercise,
  set as workoutSet,
  user,
  workout,
  workoutExercise,
} from "../src/db/schema";
import type { MetricProfile } from "../src/db/schema/workout-schema";

const SESSIONS = 12;
const SETS_PER_SESSION = 4;
const HISTORY_DAYS = 90;
const INSERT_CHUNK_SIZE = 500;

function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function dummyMetrics(profile: MetricProfile) {
  switch (profile) {
    case "WEIGHT_REPS":
    case "WEIGHTED_REPS":
      return {
        reps: randInt(5, 12),
        weight: randInt(20, 100),
        time: null,
        distance: null,
      };
    case "BODYWEIGHT_REPS":
      return {
        reps: randInt(6, 20),
        weight: null,
        time: null,
        distance: null,
      };
    case "TIMED_HOLD":
      return {
        reps: null,
        weight: null,
        time: randInt(20, 90),
        distance: null,
      };
    case "CARDIO_DISTANCE":
      return {
        reps: null,
        weight: null,
        time: randInt(300, 1800),
        distance: randInt(1000, 8000),
      };
    case "LOADED_CARRY":
      return {
        reps: null,
        weight: randInt(16, 48),
        time: null,
        distance: randInt(20, 80),
      };
    default:
      return {
        reps: randInt(8, 15),
        weight: randInt(10, 60),
        time: null,
        distance: null,
      };
  }
}

function sessionMoments() {
  const span = Math.max(SESSIONS - 1, 1);
  return Array.from({ length: SESSIONS }, (_, sessionIndex) => {
    const daysBack = Math.round(((span - sessionIndex) / span) * HISTORY_DAYS);
    const date = new Date();
    date.setDate(date.getDate() - daysBack);
    date.setHours(randInt(6, 21), randInt(0, 59), randInt(0, 59), 0);
    return {
      createdAt: date,
      updatedAt: date,
    };
  });
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const { email } = await inquirer.prompt<{ email: string }>([
    {
      type: "input",
      name: "email",
      message: "User email to seed workout sets for",
      validate: (value: string) =>
        value.trim().includes("@") || "email is required",
    },
  ]);

  const pool = new Pool({ connectionString });
  const db = drizzle({ client: pool });

  try {
    const [existingUser] = await db
      .select({ id: user.id, email: user.email, name: user.name })
      .from(user)
      .where(eq(user.email, email.trim()))
      .limit(1);

    if (!existingUser) {
      console.error(`No user found for email ${email.trim()}`);
      return;
    }

    const workouts = await db
      .select({ id: workout.id, name: workout.name })
      .from(workout)
      .where(eq(workout.userId, existingUser.id));

    if (workouts.length === 0) {
      console.log(`No workouts found for ${existingUser.email}. Nothing to seed.`);
      return;
    }

    const workoutIds = workouts.map((row) => row.id);
    const appearances = await db
      .select({
        workoutId: workoutExercise.workoutId,
        exerciseId: workoutExercise.exerciseId,
        metricProfile: exercise.metricProfile,
      })
      .from(workoutExercise)
      .innerJoin(exercise, eq(workoutExercise.exerciseId, exercise.id))
      .where(inArray(workoutExercise.workoutId, workoutIds));

    const uniqueAppearances = [
      ...new Map(
        appearances.map((row) => [`${row.workoutId}:${row.exerciseId}`, row]),
      ).values(),
    ];

    const rows = uniqueAppearances.flatMap((appearance) =>
      sessionMoments().flatMap((session) =>
        Array.from({ length: SETS_PER_SESSION }, (_, setIndex) => {
          const createdAt = new Date(session.createdAt);
          createdAt.setMinutes(createdAt.getMinutes() + setIndex * 3);
          return {
            id: crypto.randomUUID(),
            workoutId: appearance.workoutId,
            exerciseId: appearance.exerciseId,
            createdAt,
            updatedAt: createdAt,
            ...dummyMetrics(appearance.metricProfile),
          };
        }),
      ),
    );

    const { confirmed } = await inquirer.prompt<{ confirmed: boolean }>([
      {
        type: "confirm",
        name: "confirmed",
        default: false,
        message: `Create ${rows.length} dummy set(s) (${SETS_PER_SESSION} sets × ${SESSIONS} days per exercise over ${HISTORY_DAYS} days) across ${workouts.length} workout(s) for ${existingUser.name} (${existingUser.email})?`,
      },
    ]);

    if (!confirmed) {
      console.log("Aborted.");
      return;
    }

    if (rows.length === 0) {
      console.log(
        `Found ${workouts.length} workout(s) but no exercises. Nothing to seed.`,
      );
      return;
    }

    for (let i = 0; i < rows.length; i += INSERT_CHUNK_SIZE) {
      await db.insert(workoutSet).values(rows.slice(i, i + INSERT_CHUNK_SIZE));
    }

    const byWorkout = new Map(workouts.map((row) => [row.id, row.name]));
    const counts = new Map<string, number>();
    for (const id of workoutIds) {
      counts.set(id, 0);
    }
    for (const row of rows) {
      counts.set(row.workoutId, (counts.get(row.workoutId) ?? 0) + 1);
    }

    console.log(`Inserted ${rows.length} set(s):`);
    for (const [id, count] of counts) {
      console.log(`  ${byWorkout.get(id) ?? id}: ${count}`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
