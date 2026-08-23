import { z } from "zod";
import { ValidationError } from "./errors.js";
import { validateClaimPublication } from "./knowledge-validation.js";

const publicIdPattern = /^[a-z0-9][a-z0-9._-]{0,159}$/;

export const PublicIdSchema = z
  .string()
  .min(1)
  .max(160)
  .regex(publicIdPattern, "publicId must be URL-safe");

export const PublicIdParamsSchema = z.object({
  publicId: PublicIdSchema,
});

export const SpeciesListQuerySchema = z.object({
  search: z.string().trim().min(1).max(160).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});

export const VisibilitySchema = z.enum([
  "public",
  "restricted",
  "sensitive",
  "community-controlled",
]);

export const AssertionTypeSchema = z.enum([
  "taxonomic_fact",
  "contemporary_observation",
  "historical_source",
  "archaeological_evidence",
  "academic_publication",
  "community_knowledge",
  "editorial_interpretation",
]);

export const EvidenceLevelSchema = z.enum([
  "unverified",
  "reported",
  "documented",
  "peer-reviewed",
  "community-verified",
  "modeled",
]);

export const ReviewStatusSchema = z.enum([
  "draft",
  "under-review",
  "accepted",
  "rejected",
  "superseded",
]);

export const ClaimSubjectTypeSchema = z.enum([
  "taxon",
  "biological_entity",
  "specimen",
  "culture",
  "observation",
  "place",
  "cultural_relation",
  "growing_guide",
  "media",
]);

export const ClaimInputSchema = z
  .object({
    publicId: PublicIdSchema,
    subjectType: ClaimSubjectTypeSchema,
    subjectId: z.uuid(),
    predicate: z.string().trim().min(1).max(160),
    objectType: z.string().trim().min(1).max(160).optional(),
    objectId: z.uuid().optional(),
    objectUri: z.url().optional(),
    objectText: z.string().trim().min(1).max(4000).optional(),
    value: z.record(z.string(), z.unknown()).optional(),
    assertionType: AssertionTypeSchema,
    evidenceLevel: EvidenceLevelSchema,
    authorAgentId: z.uuid().optional(),
    sourceId: z.uuid(),
    sourceRecordId: z.uuid().optional(),
    authorPerspective: z.string().trim().min(1).max(1000).optional(),
    recordedOn: z.iso.date().optional(),
    visibility: VisibilitySchema,
    license: z.string().min(1),
    reviewStatus: ReviewStatusSchema,
  })
  .superRefine((input, context) => {
    const objectCount = [
      input.objectId,
      input.objectUri,
      input.objectText,
      input.value,
    ].filter((value) => value !== undefined).length;
    if (objectCount !== 1) {
      context.addIssue({
        code: "custom",
        message: "Exactly one claim object/value is required",
        path: ["objectText"],
      });
    }
    for (const issue of validateClaimPublication(input)) {
      context.addIssue({
        code: "custom",
        message: issue.message,
        path: [
          issue.code === "public_claim_unknown_license"
            ? "license"
            : "reviewStatus",
        ],
      });
    }
  });

export const DerivationEventTypeSchema = z.enum([
  "parenting",
  "cutting",
  "cloning",
  "seed_collection",
  "culture_transfer",
  "isolation",
  "crossing",
  "grafting",
  "spawn_transfer",
  "other",
]);

export const ProtocolTypeSchema = z.enum([
  "observation",
  "cultivation",
  "community",
  "identification",
  "measurement",
]);

export const ProvenanceInputSchema = z.object({
  source: z.string().min(1),
  sourceRecordId: z.string().min(1),
  sourceUrl: z.url().optional(),
  retrievedAt: z.iso.datetime(),
  license: z.string().min(1),
  attribution: z.string().min(1),
  assertionType: AssertionTypeSchema,
  rawPayload: z.record(z.string(), z.unknown()),
  rawChecksum: z.string().min(1).optional(),
  importerVersion: z.string().min(1),
});

export const ExternalIdentifierInputSchema = z.object({
  namespace: z.string().min(1).max(64),
  identifier: z.string().min(1).max(512),
  canonicalUrl: z.url().optional(),
  retrievedAt: z.iso.datetime().optional(),
});

export type PublicIdParams = z.infer<typeof PublicIdParamsSchema>;
export type SpeciesListQuery = z.infer<typeof SpeciesListQuerySchema>;
export type ProvenanceInput = z.infer<typeof ProvenanceInputSchema>;
export type ExternalIdentifierInput = z.infer<
  typeof ExternalIdentifierInputSchema
>;
export type ClaimInput = z.infer<typeof ClaimInputSchema>;

export function parsePublicIdParams(input: unknown): PublicIdParams {
  const result = PublicIdParamsSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError("Invalid public identifier", {
      issues: result.error.issues,
    });
  }
  return result.data;
}

export function parseSpeciesListQuery(input: unknown): SpeciesListQuery {
  const result = SpeciesListQuerySchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError("Invalid species query", {
      issues: result.error.issues,
    });
  }
  return result.data;
}
