import type { Sql } from "postgres";
import type { PublicCulturalRelation } from "@wachuma/shared";

type CulturalRow = {
  public_id: string;
  subject_public_id: string;
  relation_type: string;
  value_text: string | null;
  description: string;
  culture_public_id: string | null;
  community_public_id: string | null;
  community_name: string | null;
  place_public_id: string | null;
  place_name: string | null;
  historical_period_public_id: string | null;
  historical_period: string | null;
  documented_by_agent_public_id: string | null;
  documented_by_name: string | null;
  recorded_on: string | null;
  source_public_id: string;
  evidence_level: string;
  author_perspective: string;
  sensitivity: PublicCulturalRelation["sensitivity"];
  access_level: "public";
  license_uri: string;
  review_status: "accepted";
};

function toRelation(row: CulturalRow): PublicCulturalRelation {
  return {
    publicId: row.public_id as PublicCulturalRelation["publicId"],
    subjectPublicId:
      row.subject_public_id as PublicCulturalRelation["subjectPublicId"],
    relationType: row.relation_type,
    ...(row.value_text ? { valueText: row.value_text } : {}),
    description: row.description,
    ...(row.culture_public_id
      ? {
          culturePublicId: row.culture_public_id as NonNullable<
            PublicCulturalRelation["culturePublicId"]
          >,
        }
      : {}),
    ...(row.community_public_id
      ? {
          communityPublicId: row.community_public_id as NonNullable<
            PublicCulturalRelation["communityPublicId"]
          >,
        }
      : {}),
    ...(row.community_name ? { communityName: row.community_name } : {}),
    ...(row.place_public_id
      ? {
          placePublicId: row.place_public_id as NonNullable<
            PublicCulturalRelation["placePublicId"]
          >,
        }
      : {}),
    ...(row.place_name ? { placeName: row.place_name } : {}),
    ...(row.historical_period_public_id
      ? {
          historicalPeriodPublicId:
            row.historical_period_public_id as NonNullable<
              PublicCulturalRelation["historicalPeriodPublicId"]
            >,
        }
      : {}),
    ...(row.historical_period
      ? { historicalPeriod: row.historical_period }
      : {}),
    ...(row.documented_by_agent_public_id
      ? {
          documentedByAgentPublicId:
            row.documented_by_agent_public_id as NonNullable<
              PublicCulturalRelation["documentedByAgentPublicId"]
            >,
        }
      : {}),
    ...(row.documented_by_name
      ? { documentedByName: row.documented_by_name }
      : {}),
    ...(row.recorded_on ? { recordedOn: row.recorded_on } : {}),
    sourcePublicId:
      row.source_public_id as PublicCulturalRelation["sourcePublicId"],
    evidenceLevel: row.evidence_level,
    authorPerspective: row.author_perspective,
    sensitivity: row.sensitivity,
    accessLevel: row.access_level,
    license: row.license_uri,
    reviewStatus: row.review_status,
  };
}

export function createCultureRepository(sql: Sql) {
  return {
    async listPublicRelations(
      subjectPublicId?: string,
    ): Promise<PublicCulturalRelation[]> {
      const rows = subjectPublicId
        ? await sql<CulturalRow[]>`
            SELECT
              cr.public_id,
              COALESCE(be.public_id, t.public_id) AS subject_public_id,
              cr.relation_type,
              cr.value_text,
              cr.description,
              cultural_material.public_id AS culture_public_id,
              c.public_id AS community_public_id,
              c.name AS community_name,
              p.public_id AS place_public_id,
              p.name AS place_name,
              hp.public_id AS historical_period_public_id,
              hp.name AS historical_period,
              documented_by.public_id AS documented_by_agent_public_id,
              documented_by.public_name AS documented_by_name,
              cr.recorded_on,
              s.public_id AS source_public_id,
              cr.evidence_level,
              cr.author_perspective,
              cr.sensitivity,
              cr.access_level,
              cr.license_uri,
              cr.review_status
            FROM cultural_relations AS cr
            JOIN sources AS s ON s.id = cr.source_id
            LEFT JOIN taxa AS t ON t.id = cr.taxon_id
            LEFT JOIN biological_entities AS be ON be.id = cr.biological_entity_id
            LEFT JOIN cultures AS cultural_material
              ON cultural_material.id = cr.culture_id
            LEFT JOIN communities AS c
              ON c.id = cr.community_id
             AND c.visibility = 'public'
            LEFT JOIN places AS p
              ON p.id = cr.place_id
             AND p.visibility = 'public'
            LEFT JOIN historical_periods AS hp ON hp.id = cr.historical_period_id
            LEFT JOIN agents AS documented_by
              ON documented_by.id = cr.documented_by_agent_id
             AND documented_by.is_public = true
            LEFT JOIN specimens AS culture_specimen
              ON culture_specimen.id = cultural_material.specimen_id
            LEFT JOIN biological_entities AS culture_entity
              ON culture_entity.id = culture_specimen.biological_entity_id
            WHERE cr.access_level = 'public'
              AND cr.review_status = 'accepted'
              AND cr.sensitivity = 'normal'
              AND (cr.community_id IS NULL OR c.id IS NOT NULL)
              AND (cr.culture_id IS NULL OR culture_specimen.visibility = 'public')
              AND (cr.culture_id IS NULL OR culture_entity.visibility = 'public')
              AND (cr.place_id IS NULL OR p.id IS NOT NULL)
              AND COALESCE(be.public_id, t.public_id) = ${subjectPublicId}
            ORDER BY cr.public_id ASC
          `
        : await sql<CulturalRow[]>`
            SELECT
              cr.public_id,
              COALESCE(be.public_id, t.public_id) AS subject_public_id,
              cr.relation_type,
              cr.value_text,
              cr.description,
              cultural_material.public_id AS culture_public_id,
              c.public_id AS community_public_id,
              c.name AS community_name,
              p.public_id AS place_public_id,
              p.name AS place_name,
              hp.public_id AS historical_period_public_id,
              hp.name AS historical_period,
              documented_by.public_id AS documented_by_agent_public_id,
              documented_by.public_name AS documented_by_name,
              cr.recorded_on,
              s.public_id AS source_public_id,
              cr.evidence_level,
              cr.author_perspective,
              cr.sensitivity,
              cr.access_level,
              cr.license_uri,
              cr.review_status
            FROM cultural_relations AS cr
            JOIN sources AS s ON s.id = cr.source_id
            LEFT JOIN taxa AS t ON t.id = cr.taxon_id
            LEFT JOIN biological_entities AS be ON be.id = cr.biological_entity_id
            LEFT JOIN cultures AS cultural_material
              ON cultural_material.id = cr.culture_id
            LEFT JOIN communities AS c
              ON c.id = cr.community_id
             AND c.visibility = 'public'
            LEFT JOIN places AS p
              ON p.id = cr.place_id
             AND p.visibility = 'public'
            LEFT JOIN historical_periods AS hp ON hp.id = cr.historical_period_id
            LEFT JOIN agents AS documented_by
              ON documented_by.id = cr.documented_by_agent_id
             AND documented_by.is_public = true
            LEFT JOIN specimens AS culture_specimen
              ON culture_specimen.id = cultural_material.specimen_id
            LEFT JOIN biological_entities AS culture_entity
              ON culture_entity.id = culture_specimen.biological_entity_id
            WHERE cr.access_level = 'public'
              AND cr.review_status = 'accepted'
              AND cr.sensitivity = 'normal'
              AND (cr.community_id IS NULL OR c.id IS NOT NULL)
              AND (cr.culture_id IS NULL OR culture_specimen.visibility = 'public')
              AND (cr.culture_id IS NULL OR culture_entity.visibility = 'public')
              AND (cr.place_id IS NULL OR p.id IS NOT NULL)
            ORDER BY cr.public_id ASC
            LIMIT 100
          `;
      return rows.map(toRelation);
    },
  };
}
