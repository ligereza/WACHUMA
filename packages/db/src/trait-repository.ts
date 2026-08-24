import type { Sql } from "postgres";
import type { TraitMeasurement } from "@wachuma/shared";

type TraitRow = {
  id: string;
  public_id: string;
  trait_definition_id: string;
  namespace: string;
  identifier: string;
  label: string;
  taxon_id: string | null;
  biological_entity_id: string | null;
  specimen_id: string | null;
  observation_id: string | null;
  value_numeric: number | null;
  value_text: string | null;
  value_json: Record<string, unknown> | null;
  unit: string | null;
  measured_at: string;
  method: string | null;
  uncertainty: Record<string, unknown>;
  protocol_id: string | null;
  source_id: string;
  visibility: TraitMeasurement["visibility"];
};

function toTrait(row: TraitRow): TraitMeasurement {
  return {
    id: row.id as TraitMeasurement["id"],
    publicId: row.public_id as TraitMeasurement["publicId"],
    traitDefinitionId:
      row.trait_definition_id as TraitMeasurement["traitDefinitionId"],
    traitNamespace: row.namespace,
    traitIdentifier: row.identifier,
    traitLabel: row.label,
    ...(row.taxon_id
      ? {
          taxonId: row.taxon_id as NonNullable<TraitMeasurement["taxonId"]>,
        }
      : {}),
    ...(row.biological_entity_id
      ? {
          biologicalEntityId: row.biological_entity_id as NonNullable<
            TraitMeasurement["biologicalEntityId"]
          >,
        }
      : {}),
    ...(row.specimen_id
      ? {
          specimenId: row.specimen_id as NonNullable<
            TraitMeasurement["specimenId"]
          >,
        }
      : {}),
    ...(row.observation_id
      ? {
          observationId: row.observation_id as NonNullable<
            TraitMeasurement["observationId"]
          >,
        }
      : {}),
    ...(row.value_numeric === null
      ? {}
      : { valueNumeric: Number(row.value_numeric) }),
    ...(row.value_text ? { valueText: row.value_text } : {}),
    ...(row.value_json ? { value: row.value_json } : {}),
    ...(row.unit ? { unit: row.unit } : {}),
    measuredAt: row.measured_at,
    ...(row.method ? { method: row.method } : {}),
    uncertainty: row.uncertainty ?? {},
    ...(row.protocol_id
      ? {
          protocolId: row.protocol_id as NonNullable<
            TraitMeasurement["protocolId"]
          >,
        }
      : {}),
    sourceId: row.source_id as TraitMeasurement["sourceId"],
    visibility: "public",
  };
}

export function createTraitRepository(sql: Sql) {
  return {
    async listPublicTraitMeasurements(
      subjectPublicId?: string,
      limit = 100,
    ): Promise<TraitMeasurement[]> {
      const safeLimit = Math.min(Math.max(limit, 1), 500);
      const rows = await sql<TraitRow[]>`
        SELECT measurement.*,
          definition.namespace,
          definition.identifier,
          definition.label
        FROM trait_measurements AS measurement
        JOIN trait_definitions AS definition
          ON definition.id = measurement.trait_definition_id
        LEFT JOIN taxa AS taxon ON taxon.id = measurement.taxon_id
        LEFT JOIN biological_entities AS entity
          ON entity.id = measurement.biological_entity_id
        LEFT JOIN specimens AS specimen ON specimen.id = measurement.specimen_id
        LEFT JOIN biological_entities AS specimen_entity
          ON specimen_entity.id = specimen.biological_entity_id
        LEFT JOIN observations AS observation
          ON observation.id = measurement.observation_id
        WHERE measurement.visibility = 'public'
          AND (
            ${subjectPublicId ?? null}::text IS NULL
            OR taxon.public_id = ${subjectPublicId ?? null}::text
            OR entity.public_id = ${subjectPublicId ?? null}::text
            OR specimen_entity.public_id = ${subjectPublicId ?? null}::text
            OR specimen.public_id = ${subjectPublicId ?? null}::text
            OR observation.public_id = ${subjectPublicId ?? null}::text
          )
        ORDER BY measurement.measured_at DESC
        LIMIT ${safeLimit}
      `;
      return rows.map(toTrait);
    },
  };
}
