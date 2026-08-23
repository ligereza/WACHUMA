import type { Sql } from "postgres";
import type { GrowingGuide, Id, PublicId } from "@wachuma/shared";

type GuideRow = {
  id: string;
  public_id: string;
  guide_key: string;
  version: number;
  title: string;
  taxon_id: string | null;
  biological_entity_id: string | null;
  subject_public_id: string | null;
  climate_context: string | null;
  technique_context: string | null;
  region_context: string | null;
  status: GrowingGuide["status"];
  summary: string | null;
};

type ClaimRow = {
  id: string;
  section_key: GrowingGuide["claims"][number]["sectionKey"];
  statement: string;
  evidence_level: string;
  source_id: string | null;
  assertion_type: GrowingGuide["claims"][number]["assertionType"];
};

function toGuide(row: GuideRow, claims: ClaimRow[]): GrowingGuide {
  return {
    id: row.id as GrowingGuide["id"],
    publicId: row.public_id as GrowingGuide["publicId"],
    guideKey: row.guide_key,
    version: row.version,
    title: row.title,
    ...(row.taxon_id ? { taxonId: row.taxon_id as Id } : {}),
    ...(row.biological_entity_id
      ? {
          biologicalEntityId: row.biological_entity_id as Id,
        }
      : {}),
    ...(row.subject_public_id
      ? { subjectPublicId: row.subject_public_id as PublicId }
      : {}),
    ...(row.climate_context ? { climateContext: row.climate_context } : {}),
    ...(row.technique_context
      ? { techniqueContext: row.technique_context }
      : {}),
    ...(row.region_context ? { regionContext: row.region_context } : {}),
    status: row.status,
    ...(row.summary ? { summary: row.summary } : {}),
    claims: claims.map((claim) => ({
      id: claim.id as GrowingGuide["claims"][number]["id"],
      sectionKey: claim.section_key,
      statement: claim.statement,
      evidenceLevel: claim.evidence_level,
      ...(claim.source_id
        ? {
            sourceId: claim.source_id as Id,
          }
        : {}),
      assertionType: claim.assertion_type,
    })),
  };
}

export function createCultivationRepository(sql: Sql) {
  async function findGuide(publicId: string): Promise<GuideRow | null> {
    const [row] = await sql<GuideRow[]>`
      SELECT
        gg.id,
        gg.public_id,
        gg.guide_key,
        gg.version,
        gg.title,
        gg.taxon_id,
        gg.biological_entity_id,
        COALESCE(t.public_id, be.public_id) AS subject_public_id,
        gg.climate_context,
        gg.technique_context,
        gg.region_context,
        gg.status,
        gg.summary
      FROM growing_guides AS gg
      LEFT JOIN taxa AS t ON t.id = gg.taxon_id
      LEFT JOIN biological_entities AS be ON be.id = gg.biological_entity_id
      WHERE gg.public_id = ${publicId}
        AND gg.status = 'published'
        AND (be.id IS NULL OR be.visibility = 'public')
      LIMIT 1
    `;
    return row ?? null;
  }

  async function findClaims(guideId: string): Promise<ClaimRow[]> {
    return sql<ClaimRow[]>`
      SELECT
        id,
        section_key,
        statement,
        evidence_level,
        source_id,
        assertion_type
      FROM growing_guide_claims
      WHERE growing_guide_id = ${guideId}
      ORDER BY created_at ASC, id ASC
    `;
  }

  return {
    async listPublicGuides(limit = 24): Promise<GrowingGuide[]> {
      const safeLimit = Math.min(Math.max(limit, 1), 100);
      const rows = await sql<GuideRow[]>`
        SELECT
          gg.id,
          gg.public_id,
          gg.guide_key,
          gg.version,
          gg.title,
          gg.taxon_id,
          gg.biological_entity_id,
          COALESCE(t.public_id, be.public_id) AS subject_public_id,
          gg.climate_context,
          gg.technique_context,
          gg.region_context,
          gg.status,
          gg.summary
        FROM growing_guides AS gg
        LEFT JOIN taxa AS t ON t.id = gg.taxon_id
        LEFT JOIN biological_entities AS be ON be.id = gg.biological_entity_id
        WHERE gg.status = 'published'
          AND (be.id IS NULL OR be.visibility = 'public')
        ORDER BY gg.title ASC, gg.version DESC
        LIMIT ${safeLimit}
      `;
      return Promise.all(
        rows.map(async (row) => toGuide(row, await findClaims(row.id))),
      );
    },

    async getPublicGuide(publicId: string): Promise<GrowingGuide | null> {
      const row = await findGuide(publicId);
      return row ? toGuide(row, await findClaims(row.id)) : null;
    },
  };
}
