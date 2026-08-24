import { readFile } from "node:fs/promises";
import process from "node:process";

const args = process.argv.slice(2);
const fileIndex = args.indexOf("--file");
const filePath = fileIndex >= 0 ? args[fileIndex + 1] : undefined;
const apply = args.includes("--apply");
const apiUrl = (process.env.WACHUMA_API_URL ?? "http://localhost:3001").replace(
  /\/$/,
  "",
);
const token = process.env.WACHUMA_ADMIN_TOKEN;

if (!filePath || filePath.startsWith("--")) {
  console.error(
    "Uso: pnpm import:garden:ledger -- --file <manifiesto.json> [--apply]",
  );
  process.exitCode = 2;
} else {
  const { applyGardenLedger, parseGardenLedgerJson } =
    await import("../importers/garden/dist/index.js");
  const input = await readFile(filePath, "utf8");
  const batch = parseGardenLedgerJson(input);

  console.log(
    JSON.stringify(
      {
        mode: apply ? "apply" : "validate-only",
        schemaVersion: batch.schemaVersion,
        sourcePublicId: batch.sourcePublicId,
        recordCount: batch.recordCount,
      },
      null,
      2,
    ),
  );

  if (apply) {
    if (!token) {
      throw new Error(
        "WACHUMA_ADMIN_TOKEN is required with --apply; validation never needs a token",
      );
    }

    const result = await applyGardenLedger(batch, {
      apiUrl,
      token,
    });
    for (const applied of result.applied) console.log(JSON.stringify(applied));
  }
}
