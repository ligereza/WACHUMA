import { randomUUID } from "node:crypto";
import type { Sql } from "postgres";
import {
  DomainError,
  NotFoundError,
  type AdminCulturalRelationCreateInput,
  type AdminCulturalRelationRecord,
  type AdminCulturalRelationUpdateInput,
  type AdminCulturalTakedownInput,
  type Visibility,
} from "@wachuma/shared";

type RelationRow = {
  public_id: string;
  subject_public_id: string;
  relation_type: string;
  value_text: string | null;
  description: string;
  culture_public_id: string | null;
  community_public_id: string | null;
  place_public_id: string | null;
  historical_period_public_id: string | null;
  documented_by_agent_public_id: string | null;
  documented_by_name: string | null;
  source_public_id: string;
  evidence_level: string;
  assertion_type: string;
  author_perspective: string;
  sensitivity: "normal" | "sensitive" | "sacred";
  access_level: Visibility;
  license_uri: string;
  review_notes: string | null;
  review_status: "draft" | "under-review" | "accepted" | "rejected";
  reviewed_by: string | null;
  reviewed_at: string | null;
  recorded_on: string | null;
};

function toRelation(row: RelationRow): AdminCulturalRelationRecord {
  return {
    publicId: row.public_id as AdminCulturalRelationRecord["publicId"],
    subjectPublicId:
      row.subject_public_id as AdminCulturalRelationRecord["subjectPublicId"],
    relationType: row.relation_type,
    ...(row.value_text ? { valueText: row.value_text } : {}),
    description: row.description,
    ...(row.culture_public_id
      ? {
          culturePublicId: row.culture_public_id as NonNullable<
            AdminCulturalRelationRecord["culturePublicId"]
          >,
        }
      : {}),
    ...(row.community_public_id
      ? {
          communityPublicId: row.community_public_id as NonNullable<
            AdminCulturalRelationRecord["communityPublicId"]
          >,
        }
      : {}),
    ...(row.place_public_id
      ? {
          placePublicId: row.place_public_id as NonNullable<
            AdminCulturalRelationRecord["placePublicId"]
          >,
        }
      : {}),
    ...(row.historical_period_public_id
      ? {
          historicalPeriodPublicId:
            row.historical_period_public_id as NonNullable<
              AdminCulturalRelationRecord["historicalPeriodPublicId"]
            >,
        }
      : {}),
    ...(row.documented_by_agent_public_id
      ? {
          documentedByAgentPublicId:
            row.documented_by_agent_public_id as NonNullable<
              AdminCulturalRelationRecord["documentedByAgentPublicId"]
            >,
        }
      : {}),
    ...(row.documented_by_name
      ? { documentedByName: row.documented_by_name }
      : {}),
    sourcePublicId:
      row.source_public_id as AdminCulturalRelationRecord["sourcePublicId"],
    evidenceLevel: row.evidence_level,
    assertionType: row.assertion_type,
    authorPerspective: row.author_perspective,
    sensitivity: row.sensitivity,
    accessLevel: row.access_level,
    license: row.license_uri,
    ...(row.review_notes ? { reviewNote: row.review_notes } : {}),
    reviewStatus: row.review_status,
    ...(row.reviewed_by ? { reviewedBy: row.reviewed_by } : {}),
    ...(row.reviewed_at ? { reviewedAt: row.reviewed_at } : {}),
    ...(row.recorded_on ? { recordedOn: row.recorded_on } : {}),
  };
}

function rethrowDatabaseError(error: unknown): never {
  const code = (error as { code?: string }).code;
  if (code === "23505") {
    throw new DomainError(
      "conflict",
      "A cultural relation with this identifier already exists",
      409,
    );
  }
  if (code === "23503") {
    throw new DomainError(
      "validation_error",
      "A referenced record does not exist",
      400,
    );
  }
  if (code === "23514") {
    throw new DomainError(
      "validation_error",
      "A cultural relation needs one subject and a culture or community context",
      400,
    );
  }
  throw error;
}

export function createCultureAdminRepository(sql: Sql) {
  async function subjectIds(
    publicId: string,
  ): Promise<{ biologicalEntityId: string | null; taxonId: string | null }> {
    const [entity] = await sql<{ id: string }[]>`
      SELECT id FROM biological_entities WHERE public_id = ${publicId} LIMIT 1
    `;
    if (entity) {
      return { biologicalEntityId: entity.id, taxonId: null };
    }
    const [taxon] = await sql<{ id: string }[]>`
      SELECT id FROM taxa WHERE public_id = ${publicId} LIMIT 1
    `;
    if (taxon) return { biologicalEntityId: null, taxonId: taxon.id };
    throw new NotFoundError("Taxon or biological entity", publicId);
  }

  async function sourceId(publicId: string): Promise<string> {
    const [row] = await sql<{ id: string }[]>`
      SELECT id FROM sources WHERE public_id = ${publicId} LIMIT 1
    `;
    if (!row) throw new NotFoundError("Source", publicId);
    return row.id;
  }

  async function communityId(publicId: string): Promise<string> {
    const [row] = await sql<{ id: string }[]>`
      SELECT id FROM communities WHERE public_id = ${publicId} LIMIT 1
    `;
    if (!row) throw new NotFoundError("Community", publicId);
    return row.id;
  }

  async function cultureId(publicId: string): Promise<string> {
    const [row] = await sql<{ id: string }[]>`
      SELECT id FROM cultures WHERE public_id = ${publicId} LIMIT 1
    `;
    if (!row) throw new NotFoundError("Culture", publicId);
    return row.id;
  }

  async function historicalPeriodId(publicId: string): Promise<string> {
    const [row] = await sql<{ id: string }[]>`
      SELECT id FROM historical_periods WHERE public_id = ${publicId} LIMIT 1
    `;
    if (!row) throw new NotFoundError("Historical period", publicId);
    return row.id;
  }

  async function documentedByAgentId(publicId: string): Promise<string> {
    const [row] = await sql<{ id: string }[]>`
      SELECT id FROM agents WHERE public_id = ${publicId} LIMIT 1
    `;
    if (!row) throw new NotFoundError("Documenting agent", publicId);
    return row.id;
  }

  async function placeId(publicId: string): Promise<string> {
    const [row] = await sql<{ id: string }[]>`
      SELECT id FROM places WHERE public_id = ${publicId} LIMIT 1
    `;
    if (!row) throw new NotFoundError("Place", publicId);
    return row.id;
  }

  async function getRelation(
    publicId: string,
  ): Promise<AdminCulturalRelationRecord | null> {
    const [row] = await sql<RelationRow[]>`
      SELECT
        relation.public_id,
        COALESCE(entity.public_id, taxon.public_id) AS subject_public_id,
        relation.relation_type,
        relation.value_text,
        relation.description,
        culture.public_id AS culture_public_id,
        community.public_id AS community_public_id,
        place.public_id AS place_public_id,
        historical_period.public_id AS historical_period_public_id,
        documented_by.public_id AS documented_by_agent_public_id,
        documented_by.public_name AS documented_by_name,
        source.public_id AS source_public_id,
        relation.evidence_level,
        relation.assertion_type,
        relation.author_perspective,
        relation.sensitivity,
        relation.access_level,
        relation.license_uri,
        relation.review_notes,
        relation.review_status,
        relation.reviewed_by,
        relation.reviewed_at,
        relation.recorded_on
      FROM cultural_relations AS relation
      LEFT JOIN biological_entities AS entity ON entity.id = relation.biological_entity_id
      LEFT JOIN taxa AS taxon ON taxon.id = relation.taxon_id
      LEFT JOIN cultures AS culture ON culture.id = relation.culture_id
      LEFT JOIN communities AS community ON community.id = relation.community_id
      LEFT JOIN places AS place ON place.id = relation.place_id
      LEFT JOIN historical_periods AS historical_period
        ON historical_period.id = relation.historical_period_id
      LEFT JOIN agents AS documented_by
        ON documented_by.id = relation.documented_by_agent_id
      JOIN sources AS source ON source.id = relation.source_id
      WHERE relation.public_id = ${publicId}
      LIMIT 1
    `;
    return row ? toRelation(row) : null;
  }

  async function assertPublishableContext(
    relation: AdminCulturalRelationRecord,
  ): Promise<void> {
    if (
      relation.reviewStatus !== "accepted" ||
      relation.accessLevel !== "public" ||
      relation.sensitivity !== "normal"
    ) {
      return;
    }
    const [row] = await sql<
      {
        community_visibility: Visibility | null;
        culture_visibility: Visibility | null;
        culture_entity_visibility: Visibility | null;
        has_documenter: boolean;
        place_visibility: Visibility | null;
      }[]
    >`
      SELECT
        community.visibility AS community_visibility,
        culture_specimen.visibility AS culture_visibility,
        culture_entity.visibility AS culture_entity_visibility,
        relation.documented_by_agent_id IS NOT NULL AS has_documenter,
        place.visibility AS place_visibility
      FROM cultural_relations AS relation
      LEFT JOIN communities AS community ON community.id = relation.community_id
      LEFT JOIN cultures AS cultural_material
        ON cultural_material.id = relation.culture_id
      LEFT JOIN specimens AS culture_specimen
        ON culture_specimen.id = cultural_material.specimen_id
      LEFT JOIN biological_entities AS culture_entity
        ON culture_entity.id = culture_specimen.biological_entity_id
      LEFT JOIN places AS place ON place.id = relation.place_id
      WHERE relation.public_id = ${relation.publicId}
      LIMIT 1
    `;
    if (
      !row ||
      (row.community_visibility !== null &&
        row.community_visibility !== "public") ||
      (row.culture_visibility !== null &&
        row.culture_visibility !== "public") ||
      (row.culture_entity_visibility !== null &&
        row.culture_entity_visibility !== "public") ||
      !row.has_documenter ||
      (row.place_visibility !== null && row.place_visibility !== "public")
    ) {
      throw new DomainError(
        "validation_error",
        "An accepted public cultural relation needs public context",
      );
    }
  }

  return {
    async listRelations(): Promise<AdminCulturalRelationRecord[]> {
      const rows = await sql<RelationRow[]>`
        SELECT
          relation.public_id,
          COALESCE(entity.public_id, taxon.public_id) AS subject_public_id,
          relation.relation_type,
          relation.value_text,
          relation.description,
          culture.public_id AS culture_public_id,
          community.public_id AS community_public_id,
          place.public_id AS place_public_id,
          historical_period.public_id AS historical_period_public_id,
          documented_by.public_id AS documented_by_agent_public_id,
          documented_by.public_name AS documented_by_name,
          source.public_id AS source_public_id,
          relation.evidence_level,
          relation.assertion_type,
          relation.author_perspective,
          relation.sensitivity,
          relation.access_level,
          relation.license_uri,
          relation.review_notes,
          relation.review_status,
          relation.reviewed_by,
          relation.reviewed_at,
          relation.recorded_on
        FROM cultural_relations AS relation
        LEFT JOIN biological_entities AS entity ON entity.id = relation.biological_entity_id
        LEFT JOIN taxa AS taxon ON taxon.id = relation.taxon_id
        LEFT JOIN cultures AS culture ON culture.id = relation.culture_id
        LEFT JOIN communities AS community ON community.id = relation.community_id
        LEFT JOIN places AS place ON place.id = relation.place_id
        LEFT JOIN historical_periods AS historical_period
          ON historical_period.id = relation.historical_period_id
        LEFT JOIN agents AS documented_by
          ON documented_by.id = relation.documented_by_agent_id
        JOIN sources AS source ON source.id = relation.source_id
        ORDER BY relation.created_at DESC, relation.public_id ASC
        LIMIT 500
      `;
      return rows.map(toRelation);
    },

    async getRelation(
      publicId: string,
    ): Promise<AdminCulturalRelationRecord | null> {
      return getRelation(publicId);
    },

    async createRelation(
      input: AdminCulturalRelationCreateInput,
    ): Promise<AdminCulturalRelationRecord> {
      try {
        const subject = await subjectIds(input.subjectPublicId);
        const culture = input.culturePublicId
          ? await cultureId(input.culturePublicId)
          : null;
        const community = input.communityPublicId
          ? await communityId(input.communityPublicId)
          : null;
        const source = await sourceId(input.sourcePublicId);
        const place = input.placePublicId
          ? await placeId(input.placePublicId)
          : null;
        const historicalPeriod = input.historicalPeriodPublicId
          ? await historicalPeriodId(input.historicalPeriodPublicId)
          : null;
        const documentedBy = input.documentedByAgentPublicId
          ? await documentedByAgentId(input.documentedByAgentPublicId)
          : null;
        const [row] = await sql<RelationRow[]>`
          INSERT INTO cultural_relations (
            public_id, relation_type, taxon_id, biological_entity_id,
            culture_id, community_id, place_id, historical_period_id,
            documented_by_agent_id, source_id, value_text, description,
            evidence_level, assertion_type, author_perspective, sensitivity,
            access_level, license_uri, review_notes, review_status, recorded_on
          ) VALUES (
            ${input.publicId || `cultural-relation-${randomUUID()}`},
            ${input.relationType},
            ${subject.taxonId},
            ${subject.biologicalEntityId},
            ${culture},
            ${community},
            ${place},
            ${historicalPeriod},
            ${documentedBy},
            ${source},
            ${input.valueText ?? null},
            ${input.description},
            ${input.evidenceLevel},
            ${input.assertionType},
            ${input.authorPerspective},
            ${input.sensitivity},
            ${input.accessLevel},
            ${input.license},
            ${input.reviewNote ?? null},
            ${input.reviewStatus},
            ${input.recordedOn ?? null}
          )
          RETURNING public_id
        `;
        if (!row)
          throw new DomainError(
            "internal_error",
            "Cultural relation was not created",
            500,
          );
        const relation = await getRelation(row.public_id);
        if (!relation)
          throw new DomainError(
            "internal_error",
            "Cultural relation was not readable",
            500,
          );
        await assertPublishableContext(relation);
        return relation;
      } catch (error) {
        rethrowDatabaseError(error);
      }
    },

    async updateRelation(
      publicId: string,
      input: AdminCulturalRelationUpdateInput,
    ): Promise<AdminCulturalRelationRecord> {
      try {
        const culture = input.culturePublicId
          ? await cultureId(input.culturePublicId)
          : null;
        const community = input.communityPublicId
          ? await communityId(input.communityPublicId)
          : null;
        const source = input.sourcePublicId
          ? await sourceId(input.sourcePublicId)
          : null;
        const place =
          input.placePublicId !== undefined
            ? input.placePublicId
              ? await placeId(input.placePublicId)
              : null
            : null;
        const historicalPeriod = input.historicalPeriodPublicId
          ? await historicalPeriodId(input.historicalPeriodPublicId)
          : null;
        const documentedBy = input.documentedByAgentPublicId
          ? await documentedByAgentId(input.documentedByAgentPublicId)
          : null;
        const [row] = await sql<{ public_id: string }[]>`
          UPDATE cultural_relations AS relation
          SET
            relation_type = COALESCE(${input.relationType ?? null}, relation.relation_type),
            culture_id = CASE
              WHEN ${input.culturePublicId !== undefined} THEN ${culture}
              ELSE relation.culture_id
            END,
            community_id = CASE
              WHEN ${input.communityPublicId !== undefined} THEN ${community}
              ELSE relation.community_id
            END,
            source_id = COALESCE(${source}, relation.source_id),
            place_id = CASE
              WHEN ${input.placePublicId !== undefined} THEN ${place}
              ELSE relation.place_id
            END,
            historical_period_id = CASE
              WHEN ${input.historicalPeriodPublicId !== undefined} THEN ${historicalPeriod}
              ELSE relation.historical_period_id
            END,
            documented_by_agent_id = CASE
              WHEN ${input.documentedByAgentPublicId !== undefined} THEN ${documentedBy}
              ELSE relation.documented_by_agent_id
            END,
            value_text = CASE
              WHEN ${input.valueText !== undefined} THEN ${input.valueText ?? null}
              ELSE relation.value_text
            END,
            description = COALESCE(${input.description ?? null}, relation.description),
            evidence_level = COALESCE(${input.evidenceLevel ?? null}, relation.evidence_level),
            assertion_type = COALESCE(${input.assertionType ?? null}, relation.assertion_type),
            author_perspective = COALESCE(${input.authorPerspective ?? null}, relation.author_perspective),
            sensitivity = COALESCE(${input.sensitivity ?? null}, relation.sensitivity),
            access_level = COALESCE(${input.accessLevel ?? null}, relation.access_level),
            license_uri = COALESCE(${input.license ?? null}, relation.license_uri),
            review_notes = CASE
              WHEN ${input.reviewNote !== undefined} THEN ${input.reviewNote ?? null}
              ELSE relation.review_notes
            END,
            review_status = COALESCE(${input.reviewStatus ?? null}, relation.review_status),
            reviewed_by = CASE
              WHEN ${input.reviewer !== undefined} THEN ${input.reviewer ?? null}
              ELSE relation.reviewed_by
            END,
            reviewed_at = CASE
              WHEN ${input.reviewer !== undefined} THEN now()
              ELSE relation.reviewed_at
            END,
            recorded_on = CASE
              WHEN ${input.recordedOn !== undefined} THEN ${input.recordedOn ?? null}
              ELSE relation.recorded_on
            END
          WHERE relation.public_id = ${publicId}
          RETURNING relation.public_id
        `;
        if (!row) throw new NotFoundError("Cultural relation", publicId);
        const relation = await getRelation(publicId);
        if (!relation) throw new NotFoundError("Cultural relation", publicId);
        await assertPublishableContext(relation);
        return relation;
      } catch (error) {
        rethrowDatabaseError(error);
      }
    },

    async takedownRelation(
      publicId: string,
      input: AdminCulturalTakedownInput,
    ): Promise<AdminCulturalRelationRecord> {
      return this.updateRelation(publicId, {
        reviewStatus: "rejected",
        accessLevel: "restricted",
        sensitivity: "sensitive",
        reviewNote: input.reason,
        ...(input.reviewer ? { reviewer: input.reviewer } : {}),
      });
    },
  };
}
