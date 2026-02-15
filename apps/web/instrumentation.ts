export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const path = await import("path");
    const { getDb } = await import("./lib/db");
    const { migrateDatabase } = await import("@sales-agent/db");

    const migrationsFolder = path.resolve(
      process.cwd(),
      "../../packages/db/src/migrations"
    );

    await migrateDatabase(getDb(), migrationsFolder);
  }
}
