import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

/** Standalone migration runner: `npm run db:migrate`. */
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required to run migrations");
  const sql = postgres(url, { max: 1 });
  const db = drizzle(sql);
  await migrate(db, { migrationsFolder: "./lib/db/migrations" });
  await sql.end();
  // eslint-disable-next-line no-console
  console.log("✓ migrations applied");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("migration failed:", err);
  process.exit(1);
});
