import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageManager = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const commands = [
  ["typecheck"],
  ["lint"],
  ["test"],
  ["build"],
  ["quality:taxonomy-fixture"],
  ["quality:content"],
  ["quality:pachanoi-knowledge"],
  ["quality:content-manifest"],
  ["quality:licenses"],
  ["quality:sbom"],
  ["quality:release-policy"],
  ["quality:migrations"],
  ["quality:retired-scope"],
  ["quality:procedural"],
  ["quality:source-map"],
  ["validate:glb"],
  ["quality:topology"],
  ["format:check"],
  ["db:verify"],
  ["quality:legacy-db"],
  ["quality:corpus"],
  ["quality:content-db"],
  ["quality:public-corpus"],
  ["verify:public-web"],
];

for (const args of commands) {
  const label = `pnpm ${args.join(" ")}`;
  console.log(`\n[release-gate] ${label}`);
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
    env: process.env,
    stdio: "inherit",
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    console.error(`[release-gate] failed: ${label}`);
    process.exit(result.status ?? 1);
  }
}

console.log("\n[release-gate] all automated gates passed");
