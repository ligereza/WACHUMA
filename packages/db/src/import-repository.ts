import type { Sql } from "postgres";

type JsonValue =
  | null
  | string
  | number
  | boolean
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue | undefined };

export interface PersistableSourceRecord {
  source: string;
  sourceRecordId: string;
  sourceUrl?: string;
  retrievedAt: string;
  license: string;
  attribution: string;
  assertionType: string;
  rawPayload: Record<string, unknown>;
  rawChecksum?: string;
  importerVersion: string;
  status: "pending" | "accepted" | "rejected" | "superseded";
}

export interface PersistedSourceRecordSummary {
  source: string;
  inserted: number;
  skipped: number;
  recordIds: Record<string, string>;
}

export function createImportRepository(sql: Sql) {
  return {
    async persistSourceRecords(
      records: PersistableSourceRecord[],
    ): Promise<PersistedSourceRecordSummary[]> {
      const groups = new Map<string, PersistableSourceRecord[]>();
      for (const record of records) {
        const group = groups.get(record.source) ?? [];
        group.push(record);
        groups.set(record.source, group);
      }

      return sql.begin(async (transaction) => {
        const summaries: PersistedSourceRecordSummary[] = [];
        for (const [providerKey, sourceRecords] of groups) {
          await transaction`
            INSERT INTO data_sources (
              provider_key,
              name,
              source_type,
              base_url
            ) VALUES (
              ${providerKey},
              ${providerKey.toUpperCase()} external source,
              'external_dataset',
              ${providerKey === "gbif" ? "https://api.gbif.org/v1" : null}
            )
            ON CONFLICT (provider_key) DO UPDATE SET
              name = EXCLUDED.name,
              source_type = EXCLUDED.source_type,
              base_url = EXCLUDED.base_url
          `;

          const [dataSource] = await transaction<{ id: string }[]>`
            SELECT id FROM data_sources WHERE provider_key = ${providerKey}
          `;
          if (!dataSource)
            throw new Error(`Data source was not created: ${providerKey}`);

          let inserted = 0;
          const recordIds: Record<string, string> = {};
          for (const record of sourceRecords) {
            const rows = await transaction<{ id: string }[]>`
              INSERT INTO source_records (
                data_source_id,
                source_record_id,
                source_url,
                retrieved_at,
                license_uri,
                attribution,
                assertion_type,
                raw_payload,
                raw_checksum,
                importer_version,
                status
              ) VALUES (
                ${dataSource.id},
                ${record.sourceRecordId},
                ${record.sourceUrl ?? null},
                ${record.retrievedAt},
                ${record.license},
                ${record.attribution},
                ${record.assertionType},
                ${transaction.json(record.rawPayload as JsonValue)},
                ${record.rawChecksum ?? null},
                ${record.importerVersion},
                ${record.status}
              )
              ON CONFLICT (data_source_id, source_record_id, retrieved_at)
              DO NOTHING
              RETURNING id
            `;
            if (rows.length > 0) inserted += 1;
            const [persisted] = rows.length
              ? rows
              : await transaction<{ id: string }[]>`
                  SELECT id
                  FROM source_records
                  WHERE data_source_id = ${dataSource.id}
                    AND source_record_id = ${record.sourceRecordId}
                    AND retrieved_at = ${record.retrievedAt}
                  LIMIT 1
                `;
            if (persisted) recordIds[record.sourceRecordId] = persisted.id;
          }
          summaries.push({
            source: providerKey,
            inserted,
            skipped: sourceRecords.length - inserted,
            recordIds,
          });
        }
        return summaries;
      });
    },
  };
}
