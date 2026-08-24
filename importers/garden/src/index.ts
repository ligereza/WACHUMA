import {
  AdminGardenSpecimenIntakeSchema,
  type AdminGardenSpecimenIntakeInput,
} from "@wachuma/shared";
import { z } from "zod";

export const GARDEN_LEDGER_SCHEMA_VERSION = "1.0" as const;
export const GARDEN_LEDGER_IMPORTER_VERSION = "garden-ledger-v0.1.0";

const PublicIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9][a-z0-9._-]{0,159}$/, "publicId must be URL-safe");

const NonPublicVisibilitySchema = z.enum([
  "restricted",
  "sensitive",
  "community-controlled",
]);

const LedgerRecordSchema = z.object({
  publicId: PublicIdSchema,
  specimenType: z.enum([
    "plant-live",
    "cutting",
    "seed",
    "agar-culture",
    "liquid-culture",
    "spawn",
    "sample",
  ]),
  biologicalEntityPublicId: z.string().trim().min(1).max(160),
  status: z.enum(["alive", "stored", "archived", "lost", "deceased"]),
  visibility: NonPublicVisibilitySchema,
  acquiredAt: z.iso.datetime().optional(),
  notes: z.string().max(4000).optional(),
  sourceRecordId: z.string().trim().min(1).max(512),
  sourceUrl: z.url().optional(),
  retrievedAt: z.iso.datetime().optional(),
  license: z.string().trim().min(1).max(500).optional(),
  attribution: z.string().trim().min(1).max(2000).optional(),
  importerVersion: z.string().trim().min(1).max(160).optional(),
  assertionType: z
    .enum(["contemporary_observation", "editorial_interpretation"])
    .default("contemporary_observation"),
  rawPayload: z.record(z.string(), z.unknown()),
});

export const GardenLedgerManifestSchema = z.object({
  schemaVersion: z.literal(GARDEN_LEDGER_SCHEMA_VERSION),
  sourcePublicId: PublicIdSchema,
  sourceUrl: z.url().optional(),
  retrievedAt: z.iso.datetime(),
  license: z.string().trim().min(1).max(500),
  attribution: z.string().trim().min(1).max(2000),
  importerVersion: z
    .string()
    .trim()
    .min(1)
    .max(160)
    .default(GARDEN_LEDGER_IMPORTER_VERSION),
  records: z.array(LedgerRecordSchema),
});

export type GardenLedgerManifest = z.infer<typeof GardenLedgerManifestSchema>;
export type GardenLedgerRecord = z.infer<typeof LedgerRecordSchema>;

export interface GardenLedgerImportResult {
  schemaVersion: typeof GARDEN_LEDGER_SCHEMA_VERSION;
  sourcePublicId: string;
  recordCount: number;
  records: AdminGardenSpecimenIntakeInput[];
}

export interface GardenLedgerApplyResult {
  applied: Array<{
    index: number;
    publicId: string;
    sourceRecordStatus: string;
    created: boolean;
  }>;
}

export interface GardenLedgerApplyOptions {
  apiUrl: string;
  token: string;
  fetchImpl?: typeof fetch;
}

export class GardenLedgerImportError extends Error {
  readonly code = "garden_ledger_import_error" as const;

  constructor(message: string) {
    super(message);
    this.name = "GardenLedgerImportError";
  }
}

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "manifest";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
}

function parseManifest(input: unknown): GardenLedgerManifest {
  const result = GardenLedgerManifestSchema.safeParse(input);
  if (!result.success) {
    throw new GardenLedgerImportError(
      `Invalid garden ledger: ${formatIssues(result.error)}`,
    );
  }
  return result.data;
}

function duplicateKey(
  sourcePublicId: string,
  sourceRecordId: string,
  retrievedAt: string,
): string {
  return `${sourcePublicId}\u001f${sourceRecordId}\u001f${retrievedAt}`;
}

function makeProvenance(
  manifest: GardenLedgerManifest,
  record: GardenLedgerRecord,
): AdminGardenSpecimenIntakeInput["provenance"] {
  const sourceUrl = record.sourceUrl ?? manifest.sourceUrl;
  return {
    sourceRecordId: record.sourceRecordId,
    ...(sourceUrl ? { sourceUrl } : {}),
    retrievedAt: record.retrievedAt ?? manifest.retrievedAt,
    license: record.license ?? manifest.license,
    attribution: record.attribution ?? manifest.attribution,
    rawPayload: record.rawPayload,
    importerVersion: record.importerVersion ?? manifest.importerVersion,
    assertionType: record.assertionType,
    sourcePublicId: manifest.sourcePublicId,
  };
}

export function parseGardenLedger(input: unknown): GardenLedgerImportResult {
  const manifest = parseManifest(input);
  const publicIds = new Set<string>();
  const sourceRecordKeys = new Set<string>();
  const records: AdminGardenSpecimenIntakeInput[] = [];

  for (const [index, record] of manifest.records.entries()) {
    if (publicIds.has(record.publicId)) {
      throw new GardenLedgerImportError(
        `Duplicate specimen publicId at records.${index}: ${record.publicId}`,
      );
    }
    publicIds.add(record.publicId);

    const retrievedAt = record.retrievedAt ?? manifest.retrievedAt;
    const key = duplicateKey(
      manifest.sourcePublicId,
      record.sourceRecordId,
      retrievedAt,
    );
    if (sourceRecordKeys.has(key)) {
      throw new GardenLedgerImportError(
        `Duplicate source record key at records.${index}: ${record.sourceRecordId} @ ${retrievedAt}`,
      );
    }
    sourceRecordKeys.add(key);

    const candidate = {
      publicId: record.publicId,
      specimenType: record.specimenType,
      biologicalEntityPublicId: record.biologicalEntityPublicId,
      status: record.status,
      visibility: record.visibility,
      ...(record.acquiredAt ? { acquiredAt: record.acquiredAt } : {}),
      ...(record.notes ? { notes: record.notes } : {}),
      provenance: makeProvenance(manifest, record),
    };
    const parsed = AdminGardenSpecimenIntakeSchema.safeParse(candidate);
    if (!parsed.success) {
      throw new GardenLedgerImportError(
        `Invalid specimen at records.${index}: ${formatIssues(parsed.error)}`,
      );
    }
    records.push(parsed.data);
  }

  return {
    schemaVersion: manifest.schemaVersion,
    sourcePublicId: manifest.sourcePublicId,
    recordCount: records.length,
    records,
  };
}

export function parseGardenLedgerJson(json: string): GardenLedgerImportResult {
  let input: unknown;
  try {
    input = JSON.parse(json) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid JSON";
    throw new GardenLedgerImportError(`Invalid garden ledger JSON: ${message}`);
  }
  return parseGardenLedger(input);
}

function responseMessage(status: number, body: unknown): string {
  if (body && typeof body === "object" && !Array.isArray(body)) {
    const message = (body as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }
  return `HTTP ${status}`;
}

export async function applyGardenLedger(
  batch: GardenLedgerImportResult,
  options: GardenLedgerApplyOptions,
): Promise<GardenLedgerApplyResult> {
  if (!options.token.trim()) {
    throw new GardenLedgerImportError(
      "A non-empty admin token is required to apply a garden ledger",
    );
  }

  const apiUrl = options.apiUrl.replace(/\/$/, "");
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const applied: GardenLedgerApplyResult["applied"] = [];

  for (const [index, record] of batch.records.entries()) {
    const response = await fetchImpl(
      `${apiUrl}/api/v1/admin/garden/intake/specimens`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${options.token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(record),
      },
    );
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    if (!response.ok) {
      throw new GardenLedgerImportError(
        `Garden ledger record ${index + 1} failed: ${responseMessage(response.status, body)}`,
      );
    }
    const result =
      body && typeof body === "object" && !Array.isArray(body)
        ? (body as {
            specimen?: { publicId?: unknown };
            sourceRecordStatus?: unknown;
            created?: unknown;
          })
        : {};
    applied.push({
      index: index + 1,
      publicId:
        typeof result.specimen?.publicId === "string"
          ? result.specimen.publicId
          : record.publicId,
      sourceRecordStatus:
        typeof result.sourceRecordStatus === "string"
          ? result.sourceRecordStatus
          : "unknown",
      created: result.created === true,
    });
  }

  return { applied };
}
