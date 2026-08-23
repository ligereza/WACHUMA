import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const recipePath = resolve(root, "integrations/blender/recipe.example.json");
const adapterPath = resolve(
  root,
  "integrations/blender/generate_wachuma_scene.py",
);

const recipe = JSON.parse(await readFile(recipePath, "utf8"));
const adapter = await readFile(adapterPath, "utf8");

const failures = [];
if (recipe.schemaVersion !== "1.0") failures.push("unsupported recipe schema");
if (recipe.output?.format !== "glb") failures.push("adapter output is not GLB");
if (!Number.isInteger(recipe.recipe?.seed))
  failures.push("recipe seed is not integer");
if (recipe.recipe?.constraints?.taxonomicClaim !== false) {
  failures.push("demo recipe must not make a taxonomic claim");
}
if (recipe.generator?.runtime !== "Blender 4.x/5.x Geometry Nodes") {
  failures.push("Blender runtime boundary is not explicit");
}
if (recipe.generator?.license !== "GPL-2.0-or-later") {
  failures.push("Blender license boundary is not explicit");
}
for (const marker of [
  "import bpy",
  '"adapterBoundary": "external-process"',
  "bpy.ops.export_scene.gltf",
  "contentHash",
]) {
  if (!adapter.includes(marker))
    failures.push(`adapter marker missing: ${marker}`);
}

if (failures.length > 0) {
  console.error(JSON.stringify({ failures }, null, 2));
  process.exit(1);
}

console.log(
  JSON.stringify({
    recipe: recipe.recipe.publicId,
    runtime: recipe.generator.runtime,
    boundary: "external-process",
    blenderExecution: "environment-dependent",
  }),
);
