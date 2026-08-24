import type { Sql, TransactionSql } from "postgres";
import { validateLineageAcyclic } from "@wachuma/lineage";
import {
  DomainError,
  NotFoundError,
  type AdminLineageRelationshipCreateInput,
  type AdminLineageRelationshipRecord,
} from "@wachuma/shared";

type SubjectRow = { id: string; public_id: string };
type ExistingRelationshipRow = {
  parent_entity_id: string | null;
  parent_specimen_id: string | null;
  child_entity_id: string | null;
  child_specimen_id: string | null;
};

function rethrowDatabaseError(error: unknown): never {
  const code = (error as { code?: string }).code;
  if (code === "23505") {
    throw new DomainError(
      "conflict",
      "A lineage relationship with this provenance already exists",
      409,
    );
  }
  if (code === "23503") {
    throw new DomainError(
      "validation_error",
      "A referenced lineage subject does not exist",
      400,
    );
  }
  throw error;
}

async function resolveSubject(
  transaction: TransactionSql,
  subject: AdminLineageRelationshipCreateInput["parent"],
): Promise<SubjectRow> {
  const rows =
    subject.kind === "biological_entity"
      ? await transaction<SubjectRow[]>`
          SELECT id, public_id
          FROM biological_entities
          WHERE public_id = ${subject.publicId}
          LIMIT 1
        `
      : await transaction<SubjectRow[]>`
          SELECT id, public_id
          FROM specimens
          WHERE public_id = ${subject.publicId}
          LIMIT 1
        `;
  const row = rows[0];
  if (!row) {
    throw new NotFoundError(
      subject.kind === "biological_entity" ? "BiologicalEntity" : "Specimen",
      subject.publicId,
    );
  }
  return row;
}

export function createLineageAdminRepository(sql: Sql) {
  return {
    async createRelationship(
      input: AdminLineageRelationshipCreateInput,
    ): Promise<AdminLineageRelationshipRecord> {
      try {
        return await sql.begin(async (transaction) => {
          const [dataSource] = await transaction<{ id: string }[]>`
            SELECT id
            FROM data_sources
            WHERE provider_key = 'wachuma-garden'
            LIMIT 1
          `;
          if (!dataSource) {
            throw new DomainError(
              "not_found",
              "The WACHUMA garden data source is not configured",
              404,
            );
          }

          const [source] = await transaction<{ id: string }[]>`
            SELECT id
            FROM sources
            WHERE public_id = ${input.provenance.sourcePublicId}
            LIMIT 1
          `;
          if (!source) {
            throw new NotFoundError("Source", input.provenance.sourcePublicId);
          }

          const parent = await resolveSubject(transaction, input.parent);
          const child = await resolveSubject(transaction, input.child);

          const existingRelationships = await transaction<
            ExistingRelationshipRow[]
          >`
            SELECT
              parent_entity_id,
              parent_specimen_id,
              child_entity_id,
              child_specimen_id
            FROM lineage_relationships
          `;
          const subjectKey = (
            kind: "biological_entity" | "specimen",
            id: string,
          ) => `${kind}:${id}`;
          const existingLineage = existingRelationships.map((row) => ({
            relationshipType: input.relationshipType,
            parentId: row.parent_entity_id
              ? subjectKey("biological_entity", row.parent_entity_id)
              : subjectKey("specimen", row.parent_specimen_id!),
            childId: row.child_entity_id
              ? subjectKey("biological_entity", row.child_entity_id)
              : subjectKey("specimen", row.child_specimen_id!),
          }));
          const cycles = validateLineageAcyclic([
            ...existingLineage,
            {
              relationshipType: input.relationshipType,
              parentId: subjectKey(input.parent.kind, parent.id),
              childId: subjectKey(input.child.kind, child.id),
            },
          ]);
          if (cycles.length > 0) {
            throw new DomainError(
              "validation_error",
              `Lineage relationship would create a cycle: ${cycles[0]}`,
              400,
            );
          }

          const [sourceRecord] = await transaction<
            Array<{
              id: string;
              status: AdminLineageRelationshipRecord["sourceRecordStatus"];
            }>
          >`
            INSERT INTO source_records (
              data_source_id, source_record_id, source_url, retrieved_at,
              license_uri, attribution, assertion_type, raw_payload,
              importer_version, status
            ) VALUES (
              ${dataSource.id},
              ${input.provenance.sourceRecordId},
              ${input.provenance.sourceUrl ?? null},
              ${input.provenance.retrievedAt},
              ${input.provenance.license},
              ${input.provenance.attribution},
              ${input.provenance.assertionType},
              ${JSON.stringify(input.provenance.rawPayload)}::jsonb,
              ${input.provenance.importerVersion},
              'pending'
            )
            ON CONFLICT (data_source_id, source_record_id, retrieved_at)
            DO UPDATE SET
              source_url = EXCLUDED.source_url,
              license_uri = EXCLUDED.license_uri,
              attribution = EXCLUDED.attribution,
              assertion_type = EXCLUDED.assertion_type,
              raw_payload = EXCLUDED.raw_payload,
              importer_version = EXCLUDED.importer_version
            RETURNING id, status
          `;
          if (!sourceRecord) {
            throw new DomainError(
              "internal_error",
              "Lineage source record was not created",
              500,
            );
          }

          const [existing] = await transaction<{ id: string }[]>`
            SELECT relationship.id
            FROM lineage_relationships AS relationship
            JOIN record_provenance AS provenance
              ON provenance.lineage_relationship_id = relationship.id
             AND provenance.source_record_id = ${sourceRecord.id}
            WHERE relationship.relationship_type = ${input.relationshipType}
              AND (
                (${input.parent.kind === "biological_entity"} AND relationship.parent_entity_id = ${parent.id})
                OR (${input.parent.kind === "specimen"} AND relationship.parent_specimen_id = ${parent.id})
              )
              AND (
                (${input.child.kind === "biological_entity"} AND relationship.child_entity_id = ${child.id})
                OR (${input.child.kind === "specimen"} AND relationship.child_specimen_id = ${child.id})
              )
            LIMIT 1
          `;

          if (existing) {
            return {
              id: existing.id,
              relationshipType: input.relationshipType,
              parent: input.parent,
              child: input.child,
              ...(input.generationLabel
                ? { generationLabel: input.generationLabel }
                : {}),
              ...(input.occurredAt ? { occurredAt: input.occurredAt } : {}),
              ...(input.notes ? { notes: input.notes } : {}),
              sourcePublicId: input.provenance.sourcePublicId,
              sourceRecordId: sourceRecord.id,
              sourceRecordKey: input.provenance.sourceRecordId,
              sourceRecordStatus: sourceRecord.status,
              created: false,
            };
          }

          const [relationship] = await transaction<{ id: string }[]>`
            INSERT INTO lineage_relationships (
              relationship_type,
              parent_entity_id,
              parent_specimen_id,
              child_entity_id,
              child_specimen_id,
              generation_label,
              occurred_at,
              source_id,
              notes
            ) VALUES (
              ${input.relationshipType},
              ${input.parent.kind === "biological_entity" ? parent.id : null},
              ${input.parent.kind === "specimen" ? parent.id : null},
              ${input.child.kind === "biological_entity" ? child.id : null},
              ${input.child.kind === "specimen" ? child.id : null},
              ${input.generationLabel ?? null},
              ${input.occurredAt ?? null},
              ${source.id},
              ${input.notes ?? null}
            )
            RETURNING id
          `;
          if (!relationship) {
            throw new DomainError(
              "internal_error",
              "Lineage relationship was not created",
              500,
            );
          }

          await transaction`
            INSERT INTO record_provenance (
              source_record_id,
              lineage_relationship_id,
              source_id,
              assertion_type
            ) VALUES (
              ${sourceRecord.id},
              ${relationship.id},
              ${source.id},
              ${input.provenance.assertionType}
            )
          `;

          return {
            id: relationship.id,
            relationshipType: input.relationshipType,
            parent: input.parent,
            child: input.child,
            ...(input.generationLabel
              ? { generationLabel: input.generationLabel }
              : {}),
            ...(input.occurredAt ? { occurredAt: input.occurredAt } : {}),
            ...(input.notes ? { notes: input.notes } : {}),
            sourcePublicId: input.provenance.sourcePublicId,
            sourceRecordId: sourceRecord.id,
            sourceRecordKey: input.provenance.sourceRecordId,
            sourceRecordStatus: sourceRecord.status,
            created: true,
          };
        });
      } catch (error) {
        rethrowDatabaseError(error);
      }
    },
  };
}
