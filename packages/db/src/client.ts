import { drizzle as drizzleLibsql } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

export type Database = ReturnType<typeof createDatabase>;

export function createDatabase(options?: {
  tursoUrl?: string;
  tursoAuthToken?: string;
  sqlitePath?: string;
}) {
  const url =
    options?.tursoUrl ?? process.env.TURSO_DATABASE_URL ?? "file:local.db";
  const authToken =
    options?.tursoAuthToken ?? process.env.TURSO_AUTH_TOKEN ?? undefined;

  const client = createClient({
    url,
    authToken,
  });

  return drizzleLibsql(client, { schema });
}

export async function migrateDatabase(db: Database, migrationsFolder: string) {
  await migrate(db, { migrationsFolder });
}
