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
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(["db:migrate"]);
run(["db:seed"]);
run(["--filter", "@wachuma/api", "test"], { RUN_DB_INTEGRATION: "1" });
