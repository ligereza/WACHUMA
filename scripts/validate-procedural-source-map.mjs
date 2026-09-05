import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const gardenRoutePath = resolve(root, "apps/web/app/garden/page.tsx");
const procgenGeneratorPath = resolve(
  root,
  "apps/web/scripts/generate-demo-glb.ts",
);
const procgenSourcePath = resolve(
  root,
  "packages/procgen/src/pachanoi-surface.ts",
);
const procgenAssetPath = resolve(
  root,
  "apps/web/public/models/echinopsis-pachanoi-demo.glb",
);
const procgenManifestPath = resolve(
  root,
  "apps/web/public/models/echinopsis-pachanoi-demo.manifest.json",
);
const routePath = resolve(root, "apps/web/app/preview/svg-loft/page.tsx");
const previewPath = resolve(
  root,
  "apps/web/app/components/GeometryNodesPachanoiPreview.tsx",
);
const sourceMapPath = resolve(
  root,
  "docs/architecture/procedural-asset-source-map.md",
);
const manifestPath = resolve(
  root,
  "apps/web/public/models/pachanoi-sequence/sequence.manifest.json",
);
const generatorPath = resolve(
  root,
  "integrations/blender/generate_pachanoi_geometry_nodes.py",
);
const blendPath = resolve(
  root,
  "integrations/blender/projects/wachuma-pachanoi-geometry-nodes.blend",
);

const requiredFiles = [
  gardenRoutePath,
  procgenGeneratorPath,
  procgenSourcePath,
  procgenAssetPath,
  procgenManifestPath,
  routePath,
  previewPath,
  sourceMapPath,
  manifestPath,
  generatorPath,
  blendPath,
];
for (const path of requiredFiles) {
  await access(path, constants.F_OK);
}

const route = await readFile(routePath, "utf8");
const gardenRoute = await readFile(gardenRoutePath, "utf8");
const procgenGenerator = await readFile(procgenGeneratorPath, "utf8");
const procgenSource = await readFile(procgenSourcePath, "utf8");
const procgenManifest = JSON.parse(await readFile(procgenManifestPath, "utf8"));
const preview = await readFile(previewPath, "utf8");
const sourceMap = await readFile(sourceMapPath, "utf8");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const failures = [];

if (!gardenRoute.includes("Garden3DPreview")) {
  failures.push("garden route does not import the canonical procgen preview");
}
if (!procgenGenerator.includes("buildPachanoi")) {
  failures.push("canonical GLB generator does not call buildPachanoi");
}
if (!procgenGenerator.includes('adapterBoundary: "in-process"')) {
  failures.push("canonical GLB generator does not declare in-process boundary");
}
if (!procgenSource.includes("export function buildPachanoi")) {
  failures.push("procgen source does not expose buildPachanoi");
}
if (procgenManifest.adapterBoundary !== "in-process") {
  failures.push("canonical procgen manifest is not in-process");
}
if (
  procgenManifest.metadata?.source !==
  "packages/procgen/src/pachanoi-surface.ts"
) {
  failures.push("canonical procgen manifest has no procgen source link");
}

if (!route.includes("GeometryNodesPachanoiPreview")) {
  failures.push(
    "active preview route does not import GeometryNodesPachanoiPreview",
  );
}
if (route.includes('from "../../components/SvgLoftPreview"')) {
  failures.push("active preview route imports the legacy SvgLoftPreview");
}
if (!preview.includes("/models/pachanoi-sequence/frame-")) {
  failures.push("active preview does not point at the pachanoi sequence");
}
if (!preview.includes("fetch(SEQUENCE_MANIFEST_URL")) {
  failures.push("active preview does not load the sequence manifest");
}
if (!sourceMap.includes("sequence.manifest.json")) {
  failures.push("source map does not name the active sequence manifest");
}
if (manifest.generatorVersion !== "0.3.4-cyclic-body-closure") {
  failures.push("active sequence manifest has an unexpected generator version");
}
if (!Array.isArray(manifest.frames) || manifest.frames.length === 0) {
  failures.push("active sequence manifest has no frames");
}

if (failures.length > 0) {
  console.error(JSON.stringify({ failures }, null, 2));
  process.exit(1);
}

console.log(
  JSON.stringify({
    canonicalRoute: "apps/web/app/garden/page.tsx",
    canonicalComponent: "apps/web/app/components/Garden3DPreview.tsx",
    canonicalGenerator: "apps/web/scripts/generate-demo-glb.ts",
    canonicalSource: "packages/procgen/src/pachanoi-surface.ts",
    canonicalManifest:
      "apps/web/public/models/echinopsis-pachanoi-demo.manifest.json",
    comparisonRoute: "apps/web/app/preview/svg-loft/page.tsx",
    comparisonComponent:
      "apps/web/app/components/GeometryNodesPachanoiPreview.tsx",
    comparisonGenerator:
      "integrations/blender/generate_pachanoi_geometry_nodes.py",
    comparisonBlend:
      "integrations/blender/projects/wachuma-pachanoi-geometry-nodes.blend",
    comparisonManifest:
      "apps/web/public/models/pachanoi-sequence/sequence.manifest.json",
    comparisonFrameCount: manifest.frames.length,
    legacyRouteImport: false,
  }),
);
