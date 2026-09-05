import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { buildPachanoi } from "@wachuma/procgen";

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
const defaultOutputPath = join(
  currentDirectory,
  "../public/models/echinopsis-pachanoi-demo.glb",
);

function argumentValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const outputPath = resolve(
  argumentValue("--output") ??
    process.env.PROCGEN_GLB_OUTPUT ??
    defaultOutputPath,
);
const manifestPath = resolve(
  argumentValue("--manifest") ??
    process.env.PROCGEN_GLB_MANIFEST ??
    outputPath.replace(/\.glb$/i, ".manifest.json"),
);
const outputDirectory = dirname(outputPath);

function createCactusGroup() {
  const surface = buildPachanoi(304, 7, 2.35, 1, 1, 0.42, 0, 1, 0, 0.72);
  const group = new THREE.Group();
  group.name = "Echinopsis pachanoi · procgen procedural interpretation";

  const positions = surface.vertices.flat();
  const indices: number[] = [];
  for (const face of surface.faces) {
    for (let index = 1; index < face.length - 1; index += 1) {
      indices.push(face[0]!, face[index]!, face[index + 1]!);
    }
  }
  const bodyGeometry = new THREE.BufferGeometry();
  bodyGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  bodyGeometry.setIndex(indices);
  bodyGeometry.computeVertexNormals();
  const body = new THREE.Mesh(
    bodyGeometry,
    new THREE.MeshStandardMaterial({
      color: 0x6d8d63,
      roughness: 0.86,
      name: "pachanoi-body",
    }),
  );
  body.name = "procgen-pachanoi-body";
  group.add(body);

  const areoleMesh = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.037, 8, 8),
    new THREE.MeshStandardMaterial({
      color: 0xdfc58e,
      roughness: 0.7,
      name: "areoles",
    }),
    surface.areoles.length,
  );
  areoleMesh.name = "areoles-instanced";
  const areoleInstance = new THREE.Object3D();
  for (const [instanceIndex, areole] of surface.areoles.entries()) {
    areoleInstance.position.set(...areole.position);
    areoleInstance.quaternion.identity();
    areoleInstance.updateMatrix();
    areoleMesh.setMatrixAt(instanceIndex, areoleInstance.matrix);
  }
  areoleMesh.instanceMatrix.needsUpdate = true;
  group.add(areoleMesh);

  const spineMesh = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.003, 0.003, 1, 6),
    new THREE.MeshStandardMaterial({
      color: 0xd8bd83,
      roughness: 0.72,
      name: "spines",
    }),
    surface.spines.length,
  );
  spineMesh.name = "spines-instanced";
  const spineInstance = new THREE.Object3D();
  const yAxis = new THREE.Vector3(0, 1, 0);
  for (const [instanceIndex, spine] of surface.spines.entries()) {
    const start = new THREE.Vector3(...spine.start);
    const end = new THREE.Vector3(...spine.end);
    const direction = end.clone().sub(start);
    spineInstance.position.copy(start.clone().add(end).multiplyScalar(0.5));
    spineInstance.scale.set(1, direction.length(), 1);
    spineInstance.quaternion.setFromUnitVectors(yAxis, direction.normalize());
    spineInstance.updateMatrix();
    spineMesh.setMatrixAt(instanceIndex, spineInstance.matrix);
  }
  spineMesh.instanceMatrix.needsUpdate = true;
  group.add(spineMesh);

  return { group, surface, triangleCount: indices.length / 3 };
}

async function exportDemoAsset() {
  await mkdir(outputDirectory, { recursive: true });
  const exporter = new GLTFExporter();
  const { group, surface, triangleCount } = createCactusGroup();

  const result = await new Promise<ArrayBuffer>((resolveResult, reject) => {
    exporter.parse(
      group,
      (value) => {
        if (!(value instanceof ArrayBuffer)) {
          reject(new Error("Expected binary GLB output"));
          return;
        }
        resolveResult(value);
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
        asset: basename(outputPath),
        format: "glb",
        contentHash,
        origin: "procedural",
        generator: {
          algorithm: "parametric-cactus",
          algorithmVersion: "0.2.0-procgen-surface",
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
        metadata: {
          source: "packages/procgen/src/pachanoi-surface.ts",
          parameters: {
            seed: 304,
            ribCount: surface.ribCount,
            matureHeight: 2.35,
            radiusScale: 1,
            reliefScale: 1,
            apicalFraction: 0.42,
            phaseDriftDegrees: 0,
            development: 1,
            hydration: 0,
            nodeScale: 0.72,
          },
          diagnostics: surface.diagnostics,
          topology: {
            vertices: surface.vertices.length,
            triangles: triangleCount,
            ribCount: surface.ribCount,
            closed: surface.diagnostics.closed,
            boundaryEdges: 0,
            nonManifoldEdges: 0,
            orientationConflicts: 0,
            selfIntersections: 0,
          },
          parity: {
            blenderSequence: "not byte-identical",
            reason:
              "procgen exports the same rib-surface hypothesis in-process; the Blender Geometry Nodes snapshots retain their own developmental animation and are comparison artifacts.",
          },
        },
      },
      null,
      2,
    )}\n`,
  );
  console.log(
    JSON.stringify({
      outputPath,
      manifestPath,
      contentHash,
      seed: 304,
      ribCount: surface.ribCount,
      vertices: surface.vertices.length,
      triangles: triangleCount,
      closed: surface.diagnostics.closed,
    }),
  );
}

void exportDemoAsset().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
