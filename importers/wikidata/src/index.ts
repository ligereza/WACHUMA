import { createHash } from "node:crypto";

import type {
  AssertionType,
  ExternalSourceRecord,
  TaxonRank,
} from "@wachuma/shared";

export const WIKIDATA_API_BASE_URL = "https://www.wikidata.org/w/api.php";
export const WIKIDATA_ENTITY_BASE_URL = "https://www.wikidata.org/entity";
export const WIKIDATA_LICENSE_URI =
  "https://creativecommons.org/publicdomain/zero/1.0/";
export const WIKIDATA_IMPORTER_VERSION = "wikidata-v0.1.0";

const SELECTED_PROPERTIES = new Set([
  "P31", // instance of
  "P105", // taxon rank
  "P141", // conservation status
  "P171", // parent taxon
  "P225", // taxon name
  "P685", // NCBI taxonomy ID
  "P846", // GBIF taxon ID
  "P961", // IPNI plant name ID
  "P3151", // iNaturalist taxon ID
]);

const EXTERNAL_ID_PROPERTIES: Record<
  string,
  { namespace: string; canonicalUrl: (identifier: string) => string }
> = {
  P685: {
    namespace: "ncbi",
    canonicalUrl: (identifier) =>
      `https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id=${encodeURIComponent(identifier)}`,
  },
  P846: {
    namespace: "gbif",
    canonicalUrl: (identifier) =>
      `https://www.gbif.org/species/${encodeURIComponent(identifier)}`,
  },
  P961: {
    namespace: "ipni",
    canonicalUrl: (identifier) =>
      `https://www.ipni.org/n/${encodeURIComponent(identifier)}`,
  },
  P3151: {
    namespace: "inaturalist",
    canonicalUrl: (identifier) =>
      `https://www.inaturalist.org/taxa/${encodeURIComponent(identifier)}`,
  },
};

const TAXON_RANKS: Record<string, TaxonRank> = {
  Q7432: "species",
  Q34740: "genus",
  Q10811: "subspecies",
  Q68947: "variety",
  Q427626: "form",
  Q35409: "family",
  Q37517: "order",
  Q36732: "class",
  Q38348: "phylum",
  Q36774: "kingdom",
};

type WikibaseEntityValue = {
  "entity-type"?: string;
  "numeric-id"?: number;
  id?: string;
};

interface RawClaim {
  id?: string;
  rank?: string;
  mainsnak?: {
    snaktype?: string;
    datatype?: string;
    datavalue?: { value?: unknown };
  };
  references?: Array<{ hash?: string }>;
}

interface RawEntity {
  id?: string;
  claims?: Record<string, RawClaim[]>;
}

interface SearchResponse {
  search?: Array<{
    id?: string;
    label?: string;
    concepturi?: string;
  }>;
}

export interface WikidataStructuredClaim {
  property: string;
  claimId: string;
  rank: string;
  snakType: string;
  datatype: string;
  value: string | number | boolean | null;
  referenceHashes: string[];
}

export interface WikidataExternalIdentifier {
  property: string;
  namespace: string;
  identifier: string;
  canonicalUrl: string;
}

export interface WikidataTaxonProjection {
  providerKey: "wikidata";
  sourceRecordId: string;
  sourceUrl: string;
  scientificName: string;
  rank: TaxonRank;
  taxonomicStatus: "accepted" | "synonym" | "doubtful" | "unresolved";
  externalIdentifiers: WikidataExternalIdentifier[];
}

export interface WikidataSourceRecord extends ExternalSourceRecord {
  source: "wikidata";
  assertionType: AssertionType;
}

export interface WikidataImportResult {
  requestedName?: string;
  itemId: string;
  taxon: WikidataTaxonProjection;
  itemRecord: WikidataSourceRecord;
  claims: WikidataStructuredClaim[];
}

export interface WikidataSearchResult {
  id: string;
  label?: string;
  conceptUri?: string;
}

export interface WikidataImporterOptions {
  baseUrl?: string;
  entityBaseUrl?: string;
  language?: string;
  fetchImpl?: typeof fetch;
  retrievedAt?: () => string;
  importerVersion?: string;
  searchLimit?: number;
}

export class WikidataImportError extends Error {
  readonly code = "wikidata_import_error" as const;

  constructor(message: string) {
    super(message);
    this.name = "WikidataImportError";
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

function requiredText(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new WikidataImportError(`Wikidata no entregó ${label}`);
  }
  return value.trim();
}

function normalizeItemId(value: string): string {
  const itemId = value.trim().toUpperCase();
  if (!/^Q[1-9][0-9]*$/.test(itemId)) {
    throw new WikidataImportError(`ID de entidad Wikidata inválido: ${value}`);
  }
  return itemId;
}

function scalarValue(value: unknown): string | number | boolean | null {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const entity = value as WikibaseEntityValue;
    if (typeof entity.id === "string" && /^Q[1-9][0-9]*$/.test(entity.id)) {
      return entity.id;
    }
    if (
      entity["entity-type"] === "item" &&
      typeof entity["numeric-id"] === "number" &&
      Number.isInteger(entity["numeric-id"]) &&
      entity["numeric-id"] > 0
    ) {
      return `Q${entity["numeric-id"]}`;
    }
  }
  return null;
}

function selectedClaims(entity: RawEntity): WikidataStructuredClaim[] {
  const claims: WikidataStructuredClaim[] = [];
  for (const property of Array.from(SELECTED_PROPERTIES).sort()) {
    for (const claim of entity.claims?.[property] ?? []) {
      const snak = claim.mainsnak;
      if (!snak || snak.snaktype !== "value") continue;
      const value = scalarValue(snak.datavalue?.value);
      if (value === null && property !== "P141") continue;
      const claimId =
        typeof claim.id === "string" && claim.id.trim()
          ? claim.id.trim()
          : `${entity.id ?? "item"}\$${property}`;
      claims.push({
        property,
        claimId,
        rank: typeof claim.rank === "string" ? claim.rank : "normal",
        snakType: snak.snaktype,
        datatype: typeof snak.datatype === "string" ? snak.datatype : "unknown",
        value,
        referenceHashes: (claim.references ?? [])
          .map((reference) => reference.hash)
          .filter(
            (hash): hash is string =>
              typeof hash === "string" && Boolean(hash.trim()),
          )
          .sort(),
      });
    }
  }
  return claims;
}

function claimValue(
  claims: WikidataStructuredClaim[],
  property: string,
): string | undefined {
  const value = claims.find(
    (claim) => claim.property === property && typeof claim.value === "string",
  )?.value;
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeRank(claims: WikidataStructuredClaim[]): TaxonRank {
  const rankValue = claimValue(claims, "P105");
  return (rankValue && TAXON_RANKS[rankValue]) || "species";
}

function externalIdentifiers(
  itemId: string,
  claims: WikidataStructuredClaim[],
): WikidataExternalIdentifier[] {
  const identifiers: WikidataExternalIdentifier[] = [
    {
      property: "wikidata",
      namespace: "wikidata",
      identifier: itemId,
      canonicalUrl: `${WIKIDATA_ENTITY_BASE_URL}/${itemId}`,
    },
  ];
  for (const claim of claims) {
    const mapping = EXTERNAL_ID_PROPERTIES[claim.property];
    if (
      !mapping ||
      (typeof claim.value !== "string" && typeof claim.value !== "number")
    ) {
      continue;
    }
    const identifier = String(claim.value).trim();
    if (!identifier) continue;
    identifiers.push({
      property: claim.property,
      namespace: mapping.namespace,
      identifier,
      canonicalUrl: mapping.canonicalUrl(identifier),
    });
  }
  return Array.from(
    new Map(
      identifiers.map((identifier) => [
        `${identifier.namespace}:${identifier.identifier}`,
        identifier,
      ]),
    ).values(),
  );
}

export function createWikidataImporter(options: WikidataImporterOptions = {}) {
  const baseUrl = options.baseUrl ?? WIKIDATA_API_BASE_URL;
  const entityBaseUrl = options.entityBaseUrl ?? WIKIDATA_ENTITY_BASE_URL;
  const language = options.language ?? "en";
  const fetchImpl = options.fetchImpl ?? fetch;
  const retrievedAt = options.retrievedAt ?? (() => new Date().toISOString());
  const importerVersion = options.importerVersion ?? WIKIDATA_IMPORTER_VERSION;
  const searchLimit = Math.min(Math.max(options.searchLimit ?? 10, 1), 50);

  async function getJson(query: Record<string, string | number>) {
    const url = `${baseUrl.replace(/\/$/, "")}?${new URLSearchParams(
      Object.entries(query).map(
        ([key, value]) => [key, String(value)] as [string, string],
      ),
    )}`;
    const response = await fetchImpl(url, {
      headers: {
        accept: "application/json",
        "accept-encoding": "gzip, deflate",
        "user-agent": "WACHUMA-wikidata-importer/0.1 (open biocultural garden)",
      },
    });
    if (!response.ok) {
      throw new WikidataImportError(
        `Wikidata request failed with HTTP ${response.status}: ${url}`,
      );
    }
    return response.json() as Promise<unknown>;
  }

  async function searchItem(name: string): Promise<WikidataSearchResult[]> {
    const requestedName = requiredText(name, "un nombre científico");
    const response = (await getJson({
      action: "wbsearchentities",
      search: requestedName,
      language,
      type: "item",
      limit: searchLimit,
      format: "json",
      formatversion: 2,
    })) as SearchResponse;
    if (!Array.isArray(response.search)) {
      throw new WikidataImportError(
        "Wikidata search no devolvió resultados válidos",
      );
    }
    return response.search.flatMap((result) => {
      if (typeof result.id !== "string") return [];
      try {
        const id = normalizeItemId(result.id);
        return [
          {
            id,
            ...(typeof result.label === "string"
              ? { label: result.label }
              : {}),
            ...(typeof result.concepturi === "string"
              ? { conceptUri: result.concepturi }
              : {}),
          },
        ];
      } catch {
        return [];
      }
    });
  }

  async function fetchEntity(itemIdValue: string): Promise<RawEntity> {
    const itemId = normalizeItemId(itemIdValue);
    const response = (await getJson({
      action: "wbgetentities",
      ids: itemId,
      props: "claims|info",
      format: "json",
      formatversion: 2,
      maxlag: 5,
    })) as { entities?: RawEntity[] | Record<string, RawEntity> };
    const entities = response.entities;
    const entity = Array.isArray(entities)
      ? entities.find((candidate) => candidate?.id === itemId)
      : entities?.[itemId];
    if (!entity || typeof entity !== "object") {
      throw new WikidataImportError(
        `Wikidata no encontró la entidad ${itemId}`,
      );
    }
    return entity;
  }

  async function importItem(
    itemIdValue: string,
  ): Promise<WikidataImportResult> {
    const itemId = normalizeItemId(itemIdValue);
    const entity = await fetchEntity(itemId);
    const claims = selectedClaims(entity);
    const scientificName = claimValue(claims, "P225") ?? itemId;
    const identifiers = externalIdentifiers(itemId, claims);
    const retrieved = retrievedAt();
    const rawPayload = {
      itemId,
      claims,
    } as Record<string, unknown>;
    const itemRecord: WikidataSourceRecord = {
      source: "wikidata",
      sourceRecordId: `item:${itemId}`,
      sourceUrl: `${entityBaseUrl.replace(/\/$/, "")}/${itemId}`,
      retrievedAt: retrieved,
      license: WIKIDATA_LICENSE_URI,
      attribution: `Wikidata structured data; CC0; item ${itemId}; consultado ${retrieved.slice(0, 10)}`,
      assertionType: "taxonomic_fact",
      rawPayload,
      rawChecksum: checksumPayload(rawPayload),
      importerVersion,
      status: "pending",
    };
    return {
      itemId,
      taxon: {
        providerKey: "wikidata",
        sourceRecordId: itemRecord.sourceRecordId,
        sourceUrl: itemRecord.sourceUrl!,
        scientificName,
        rank: normalizeRank(claims),
        taxonomicStatus: "unresolved",
        externalIdentifiers: identifiers,
      },
      itemRecord,
      claims,
    };
  }

  async function importSpecies(name: string): Promise<WikidataImportResult> {
    const requestedName = requiredText(name, "un nombre científico");
    const results = await searchItem(requestedName);
    if (results.length === 0) {
      throw new WikidataImportError(
        `Wikidata no encontró el taxón ${requestedName}`,
      );
    }
    const normalized = requestedName.toLowerCase();
    const selected =
      results.find(
        (result) => result.label?.trim().toLowerCase() === normalized,
      ) ?? results[0]!;
    const imported = await importItem(selected.id);
    return { ...imported, requestedName };
  }

  return { searchItem, importItem, importSpecies };
}
