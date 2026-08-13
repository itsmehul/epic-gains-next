import "dotenv/config";

import inquirer from "inquirer";
import { Pool } from "pg";

const KEEP_TABLES = new Set([
  "user",
  "session",
  "account",
  "verification",
]);

const SKIP_SCHEMAS = new Set([
  "information_schema",
  "pg_catalog",
  "pg_toast",
  "drizzle",
]);

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const { confirmed } = await inquirer.prompt<{ confirmed: boolean }>([
    {
      type: "confirm",
      name: "confirmed",
      default: false,
      message:
        "Delete all data except user/auth tables (user, session, account, verification)? This cannot be undone.",
    },
  ]);

  if (!confirmed) {
    console.log("Aborted.");
    return;
  }

  const pool = new Pool({ connectionString });

  try {
    const { rows } = await pool.query<{
      table_schema: string;
      table_name: string;
    }>(`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_type = 'BASE TABLE'
        AND table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      ORDER BY table_schema, table_name
    `);

    const toTruncate = rows.filter((row) => {
      if (SKIP_SCHEMAS.has(row.table_schema)) {
        return false;
      }
      if (row.table_schema === "public" && KEEP_TABLES.has(row.table_name)) {
        return false;
      }
      return true;
    });

    if (toTruncate.length === 0) {
      console.log("Nothing to delete.");
      return;
    }

    console.log("Tables to truncate:");
    for (const row of toTruncate) {
      console.log(`  ${row.table_schema}.${row.table_name}`);
    }

    const qualified = toTruncate
      .map(
        (row) =>
          `"${row.table_schema.replaceAll('"', '""')}"."${row.table_name.replaceAll('"', '""')}"`,
      )
      .join(", ");

    await pool.query(`TRUNCATE ${qualified} RESTART IDENTITY CASCADE`);
    console.log(`Truncated ${toTruncate.length} table(s). User data kept.`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
