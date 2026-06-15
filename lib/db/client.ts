import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getEnv } from "@/lib/env";
import * as schema from "./schema";

/**
 * Lazy Drizzle client over postgres.js. Works with Neon (and any Postgres) via
 * the connection string. Initialization is deferred to the first query so that
 * importing this module (e.g. during `next build` page-data collection) does not
 * require DATABASE_URL to be present.
 */
declare global {
  // eslint-disable-next-line no-var
  var __lyrio_db__: PostgresJsDatabase<typeof schema> | undefined;
}

function init(): PostgresJsDatabase<typeof schema> {
  if (globalThis.__lyrio_db__) return globalThis.__lyrio_db__;
  const { DATABASE_URL } = getEnv();
  const sql = postgres(DATABASE_URL, { max: 1, prepare: false });
  const instance = drizzle(sql, { schema });
  globalThis.__lyrio_db__ = instance;
  return instance;
}

export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_target, prop, receiver) {
    const real = init();
    const value = Reflect.get(real as object, prop, receiver);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export { schema };
