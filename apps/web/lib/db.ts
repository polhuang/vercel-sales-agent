import { createDatabase, type Database } from "@sales-agent/db";

let _db: Database | null = null;

export function getDb(): Database {
  if (!_db) {
    _db = createDatabase({
      tursoUrl: process.env.TURSO_DATABASE_URL,
      tursoAuthToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return _db;
}

export type { Database };
