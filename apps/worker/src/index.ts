import { PgBoss } from "pg-boss";
import postgres, { type Sql } from "postgres";
import {
  createGbifProjectionRepository,
  createImportRepository,
} from "@wachuma/db";
import {
  createGbifImporter,
  type GbifImporterOptions,
} from "@wachuma/importer-gbif";
import {
  enqueueGbifImport,
  prepareGbifQueues,
  startGbifQueueWorker,
} from "./queue.js";

export const workerName = "wachuma-worker";

export interface GbifImportJob {
  name: string;
  occurrenceLimit?: number;
}

export async function runGbifImportJob(
  sql: Sql,
  job: GbifImportJob,
  options: GbifImporterOptions = {},
) {
  const importer = createGbifImporter({
    ...options,
    ...(job.occurrenceLimit !== undefined
      ? { occurrenceLimit: job.occurrenceLimit }
      : {}),
  });
  const result = await importer.importSpecies(job.name);
  const records = [
    result.speciesRecord,
    ...result.occurrenceRecords,
    ...result.mediaRecords,
  ];
  const persisted =
    await createImportRepository(sql).persistSourceRecords(records);
  const sourceRecordIds = Object.assign(
    {},
    ...persisted.map((summary) => summary.recordIds),
  );
  const projection = await createGbifProjectionRepository(sql).persistSnapshot({
    taxon: result.taxon,
    speciesRecord: result.speciesRecord,
    occurrenceRecords: result.occurrenceRecords,
    mediaRecords: result.mediaRecords,
    sourceRecordIds,
  });
  return {
    requestedName: result.requestedName,
    taxon: result.taxon,
    sourceRecords: records.length,
    persisted,
    projection,
  };
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const importName = process.env.GBIF_IMPORT_NAME;
  if (!databaseUrl) {
    return;
  }

  const sql = postgres(databaseUrl);
  const boss = new PgBoss(databaseUrl);
  try {
    await boss.start();
    await prepareGbifQueues(boss);
    if (importName) {
      const jobId = await enqueueGbifImport(boss, { name: importName });
      console.log(JSON.stringify({ worker: workerName, enqueued: jobId }));
      await boss.stop();
      return;
    }
    await startGbifQueueWorker(boss, sql);
    console.log(JSON.stringify({ worker: workerName, status: "ready" }));
    const shutdown = async () => {
      await boss.stop();
      await sql.end();
    };
    process.once("SIGINT", () => void shutdown());
    process.once("SIGTERM", () => void shutdown());
  } finally {
    if (importName) await sql.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void main();
}
