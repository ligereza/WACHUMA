import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import postgres from "../packages/db/node_modules/postgres/src/index.js";
import { createImportRepository } from "../packages/db/dist/index.js";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

function assertMetadataOnly(rawPayload, sourceRecordId) {
  if (
    rawPayload &&
    typeof rawPayload === "object" &&
    ("body" in rawPayload || "html" in rawPayload || "content" in rawPayload)
  ) {
    throw new Error(
      `Refusing ${sourceRecordId}: harvest payload contains page content`,
    );
  }
}

export function toPersistablePageRecords(harvest) {
  if (!harvest || !Array.isArray(harvest.sources)) {
    throw new Error("The harvest document must contain a sources array");
  }
  return harvest.sources.map((source) => {
    const record = source.sourceRecord;
    if (!record) {
      throw new Error(
        `Harvest source ${source.sourcePublicId} has no sourceRecord`,
      );
    }
    for (const field of [
      "source",
      "sourceRecordId",
      "sourceUrl",
      "retrievedAt",
      "license",
      "attribution",
      "assertionType",
      "rawPayload",
      "importerVersion",
      "status",
    ]) {
      if (record[field] === undefined || record[field] === null) {
        throw new Error(
          `Harvest source ${source.sourcePublicId} is missing sourceRecord.${field}`,
        );
      }
    }
    assertMetadataOnly(record.rawPayload, record.sourceRecordId);
    return {
      source: record.source,
      sourceRecordId: record.sourceRecordId,
      sourceUrl: record.sourceUrl,
      retrievedAt: record.retrievedAt,
      license: record.license,
      attribution: record.attribution,
      assertionType: record.assertionType,
      rawPayload: record.rawPayload,
      ...(record.rawChecksum ? { rawChecksum: record.rawChecksum } : {}),
      importerVersion: record.importerVersion,
      status: record.status,
    };
  });
}

async function latestHarvestPath() {
  if (process.env.PACHANOI_HARVEST_PATH) {
    return resolve(ROOT, process.env.PACHANOI_HARVEST_PATH);
  }
  const directory = resolve(ROOT, ".local/source-harvest");
  const files = (await readdir(directory))
    .filter((file) => /^pachanoi-pages-\d{4}-\d{2}-\d{2}\.json$/.test(file))
    .sort();
  const latest = files.at(-1);
  if (!latest) {
    throw new Error(
      "No pachanoi page harvest found; run harvest:pachanoi:pages first",
    );
  }
  return resolve(directory, latest);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is required; this importer never falls back to fixtures",
    );
  }
  const inputPath = await latestHarvestPath();
  const harvest = JSON.parse(await readFile(inputPath, "utf8"));
  const records = toPersistablePageRecords(harvest);
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  try {
    const summaries =
      await createImportRepository(sql).persistSourceRecords(records);
    console.log(
      JSON.stringify({
        inputPath,
        records: records.length,
        publicationStatus: "pending-source-review",
        summaries,
      }),
    );
  } finally {
    await sql.end();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await main();
}
