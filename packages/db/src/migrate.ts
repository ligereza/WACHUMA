import { readFile } from "node:fs/promises";
import { readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

async function main() {
  const connectionString =
    process.env.DATABASE_URL ??
    "postgres://wachuma:wachuma-dev@localhost:5432/wachuma";
  const sql = postgres(connectionString);
  const migrationsDir = join(
    dirname(fileURLToPath(import.meta.url)),
    "../migrations",
  );

  try {
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS _wachuma_migrations (
        id text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const files = (await readdir(migrationsDir))
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const [existing] = await sql<{ id: string }[]>`
        SELECT id FROM _wachuma_migrations WHERE id = ${file}
      `;
      if (existing) continue;

      const migration = await readFile(join(migrationsDir, file), "utf8");
      await sql.begin(async (transaction) => {
        await transaction.unsafe(migration);
        await transaction`INSERT INTO _wachuma_migrations (id) VALUES (${file})`;
      });
      console.log(`Applied ${file}`);
    }
  } finally {
    await sql.end();
  }
}

void main();
