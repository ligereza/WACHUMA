import type { Sql } from "postgres";
import {
  buildLineageTree,
  type PublicLineageDocument,
  type PublicLineageRelationship,
} from "@wachuma/lineage";
import type { LineageRelationshipType } from "@wachuma/shared";

type LineageRow = {
  relationship_type: LineageRelationshipType;
  parent_public_id: string | null;
  child_public_id: string | null;
  source_public_id: string | null;
};

type PublicRecordRow = { exists: boolean };

export function createLineageRepository(sql: Sql) {
  return {
    async getPublicLineage(
      subjectPublicId: string,
    ): Promise<PublicLineageDocument | null> {
      const [record] = await sql<PublicRecordRow[]>`
        SELECT EXISTS (
          SELECT 1
          FROM biological_entities AS be
          WHERE be.public_id = ${subjectPublicId}
            AND be.visibility = 'public'
          UNION ALL
          SELECT 1
          FROM specimens AS sp
          JOIN biological_entities AS be ON be.id = sp.biological_entity_id
          WHERE sp.public_id = ${subjectPublicId}
            AND sp.visibility = 'public'
            AND be.visibility = 'public'
        ) AS exists
      `;
      if (!record?.exists) return null;

      const rows = await sql<LineageRow[]>`
        SELECT
          lr.relationship_type,
          COALESCE(
            parent_entity.public_id,
            CASE WHEN parent_specimen_entity.id IS NOT NULL THEN parent_specimen.public_id END
          ) AS parent_public_id,
          COALESCE(
            child_entity.public_id,
            CASE WHEN child_specimen_entity.id IS NOT NULL THEN child_specimen.public_id END
          ) AS child_public_id,
          source.public_id AS source_public_id
        FROM lineage_relationships AS lr
        LEFT JOIN biological_entities AS parent_entity
          ON parent_entity.id = lr.parent_entity_id
         AND parent_entity.visibility = 'public'
        LEFT JOIN specimens AS parent_specimen
          ON parent_specimen.id = lr.parent_specimen_id
         AND parent_specimen.visibility = 'public'
        LEFT JOIN biological_entities AS parent_specimen_entity
          ON parent_specimen_entity.id = parent_specimen.biological_entity_id
         AND parent_specimen_entity.visibility = 'public'
        LEFT JOIN biological_entities AS child_entity
          ON child_entity.id = lr.child_entity_id
         AND child_entity.visibility = 'public'
        LEFT JOIN specimens AS child_specimen
          ON child_specimen.id = lr.child_specimen_id
         AND child_specimen.visibility = 'public'
        LEFT JOIN biological_entities AS child_specimen_entity
          ON child_specimen_entity.id = child_specimen.biological_entity_id
         AND child_specimen_entity.visibility = 'public'
        LEFT JOIN sources AS source ON source.id = lr.source_id
        WHERE (
          COALESCE(
            parent_entity.public_id,
            CASE WHEN parent_specimen_entity.id IS NOT NULL THEN parent_specimen.public_id END
          ) = ${subjectPublicId}
          OR COALESCE(
            child_entity.public_id,
            CASE WHEN child_specimen_entity.id IS NOT NULL THEN child_specimen.public_id END
          ) = ${subjectPublicId}
        )
          AND COALESCE(
            parent_entity.public_id,
            CASE WHEN parent_specimen_entity.id IS NOT NULL THEN parent_specimen.public_id END
          ) IS NOT NULL
          AND COALESCE(
            child_entity.public_id,
            CASE WHEN child_specimen_entity.id IS NOT NULL THEN child_specimen.public_id END
          ) IS NOT NULL
        ORDER BY parent_public_id ASC, child_public_id ASC, lr.relationship_type ASC
      `;

      const relationships = rows.map<PublicLineageRelationship>((row) => ({
        relationshipType: row.relationship_type,
        parentId: row.parent_public_id as string,
        childId: row.child_public_id as string,
        ...(row.source_public_id
          ? { sourcePublicId: row.source_public_id }
          : {}),
      }));
      const tree = buildLineageTree(relationships);
      if (relationships.length === 0) {
        tree.nodes.push({ id: subjectPublicId, parents: [], children: [] });
        tree.roots.push(subjectPublicId);
      }
      return { subjectPublicId, relationships, tree };
    },
  };
}
