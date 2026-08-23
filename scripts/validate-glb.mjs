import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import validator from "gltf-validator";

const assetPath = resolve(
  process.argv[2] ?? "apps/web/public/models/echinopsis-pachanoi-demo.glb",
);
const asset = await readFile(assetPath);
const report = await validator.validateBytes(new Uint8Array(asset), {
  uri: assetPath,
  format: "glb",
});

console.log(
  JSON.stringify(
    {
      assetPath,
      version: report.version,
      numErrors: report.issues.numErrors,
      numWarnings: report.issues.numWarnings,
      numHints: report.issues.numHints,
      drawCallCount: report.info.drawCallCount,
      animationCount: report.info.animationCount,
    },
    null,
    2,
  ),
);

if (report.issues.numErrors > 0) {
  process.exitCode = 1;
}
