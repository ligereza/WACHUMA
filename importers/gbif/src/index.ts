import { createHash } from "node:crypto";

import type { AssertionType, TaxonRank } from "@wachuma/shared";

export const GBIF_API_BASE_URL = "https://api.gbif.org/v1";
export const GBIF_IMPORTER_VERSION = "gbif-v0.1.0";

export interface GbifSpeciesMatch {
  key?: number;
  usageKey?: number;
  scientificName?: string;
  canonicalName?: string;
  rank?: string;
  status?: string;
  acceptedKey?: number;
  acceptedScientificName?: string;
  kingdom?: string;
  phylum?: string;
  order?: string;
  family?: string;
  genus?: string;
  confidence?: number;
  note?: string;
  [key: string]: unknown;
}

export interface GbifSpeciesRecord extends GbifSpeciesMatch {
  key: number;
  scientificName: string;
}

export interface GbifOccurrenceRecord {
  key?: number;
  gbifID?: string;
  speciesKey?: number;
  scientificName?: string;
  decimalLatitude?: number;
  decimalLongitude?: number;
  countryCode?: string;
  locality?: string;
  occurrenceStatus?: string;
  basisOfRecord?: string;
  license?: string;
  rightsHolder?: string;
  datasetName?: string;
  publishingOrgKey?: string;
  media?: GbifMediaRecord[];
  [key: string]: unknown;
}

export interface GbifMediaRecord {
  type?: string;
  format?: string;
  identifier?: string;
  references?: string;
  title?: string;
  creator?: string;
  license?: string;
  rightsHolder?: string;
  [key: string]: unknown;
}

export interface GbifOccurrenceSearchResponse {
  count?: number;
  endOfRecords?: boolean;
  results?: GbifOccurrenceRecord[];
  [key: string]: unknown;
}

export interface GbifSourceRecord {
  source: "gbif";
  sourceRecordId: string;
  sourceUrl: string;
  retrievedAt: string;
  license: string;
  attribution: string;
  assertionType: AssertionType;
  rawPayload: Record<string, unknown>;
  rawChecksum: string;
  importerVersion: string;
  status: "pending";
}

export interface GbifTaxonProjection {
  providerKey: "gbif";
  sourceRecordId: string;
  sourceUrl: string;
  scientificName: string;
  canonicalName?: string;
  rank: TaxonRank;
  taxonomicStatus: "accepted" | "synonym" | "doubtful" | "unresolved";
  acceptedName?: string;
  externalIdentifier: {
    namespace: "gbif";
    identifier: string;
    canonicalUrl: string;
  };
}

export interface GbifImportResult {
  requestedName: string;
  taxon: GbifTaxonProjection;
  speciesRecord: GbifSourceRecord;
  occurrenceRecords: GbifSourceRecord[];
  mediaRecords: GbifSourceRecord[];
}

export interface GbifImporterOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  retrievedAt?: () => string;
  importerVersion?: string;
  defaultLicense?: string;
  occurrenceLimit?: number;
}

export class GbifImportError extends Error {
  readonly code = "gbif_import_error" as const;

  constructor(message: string) {
    super(message);
    this.name = "GbifImportError";
  }
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

export function checksumPayload(payload: Record<string, unknown>): string {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(stableValue(payload)))
    .digest("hex")}`;
}

function asObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new GbifImportError(`GBIF returned an invalid ${label} payload`);
  }
  return value as Record<string, unknown>;
}

function asSpeciesMatch(value: unknown): GbifSpeciesMatch {
  return asObject(value, "species match") as GbifSpeciesMatch;
}

function asSpeciesRecord(value: unknown): GbifSpeciesRecord {
  const payload = asSpeciesMatch(value);
  const key = payload.key ?? payload.usageKey;
  if (typeof key !== "number" || typeof payload.scientificName !== "string") {
    throw new GbifImportError(
      "GBIF species record is missing key or scientificName",
    );
  }
  return { ...payload, key } as GbifSpeciesRecord;
}

function asOccurrenceSearch(value: unknown): GbifOccurrenceSearchResponse {
  const payload = asObject(
    value,
    "occurrence search",
  ) as GbifOccurrenceSearchResponse;
  if (payload.results !== undefined && !Array.isArray(payload.results)) {
    throw new GbifImportError(
      "GBIF occurrence search results are not an array",
    );
  }
  return payload;
}

function encodeQuery(params: Record<string, string | number>): string {
  return new URLSearchParams(
    Object.entries(params).map(
      ([key, value]) => [key, String(value)] as [string, string],
    ),
  ).toString();
}

function normalizeRank(value: string | undefined): TaxonRank {
  const rank = value?.toLowerCase();
  const ranks: TaxonRank[] = [
    "domain",
    "kingdom",
    "phylum",
    "class",
    "order",
    "family",
    "genus",
    "species",
    "subspecies",
    "variety",
    "form",
    "hybrid",
  ];
  return ranks.includes(rank as TaxonRank) ? (rank as TaxonRank) : "species";
}

function normalizeStatus(
  value: string | undefined,
): GbifTaxonProjection["taxonomicStatus"] {
  switch (value?.toLowerCase()) {
    case "accepted":
      return "accepted";
    case "synonym":
      return "synonym";
    case "doubtful":
      return "doubtful";
    default:
      return "unresolved";
  }
}

function occurrenceAttribution(
  occurrence: GbifOccurrenceRecord,
  retrievedAt: string,
): string {
  const dataset = occurrence.datasetName ?? "dataset no especificado";
  const holder = occurrence.rightsHolder
    ? `; titular: ${occurrence.rightsHolder}`
    : "";
  return `GBIF occurrence ${occurrence.gbifID ?? occurrence.key ?? "sin-id"}; dataset: ${dataset}${holder}; consultado ${retrievedAt.slice(0, 10)}`;
}

function mediaAttribution(
  media: GbifMediaRecord,
  occurrence: GbifOccurrenceRecord,
  retrievedAt: string,
): string {
  const creator = media.creator ? `; creador: ${media.creator}` : "";
  const holder = media.rightsHolder
    ? `; titular: ${media.rightsHolder}`
    : occurrence.rightsHolder
      ? `; titular: ${occurrence.rightsHolder}`
      : "";
  return `GBIF multimedia ${media.identifier ?? "sin-id"}; ocurrencia ${occurrence.gbifID ?? occurrence.key ?? "sin-id"}${creator}${holder}; consultado ${retrievedAt.slice(0, 10)}`;
}

export function projectTaxon(
  record: GbifSpeciesRecord,
  baseUrl = GBIF_API_BASE_URL,
): GbifTaxonProjection {
  const identifier = String(record.key);
  return {
    providerKey: "gbif",
    sourceRecordId: identifier,
    sourceUrl: `${baseUrl}/species/${identifier}`,
    scientificName: record.scientificName,
    ...(record.canonicalName ? { canonicalName: record.canonicalName } : {}),
    rank: normalizeRank(record.rank),
    taxonomicStatus: normalizeStatus(record.status),
    ...(record.acceptedScientificName
      ? { acceptedName: record.acceptedScientificName }
      : {}),
    externalIdentifier: {
      namespace: "gbif",
      identifier,
      canonicalUrl: `https://www.gbif.org/species/${identifier}`,
    },
  };
}

export function createGbifImporter(options: GbifImporterOptions = {}) {
  const baseUrl = options.baseUrl ?? GBIF_API_BASE_URL;
  const fetchImpl = options.fetchImpl ?? fetch;
  const retrievedAt = options.retrievedAt ?? (() => new Date().toISOString());
  const importerVersion = options.importerVersion ?? GBIF_IMPORTER_VERSION;
  const defaultLicense = options.defaultLicense ?? "unknown";
  const occurrenceLimit = Math.min(
    Math.max(options.occurrenceLimit ?? 20, 0),
    300,
  );

  async function getJson(
    path: string,
    query?: Record<string, string | number>,
  ): Promise<unknown> {
    const url = `${baseUrl.replace(/\/$/, "")}${path}${query ? `?${encodeQuery(query)}` : ""}`;
    const response = await fetchImpl(url, {
      headers: {
        accept: "application/json",
        "user-agent": "WACHUMA-gbif-importer/0.1",
      },
    });
    if (!response.ok) {
      throw new GbifImportError(
        `GBIF request failed with HTTP ${response.status}: ${url}`,
      );
    }
    return response.json();
  }

  async function matchSpecies(name: string): Promise<GbifSpeciesMatch> {
    const trimmed = name.trim();
    if (!trimmed) throw new GbifImportError("A scientific name is required");
    return asSpeciesMatch(await getJson("/species/match", { name: trimmed }));
  }

  async function importSpecies(name: string): Promise<GbifImportResult> {
    const match = await matchSpecies(name);
    const matchKey = match.key ?? match.usageKey;
    if (typeof matchKey !== "number") {
      throw new GbifImportError(`GBIF could not resolve a key for ${name}`);
    }
    const speciesRecord = asSpeciesRecord(
      await getJson(`/species/${matchKey}`),
    );
    const retrieved = retrievedAt();
    const taxon = projectTaxon(speciesRecord, baseUrl);
    const speciesPayload: Record<string, unknown> = {
      match,
      species: speciesRecord,
    };
    const speciesSourceRecord: GbifSourceRecord = {
      source: "gbif",
      sourceRecordId: `species:${speciesRecord.key}`,
      sourceUrl: `${baseUrl}/species/${speciesRecord.key}`,
      retrievedAt: retrieved,
      license: defaultLicense,
      attribution: `GBIF Backbone Taxonomy; consultado ${retrieved.slice(0, 10)}`,
      assertionType: "taxonomic_fact",
      rawPayload: speciesPayload,
      rawChecksum: checksumPayload(speciesPayload),
      importerVersion,
      status: "pending",
    };

    if (occurrenceLimit === 0) {
      return {
        requestedName: name.trim(),
        taxon,
        speciesRecord: speciesSourceRecord,
        occurrenceRecords: [],
        mediaRecords: [],
      };
    }

    const occurrenceSearch = asOccurrenceSearch(
      await getJson("/occurrence/search", {
        taxon_key: speciesRecord.key,
        limit: occurrenceLimit,
      }),
    );
    const occurrenceRecords = (occurrenceSearch.results ?? []).flatMap(
      (occurrence) => {
        const sourceRecordId =
          occurrence.gbifID ??
          (occurrence.key !== undefined ? String(occurrence.key) : undefined);
        if (!sourceRecordId) return [];
        const payload = occurrence as Record<string, unknown>;
        return [
          {
            source: "gbif" as const,
            sourceRecordId: `occurrence:${sourceRecordId}`,
            sourceUrl: `https://www.gbif.org/occurrence/${sourceRecordId}`,
            retrievedAt: retrieved,
            license: occurrence.license ?? defaultLicense,
            attribution: occurrenceAttribution(occurrence, retrieved),
            assertionType: "contemporary_observation" as const,
            rawPayload: payload,
            rawChecksum: checksumPayload(payload),
            importerVersion,
            status: "pending" as const,
          },
        ];
      },
    );

    const mediaRecords = (occurrenceSearch.results ?? []).flatMap(
      (occurrence) => {
        const occurrenceId =
          occurrence.gbifID ??
          (occurrence.key !== undefined ? String(occurrence.key) : undefined);
        if (!occurrenceId || !Array.isArray(occurrence.media)) return [];
        return occurrence.media.flatMap((media, index) => {
          if (!media.identifier) return [];
          const payload = {
            occurrenceId,
            mediaIndex: index,
            media,
          } as Record<string, unknown>;
          return [
            {
              source: "gbif" as const,
              sourceRecordId: `media:${occurrenceId}:${index}`,
              sourceUrl: `https://www.gbif.org/occurrence/${occurrenceId}`,
              retrievedAt: retrieved,
              license: media.license ?? occurrence.license ?? defaultLicense,
              attribution: mediaAttribution(media, occurrence, retrieved),
              assertionType: "contemporary_observation" as const,
              rawPayload: payload,
              rawChecksum: checksumPayload(payload),
              importerVersion,
              status: "pending" as const,
            },
          ];
        });
      },
    );

    return {
      requestedName: name.trim(),
      taxon,
      speciesRecord: speciesSourceRecord,
      occurrenceRecords,
      mediaRecords,
    };
  }

  return { matchSpecies, importSpecies };
}

export type { GbifImporterOptions as GbifImportOptions };
