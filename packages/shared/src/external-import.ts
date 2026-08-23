import { z } from "zod";

export const ExternalProviderContractSchema = z.object({
  providerKey: z.enum([
    "gbif",
    "inaturalist",
    "wikidata",
    "fungaltraits",
    "ethnobotany",
  ]),
  sourceType: z.enum(["external_dataset", "community_knowledge"]),
  retrievalMode: z.enum(["api", "snapshot", "manual_review"]),
  requiresPerRecordLicense: z.boolean(),
  mediaPolicy: z.enum([
    "none",
    "per_record_license",
    "per_record_license_and_attribution",
    "manual_review_only",
  ]),
  communityReviewRequired: z.boolean(),
  defaultAssertionType: z.enum([
    "taxonomic_fact",
    "contemporary_observation",
    "historical_source",
    "archaeological_evidence",
    "academic_publication",
    "community_knowledge",
    "editorial_interpretation",
  ]),
  notes: z.string().min(1),
});

export type ExternalProviderContract = z.infer<
  typeof ExternalProviderContractSchema
>;

export const externalProviderContracts: ExternalProviderContract[] = [
  {
    providerKey: "gbif",
    sourceType: "external_dataset",
    retrievalMode: "api",
    requiresPerRecordLicense: true,
    mediaPolicy: "per_record_license_and_attribution",
    communityReviewRequired: false,
    defaultAssertionType: "contemporary_observation",
    notes:
      "Taxonomía, ocurrencias y descriptores multimedia quedan pending hasta revisión; la licencia de media no se hereda de la ocurrencia.",
  },
  {
    providerKey: "inaturalist",
    sourceType: "external_dataset",
    retrievalMode: "api",
    requiresPerRecordLicense: true,
    mediaPolicy: "per_record_license_and_attribution",
    communityReviewRequired: false,
    defaultAssertionType: "contemporary_observation",
    notes:
      "Cada observación y cada foto/sonido requieren licencia y atribución propias; all-rights-reserved no se descarga.",
  },
  {
    providerKey: "wikidata",
    sourceType: "external_dataset",
    retrievalMode: "api",
    requiresPerRecordLicense: false,
    mediaPolicy: "none",
    communityReviewRequired: false,
    defaultAssertionType: "taxonomic_fact",
    notes:
      "Se importan identificadores y claims estructurados CC0; no se copia texto de otros namespaces sin resolver su licencia.",
  },
  {
    providerKey: "fungaltraits",
    sourceType: "external_dataset",
    retrievalMode: "snapshot",
    requiresPerRecordLicense: true,
    mediaPolicy: "manual_review_only",
    communityReviewRequired: false,
    defaultAssertionType: "academic_publication",
    notes:
      "Traits funcionales se conservan como snapshot versionado con release, DOI, metadatos y fuente de cada medición.",
  },
  {
    providerKey: "ethnobotany",
    sourceType: "community_knowledge",
    retrievalMode: "manual_review",
    requiresPerRecordLicense: true,
    mediaPolicy: "manual_review_only",
    communityReviewRequired: true,
    defaultAssertionType: "community_knowledge",
    notes:
      "No se importa automáticamente: requiere comunidad identificada, perspectiva, territorio, restricciones y revisión/takedown.",
  },
];

export const ExternalSourceRecordSchema = z.object({
  source: z.string().min(1),
  sourceRecordId: z.string().min(1),
  sourceUrl: z.string().url().optional(),
  retrievedAt: z.iso.datetime(),
  license: z.string().min(1),
  attribution: z.string().min(1),
  assertionType: z.string().min(1),
  rawPayload: z.record(z.string(), z.unknown()),
  rawChecksum: z.string().optional(),
  importerVersion: z.string().min(1),
  status: z.enum(["pending", "accepted", "rejected", "superseded"]),
});

export type ExternalSourceRecord = z.infer<typeof ExternalSourceRecordSchema>;

export function normalizeExternalLicense(value: string | undefined): string {
  return (value ?? "unknown").trim().toLowerCase();
}

export function isPubliclyPublishableExternalMediaLicense(
  license: string | undefined,
): boolean {
  const normalized = normalizeExternalLicense(license);
  if (
    !normalized ||
    normalized === "unknown" ||
    normalized === "none" ||
    normalized.includes("all rights reserved")
  ) {
    return false;
  }
  return (
    normalized.includes("creativecommons.org/publicdomain/zero") ||
    normalized.includes("creativecommons.org/licenses/by/4.0") ||
    normalized === "cc0" ||
    normalized === "cc by 4.0"
  );
}

export function canPublishExternalMediaRecord(input: {
  license?: string;
  attribution?: string;
  identifier?: string;
}): boolean {
  return Boolean(
    input.identifier &&
    input.attribution?.trim() &&
    isPubliclyPublishableExternalMediaLicense(input.license),
  );
}
