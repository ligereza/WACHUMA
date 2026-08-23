import { z } from "zod";
import type { PublicId, Visibility } from "./types.js";
import type {
  Location,
  PublicCultivationEvent,
  SpecimenRecord,
} from "./domain.js";

const GeoJsonSchema = z
  .record(z.string(), z.unknown())
  .refine((value) => typeof value.type === "string", {
    message: "GeoJSON values need a type",
  });

const LocationFieldsSchema = z.object({
  name: z.string().trim().min(1).max(160),
  locationType: z.enum([
    "garden",
    "bed",
    "greenhouse",
    "shelf",
    "container",
    "lab",
    "other",
  ]),
  parentPublicId: z.string().trim().min(1).max(160).optional(),
  geometryPublic: GeoJsonSchema.optional(),
  geometryExact: GeoJsonSchema.optional(),
  visibility: z.enum([
    "public",
    "restricted",
    "sensitive",
    "community-controlled",
  ]),
  notes: z.string().max(4000).optional(),
});

export const AdminLocationCreateSchema = LocationFieldsSchema.extend({
  publicId: z
    .string()
    .min(1)
    .max(160)
    .regex(/^[a-z0-9][a-z0-9._-]{0,159}$/, "publicId must be URL-safe"),
});

export const AdminLocationUpdateSchema = LocationFieldsSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one location field is required",
);

export const AdminSpecimenCreateSchema = z.object({
  publicId: z
    .string()
    .min(1)
    .max(160)
    .regex(/^[a-z0-9][a-z0-9._-]{0,159}$/, "publicId must be URL-safe"),
  specimenType: z.enum([
    "plant-live",
    "cutting",
    "seed",
    "agar-culture",
    "liquid-culture",
    "spawn",
    "sample",
  ]),
  biologicalEntityPublicId: z.string().min(1).max(160),
  status: z.enum(["alive", "stored", "archived", "lost", "deceased"]),
  visibility: z.enum([
    "public",
    "restricted",
    "sensitive",
    "community-controlled",
  ]),
  acquiredAt: z.iso.datetime().optional(),
  notes: z.string().max(4000).optional(),
});

export const AdminSpecimenUpdateSchema = AdminSpecimenCreateSchema.omit({
  publicId: true,
})
  .partial()
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one specimen field is required",
  );

export const AdminSpecimenLocationSchema = z.object({
  locationPublicId: z.string().min(1).max(160),
  startsAt: z.iso.datetime().optional(),
});

export const AdminCultivationEventCreateSchema = z.object({
  specimenPublicId: z.string().min(1).max(160),
  locationPublicId: z.string().min(1).max(160).optional(),
  eventType: z.enum([
    "propagation",
    "watering",
    "feeding",
    "transplant",
    "pest",
    "disease",
    "fruiting",
    "harvest",
    "observation",
    "move",
    "other",
  ]),
  occurredAt: z.iso.datetime(),
  notes: z.string().max(4000).optional(),
  measurements: z.record(z.string(), z.unknown()).default({}),
  sourcePublicId: z.string().min(1).max(160).optional(),
});

const CulturalRelationFieldsSchema = z.object({
  publicId: z
    .string()
    .min(1)
    .max(160)
    .regex(/^[a-z0-9][a-z0-9._-]{0,159}$/, "publicId must be URL-safe"),
  relationType: z.enum([
    "vernacular_name",
    "food",
    "medicine",
    "ritual",
    "symbolism",
    "material",
    "cultivation",
    "trade",
    "mythology",
    "art",
    "archaeology",
    "ecological_management",
    "historical_account",
  ]),
  subjectPublicId: z.string().min(1).max(160),
  valueText: z.string().max(500).optional(),
  description: z.string().trim().min(1).max(8000),
  culturePublicId: z.string().min(1).max(160).nullable().optional(),
  communityPublicId: z.string().min(1).max(160).nullable().optional(),
  placePublicId: z.string().min(1).max(160).nullable().optional(),
  historicalPeriodPublicId: z.string().min(1).max(160).nullable().optional(),
  documentedByAgentPublicId: z.string().min(1).max(160).nullable().optional(),
  sourcePublicId: z.string().min(1).max(160),
  evidenceLevel: z.enum([
    "unverified",
    "reported",
    "documented",
    "peer-reviewed",
  ]),
  assertionType: z.enum([
    "taxonomic_fact",
    "contemporary_observation",
    "historical_source",
    "archaeological_evidence",
    "academic_publication",
    "community_knowledge",
    "editorial_interpretation",
  ]),
  authorPerspective: z.string().trim().min(1).max(2000),
  sensitivity: z.enum(["normal", "sensitive", "sacred"]),
  accessLevel: z.enum([
    "public",
    "restricted",
    "sensitive",
    "community-controlled",
  ]),
  license: z.string().trim().min(1).max(500),
  reviewNote: z.string().trim().min(1).max(4000).optional(),
  reviewStatus: z.enum(["draft", "under-review", "accepted", "rejected"]),
  recordedOn: z.iso.date().optional(),
});

const acceptedRelationGuard = <T extends z.ZodTypeAny>(schema: T) =>
  schema.refine(
    (value: z.infer<T>) => {
      const candidate = value as {
        accessLevel?: string;
        sensitivity?: string;
        reviewStatus?: string;
      };
      return (
        candidate.reviewStatus !== "accepted" ||
        (candidate.accessLevel === "public" &&
          candidate.sensitivity === "normal")
      );
    },
    {
      message:
        "Accepted cultural relations must be public and have normal sensitivity",
      path: ["reviewStatus"],
    },
  );

export const AdminCulturalRelationCreateSchema = acceptedRelationGuard(
  CulturalRelationFieldsSchema.refine(
    (value) => Boolean(value.culturePublicId || value.communityPublicId),
    {
      message: "A cultural relation needs a culture or community context",
      path: ["communityPublicId"],
    },
  ),
);
export const AdminCulturalRelationUpdateSchema = acceptedRelationGuard(
  CulturalRelationFieldsSchema.omit({ publicId: true, subjectPublicId: true })
    .partial()
    .refine(
      (value) => Object.keys(value).length > 0,
      "At least one cultural relation field is required",
    ),
);
export const AdminCulturalTakedownSchema = z.object({
  reason: z.string().trim().min(1).max(4000),
});

export type AdminLocationCreateInput = z.infer<
  typeof AdminLocationCreateSchema
>;
export type AdminLocationUpdateInput = z.infer<
  typeof AdminLocationUpdateSchema
>;
export type AdminSpecimenCreateInput = z.infer<
  typeof AdminSpecimenCreateSchema
>;
export type AdminSpecimenUpdateInput = z.infer<
  typeof AdminSpecimenUpdateSchema
>;
export type AdminSpecimenLocationInput = z.infer<
  typeof AdminSpecimenLocationSchema
>;
export type AdminCultivationEventCreateInput = z.infer<
  typeof AdminCultivationEventCreateSchema
>;
export type AdminCulturalRelationCreateInput = z.infer<
  typeof AdminCulturalRelationCreateSchema
>;
export type AdminCulturalRelationUpdateInput = z.infer<
  typeof AdminCulturalRelationUpdateSchema
>;
export type AdminCulturalTakedownInput = z.infer<
  typeof AdminCulturalTakedownSchema
>;

export interface AdminLocationRecord {
  publicId: PublicId;
  name: string;
  locationType: Location["locationType"];
  parentPublicId?: PublicId;
  geometryPublic?: Record<string, unknown>;
  visibility: Visibility;
  notes?: string;
}

export interface AdminSpecimenRecord {
  publicId: PublicId;
  specimenType: SpecimenRecord["specimenType"];
  biologicalEntityPublicId: PublicId;
  status: SpecimenRecord["status"];
  visibility: Visibility;
  acquiredAt?: string;
  notes?: string;
  currentLocationPublicId?: PublicId;
}

export type AdminCultivationEventRecord = PublicCultivationEvent;

export interface AdminCulturalRelationRecord {
  publicId: PublicId;
  subjectPublicId: PublicId;
  relationType: string;
  valueText?: string;
  description: string;
  culturePublicId?: PublicId;
  communityPublicId?: PublicId;
  placePublicId?: PublicId;
  historicalPeriodPublicId?: PublicId;
  documentedByAgentPublicId?: PublicId;
  documentedByName?: string;
  sourcePublicId: PublicId;
  evidenceLevel: string;
  assertionType: string;
  authorPerspective: string;
  sensitivity: "normal" | "sensitive" | "sacred";
  accessLevel: Visibility;
  license: string;
  reviewNote?: string;
  reviewStatus: "draft" | "under-review" | "accepted" | "rejected";
  recordedOn?: string;
}
