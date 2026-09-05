import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const generator = resolve(root, "apps/web/scripts/generate-demo-glb.ts");
const tempDirectory = await mkdtemp("/tmp/wachuma-procgen-glb-");

function runGenerator(outputPath) {
  const result = execFileSync(
    "pnpm",
    [
      "--filter",
      "@wachuma/web",
      "exec",
      "tsx",
      generator,
      "--output",
      outputPath,
    ],
    { cwd: root, encoding: "utf8", env: process.env },
  );
  return JSON.parse(result.trim().split("\n").at(-1));
}

function parseGlb(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  assert.equal(
    view.getUint32(0, true),
    0x46546c67,
    "generated file is not GLB",
  );
  let offset = 12;
  let json;
  let binary;
  while (offset < bytes.byteLength) {
    const length = view.getUint32(offset, true);
    const type = view.getUint32(offset + 4, true);
    const chunk = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(chunk));
    if (type === 0x004e4942) binary = chunk;
    offset += length + 8;
  }
  assert.ok(json && binary, "generated GLB is missing JSON or BIN");
  return { json, binary };
}

function accessorValues(asset, accessorIndex) {
  const accessor = asset.json.accessors[accessorIndex];
  const view = asset.json.bufferViews[accessor.bufferView];
  const componentBytes = { 5123: 2, 5125: 4, 5126: 4 }[accessor.componentType];
  const componentCount = { SCALAR: 1, VEC3: 3 }[accessor.type];
  assert.ok(componentBytes && componentCount, "unsupported generated accessor");
  const stride = view.byteStride ?? componentBytes * componentCount;
  const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const data = new DataView(
    asset.binary.buffer,
    asset.binary.byteOffset,
    asset.binary.byteLength,
  );
  return Array.from({ length: accessor.count }, (_, index) => {
    const row = Array.from({ length: componentCount }, (_, component) => {
      const at = start + index * stride + component * componentBytes;
      if (accessor.componentType === 5126) return data.getFloat32(at, true);
      if (accessor.componentType === 5125) return data.getUint32(at, true);
      return data.getUint16(at, true);
    });
    return componentCount === 1 ? row[0] : row;
  });
}

function topology(asset, primitive) {
  assert.equal(primitive.mode ?? 4, 4, "body primitive is not triangles");
  const positions = accessorValues(asset, primitive.attributes.POSITION);
  const indices =
    primitive.indices === undefined
      ? positions.map((_, index) => index)
      : accessorValues(asset, primitive.indices);
  const edges = new Map();
  let degenerateTriangles = 0;
  for (let index = 0; index < indices.length; index += 3) {
    const [a, b, c] = indices.slice(index, index + 3);
    if (c === undefined || a === b || b === c || c === a) {
      degenerateTriangles += 1;
      continue;
    }
    for (const [from, to] of [
      [a, b],
      [b, c],
      [c, a],
    ]) {
      const key = from < to ? `${from}:${to}` : `${to}:${from}`;
      const direction = from < to ? 1 : -1;
      const edge = edges.get(key) ?? { count: 0, directions: [] };
      edge.count += 1;
      edge.directions.push(direction);
      edges.set(key, edge);
    }
  }
  let boundaryEdges = 0;
  let nonManifoldEdges = 0;
  let orientationConflicts = 0;
  for (const edge of edges.values()) {
    if (edge.count === 1) boundaryEdges += 1;
    if (edge.count > 2) nonManifoldEdges += 1;
    if (edge.count === 2 && edge.directions[0] === edge.directions[1]) {
      orientationConflicts += 1;
    }
  }
  return {
    positions,
    indices,
    vertices: positions.length,
    triangles: Math.floor(indices.length / 3),
    boundaryEdges,
    nonManifoldEdges,
    orientationConflicts,
    degenerateTriangles,
  };
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const magnitude = (a) => Math.hypot(a[0], a[1], a[2]);
const normal = (a, b, c) => cross(sub(b, a), sub(c, a));
const project = (points, axis) => points.map((point) => dot(point, axis));

function coplanarTrianglesIntersect(left, right, axis) {
  const dominant = axis
    .map((value, index) => [Math.abs(value), index])
    .sort((a, b) => b[0] - a[0])[0][1];
  const project2d = (point) =>
    dominant === 0
      ? [point[1], point[2]]
      : dominant === 1
        ? [point[0], point[2]]
        : [point[0], point[1]];
  const left2d = left.map(project2d);
  const right2d = right.map(project2d);
  const axes = [];
  for (const triangle of [left2d, right2d]) {
    for (let index = 0; index < 3; index += 1) {
      const from = triangle[index];
      const to = triangle[(index + 1) % 3];
      axes.push([to[1] - from[1], from[0] - to[0]]);
    }
  }
  const interval = (points, axis2d) =>
    points.map((point) => point[0] * axis2d[0] + point[1] * axis2d[1]);
  return !axes.some((axis2d) => {
    const a = interval(left2d, axis2d);
    const b = interval(right2d, axis2d);
    return (
      Math.max(...a) < Math.min(...b) - 1e-8 ||
      Math.max(...b) < Math.min(...a) - 1e-8
    );
  });
}

function separatedOnAxis(left, right, axis) {
  if (magnitude(axis) < 1e-10) return false;
  const a = project(left, axis);
  const b = project(right, axis);
  return (
    Math.max(...a) < Math.min(...b) - 1e-8 ||
    Math.max(...b) < Math.min(...a) - 1e-8
  );
}

function trianglesIntersect(left, right) {
  for (let axis = 0; axis < 3; axis += 1) {
    const leftValues = left.map((point) => point[axis]);
    const rightValues = right.map((point) => point[axis]);
    if (
      Math.max(...leftValues) < Math.min(...rightValues) - 1e-7 ||
      Math.max(...rightValues) < Math.min(...leftValues) - 1e-7
    )
      return false;
  }
  const leftEdges = [
    sub(left[1], left[0]),
    sub(left[2], left[1]),
    sub(left[0], left[2]),
  ];
  const rightEdges = [
    sub(right[1], right[0]),
    sub(right[2], right[1]),
    sub(right[0], right[2]),
  ];
  const leftNormal = normal(...left);
  const rightNormal = normal(...right);
  const normalsCross = cross(leftNormal, rightNormal);
  if (magnitude(normalsCross) < 1e-8) {
    const leftNormalLength = magnitude(leftNormal);
    if (leftNormalLength > 1e-10) {
      const planeDistance =
        Math.abs(dot(leftNormal, sub(right[0], left[0]))) / leftNormalLength;
      if (planeDistance < 1e-7)
        return coplanarTrianglesIntersect(left, right, leftNormal);
    }
  }
  const axes = [leftNormal, rightNormal];
  for (const leftEdge of leftEdges) {
    for (const rightEdge of rightEdges) axes.push(cross(leftEdge, rightEdge));
  }
  return !axes.some((axis) => separatedOnAxis(left, right, axis));
}

function countSelfIntersections(topologyReport) {
  const welded = new Map();
  const weldedId = (id) => {
    const point = topologyReport.positions[id];
    const key = point.map((value) => Math.round(value * 1e6)).join(":");
    if (!welded.has(key)) welded.set(key, welded.size);
    return welded.get(key);
  };
  const triangles = [];
  for (let index = 0; index < topologyReport.indices.length; index += 3) {
    const ids = topologyReport.indices.slice(index, index + 3);
    if (ids.length !== 3 || new Set(ids).size !== 3) continue;
    const weldedIds = ids.map(weldedId);
    if (new Set(weldedIds).size !== 3) continue;
    triangles.push({
      ids: weldedIds,
      points: ids.map((id) => topologyReport.positions[id]),
    });
  }
  const cellSize = 0.12;
  const cells = new Map();
  const keyFor = (x, y, z) => `${x}:${y}:${z}`;
  triangles.forEach((triangle, triangleIndex) => {
    const xs = triangle.points.map((point) => Math.floor(point[0] / cellSize));
    const ys = triangle.points.map((point) => Math.floor(point[1] / cellSize));
    const zs = triangle.points.map((point) => Math.floor(point[2] / cellSize));
    for (let x = Math.min(...xs); x <= Math.max(...xs); x += 1) {
      for (let y = Math.min(...ys); y <= Math.max(...ys); y += 1) {
        for (let z = Math.min(...zs); z <= Math.max(...zs); z += 1) {
          const key = keyFor(x, y, z);
          const list = cells.get(key) ?? [];
          list.push(triangleIndex);
          cells.set(key, list);
        }
      }
    }
  });
  const candidates = new Set();
  for (const list of cells.values()) {
    for (let left = 0; left < list.length; left += 1) {
      for (let right = left + 1; right < list.length; right += 1) {
        const a = list[left];
        const b = list[right];
        candidates.add(a < b ? `${a}:${b}` : `${b}:${a}`);
      }
    }
  }
  let intersections = 0;
  for (const pair of candidates) {
    const [leftIndex, rightIndex] = pair.split(":").map(Number);
    const left = triangles[leftIndex];
    const right = triangles[rightIndex];
    if (left.ids.some((id) => right.ids.includes(id))) continue;
    if (trianglesIntersect(left.points, right.points)) intersections += 1;
  }
  return intersections;
}

try {
  const firstPath = resolve(tempDirectory, "procgen-a.glb");
  const secondPath = resolve(tempDirectory, "procgen-b.glb");
  const firstResult = runGenerator(firstPath);
  const secondResult = runGenerator(secondPath);
  const firstBytes = await readFile(firstPath);
  const secondBytes = await readFile(secondPath);
  assert.deepEqual(
    firstBytes,
    secondBytes,
    "same seed did not produce identical GLB bytes",
  );
  const contentHash = createHash("sha256").update(firstBytes).digest("hex");
  assert.equal(contentHash, firstResult.contentHash);
  assert.equal(contentHash, secondResult.contentHash);

  const manifest = JSON.parse(
    await readFile(resolve(tempDirectory, "procgen-a.manifest.json"), "utf8"),
  );
  assert.equal(manifest.adapterBoundary, "in-process");
  assert.equal(manifest.seed, 304);
  assert.equal(
    manifest.metadata.source,
    "packages/procgen/src/pachanoi-surface.ts",
  );
  assert.equal(manifest.metadata.parameters.ribCount, 7);

  const asset = parseGlb(new Uint8Array(firstBytes));
  const bodyPrimitives = [];
  for (const mesh of asset.json.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      const material =
        asset.json.materials?.[primitive.material ?? -1]?.name ?? "";
      if (/pachanoi-body/i.test(material)) bodyPrimitives.push(primitive);
    }
  }
  assert.equal(
    bodyPrimitives.length,
    1,
    "generated GLB must have one body primitive",
  );
  const report = topology(asset, bodyPrimitives[0]);
  assert.equal(report.boundaryEdges, 0);
  assert.equal(report.nonManifoldEdges, 0);
  assert.equal(report.orientationConflicts, 0);
  assert.equal(report.degenerateTriangles, 0);
  const selfIntersections = countSelfIntersections(report);
  assert.equal(selfIntersections, 0, "generated body has self-intersections");

  console.log(
    JSON.stringify({
      valid: true,
      deterministic: true,
      seed: manifest.seed,
      ribCount: manifest.metadata.parameters.ribCount,
      vertices: report.vertices,
      triangles: report.triangles,
      boundaryEdges: report.boundaryEdges,
      nonManifoldEdges: report.nonManifoldEdges,
      orientationConflicts: report.orientationConflicts,
      selfIntersections,
      blenderParity: manifest.metadata.parity.blenderSequence,
    }),
  );
} finally {
  await rm(tempDirectory, { recursive: true, force: true });
}
