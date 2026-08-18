import "dotenv/config";

import { count, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import inquirer from "inquirer";
import { Pool } from "pg";

import { set as workoutSet, user } from "../src/db/schema";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const { email } = await inquirer.prompt<{ email: string }>([
    {
      type: "input",
      name: "email",
      message: "User email to delete workout sets for",
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

    const [setCount] = await db
      .select({ value: count() })
      .from(workoutSet)
      .where(eq(workoutSet.userId, existingUser.id));

    const total = setCount?.value ?? 0;
    if (total === 0) {
      console.log(
        `No sets found for ${existingUser.name} (${existingUser.email}).`,
      );
      return;
    }

    const { confirmed } = await inquirer.prompt<{ confirmed: boolean }>([
      {
        type: "confirm",
        name: "confirmed",
        default: false,
        message: `Delete ${total} set(s) for ${existingUser.name} (${existingUser.email})? This cannot be undone.`,
      },
    ]);

    if (!confirmed) {
      console.log("Aborted.");
      return;
    }

    await db.delete(workoutSet).where(eq(workoutSet.userId, existingUser.id));
    console.log(`Deleted ${total} set(s) for ${existingUser.email}.`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
