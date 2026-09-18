// Makes the schemas in schemas/ actually binding.
//
// Until now they were documentation: every content document declares a
// `$schema`, eight schema files sit in schemas/, and no gate ever read them.
// The contract was written and nothing enforced it, which is the opposite of
// what this repository claims to do. A section could be added to a content
// document -- and four were -- without any schema describing it.
//
// This gate resolves each document's declared `$schema` to its local file and
// validates the document against it. A document whose schema is missing is a
// failure, not a skip: a dangling contract is worse than no contract.

import { readdir, readFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// The schemas declare draft 2020-12; the default Ajv export is draft-07.
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const root = fileURLToPath(new URL("..", import.meta.url));
const contentDirectory = resolve(root, "content");
const schemaDirectory = resolve(root, "schemas");

async function collectDocuments(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const documents = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      documents.push(...(await collectDocuments(path)));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      documents.push(path);
    }
  }
  return documents;
}

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

// One compiled validator per schema: two guides declare the same contract.
const validators = new Map();

const documents = (await collectDocuments(contentDirectory)).sort();
const failures = [];
const validated = [];
const unschematised = [];

for (const path of documents) {
  const relative = path.slice(root.length);
  const document = JSON.parse(await readFile(path, "utf8"));
  const declared = document.$schema;
  if (!declared) {
    // An example payload may legitimately carry no contract; a corpus document
    // may not. The distinction is the directory it lives in.
    unschematised.push(relative);
    continue;
  }

  const schemaPath = resolve(schemaDirectory, basename(declared));
  let schema;
  try {
    schema = JSON.parse(await readFile(schemaPath, "utf8"));
  } catch {
    failures.push({
      document: relative,
      error: `declares ${declared} but schemas/${basename(declared)} does not exist`,
    });
    continue;
  }

  let validate = validators.get(schemaPath);
  if (!validate) {
    validate = ajv.compile(schema);
    validators.set(schemaPath, validate);
  }
  if (!validate(document)) {
    for (const error of validate.errors ?? []) {
      failures.push({
        document: relative,
        path: error.instancePath || "/",
        error: `${error.message}${error.params?.additionalProperty ? `: ${error.params.additionalProperty}` : ""}`,
      });
    }
    continue;
  }
  validated.push(relative);
}

// The two subject-specific claim contracts are derived from speciesClaim and
// close additionalProperties, so JSON Schema cannot compose them with allOf.
// They are written out in full, which is the drift this repository has already
// paid for once. This keeps them honest: every property of the base must exist
// in each derivative.
const speciesSchema = JSON.parse(
  await readFile(
    resolve(schemaDirectory, "species-document.schema.json"),
    "utf8",
  ),
);
const baseClaim = speciesSchema.$defs.speciesClaim;
for (const derived of ["pathogenicityClaim", "relatedTaxonClaim"]) {
  const candidate = speciesSchema.$defs[derived];
  if (!candidate) {
    failures.push({
      document: "schemas/species-document.schema.json",
      error: `$defs.${derived} is missing`,
    });
    continue;
  }
  for (const property of Object.keys(baseClaim.properties)) {
    if (!(property in candidate.properties)) {
      failures.push({
        document: "schemas/species-document.schema.json",
        path: `/$defs/${derived}`,
        error: `drifted from speciesClaim: missing ${property}`,
      });
    }
  }
}

if (failures.length > 0) {
  console.error(JSON.stringify({ failures }, null, 2));
  process.exit(1);
}

console.log(
  JSON.stringify({
    validated,
    unschematised,
    schemas: (await readdir(schemaDirectory))
      .filter((file) => file.endsWith(".schema.json"))
      .sort(),
  }),
);
