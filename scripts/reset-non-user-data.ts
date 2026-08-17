import "dotenv/config";

import { eq, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import inquirer from "inquirer";
import { Pool } from "pg";

import {
  comments,
  follow,
  followRequest,
  mcpApiKey,
  oauthAccessToken,
  oauthApplication,
  oauthConsent,
  set as workoutSet,
  user,
  userAchievement,
  workout,
  workoutMembership,
} from "../src/db/schema";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const emailArg = process.argv[2]?.trim();
  const { email } = emailArg
    ? { email: emailArg }
    : await inquirer.prompt<{ email: string }>([
        {
          type: "input",
          name: "email",
          message: "User email to reset non-auth data for",
          validate: (value: string) =>
            value.trim().includes("@") || "email is required",
        },
      ]);

  const trimmedEmail = email.trim();
  const pool = new Pool({ connectionString });
  const db = drizzle({ client: pool });

  try {
    const [existingUser] = await db
      .select({ id: user.id, email: user.email, name: user.name })
      .from(user)
      .where(eq(user.email, trimmedEmail))
      .limit(1);

    if (!existingUser) {
      console.error(`No user found for email ${trimmedEmail}`);
      return;
    }

    const { confirmed } = await inquirer.prompt<{ confirmed: boolean }>([
      {
        type: "confirm",
        name: "confirmed",
        default: false,
        message: `Delete all app data for ${existingUser.email} (${existingUser.name})? Auth tables stay. This cannot be undone.`,
      },
    ]);

    if (!confirmed) {
      console.log("Aborted.");
      return;
    }

    const userId = existingUser.id;

    await db.transaction(async (tx) => {
      await tx.delete(workout).where(eq(workout.userId, userId));
      await tx
        .delete(workoutMembership)
        .where(eq(workoutMembership.userId, userId));
      await tx.delete(workoutSet).where(eq(workoutSet.userId, userId));
      await tx.delete(comments).where(eq(comments.authorId, userId));
      await tx
        .delete(userAchievement)
        .where(eq(userAchievement.userId, userId));
      await tx
        .delete(follow)
        .where(
          or(eq(follow.followerId, userId), eq(follow.followingId, userId)),
        );
      await tx
        .delete(followRequest)
        .where(
          or(
            eq(followRequest.requesterId, userId),
            eq(followRequest.targetId, userId),
          ),
        );
      await tx.delete(mcpApiKey).where(eq(mcpApiKey.userId, userId));
      await tx.delete(oauthConsent).where(eq(oauthConsent.userId, userId));
      await tx
        .delete(oauthAccessToken)
        .where(eq(oauthAccessToken.userId, userId));
      await tx
        .delete(oauthApplication)
        .where(eq(oauthApplication.userId, userId));
    });

    console.log(`Reset non-auth data for ${existingUser.email}.`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
