import { PgBoss } from "pg-boss";
import postgres, { type Sql } from "postgres";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  createGbifProjectionRepository,
  createImportRepository,
  createInaturalistProjectionRepository,
  createWikidataProjectionRepository,
} from "@wachuma/db";
import {
  createGbifImporter,
  type GbifImporterOptions,
} from "@wachuma/importer-gbif";
import {
  importFungalTraitsSnapshot,
  type FungalTraitsSnapshotMetadata,
} from "@wachuma/importer-fungaltraits";
import {
  createInaturalistImporter,
  type InaturalistImporterOptions,
} from "@wachuma/importer-inaturalist";
import {
  createWikidataImporter,
  type WikidataImporterOptions,
} from "@wachuma/importer-wikidata";
import {
  enqueueGbifImport,
  prepareGbifQueues,
  startGbifQueueWorker,
} from "./queue.js";

export const workerName = "wachuma-worker";

export interface GbifImportJob {
  name: string;
  occurrenceLimit?: number;
  occurrenceLicense?: string;
  occurrenceMediaType?: string;
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
    ...(job.occurrenceLicense !== undefined
      ? { occurrenceLicense: job.occurrenceLicense }
      : {}),
    ...(job.occurrenceMediaType !== undefined
      ? { occurrenceMediaType: job.occurrenceMediaType }
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

export interface InaturalistImportJob {
  name: string;
  perPage?: number;
  page?: number;
  qualityGrade?: string;
  observationLicense?: string;
  photoLicense?: string;
  soundLicense?: string;
  openGeoOnly?: boolean;
}

export async function runInaturalistImportJob(
  sql: Sql,
  job: InaturalistImportJob,
  options: InaturalistImporterOptions = {},
) {
  const importer = createInaturalistImporter({
    ...options,
    ...(job.perPage !== undefined ? { perPage: job.perPage } : {}),
    ...(job.page !== undefined ? { page: job.page } : {}),
    ...(job.qualityGrade !== undefined
      ? { qualityGrade: job.qualityGrade }
      : {}),
    ...(job.observationLicense !== undefined
      ? { observationLicense: job.observationLicense }
      : {}),
    ...(job.photoLicense !== undefined
      ? { photoLicense: job.photoLicense }
      : {}),
    ...(job.soundLicense !== undefined
      ? { soundLicense: job.soundLicense }
      : {}),
    ...(job.openGeoOnly !== undefined ? { openGeoOnly: job.openGeoOnly } : {}),
  });
  const result = await importer.importSpecies(job.name);
  const records = [
    result.taxonRecord,
    ...result.observationRecords,
    ...result.mediaRecords,
  ];
  const persistableRecords = records.map((record) => {
    const { sourceUrl, rawChecksum, ...requiredFields } = record;
    return {
      ...requiredFields,
      ...(sourceUrl ? { sourceUrl } : {}),
      ...(rawChecksum ? { rawChecksum } : {}),
    };
  });
  const persisted =
    await createImportRepository(sql).persistSourceRecords(persistableRecords);
  const sourceRecordIds = Object.assign(
    {},
    ...persisted.map((summary) => summary.recordIds),
  );
  const projection = await createInaturalistProjectionRepository(
    sql,
  ).persistSnapshot({
    taxon: result.taxon,
    taxonRecord: persistableRecords[0]!,
    observationRecords: persistableRecords.slice(
      1,
      1 + result.observationRecords.length,
    ),
    mediaRecords: persistableRecords.slice(
      1 + result.observationRecords.length,
    ),
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

export interface WikidataImportJob {
  name?: string;
  itemId?: string;
}

export async function runWikidataImportJob(
  sql: Sql,
  job: WikidataImportJob,
  options: WikidataImporterOptions = {},
) {
  if (!job.name && !job.itemId) {
    throw new Error("Wikidata import requires name or itemId");
  }
  const importer = createWikidataImporter(options);
  const result = job.itemId
    ? await importer.importItem(job.itemId)
    : await importer.importSpecies(job.name!);
  const { sourceUrl, rawChecksum, ...requiredFields } = result.itemRecord;
  const persistableRecord = {
    ...requiredFields,
    ...(sourceUrl ? { sourceUrl } : {}),
    ...(rawChecksum ? { rawChecksum } : {}),
  };
  const persisted = await createImportRepository(sql).persistSourceRecords([
    persistableRecord,
  ]);
  const sourceRecordIds = Object.assign(
    {},
    ...persisted.map((summary) => summary.recordIds),
  );
  const projection = await createWikidataProjectionRepository(
    sql,
  ).persistSnapshot({
    taxon: result.taxon,
    itemRecord: persistableRecord,
    sourceRecordIds,
  });
  return {
    ...(result.requestedName ? { requestedName: result.requestedName } : {}),
    itemId: result.itemId,
    taxon: result.taxon,
    sourceRecords: 1,
    persisted,
    projection,
  };
}

export interface FungalTraitsStagingJob {
  csv: string;
  metadata: FungalTraitsSnapshotMetadata;
}

/**
 * Persists only auditable pending source records. Trait rows stay unresolved
 * until an editor maps the snapshot name and trait identifier to local
 * entities; the raw row remains available through source_records.raw_payload.
 */
export async function runFungalTraitsStagingJob(
  sql: Sql,
  job: FungalTraitsStagingJob,
) {
  const result = importFungalTraitsSnapshot(job);
  const sourceRecords = result.sourceRecords.map((record) => {
    const { sourceUrl, rawChecksum, ...requiredFields } = record;
    return {
      ...requiredFields,
      ...(sourceUrl ? { sourceUrl } : {}),
      ...(rawChecksum ? { rawChecksum } : {}),
    };
  });
  const persisted =
    await createImportRepository(sql).persistSourceRecords(sourceRecords);
  return {
    provider: "fungaltraits" as const,
    releaseVersion: job.metadata.releaseVersion,
    publishable: result.publishable,
    measurementsPending: result.measurements.length,
    persisted,
  };
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for FungalTraits staging`);
  return value;
}

function fungalTraitsMetadataFromEnvironment(): FungalTraitsSnapshotMetadata {
  const licenseReview = requiredEnvironment("FUNGALTRAITS_LICENSE_REVIEW");
  if (licenseReview !== "verified" && licenseReview !== "unresolved") {
    throw new Error(
      "FUNGALTRAITS_LICENSE_REVIEW must be verified or unresolved",
    );
  }
  const licenseEvidenceUrl =
    process.env.FUNGALTRAITS_LICENSE_EVIDENCE_URL?.trim();
  return {
    releaseVersion: requiredEnvironment("FUNGALTRAITS_RELEASE_VERSION"),
    snapshotUrl: requiredEnvironment("FUNGALTRAITS_SNAPSHOT_URL"),
    doi: requiredEnvironment("FUNGALTRAITS_DOI"),
    citation: requiredEnvironment("FUNGALTRAITS_CITATION"),
    license: requiredEnvironment("FUNGALTRAITS_LICENSE"),
    attribution: requiredEnvironment("FUNGALTRAITS_ATTRIBUTION"),
    retrievedAt:
      process.env.FUNGALTRAITS_RETRIEVED_AT?.trim() ?? new Date().toISOString(),
    licenseReview,
    ...(licenseEvidenceUrl ? { licenseEvidenceUrl } : {}),
  };
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const importName = process.env.GBIF_IMPORT_NAME;
  const inaturalistImportName = process.env.INATURALIST_IMPORT_NAME;
  const wikidataImportName = process.env.WIKIDATA_IMPORT_NAME;
  const wikidataImportId = process.env.WIKIDATA_QID;
  const fungalTraitsSnapshotPath = process.env.FUNGALTRAITS_SNAPSHOT_PATH;
  if (!databaseUrl) {
    return;
  }

  const sql = postgres(databaseUrl);
  try {
    if (fungalTraitsSnapshotPath) {
      const result = await runFungalTraitsStagingJob(sql, {
        csv: await readFile(fungalTraitsSnapshotPath, "utf8"),
        metadata: fungalTraitsMetadataFromEnvironment(),
      });
      console.log(JSON.stringify({ worker: workerName, ...result }));
      return;
    }
    if (inaturalistImportName) {
      const result = await runInaturalistImportJob(sql, {
        name: inaturalistImportName,
        ...(process.env.INATURALIST_PER_PAGE
          ? { perPage: Number(process.env.INATURALIST_PER_PAGE) }
          : {}),
        ...(process.env.INATURALIST_QUALITY_GRADE
          ? { qualityGrade: process.env.INATURALIST_QUALITY_GRADE }
          : {}),
        ...(process.env.INATURALIST_OBSERVATION_LICENSE
          ? { observationLicense: process.env.INATURALIST_OBSERVATION_LICENSE }
          : {}),
        ...(process.env.INATURALIST_PHOTO_LICENSE
          ? { photoLicense: process.env.INATURALIST_PHOTO_LICENSE }
          : {}),
        ...(process.env.INATURALIST_SOUND_LICENSE
          ? { soundLicense: process.env.INATURALIST_SOUND_LICENSE }
          : {}),
        ...(process.env.INATURALIST_OPEN_GEO_ONLY === "true"
          ? { openGeoOnly: true }
          : {}),
      });
      console.log(JSON.stringify({ worker: workerName, ...result }));
      return;
    }
    if (wikidataImportName || wikidataImportId) {
      const result = await runWikidataImportJob(
        sql,
        wikidataImportId
          ? { itemId: wikidataImportId }
          : { name: wikidataImportName! },
        {
          ...(process.env.WIKIDATA_LANGUAGE
            ? { language: process.env.WIKIDATA_LANGUAGE }
            : {}),
        },
      );
      console.log(JSON.stringify({ worker: workerName, ...result }));
      return;
    }
    const boss = new PgBoss(databaseUrl);
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
    if (
      importName ||
      inaturalistImportName ||
      wikidataImportName ||
      wikidataImportId ||
      fungalTraitsSnapshotPath
    ) {
      await sql.end();
    }
  }
}

const isMainModule = process.argv[1]
  ? import.meta.url === pathToFileURL(resolve(process.argv[1])).href
  : false;

if (isMainModule) {
  void main();
}
