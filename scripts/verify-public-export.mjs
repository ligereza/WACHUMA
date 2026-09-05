import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import postgres from "../packages/db/node_modules/postgres/src/index.js";

const root = resolve(new URL("..", import.meta.url).pathname);
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required for quality:public-export; this gate never falls back to fixtures.",
  );
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell.replace(/\r$/, ""));
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    if (row.some((value) => value !== "")) rows.push(row);
  }
  assert.equal(quoted, false, "CSV has an unterminated quoted field");
  assert.ok(rows.length >= 1, "CSV is missing its header");
  const headers = rows[0];
  return rows
    .slice(1)
    .map((values) =>
      Object.fromEntries(
        headers.map((header, index) => [header, values[index] ?? ""]),
      ),
    );
}

function runExport(outputDirectory) {
  const result = spawnSync(
    process.execPath,
    [resolve(root, "scripts/export-public-corpus.mjs")],
    {
      cwd: root,
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        WACHUMA_PUBLIC_EXPORT_DIR: outputDirectory,
      },
      encoding: "utf8",
    },
  );
  if (result.status !== 0) {
    throw new Error(`export:public failed\n${result.stdout}\n${result.stderr}`);
  }
}

const outputDirectory = await mkdtemp("/tmp/wachuma-public-export-");
const sql = postgres(databaseUrl, { max: 1 });
try {
  runExport(outputDirectory);
  const firstArchive = await readFile(
    resolve(outputDirectory, "public-corpus.dwca.zip"),
  );
  const firstManifest = await readFile(
    resolve(outputDirectory, "manifest.json"),
    "utf8",
  );
  runExport(outputDirectory);
  const archivePath = resolve(outputDirectory, "public-corpus.dwca.zip");
  const manifestPath = resolve(outputDirectory, "manifest.json");
  assert.deepEqual(await readFile(archivePath), firstArchive);
  assert.equal(await readFile(manifestPath, "utf8"), firstManifest);

  const manifest = JSON.parse(firstManifest);
  const archiveHash = execFileSync("sha256sum", [archivePath], {
    encoding: "utf8",
  })
    .split(/\s+/)[0]
    .trim();
  assert.equal(manifest.files["public-corpus.dwca.zip"], archiveHash);
  const crateText = await readFile(
    resolve(outputDirectory, "ro-crate-metadata.json"),
    "utf8",
  );
  assert.equal(
    manifest.files["ro-crate-metadata.json"],
    execFileSync(
      "sha256sum",
      [resolve(outputDirectory, "ro-crate-metadata.json")],
      { encoding: "utf8" },
    )
      .split(/\s+/)[0]
      .trim(),
  );

  execFileSync("unzip", ["-t", archivePath], { stdio: "ignore" });
  const names = execFileSync("unzip", ["-Z1", archivePath], {
    encoding: "utf8",
  })
    .trim()
    .split("\n");
  assert.deepEqual(names, [
    "meta.xml",
    "eml.xml",
    "taxon.csv",
    "occurrence.csv",
    "claims.csv",
    "guides.csv",
    "guide-claims.csv",
    "sources.csv",
  ]);
  const meta = execFileSync("unzip", ["-p", archivePath, "meta.xml"], {
    encoding: "utf8",
  });
  assert.match(meta, /<archive /);
  for (const name of names.filter((entry) => entry.endsWith(".csv"))) {
    assert.match(
      meta,
      new RegExp(`<location>${name.replace(".", "\\.")}</location>`),
    );
  }

  const tableRows = new Map(
    names
      .filter((name) => name.endsWith(".csv"))
      .map((name) => [
        name,
        parseCsv(
          execFileSync("unzip", ["-p", archivePath, name], {
            encoding: "utf8",
          }),
        ),
      ]),
  );
  const rowsWithProvenance = [
    "taxon.csv",
    "occurrence.csv",
    "claims.csv",
    "guides.csv",
    "guide-claims.csv",
    "sources.csv",
  ];
  for (const name of rowsWithProvenance) {
    for (const row of tableRows.get(name)) {
      assert.ok(row.id, `${name} row is missing identity`);
      assert.ok(
        row.sourceID || name === "sources.csv",
        `${name} row is missing source`,
      );
      assert.ok(row.license, `${name} row is missing license`);
      assert.ok(row.rightsHolder, `${name} row is missing attribution`);
    }
  }

  const sourceIds = new Set(tableRows.get("sources.csv").map((row) => row.id));
  const coreIds = new Set(tableRows.get("taxon.csv").map((row) => row.id));
  assert.ok(coreIds.size > 0, "Darwin Core archive has no taxon core rows");
  for (const name of rowsWithProvenance.filter(
    (entry) => entry !== "taxon.csv",
  )) {
    for (const row of tableRows.get(name)) {
      assert.ok(
        coreIds.has(row.coreID),
        `${name} has an invalid Darwin Core coreID`,
      );
    }
  }
  for (const name of rowsWithProvenance.filter(
    (entry) => entry !== "sources.csv",
  )) {
    for (const row of tableRows.get(name)) {
      for (const sourceId of row.sourceID.split("|")) {
        assert.ok(
          sourceIds.has(sourceId),
          `${name} references absent source ${sourceId}`,
        );
      }
    }
  }

  const crate = JSON.parse(crateText);
  assert.equal(crate["@context"], "https://w3id.org/ro/crate/1.2/context");
  const identifiers = new Set(
    crate["@graph"]
      .map((node) => node.identifier)
      .filter((identifier) => typeof identifier === "string"),
  );
  for (const name of rowsWithProvenance) {
    for (const row of tableRows.get(name)) {
      assert.ok(
        identifiers.has(row.id),
        `${name} identity ${row.id} did not survive RO-Crate`,
      );
    }
  }

  const hidden = await sql.unsafe(`
    SELECT public_id AS value FROM biological_entities WHERE visibility <> 'public'
    UNION SELECT public_id FROM specimens WHERE visibility <> 'public'
    UNION SELECT public_id FROM observations WHERE visibility <> 'public'
    UNION SELECT public_id FROM places WHERE visibility <> 'public'
    UNION SELECT public_id FROM locations WHERE visibility <> 'public'
    UNION SELECT uri FROM media WHERE visibility <> 'public'
  `);
  const exportedText = `${firstManifest}\n${crateText}\n${names
    .filter((name) => name.endsWith(".csv"))
    .map((name) =>
      execFileSync("unzip", ["-p", archivePath, name], { encoding: "utf8" }),
    )
    .join("\n")}`;
  for (const row of hidden) {
    assert.ok(
      !exportedText.includes(row.value),
      `restricted value leaked: ${row.value}`,
    );
  }
  assert.doesNotMatch(exportedText, /geometry_exact|geometryExact/i);

  console.log(
    JSON.stringify({
      valid: true,
      deterministic: true,
      archive: "public-corpus.dwca.zip",
      crate: "ro-crate-metadata.json",
      counts: manifest.counts,
    }),
  );
} finally {
  await sql.end();
  await rm(outputDirectory, { recursive: true, force: true });
}
