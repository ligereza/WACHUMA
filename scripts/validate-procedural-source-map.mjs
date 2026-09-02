import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
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
const preview = await readFile(previewPath, "utf8");
const sourceMap = await readFile(sourceMapPath, "utf8");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const failures = [];

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
    activeRoute: "apps/web/app/preview/svg-loft/page.tsx",
    activeComponent: "apps/web/app/components/GeometryNodesPachanoiPreview.tsx",
    generator: "integrations/blender/generate_pachanoi_geometry_nodes.py",
    blend:
      "integrations/blender/projects/wachuma-pachanoi-geometry-nodes.blend",
    manifest: "apps/web/public/models/pachanoi-sequence/sequence.manifest.json",
    frameCount: manifest.frames.length,
    legacyRouteImport: false,
  }),
);
