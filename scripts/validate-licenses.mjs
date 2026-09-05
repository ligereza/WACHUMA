import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
assert.ok(existsSync(resolve(root, "LICENSE")), "Code license is missing");
assert.ok(
  existsSync(resolve(root, "LICENSE-CONTENT.md")),
  "Content license is missing",
);
const notices = await readFile(resolve(root, "THIRD_PARTY.md"), "utf8");
assert.match(notices, /no incluye datasets externos/i);
assert.match(notices, /GBIF/);
assert.match(notices, /licencia/iu);

const manifest = JSON.parse(
  await readFile(
    resolve(
      root,
      "apps/web/public/models/echinopsis-pachanoi-demo.manifest.json",
    ),
    "utf8",
  ),
);
assert.ok(manifest.license, "Published 3D assets need a license");
assert.ok(manifest.attribution, "Published 3D assets need attribution");

const matrix = await readFile(
  resolve(root, "docs/architecture/license-matrix.md"),
  "utf8",
);
const tableLines = matrix.split("\n");
const tables = [];
for (let index = 0; index < tableLines.length; index += 1) {
  if (!/^\s*\|/.test(tableLines[index])) continue;
  const header = tableLines[index];
  const separator = tableLines[index + 1];
  if (!separator || !/^\s*\|(?:\s*:?-+:?\s*\|)+\s*$/.test(separator)) {
    continue;
  }
  const columns = (line) =>
    line
      .trim()
      .replace(/^\||\|$/g, "")
      .split("|")
      .map((cell) => cell.trim());
  const headerCells = columns(header);
  const rows = [];
  index += 2;
  while (index < tableLines.length && /^\s*\|/.test(tableLines[index])) {
    rows.push({ line: index + 1, cells: columns(tableLines[index]) });
    index += 1;
  }
  tables.push({ headerCells, rows });
  index -= 1;
}

assert.ok(tables.length > 0, "License matrix must contain Markdown tables");
for (const table of tables) {
  for (const row of table.rows) {
    assert.equal(
      row.cells.length,
      table.headerCells.length,
      `License matrix row ${row.line} has ${row.cells.length} columns; expected ${table.headerCells.length}`,
    );
  }
}

const evidenceTable = tables.find((table) =>
  table.headerCells.some((cell) => /atribución\s*\/\s*evidencia/i.test(cell)),
);
assert.ok(
  evidenceTable,
  "License matrix needs an evidence table with attribution/evidence",
);
for (const row of evidenceTable.rows) {
  const [artifact, license, source, attribution, status] = row.cells;
  assert.ok(artifact, `License evidence row ${row.line} needs an artifact`);
  assert.ok(license, `License evidence row ${row.line} needs a license`);
  assert.ok(source, `License evidence row ${row.line} needs a source`);
  assert.ok(
    attribution,
    `License evidence row ${row.line} needs attribution/evidence`,
  );
  assert.match(
    status,
    /^(confirmada|no confirmada|no aplicable|solo política)$/i,
    `License evidence row ${row.line} has an invalid status`,
  );
}

console.log(
  JSON.stringify({
    codeLicense: "MIT",
    contentLicense: "CC BY 4.0 with per-record exceptions",
    externalDatasetsBundled: false,
  }),
);
