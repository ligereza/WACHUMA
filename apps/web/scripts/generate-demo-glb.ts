import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { generateCactus } from "@wachuma/procgen";

type NodeFileReader = {
  result: ArrayBuffer | string | null;
  onloadend?: () => void;
  onerror?: (error: unknown) => void;
};

class FileReaderPolyfill implements NodeFileReader {
  result: ArrayBuffer | string | null = null;
  onloadend?: () => void;
  onerror?: (error: unknown) => void;

  readAsDataURL(blob: Blob) {
    void blob
      .arrayBuffer()
      .then((buffer) => {
        this.result = `data:application/octet-stream;base64,${Buffer.from(buffer).toString("base64")}`;
        this.onloadend?.();
      })
      .catch((error: unknown) => this.onerror?.(error));
  }

  readAsArrayBuffer(blob: Blob) {
    void blob
      .arrayBuffer()
      .then((buffer) => {
        this.result = buffer;
        this.onloadend?.();
      })
      .catch((error: unknown) => this.onerror?.(error));
  }
}

const nodeGlobals = globalThis as unknown as {
  FileReader: typeof FileReaderPolyfill;
};
nodeGlobals.FileReader = FileReaderPolyfill;

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const outputDirectory = join(currentDirectory, "../public/models");
const outputPath = join(outputDirectory, "echinopsis-pachanoi-demo.glb");
const manifestPath = join(
  outputDirectory,
  "echinopsis-pachanoi-demo.manifest.json",
);

function createCactusGroup() {
  const model = generateCactus(304, {
    height: 2.35,
    radius: 0.34,
    ribs: 7,
    areolesPerRib: 14,
    branching: 0.24,
    maturity: 0.72,
  });
  const group = new THREE.Group();
  group.name = "Echinopsis pachanoi · procedural interpretation";

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(
      model.parameters.radius * 0.92,
      model.parameters.radius,
      model.parameters.height,
      32,
    ),
    new THREE.MeshStandardMaterial({ color: 0x6d8d63, roughness: 0.86 }),
  );
  body.name = "parametric-cactus-body";
  body.position.y = model.parameters.height / 2;
  group.add(body);

  const areoleMaterial = new THREE.MeshStandardMaterial({
    color: 0xdfc58e,
    roughness: 0.7,
  });
  const areoleMesh = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.037, 8, 8),
    areoleMaterial,
    model.areoles.length,
  );
  areoleMesh.name = "areoles-instanced";
  const instance = new THREE.Object3D();
  for (const [instanceIndex, areole] of model.areoles.entries()) {
    instance.position.set(...areole.position);
    instance.quaternion.set(...areole.rotation);
    instance.updateMatrix();
    areoleMesh.setMatrixAt(instanceIndex, instance.matrix);
  }
  areoleMesh.instanceMatrix.needsUpdate = true;
  group.add(areoleMesh);

  const branch = new THREE.Mesh(
    new THREE.CylinderGeometry(
      model.parameters.radius * 0.58,
      model.parameters.radius * 0.7,
      model.parameters.height * 0.42,
      24,
    ),
    new THREE.MeshStandardMaterial({ color: 0x78986d, roughness: 0.86 }),
  );
  branch.name = "parametric-cactus-branch";
  branch.position.set(
    model.parameters.radius * 0.98,
    model.parameters.height * 0.58,
    0,
  );
  branch.rotation.z = -0.2;
  group.add(branch);

  return group;
}

async function exportDemoAsset() {
  await mkdir(outputDirectory, { recursive: true });
  const exporter = new GLTFExporter();
  const group = createCactusGroup();

  const result = await new Promise<ArrayBuffer>((resolve, reject) => {
    exporter.parse(
      group,
      (value) => {
        if (!(value instanceof ArrayBuffer)) {
          reject(new Error("Expected binary GLB output"));
          return;
        }
        resolve(value);
      },
      (error) => reject(error),
      { binary: true, trs: true },
    );
  });

  const contentHash = createHash("sha256")
    .update(Buffer.from(result))
    .digest("hex");
  await writeFile(outputPath, Buffer.from(result));
  await writeFile(
    manifestPath,
    `${JSON.stringify(
      {
        $schema:
          "https://wachuma.org/schemas/procedural-asset-manifest.schema.json",
        schemaVersion: "1.0",
        asset: "echinopsis-pachanoi-demo.glb",
        format: "glb",
        contentHash,
        origin: "procedural",
        generator: {
          algorithm: "parametric-cactus",
          algorithmVersion: "0.1.0",
          runtime: "node + three.js",
          repositoryUrl: "https://github.com/ligereza/WACHUMA",
          license: "MIT",
          attribution: "Generador parametric-cactus propio de WACHUMA",
        },
        adapterBoundary: "in-process",
        seed: 304,
        license: "WACHUMA-PROJECT",
        attribution: "Generador parametric-cactus propio de WACHUMA",
        representationType: "procedural-interpretation",
        taxonomicClaim: false,
        sourceUrl: "https://github.com/ligereza/WACHUMA",
      },
      null,
      2,
    )}\n`,
  );
  console.log(JSON.stringify({ outputPath, contentHash }));
}

void exportDemoAsset().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
