import "dotenv/config";

import { count, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import inquirer from "inquirer";
import { Pool } from "pg";

import {
  comments,
  set as workoutSet,
  user,
  workout,
  workoutExercise,
  workoutMembership,
} from "../src/db/schema";

type WorkoutRow = {
  id: string;
  name: string;
  userId: string | null;
  archivedAt: Date | null;
  createdAt: Date;
};

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const idArg = process.argv[2]?.trim();
  const pool = new Pool({ connectionString });
  const db = drizzle({ client: pool });

  try {
    let selected: WorkoutRow | undefined;

    if (idArg) {
      const [row] = await db
        .select({
          id: workout.id,
          name: workout.name,
          userId: workout.userId,
          archivedAt: workout.archivedAt,
          createdAt: workout.createdAt,
        })
        .from(workout)
        .where(eq(workout.id, idArg))
        .limit(1);
      selected = row;
      if (!selected) {
        console.error(`No workout found for id ${idArg}`);
        return;
      }
    } else {
      const { lookup } = await inquirer.prompt<{
        lookup: "id" | "email";
      }>([
        {
          type: "list",
          name: "lookup",
          message: "Find workout by",
          choices: [
            { name: "Workout ID", value: "id" },
            { name: "Owner email", value: "email" },
          ],
        },
      ]);

      if (lookup === "id") {
        const { workoutId } = await inquirer.prompt<{ workoutId: string }>([
          {
            type: "input",
            name: "workoutId",
            message: "Workout ID",
            validate: (value: string) =>
              value.trim().length > 0 || "workout id is required",
          },
        ]);
        const [row] = await db
          .select({
            id: workout.id,
            name: workout.name,
            userId: workout.userId,
            archivedAt: workout.archivedAt,
            createdAt: workout.createdAt,
          })
          .from(workout)
          .where(eq(workout.id, workoutId.trim()))
          .limit(1);
        selected = row;
        if (!selected) {
          console.error(`No workout found for id ${workoutId.trim()}`);
          return;
        }
      } else {
        const { email } = await inquirer.prompt<{ email: string }>([
          {
            type: "input",
            name: "email",
            message: "Owner email",
            validate: (value: string) =>
              value.trim().includes("@") || "email is required",
          },
        ]);

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
          .select({
            id: workout.id,
            name: workout.name,
            userId: workout.userId,
            archivedAt: workout.archivedAt,
            createdAt: workout.createdAt,
          })
          .from(workout)
          .where(eq(workout.userId, existingUser.id));

        if (workouts.length === 0) {
          console.log(
            `No workouts found for ${existingUser.name} (${existingUser.email}).`,
          );
          return;
        }

        const { workoutId } = await inquirer.prompt<{ workoutId: string }>([
          {
            type: "list",
            name: "workoutId",
            message: `Select workout for ${existingUser.email}`,
            choices: workouts.map((w) => ({
              name: `${w.name} (${w.id})${w.archivedAt ? " [archived]" : ""}`,
              value: w.id,
            })),
          },
        ]);
        selected = workouts.find((w) => w.id === workoutId);
      }
    }

    if (!selected) {
      console.error("No workout selected.");
      return;
    }

    const workoutId = selected.id;
    const [setCount] = await db
      .select({ value: count() })
      .from(workoutSet)
      .where(eq(workoutSet.workoutId, workoutId));
    const [exerciseCount] = await db
      .select({ value: count() })
      .from(workoutExercise)
      .where(eq(workoutExercise.workoutId, workoutId));
    const [commentCount] = await db
      .select({ value: count() })
      .from(comments)
      .where(eq(comments.workoutId, workoutId));
    const [membershipCount] = await db
      .select({ value: count() })
      .from(workoutMembership)
      .where(eq(workoutMembership.workoutId, workoutId));

    const ownerEmail = selected.userId
      ? (
          await db
            .select({ email: user.email })
            .from(user)
            .where(eq(user.id, selected.userId))
            .limit(1)
        )[0]?.email
      : null;

    const { confirmed } = await inquirer.prompt<{ confirmed: boolean }>([
      {
        type: "confirm",
        name: "confirmed",
        default: false,
        message: [
          `Hard-delete "${selected.name}" (${workoutId})`,
          ownerEmail ? `owner ${ownerEmail}` : "no owner",
          selected.archivedAt ? "archived" : "active",
          `${setCount?.value ?? 0} set(s)`,
          `${exerciseCount?.value ?? 0} workout exercise(s)`,
          `${commentCount?.value ?? 0} comment(s)`,
          `${membershipCount?.value ?? 0} membership(s)`,
          "This cannot be undone.",
        ].join(" — "),
      },
    ]);

    if (!confirmed) {
      console.log("Aborted.");
      return;
    }

    await db.transaction(async (tx) => {
      await tx.delete(comments).where(eq(comments.workoutId, workoutId));
      await tx.delete(workoutSet).where(eq(workoutSet.workoutId, workoutId));
      await tx
        .delete(workoutExercise)
        .where(eq(workoutExercise.workoutId, workoutId));
      await tx
        .delete(workoutMembership)
        .where(eq(workoutMembership.workoutId, workoutId));
      await tx.delete(workout).where(eq(workout.id, workoutId));
    });

    const [remaining] = await db
      .select({ id: workout.id })
      .from(workout)
      .where(eq(workout.id, workoutId))
      .limit(1);

    if (remaining) {
      console.error(`Workout ${workoutId} is still present after delete.`);
      return;
    }

    console.log(`Deleted workout ${workoutId} and related rows.`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
