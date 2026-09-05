// Replays the pre-scope-change seed in an isolated PostgreSQL schema, applies
// the current destructive scope migration, and runs the API suite against the
// resulting database. A schema is used instead of CREATE DATABASE because the
// local/CI application role is intentionally not required to own databases.
//
// The old seed is materialized directly from git commit eff8048 at runtime;
// no copy of that historical seed becomes a second editable source of truth.
// The schema is dropped in finally, so this harness leaves the operator DB
// unchanged apart from transient objects under its generated schema name.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  unlink,
  writeFile,
} from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import postgres from "../packages/db/node_modules/postgres/src/index.js";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required for quality:legacy-db; this gate never falls back to fixtures.",
  );
}

const packageManager = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const legacyCommit = "eff8048";
const schema = `wachuma_legacy_${process.pid}_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
const legacySeedPath = resolve(
  root,
  "packages/db/src",
  `.seed-legacy-harness-${process.pid}-${randomUUID()}.ts`,
);
const legacyContentRoot = await mkdtemp("/tmp/wachuma-legacy-content-");
const scopedDatabaseUrl = new URL(databaseUrl);
scopedDatabaseUrl.searchParams.set(
  "options",
  `-c search_path=${schema},public`,
);
const isolatedDatabaseUrl = scopedDatabaseUrl.toString();
const sql = postgres(databaseUrl, { max: 1, onnotice: () => {} });

function run(commandArgs, env = {}) {
  const command =
    process.platform === "win32"
      ? (process.env.ComSpec ?? "cmd.exe")
      : packageManager;
  const args =
    process.platform === "win32"
      ? ["/d", "/c", `${packageManager} ${commandArgs.join(" ")}`]
      : commandArgs;
  const result = spawnSync(command, args, {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: "inherit",
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `Command failed: ${commandArgs.join(" ")} (${result.status})`,
    );
  }
}

function quotedSchemaIdentifier() {
  assert.match(schema, /^wachuma_legacy_[0-9]+_[a-f0-9]+$/);
  return `"${schema}"`;
}

async function applyMigrations(files) {
  for (const file of files) {
    const migration = await readFile(
      resolve(root, "packages/db/migrations", file),
      "utf8",
    );
    await sql.begin(async (transaction) => {
      await transaction.unsafe(migration);
      await transaction`
        INSERT INTO _wachuma_migrations (id)
        VALUES (${file})
      `;
    });
  }
}

let report;
try {
  await sql.unsafe(`CREATE SCHEMA ${quotedSchemaIdentifier()}`);
  await sql.unsafe(`SET search_path TO ${quotedSchemaIdentifier()}, public`);
  await sql.unsafe(`
    CREATE TABLE _wachuma_migrations (
      id text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const legacyMigrationFiles = (
    await readdir(resolve(root, "packages/db/migrations"))
  )
    .filter((file) => /^\d{4}_[a-z0-9_-]+\.sql$/.test(file))
    .filter((file) => file < "0024_remove_out_of_scope_taxa.sql")
    .sort();
  assert.ok(legacyMigrationFiles.length > 0);
  await applyMigrations(legacyMigrationFiles);

  const legacyContentFiles = execFileSync(
    "git",
    ["ls-tree", "-r", "--name-only", `${legacyCommit}:content`],
    { cwd: root, encoding: "utf8" },
  )
    .split("\n")
    .filter((file) => file.endsWith(".json"));
  for (const contentFile of legacyContentFiles) {
    const destination = resolve(legacyContentRoot, "content", contentFile);
    await mkdir(resolve(destination, ".."), { recursive: true });
    const contents = execFileSync(
      "git",
      ["show", `${legacyCommit}:content/${contentFile}`],
      { cwd: root, encoding: "utf8" },
    );
    await writeFile(destination, contents, { mode: 0o600 });
  }

  const legacySeedSource = execFileSync(
    "git",
    ["show", `${legacyCommit}:packages/db/src/seed.ts`],
    { cwd: root, encoding: "utf8" },
  );
  const legacySeed = legacySeedSource.replace(
    `const editorialContent = await loadEditorialContent(rootDirectory);`,
    `const editorialContentRoot =\n  process.env.WACHUMA_LEGACY_CONTENT_ROOT ?? rootDirectory;\nconst editorialContent = await loadEditorialContent(editorialContentRoot);`,
  );
  assert.notEqual(legacySeed, legacySeedSource);
  await writeFile(legacySeedPath, legacySeed, { mode: 0o600 });
  await chmod(legacySeedPath, 0o600);
  run(["exec", "tsx", legacySeedPath], {
    DATABASE_URL: isolatedDatabaseUrl,
    WACHUMA_LEGACY_CONTENT_ROOT: legacyContentRoot,
    WACHUMA_SEED_PROFILE: "verification",
  });

  const [legacyOutOfScope] = await sql`
    SELECT COUNT(*)::int AS count
    FROM biological_entities
    WHERE public_id IN (
      'biological-entity-opuntia-ficus-indica',
      'biological-entity-pleurotus-ostreatus'
    )
  `;
  assert.equal(legacyOutOfScope.count, 2);

  // Reconcile the old state with today's seed so the current API suite can
  // exercise the post-migration contract, including newer pachanoi claims.
  run(["db:seed"], {
    DATABASE_URL: isolatedDatabaseUrl,
    WACHUMA_SEED_PROFILE: "verification",
  });

  const migration = await readFile(
    resolve(root, "packages/db/migrations/0024_remove_out_of_scope_taxa.sql"),
    "utf8",
  );
  await sql.begin(async (transaction) => {
    await transaction.unsafe(migration);
  });

  const [retired] = await sql`
    SELECT COUNT(*)::int AS count
    FROM biological_entities
    WHERE public_id IN (
      'biological-entity-opuntia-ficus-indica',
      'biological-entity-pleurotus-ostreatus'
    )
  `;
  const [kept] = await sql`
    SELECT COUNT(*)::int AS count
    FROM biological_entities
    WHERE public_id = 'biological-entity-echinopsis-pachanoi'
  `;
  assert.equal(retired.count, 0);
  assert.equal(kept.count, 1);

  run(["--filter", "@wachuma/db", "build"]);
  run(["--filter", "@wachuma/api", "test"], {
    DATABASE_URL: isolatedDatabaseUrl,
    RUN_DB_INTEGRATION: "1",
  });
  report = {
    legacyCommit,
    schema,
    legacyOutOfScopeEntities: legacyOutOfScope.count,
    retiredEntitiesAfter0024: retired.count,
    pachanoiEntitiesAfter0024: kept.count,
    apiSuite: "passed",
    schemaDropped: true,
  };
} finally {
  try {
    await unlink(legacySeedPath);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  await rm(legacyContentRoot, { recursive: true, force: true });
  await sql.unsafe(`DROP SCHEMA IF EXISTS ${quotedSchemaIdentifier()} CASCADE`);
  await sql.end();
}

console.log(JSON.stringify(report, null, 2));
