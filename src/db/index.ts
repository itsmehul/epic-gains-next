import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  pool: Pool | undefined;
};

function createPool() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  return new Pool({ connectionString });
}

export function getPool() {
  if (!globalForDb.pool) {
    globalForDb.pool = createPool();
  }

  return globalForDb.pool;
}

function createDb() {
  // Must be a real Pool: Proxy breaks drizzle's `instanceof Pool` check, so
  // transactions never pin a client and imported rows roll back after 201.
  return drizzle({ client: getPool(), schema });
}

let dbInstance: ReturnType<typeof createDb> | undefined;

function getDb() {
  if (!dbInstance) {
    dbInstance = createDb();
  }
  return dbInstance;
}

export const db = new Proxy({} as ReturnType<typeof createDb>, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
