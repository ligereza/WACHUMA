import assert from "node:assert/strict";
import postgres from "../packages/db/node_modules/postgres/src/index.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required for quality:gbif-pachanoi; this gate never falls back to fixtures.",
  );
}

function isPublicGbifLicense(license) {
  const normalized = license.trim().toLowerCase();
  return (
    normalized === "cc0" ||
    normalized.includes("creativecommons.org/publicdomain/zero") ||
    normalized.includes("creativecommons.org/licenses/by/4.0") ||
    normalized === "cc by 4.0"
  );
}

function rounded(value) {
  return Math.round(value * 100) / 100;
}

const sql = postgres(databaseUrl, { max: 1 });
try {
  const observations = await sql`
    SELECT
      occurrence_source.source_record_id,
      occurrence_source.status AS source_status,
      occurrence_source.license_uri,
      occurrence_source.raw_payload,
      observation.public_id,
      observation.visibility,
      ST_X(observation.geometry_public) AS public_longitude,
      ST_Y(observation.geometry_public) AS public_latitude,
      COUNT(DISTINCT media_source.id)::int AS media_count
    FROM source_records AS occurrence_source
    JOIN data_sources AS occurrence_data_source
      ON occurrence_data_source.id = occurrence_source.data_source_id
    JOIN record_provenance AS occurrence_provenance
      ON occurrence_provenance.source_record_id = occurrence_source.id
    JOIN observations AS observation
      ON observation.id = occurrence_provenance.observation_id
    LEFT JOIN record_provenance AS media_provenance
      ON media_provenance.observation_id = observation.id
    LEFT JOIN source_records AS media_source
      ON media_source.id = media_provenance.source_record_id
     AND media_source.source_record_id LIKE 'media:%'
    WHERE occurrence_data_source.provider_key = 'gbif'
      AND occurrence_source.source_record_id LIKE 'occurrence:%'
      AND observation.taxon_id = (
        SELECT taxon_id FROM external_identifiers
        WHERE namespace = 'gbif' AND identifier = '5622352'
        LIMIT 1
      )
    GROUP BY occurrence_source.id, observation.id
    ORDER BY occurrence_source.source_record_id
  `;

  const media = await sql`
    SELECT
      media_source.source_record_id,
      media_source.status AS source_status,
      media_source.license_uri,
      media.visibility,
      media_source.raw_payload
    FROM source_records AS media_source
    JOIN data_sources AS data_source ON data_source.id = media_source.data_source_id
    JOIN record_provenance AS provenance ON provenance.source_record_id = media_source.id
    JOIN media ON media.id = provenance.media_id
    WHERE data_source.provider_key = 'gbif'
      AND media_source.source_record_id LIKE 'media:%'
      AND media_source.raw_payload->>'occurrenceId' IN (
        SELECT regexp_replace(source_record_id, '^occurrence:', '')
        FROM source_records AS occurrence_source
        JOIN data_sources AS occurrence_data_source
          ON occurrence_data_source.id = occurrence_source.data_source_id
        WHERE occurrence_data_source.provider_key = 'gbif'
          AND occurrence_source.source_record_id LIKE 'occurrence:%'
      )
    ORDER BY media_source.source_record_id
  `;

  for (const row of observations) {
    assert.equal(row.source_status, "pending", row.source_record_id);
    assert.equal(row.visibility, "restricted", row.public_id);
    assert.match(row.license_uri, /\S/, row.source_record_id);
    const latitude = row.raw_payload.decimalLatitude;
    const longitude = row.raw_payload.decimalLongitude;
    if (latitude === undefined || longitude === undefined) {
      assert.equal(row.public_latitude, null, row.source_record_id);
      assert.equal(row.public_longitude, null, row.source_record_id);
    } else {
      assert.equal(
        row.public_latitude,
        rounded(latitude),
        row.source_record_id,
      );
      assert.equal(
        row.public_longitude,
        rounded(longitude),
        row.source_record_id,
      );
    }
  }

  for (const row of media) {
    assert.equal(row.source_status, "pending", row.source_record_id);
    assert.equal(row.visibility, "restricted", row.source_record_id);
    assert.match(row.license_uri, /\S/, row.source_record_id);
    assert.equal(typeof row.raw_payload.occurrenceId, "string");
  }

  const occurrenceLicenseCounts = Object.fromEntries(
    Object.entries(
      observations.reduce((counts, row) => {
        const license = row.license_uri.toLowerCase();
        counts[license] = (counts[license] ?? 0) + 1;
        return counts;
      }, {}),
    ).sort(([left], [right]) => left.localeCompare(right)),
  );
  const mediaLicenseCounts = Object.fromEntries(
    Object.entries(
      media.reduce((counts, row) => {
        const license = row.license_uri.toLowerCase();
        counts[license] = (counts[license] ?? 0) + 1;
        return counts;
      }, {}),
    ).sort(([left], [right]) => left.localeCompare(right)),
  );
  const candidateOccurrences = observations
    .filter((row) => isPublicGbifLicense(row.license_uri))
    .map((row) => row.source_record_id.replace(/^occurrence:/, ""));
  console.log(
    JSON.stringify({
      valid: true,
      occurrences: observations.length,
      media: media.length,
      candidateOccurrences,
      occurrenceLicenseCounts,
      mediaLicenseCounts,
      publicProjection:
        "none: all staged observations and media remain restricted",
    }),
  );
} finally {
  await sql.end({ timeout: 5 });
}
