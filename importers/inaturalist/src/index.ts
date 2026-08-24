import { createHash } from "node:crypto";

import type {
  AssertionType,
  ExternalSourceRecord,
  TaxonRank,
} from "@wachuma/shared";

export const INATURALIST_API_BASE_URL = "https://api.inaturalist.org/v1";
export const INATURALIST_IMPORTER_VERSION = "inaturalist-v0.1.0";

export interface InaturalistTaxonRecord {
  id?: number;
  name?: string;
  rank?: string;
  preferred_common_name?: string;
  default_photo?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface InaturalistPhotoRecord {
  id?: number;
  license_code?: string | null;
  attribution?: string;
  original_url?: string;
  url?: string;
  medium_url?: string;
  small_url?: string;
  type?: string;
  [key: string]: unknown;
}

export interface InaturalistSoundRecord {
  id?: number;
  license_code?: string | null;
  attribution?: string;
  file_url?: string;
  original_url?: string;
  [key: string]: unknown;
}

export interface InaturalistObservationRecord {
  id?: number;
  uri?: string;
  observed_on?: string;
  created_at?: string;
  quality_grade?: string;
  license_code?: string | null;
  geoprivacy?: string | null;
  taxon_geoprivacy?: string | null;
  geojson?: { type?: string; coordinates?: unknown };
  location?: string | null;
  positional_accuracy?: number | null;
  taxon?: InaturalistTaxonRecord | null;
  user?: { login?: string; name?: string; [key: string]: unknown } | null;
  photos?: InaturalistPhotoRecord[];
  sounds?: InaturalistSoundRecord[];
  [key: string]: unknown;
}

interface InaturalistObservationSearchResponse {
  total_results?: number;
  page?: number;
  per_page?: number;
  results?: InaturalistObservationRecord[];
  [key: string]: unknown;
}

interface InaturalistTaxonSearchResponse {
  total_results?: number;
  results?: InaturalistTaxonRecord[];
  [key: string]: unknown;
}

export interface InaturalistSourceRecord extends ExternalSourceRecord {
  source: "inaturalist";
  assertionType: AssertionType;
}

export interface InaturalistTaxonProjection {
  providerKey: "inaturalist";
  sourceRecordId: string;
  sourceUrl: string;
  scientificName: string;
  canonicalName?: string;
  rank: TaxonRank;
  taxonomicStatus: "accepted" | "synonym" | "doubtful" | "unresolved";
  externalIdentifier: {
    namespace: "inaturalist";
    identifier: string;
    canonicalUrl: string;
  };
}

export interface InaturalistImportResult {
  requestedName: string;
  taxon: InaturalistTaxonProjection;
  taxonRecord: InaturalistSourceRecord;
  observationRecords: InaturalistSourceRecord[];
  mediaRecords: InaturalistSourceRecord[];
}

export interface InaturalistImporterOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  retrievedAt?: () => string;
  importerVersion?: string;
  perPage?: number;
  page?: number;
  qualityGrade?: string;
  observationLicense?: string;
  photoLicense?: string;
  soundLicense?: string;
  openGeoOnly?: boolean;
}

export class InaturalistImportError extends Error {
  readonly code = "inaturalist_import_error" as const;

  constructor(message: string) {
    super(message);
    this.name = "InaturalistImportError";
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
    throw new InaturalistImportError(
      `iNaturalist devolvió un payload ${label} inválido`,
    );
  }
  return value as Record<string, unknown>;
}

function requiredText(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new InaturalistImportError(`iNaturalist no entregó ${label}`);
  }
  return value.trim();
}

function requiredNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new InaturalistImportError(`iNaturalist no entregó ${label}`);
  }
  return value;
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

/**
 * iNaturalist exposes short license codes. Keeping canonical URLs in the
 * database makes the review gate provider-independent and avoids treating a
 * missing code as permission to republish media.
 */
export function normalizeInaturalistLicense(value: unknown): string {
  const normalized =
    typeof value === "string" ? value.trim().toLowerCase() : "";
  if (
    !normalized ||
    normalized === "none" ||
    normalized === "all-rights-reserved"
  ) {
    return "all-rights-reserved";
  }
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return value as string;
  }
  const licenses: Record<string, string> = {
    cc0: "https://creativecommons.org/publicdomain/zero/1.0/",
    "cc-by": "https://creativecommons.org/licenses/by/4.0/",
    "cc-by-sa": "https://creativecommons.org/licenses/by-sa/4.0/",
    "cc-by-nc": "https://creativecommons.org/licenses/by-nc/4.0/",
    "cc-by-nd": "https://creativecommons.org/licenses/by-nd/4.0/",
    "cc-by-nc-sa": "https://creativecommons.org/licenses/by-nc-sa/4.0/",
    "cc-by-nc-nd": "https://creativecommons.org/licenses/by-nc-nd/4.0/",
  };
  return licenses[normalized] ?? normalized;
}

function chooseTaxon(
  results: InaturalistTaxonRecord[],
  requestedName: string,
): InaturalistTaxonRecord {
  const normalized = requestedName.trim().toLowerCase();
  const exact = results.find(
    (result) =>
      typeof result.name === "string" &&
      result.name.trim().toLowerCase() === normalized,
  );
  return exact ?? results[0]!;
}

function taxonProjection(
  record: InaturalistTaxonRecord,
  baseUrl: string,
): InaturalistTaxonProjection {
  const id = requiredNumber(record.id, "taxon id");
  const name = requiredText(record.name, "taxon name");
  const identifier = String(id);
  return {
    providerKey: "inaturalist",
    sourceRecordId: identifier,
    sourceUrl: `${baseUrl.replace(/\/$/, "")}/taxa/${identifier}`,
    scientificName: name,
    rank: normalizeRank(record.rank),
    taxonomicStatus: "accepted",
    externalIdentifier: {
      namespace: "inaturalist",
      identifier,
      canonicalUrl: `https://www.inaturalist.org/taxa/${identifier}`,
    },
  };
}

function observerAttribution(
  observation: InaturalistObservationRecord,
  retrievedAt: string,
): string {
  const id = observation.id ?? "sin-id";
  const login = observation.user?.login ?? observation.user?.name;
  return `iNaturalist observation ${id}${login ? `; observador: ${login}` : ""}; consultado ${retrievedAt.slice(0, 10)}`;
}

function mediaAttribution(
  media: InaturalistPhotoRecord | InaturalistSoundRecord,
  observation: InaturalistObservationRecord,
  retrievedAt: string,
): string {
  const id = media.id ?? "sin-id";
  const attribution =
    typeof media.attribution === "string" ? media.attribution.trim() : "";
  const observer = observation.user?.login ?? observation.user?.name;
  return `iNaturalist media ${id}${attribution ? `; ${attribution}` : observer ? `; observador: ${observer}` : ""}; consultado ${retrievedAt.slice(0, 10)}`;
}

function mediaIdentifier(
  media: InaturalistPhotoRecord | InaturalistSoundRecord,
): string | undefined {
  const candidates = [
    "original_url",
    "file_url",
    "url",
    "medium_url",
    "small_url",
  ] as const;
  for (const key of candidates) {
    const value = media[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function mediaSourceRecords(
  observation: InaturalistObservationRecord,
  retrievedAt: string,
  importerVersion: string,
): InaturalistSourceRecord[] {
  const observationId = requiredNumber(observation.id, "observation id");
  const records: InaturalistSourceRecord[] = [];
  const allMedia: Array<{
    kind: "photo" | "sound";
    value: InaturalistPhotoRecord | InaturalistSoundRecord;
    index: number;
  }> = [
    ...(observation.photos ?? []).map((value, index) => ({
      kind: "photo" as const,
      value,
      index,
    })),
    ...(observation.sounds ?? []).map((value, index) => ({
      kind: "sound" as const,
      value,
      index,
    })),
  ];
  for (const item of allMedia) {
    const id = item.value.id;
    const identifier = mediaIdentifier(item.value);
    if (!Number.isInteger(id) || !identifier) continue;
    const mediaId = String(id);
    const rawPayload = {
      observationId,
      mediaKind: item.kind,
      mediaIndex: item.index,
      media: item.value,
    } as Record<string, unknown>;
    records.push({
      source: "inaturalist",
      sourceRecordId: `${item.kind}:${mediaId}`,
      sourceUrl: `https://www.inaturalist.org/${item.kind === "photo" ? "photos" : "sounds"}/${mediaId}`,
      retrievedAt,
      license: normalizeInaturalistLicense(item.value.license_code),
      attribution: mediaAttribution(item.value, observation, retrievedAt),
      assertionType: "contemporary_observation",
      rawPayload,
      rawChecksum: checksumPayload(rawPayload),
      importerVersion,
      status: "pending",
    });
  }
  return records;
}

export function createInaturalistImporter(
  options: InaturalistImporterOptions = {},
) {
  const baseUrl = options.baseUrl ?? INATURALIST_API_BASE_URL;
  const fetchImpl = options.fetchImpl ?? fetch;
  const retrievedAt = options.retrievedAt ?? (() => new Date().toISOString());
  const importerVersion =
    options.importerVersion ?? INATURALIST_IMPORTER_VERSION;
  const perPage = Math.min(Math.max(options.perPage ?? 20, 1), 200);
  const page = Math.max(options.page ?? 1, 1);

  async function getJson(
    path: string,
    query: Record<string, string | number | boolean>,
  ): Promise<unknown> {
    const url = `${baseUrl.replace(/\/$/, "")}${path}?${new URLSearchParams(
      Object.entries(query).map(
        ([key, value]) => [key, String(value)] as [string, string],
      ),
    )}`;
    const response = await fetchImpl(url, {
      headers: {
        accept: "application/json",
        "user-agent": "WACHUMA-inaturalist-importer/0.1",
      },
    });
    if (!response.ok) {
      throw new InaturalistImportError(
        `iNaturalist request failed with HTTP ${response.status}: ${url}`,
      );
    }
    return response.json();
  }

  async function importSpecies(name: string): Promise<InaturalistImportResult> {
    const requestedName = requiredText(name, "un nombre científico");
    const taxonSearch = asObject(
      await getJson("/taxa", { q: requestedName, per_page: 10 }),
      "taxon search",
    ) as InaturalistTaxonSearchResponse;
    if (
      !Array.isArray(taxonSearch.results) ||
      taxonSearch.results.length === 0
    ) {
      throw new InaturalistImportError(
        `iNaturalist no encontró el taxón ${requestedName}`,
      );
    }
    const selectedTaxon = chooseTaxon(taxonSearch.results, requestedName);
    const taxon = taxonProjection(selectedTaxon, baseUrl);
    const retrieved = retrievedAt();
    const taxonPayload = { taxon: selectedTaxon } as Record<string, unknown>;
    const taxonRecord: InaturalistSourceRecord = {
      source: "inaturalist",
      sourceRecordId: `taxon:${taxon.externalIdentifier.identifier}`,
      sourceUrl: taxon.externalIdentifier.canonicalUrl,
      retrievedAt: retrieved,
      license: "per-record-review",
      attribution: `iNaturalist taxon ${taxon.externalIdentifier.identifier}; consultado ${retrieved.slice(0, 10)}`,
      assertionType: "taxonomic_fact",
      rawPayload: taxonPayload,
      rawChecksum: checksumPayload(taxonPayload),
      importerVersion,
      status: "pending",
    };

    const observationResponse = asObject(
      await getJson("/observations", {
        taxon_id: requiredNumber(selectedTaxon.id, "taxon id"),
        per_page: perPage,
        page,
        verifiable: true,
        order_by: "observed_on",
        order: "desc",
        ...(options.qualityGrade
          ? { quality_grade: options.qualityGrade }
          : {}),
        ...(options.observationLicense
          ? { license: options.observationLicense }
          : {}),
        ...(options.photoLicense
          ? { photo_license: options.photoLicense }
          : {}),
        ...(options.soundLicense
          ? { sound_license: options.soundLicense }
          : {}),
        ...(options.openGeoOnly
          ? { geoprivacy: "open", taxon_geoprivacy: "open" }
          : {}),
      }),
      "observation search",
    ) as InaturalistObservationSearchResponse;
    if (
      observationResponse.results !== undefined &&
      !Array.isArray(observationResponse.results)
    ) {
      throw new InaturalistImportError(
        "iNaturalist observations results no es un arreglo",
      );
    }

    const observationRecords: InaturalistSourceRecord[] = [];
    const mediaRecords: InaturalistSourceRecord[] = [];
    for (const observation of observationResponse.results ?? []) {
      const id = requiredNumber(observation.id, "observation id");
      const rawPayload = observation as Record<string, unknown>;
      observationRecords.push({
        source: "inaturalist",
        sourceRecordId: `observation:${id}`,
        sourceUrl:
          observation.uri ?? `https://www.inaturalist.org/observations/${id}`,
        retrievedAt: retrieved,
        license: normalizeInaturalistLicense(observation.license_code),
        attribution: observerAttribution(observation, retrieved),
        assertionType: "contemporary_observation",
        rawPayload,
        rawChecksum: checksumPayload(rawPayload),
        importerVersion,
        status: "pending",
      });
      mediaRecords.push(
        ...mediaSourceRecords(observation, retrieved, importerVersion),
      );
    }
    return {
      requestedName,
      taxon,
      taxonRecord,
      observationRecords,
      mediaRecords,
    };
  }

  return { importSpecies };
}
