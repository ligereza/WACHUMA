import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { createGbifImporter } = await import("../importers/gbif/dist/index.js");

const name = (process.env.GBIF_IMPORT_NAME ?? "Echinopsis pachanoi").trim();
const occurrenceLimit = Number(process.env.GBIF_OCCURRENCE_LIMIT ?? 20);
const retrievedAt = new Date().toISOString();
const outputPath = resolve(
  root,
  process.env.GBIF_SNAPSHOT_PATH ??
    `.local/gbif-snapshots/${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${retrievedAt.slice(0, 10)}.json`,
);

const importer = createGbifImporter({
  occurrenceLimit,
  retrievedAt: () => retrievedAt,
});
const result = await importer.importSpecies(name);
const records = [
  result.speciesRecord,
  ...result.occurrenceRecords,
  ...result.mediaRecords,
];
const unknownLicenseRecords = records.filter(
  (record) =>
    !record.license ||
    record.license.toLowerCase() === "unknown" ||
    record.license.toLowerCase() === "none",
);

const snapshot = {
  snapshotSchemaVersion: "1.0",
  provider: "gbif",
  requestedName: result.requestedName,
  retrievedAt,
  importerVersion: result.speciesRecord.importerVersion,
  sourceApi: "https://api.gbif.org/v1",
  publicationStatus: "pending-license-review",
  licenseReview: {
    status:
      unknownLicenseRecords.length === 0 ? "review-required" : "incomplete",
    unknownLicenseRecordIds: unknownLicenseRecords.map(
      (record) => record.sourceRecordId,
    ),
    rule: "No external record or media is published automatically; media licenses are reviewed independently.",
  },
  taxon: result.taxon,
  speciesRecord: result.speciesRecord,
  occurrenceRecords: result.occurrenceRecords,
  mediaRecords: result.mediaRecords,
  counts: {
    occurrences: result.occurrenceRecords.length,
    media: result.mediaRecords.length,
    records: records.length,
  },
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
console.log(
  JSON.stringify({
    outputPath,
    requestedName: result.requestedName,
    counts: snapshot.counts,
    publicationStatus: snapshot.publicationStatus,
    licenseReview: snapshot.licenseReview.status,
  }),
);
