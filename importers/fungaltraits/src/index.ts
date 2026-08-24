import { createHash } from "node:crypto";

import type { ExternalSourceRecord, TraitValueType } from "@wachuma/shared";

export const FUNGALTRAITS_PROVIDER_KEY = "fungaltraits" as const;
export const FUNGALTRAITS_IMPORTER_VERSION = "fungaltraits-v0.1.0";

export type FungalTraitsLicenseReview = "verified" | "unresolved";

export interface FungalTraitsSnapshotMetadata {
  releaseVersion: string;
  snapshotUrl: string;
  doi: string;
  citation: string;
  license: string;
  attribution: string;
  retrievedAt: string;
  licenseReview: FungalTraitsLicenseReview;
  licenseEvidenceUrl?: string;
}

export interface FungalTraitsRow {
  rowNumber: number;
  recordId: string;
  species: string;
  speciesMatched?: string;
  uuid?: string;
  ifungorumNumber?: string;
  traitIdentifier: string;
  rawValue: string;
}

export interface FungalTraitsMeasurementProjection {
  sourceRecordId: string;
  taxonName: string;
  taxonMatchName?: string;
  traitIdentifier: string;
  traitLabel: string;
  valueType: TraitValueType;
  valueNumeric?: number;
  valueText?: string;
  unit?: string;
  measuredAt: string;
  uncertainty: Record<string, unknown>;
  sourceStudyId: string;
  sourceCitation: string;
  doi: string;
  publishable: false;
}

export interface FungalTraitsImportResult {
  metadata: FungalTraitsSnapshotMetadata;
  publishable: boolean;
  sourceRecords: ExternalSourceRecord[];
  measurements: FungalTraitsMeasurementProjection[];
}

export class FungalTraitsImportError extends Error {
  readonly code = "fungaltraits_import_error" as const;

  constructor(message: string) {
    super(message);
    this.name = "FungalTraitsImportError";
  }
}

function requiredText(
  value: unknown,
  label: string,
  rowNumber?: number,
): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    const suffix = rowNumber === undefined ? "" : ` en la fila ${rowNumber}`;
    throw new FungalTraitsImportError(`${label} es obligatorio${suffix}`);
  }
  return normalized;
}

function optionalText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}

function requiredField(
  record: Record<string, string>,
  aliases: readonly string[],
  label: string,
  rowNumber: number,
): string {
  const value = getField(record, aliases);
  if (value === undefined) {
    throw new FungalTraitsImportError(
      `${label} es obligatorio en la fila ${rowNumber}`,
    );
  }
  return value.trim();
}

function getField(
  record: Record<string, string>,
  aliases: readonly string[],
): string | undefined {
  for (const alias of aliases) {
    const value = record[alias];
    if (value !== undefined) return value;
  }
  return undefined;
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      values.push(current);
      current = "";
    } else {
      current += character;
    }
  }

  if (quoted) throw new FungalTraitsImportError("CSV con comillas sin cerrar");
  values.push(current);
  return values;
}

function parseCsvRecords(csv: string): Record<string, string>[] {
  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/);
  while (lines.at(-1) === "") lines.pop();
  if (lines.length < 2) {
    throw new FungalTraitsImportError("El snapshot CSV no contiene filas");
  }

  const headers = parseCsvLine(lines[0] ?? "").map((header) => header.trim());
  if (headers.some((header) => !header)) {
    throw new FungalTraitsImportError(
      "El snapshot CSV contiene una columna sin nombre",
    );
  }
  if (new Set(headers).size !== headers.length) {
    throw new FungalTraitsImportError(
      "El snapshot CSV contiene columnas duplicadas",
    );
  }

  return lines.slice(1).map((line, offset) => {
    const values = parseCsvLine(line);
    if (values.length !== headers.length) {
      throw new FungalTraitsImportError(
        `La fila ${offset + 2} no coincide con el número de columnas`,
      );
    }
    return Object.fromEntries(
      headers.map((header, index) => [header, values[index] ?? ""]),
    );
  });
}

function normalizeRow(
  record: Record<string, string>,
  rowNumber: number,
): FungalTraitsRow {
  const speciesMatched = optionalText(
    getField(record, ["speciesMatched", "species_matched", "matched_name"]),
  );
  const uuid = optionalText(getField(record, ["uuid"]));
  const ifungorumNumber = optionalText(
    getField(record, ["ifungorum_number", "ifungorumNumber"]),
  );

  return {
    rowNumber,
    recordId: requiredText(
      getField(record, ["obj_id", "record_id", "recordId"]),
      "obj_id",
      rowNumber,
    ),
    species: requiredText(
      getField(record, ["species", "taxon", "taxon_name"]),
      "species",
      rowNumber,
    ),
    ...(speciesMatched ? { speciesMatched } : {}),
    ...(uuid ? { uuid } : {}),
    ...(ifungorumNumber ? { ifungorumNumber } : {}),
    traitIdentifier: requiredText(
      getField(record, ["trait_name", "trait_identifier", "traitIdentifier"]),
      "trait_name",
      rowNumber,
    ),
    rawValue: requiredField(
      record,
      ["value", "trait_value", "raw_value"],
      "value",
      rowNumber,
    ),
  };
}

export function parseFungalTraitsCsv(csv: string): FungalTraitsRow[] {
  return parseCsvRecords(csv).map((record, index) =>
    normalizeRow(record, index + 2),
  );
}

function normalizeTraitLabel(identifier: string): string {
  return identifier
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (character) => character.toUpperCase());
}

function projectValue(
  rawValue: string,
): Pick<
  FungalTraitsMeasurementProjection,
  "valueType" | "valueNumeric" | "valueText"
> {
  const numeric = Number(rawValue);
  if (rawValue !== "" && Number.isFinite(numeric)) {
    return { valueType: "numeric", valueNumeric: numeric };
  }
  return { valueType: "text", valueText: rawValue };
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, stableValue(child)]),
    );
  }
  return value;
}

function checksumPayload(payload: Record<string, unknown>): string {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(stableValue(payload)))
    .digest("hex")}`;
}

function assertMetadata(metadata: FungalTraitsSnapshotMetadata): void {
  requiredText(metadata.releaseVersion, "releaseVersion");
  requiredText(metadata.doi, "doi");
  requiredText(metadata.citation, "citation");
  requiredText(metadata.license, "license");
  requiredText(metadata.attribution, "attribution");
  requiredText(metadata.retrievedAt, "retrievedAt");
  try {
    new URL(metadata.snapshotUrl);
  } catch {
    throw new FungalTraitsImportError("snapshotUrl debe ser una URL válida");
  }
  if (metadata.licenseReview === "verified" && metadata.licenseEvidenceUrl) {
    try {
      new URL(metadata.licenseEvidenceUrl);
    } catch {
      throw new FungalTraitsImportError(
        "licenseEvidenceUrl debe ser una URL válida",
      );
    }
  }
}

export function canPublishFungalTraitsSnapshot(
  metadata: FungalTraitsSnapshotMetadata,
): boolean {
  const normalizedLicense = metadata.license.trim().toLowerCase();
  let hasValidEvidenceUrl = false;
  if (metadata.licenseEvidenceUrl) {
    try {
      new URL(metadata.licenseEvidenceUrl);
      hasValidEvidenceUrl = true;
    } catch {
      hasValidEvidenceUrl = false;
    }
  }
  return (
    metadata.licenseReview === "verified" &&
    normalizedLicense !== "unknown" &&
    !normalizedLicense.includes("all rights reserved") &&
    hasValidEvidenceUrl
  );
}

export function importFungalTraitsSnapshot(input: {
  csv: string;
  metadata: FungalTraitsSnapshotMetadata;
}): FungalTraitsImportResult {
  assertMetadata(input.metadata);
  const rows = parseFungalTraitsCsv(input.csv);
  const publishable = canPublishFungalTraitsSnapshot(input.metadata);
  const measurements = rows.map((row) => {
    const sourceRecordId = `${input.metadata.releaseVersion}:measurement:${row.recordId}:row-${row.rowNumber}`;
    const value = projectValue(row.rawValue);
    return {
      sourceRecordId,
      taxonName: row.species,
      ...(row.speciesMatched ? { taxonMatchName: row.speciesMatched } : {}),
      traitIdentifier: row.traitIdentifier,
      traitLabel: normalizeTraitLabel(row.traitIdentifier),
      ...value,
      measuredAt: input.metadata.retrievedAt,
      uncertainty: {
        measuredAt: "snapshot_retrieval_date",
        sourceRow: row.rowNumber,
        rawValue: row.rawValue,
        valuePresence: row.rawValue === "" ? "missing" : "present",
        taxonResolution: row.speciesMatched
          ? "provided_by_snapshot"
          : "unresolved",
      },
      sourceStudyId: row.recordId,
      sourceCitation: input.metadata.citation,
      doi: input.metadata.doi,
      publishable: false as const,
    } satisfies FungalTraitsMeasurementProjection;
  });

  const sourceRecords = measurements.map((measurement, index) => {
    const row = rows[index];
    if (!row)
      throw new FungalTraitsImportError("Snapshot row projection failed");
    const rawPayload = {
      dataset: FUNGALTRAITS_PROVIDER_KEY,
      releaseVersion: input.metadata.releaseVersion,
      doi: input.metadata.doi,
      citation: input.metadata.citation,
      snapshotUrl: input.metadata.snapshotUrl,
      licenseReview: input.metadata.licenseReview,
      row,
    } satisfies Record<string, unknown>;
    return {
      source: FUNGALTRAITS_PROVIDER_KEY,
      sourceRecordId: measurement.sourceRecordId,
      sourceUrl: `${input.metadata.snapshotUrl}#row-${row.rowNumber}`,
      retrievedAt: input.metadata.retrievedAt,
      license: input.metadata.license,
      attribution: `${input.metadata.attribution}; release ${input.metadata.releaseVersion}; registro ${row.recordId}`,
      assertionType: "academic_publication",
      rawPayload,
      rawChecksum: checksumPayload(rawPayload),
      importerVersion: FUNGALTRAITS_IMPORTER_VERSION,
      status: "pending",
    } satisfies ExternalSourceRecord;
  });

  return {
    metadata: input.metadata,
    publishable,
    sourceRecords,
    measurements,
  };
}
