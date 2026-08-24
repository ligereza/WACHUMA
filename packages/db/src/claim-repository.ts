import type { Sql } from "postgres";
import type { Claim } from "@wachuma/shared";

type ClaimRow = {
  id: string;
  public_id: string;
  subject_type: Claim["subjectType"];
  subject_id: string;
  subject_public_id: string | null;
  predicate: string;
  object_type: string | null;
  object_id: string | null;
  object_uri: string | null;
  object_text: string | null;
  value_json: Record<string, unknown> | null;
  assertion_type: Claim["assertionType"];
  evidence_level: Claim["evidenceLevel"];
  author_agent_id: string | null;
  source_id: string;
  source_public_id: string | null;
  source_record_id: string | null;
  author_perspective: string | null;
  recorded_on: string | null;
  license_uri: string;
  review_status: Claim["reviewStatus"];
};

function toClaim(row: ClaimRow): Claim & { subjectPublicId?: string } {
  return {
    id: row.id as Claim["id"],
    publicId: row.public_id as Claim["publicId"],
    subjectType: row.subject_type,
    subjectId: row.subject_id as Claim["subjectId"],
    ...(row.subject_public_id
      ? { subjectPublicId: row.subject_public_id }
      : {}),
    predicate: row.predicate,
    ...(row.object_type ? { objectType: row.object_type } : {}),
    ...(row.object_id
      ? { objectId: row.object_id as NonNullable<Claim["objectId"]> }
      : {}),
    ...(row.object_uri ? { objectUri: row.object_uri } : {}),
    ...(row.object_text ? { objectText: row.object_text } : {}),
    ...(row.value_json ? { value: row.value_json } : {}),
    assertionType: row.assertion_type,
    evidenceLevel: row.evidence_level,
    ...(row.author_agent_id
      ? {
          authorAgentId: row.author_agent_id as NonNullable<
            Claim["authorAgentId"]
          >,
        }
      : {}),
    sourceId: row.source_id as Claim["sourceId"],
    ...(row.source_public_id
      ? {
          sourcePublicId: row.source_public_id as NonNullable<
            Claim["sourcePublicId"]
          >,
        }
      : {}),
    ...(row.source_record_id
      ? {
          sourceRecordId: row.source_record_id as NonNullable<
            Claim["sourceRecordId"]
          >,
        }
      : {}),
    ...(row.author_perspective
      ? { authorPerspective: row.author_perspective }
      : {}),
    ...(row.recorded_on ? { recordedOn: row.recorded_on } : {}),
    visibility: "public",
    license: row.license_uri,
    reviewStatus: row.review_status,
  };
}

export function createClaimRepository(sql: Sql) {
  return {
    async listPublicClaims(
      subjectPublicId?: string,
      limit = 100,
    ): Promise<Array<Claim & { subjectPublicId?: string }>> {
      const safeLimit = Math.min(Math.max(limit, 1), 500);
      const rows = await sql<ClaimRow[]>`
        SELECT
          claim.id,
          claim.public_id,
          claim.subject_type,
          claim.subject_id,
          CASE claim.subject_type
            WHEN 'taxon' THEN subject_taxon.public_id
            WHEN 'biological_entity' THEN subject_entity.public_id
            WHEN 'specimen' THEN subject_specimen.public_id
            WHEN 'culture' THEN subject_culture.public_id
            WHEN 'observation' THEN subject_observation.public_id
            WHEN 'place' THEN subject_place.public_id
            WHEN 'cultural_relation' THEN subject_relation.public_id
            WHEN 'growing_guide' THEN subject_guide.public_id
            WHEN 'media' THEN subject_media.uri
            ELSE NULL
          END AS subject_public_id,
          claim.predicate,
          claim.object_type,
          claim.object_id,
          claim.object_uri,
          claim.object_text,
          claim.value_json,
          claim.assertion_type,
          claim.evidence_level,
          claim.author_agent_id,
          claim.source_id,
          source.public_id AS source_public_id,
          claim.source_record_id,
          claim.author_perspective,
          claim.recorded_on,
          claim.license_uri,
          claim.review_status
        FROM claims AS claim
        LEFT JOIN taxa AS subject_taxon
          ON claim.subject_type = 'taxon' AND subject_taxon.id = claim.subject_id
        LEFT JOIN biological_entities AS subject_entity
          ON claim.subject_type = 'biological_entity' AND subject_entity.id = claim.subject_id
        LEFT JOIN specimens AS subject_specimen
          ON claim.subject_type = 'specimen' AND subject_specimen.id = claim.subject_id
        LEFT JOIN cultures AS subject_culture
          ON claim.subject_type = 'culture' AND subject_culture.id = claim.subject_id
        LEFT JOIN observations AS subject_observation
          ON claim.subject_type = 'observation' AND subject_observation.id = claim.subject_id
        LEFT JOIN places AS subject_place
          ON claim.subject_type = 'place' AND subject_place.id = claim.subject_id
        LEFT JOIN cultural_relations AS subject_relation
          ON claim.subject_type = 'cultural_relation' AND subject_relation.id = claim.subject_id
        LEFT JOIN growing_guides AS subject_guide
          ON claim.subject_type = 'growing_guide' AND subject_guide.id = claim.subject_id
        LEFT JOIN media AS subject_media
          ON claim.subject_type = 'media' AND subject_media.id = claim.subject_id
        JOIN sources AS source ON source.id = claim.source_id
        WHERE claim.visibility = 'public'
          AND claim.review_status = 'accepted'
          AND (
            claim.subject_type = 'taxon'
            OR (claim.subject_type = 'biological_entity' AND subject_entity.visibility = 'public')
            OR (claim.subject_type = 'specimen' AND subject_specimen.visibility = 'public')
            OR (claim.subject_type = 'culture' AND EXISTS (
              SELECT 1 FROM specimens AS culture_specimen
              WHERE culture_specimen.id = subject_culture.specimen_id
                AND culture_specimen.visibility = 'public'
            ))
            OR (claim.subject_type = 'observation' AND subject_observation.visibility = 'public')
            OR (claim.subject_type = 'place' AND subject_place.visibility = 'public')
            OR (claim.subject_type = 'cultural_relation'
              AND subject_relation.access_level = 'public'
              AND subject_relation.review_status = 'accepted')
            OR (claim.subject_type = 'growing_guide' AND subject_guide.status = 'published')
            OR (claim.subject_type = 'media' AND subject_media.visibility = 'public')
          )
          AND (
            ${subjectPublicId ?? null}::text IS NULL
            OR CASE claim.subject_type
              WHEN 'taxon' THEN subject_taxon.public_id
              WHEN 'biological_entity' THEN subject_entity.public_id
              WHEN 'specimen' THEN subject_specimen.public_id
              WHEN 'culture' THEN subject_culture.public_id
              WHEN 'observation' THEN subject_observation.public_id
              WHEN 'place' THEN subject_place.public_id
              WHEN 'cultural_relation' THEN subject_relation.public_id
              WHEN 'growing_guide' THEN subject_guide.public_id
              ELSE NULL
            END = ${subjectPublicId ?? null}::text
            OR (
              claim.subject_type = 'taxon'
              AND subject_taxon.id = (
                SELECT linked_entity.taxon_id
                FROM biological_entities AS linked_entity
                WHERE linked_entity.public_id = ${subjectPublicId ?? null}::text
                  AND linked_entity.visibility = 'public'
                LIMIT 1
              )
            )
          )
        ORDER BY claim.recorded_on DESC NULLS LAST, claim.created_at DESC
        LIMIT ${safeLimit}
      `;
      return rows.map(toClaim);
    },
  };
}
