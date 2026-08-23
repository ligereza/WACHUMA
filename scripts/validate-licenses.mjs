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

console.log(
  JSON.stringify({
    codeLicense: "MIT",
    contentLicense: "CC BY 4.0 with per-record exceptions",
    externalDatasetsBundled: false,
  }),
);
