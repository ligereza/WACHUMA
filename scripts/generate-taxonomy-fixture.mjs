// Projects the editorial species document into a TypeScript module that the
// taxonomy package can import synchronously.
//
// content/species/echinopsis-pachanoi.json is the single source of truth for
// the values. The development fixture used to restate them by hand, and commit
// eff8048 showed what that costs: four sources were added to the editorial
// document and the fixture kept serving the previous five.
//
// Run `pnpm content:taxonomy-fixture` to regenerate, and
// `pnpm quality:taxonomy-fixture` to fail when the checked-in module and the
// editorial document disagree.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { format, resolveConfig } from "prettier";

const root = fileURLToPath(new URL("..", import.meta.url));
const contentPath = resolve(root, "content/species/echinopsis-pachanoi.json");
const modulePath = resolve(
  root,
  "packages/taxonomy/src/generated/echinopsis-pachanoi.ts",
);

const banner = `// GENERATED FILE - do not edit by hand.
// Source: content/species/echinopsis-pachanoi.json
// Regenerate: pnpm content:taxonomy-fixture
// Drift gate: pnpm quality:taxonomy-fixture
`;

export async function renderModule() {
  const document = JSON.parse(await readFile(contentPath, "utf8"));
  const source = `${banner}
export const editorialSpeciesDocument = ${JSON.stringify(document, null, 2)};
`;
  const options = (await resolveConfig(modulePath)) ?? {};
  return format(source, { ...options, filepath: modulePath });
}

const rendered = await renderModule();
const checkOnly = process.argv.includes("--check");

if (checkOnly) {
  let current = "";
  try {
    current = await readFile(modulePath, "utf8");
  } catch {
    console.error(
      JSON.stringify(
        { failures: ["generated taxonomy fixture is missing"] },
        null,
        2,
      ),
    );
    process.exit(1);
  }
  if (current !== rendered) {
    console.error(
      JSON.stringify(
        {
          failures: [
            "generated taxonomy fixture no longer matches content/species/echinopsis-pachanoi.json",
          ],
          fix: "pnpm content:taxonomy-fixture",
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }
  console.log(
    JSON.stringify({
      module: "packages/taxonomy/src/generated/echinopsis-pachanoi.ts",
      editorialDocument: "content/species/echinopsis-pachanoi.json",
      drift: false,
    }),
  );
} else {
  await mkdir(dirname(modulePath), { recursive: true });
  await writeFile(modulePath, rendered, "utf8");
  console.log(
    JSON.stringify({
      module: "packages/taxonomy/src/generated/echinopsis-pachanoi.ts",
      bytes: Buffer.byteLength(rendered, "utf8"),
    }),
  );
}
