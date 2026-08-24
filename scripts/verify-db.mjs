import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const packageManager = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is required for db:verify; this gate never falls back to fixtures.",
  );
}

function run(args, extraEnv = {}) {
  const command =
    process.platform === "win32"
      ? (process.env.ComSpec ?? "cmd.exe")
      : packageManager;
  const commandArgs =
    process.platform === "win32"
      ? ["/d", "/c", `${packageManager} ${args.join(" ")}`]
      : args;
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    env: { ...process.env, ...extraEnv },
    stdio: "inherit",
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Command failed: ${args.join(" ")} (${result.status})`);
  }
}

let verificationError;
let seedWasApplied = false;
try {
  run(["db:migrate"]);
  run(["db:seed"]);
  seedWasApplied = true;
  // API integration tests resolve workspace packages through their built
  // exports. Rebuild the database package so the verification command never
  // exercises a stale repository implementation after a local source change.
  run(["--filter", "@wachuma/db", "build"]);
  run(["--filter", "@wachuma/api", "test"], { RUN_DB_INTEGRATION: "1" });
} catch (error) {
  verificationError = error;
} finally {
  if (seedWasApplied) {
    try {
      // Integration tests intentionally exercise mutations such as takedown
      // and publication. Restore the canonical editorial projection so later
      // release gates and the local smoke test see a clean, reproducible DB.
      run(["db:seed"]);
    } catch (error) {
      if (!verificationError) verificationError = error;
      else
        console.error(
          "Could not restore the canonical seed after tests",
          error,
        );
    }
  }
}

if (verificationError) {
  throw verificationError;
}
