import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const manifestPath = resolve(
  root,
  "apps/web/public/models/pachanoi-sequence/sequence.manifest.json",
);
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

function parseGlb(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0, true) !== 0x46546c67) throw new Error("not a GLB");
  let offset = 12;
  let json;
  let binary;
  while (offset < bytes.byteLength) {
    const length = view.getUint32(offset, true);
    const type = view.getUint32(offset + 4, true);
    const chunk = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(chunk));
    if (type === 0x004e4942) binary = chunk;
    offset += 8 + length;
  }
  if (!json || !binary) throw new Error("GLB is missing JSON or BIN chunk");
  return { json, binary };
}

function accessorValues(asset, accessorIndex) {
  const accessor = asset.json.accessors[accessorIndex];
  const view = asset.json.bufferViews[accessor.bufferView];
  const componentBytes = { 5121: 1, 5123: 2, 5125: 4, 5126: 4 }[
    accessor.componentType
  ];
  const componentCount = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[
    accessor.type
  ];
  if (!componentBytes || !componentCount || accessor.sparse) {
    throw new Error("unsupported sparse or accessor shape");
  }
  const stride = view.byteStride ?? componentBytes * componentCount;
  const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const values = [];
  const viewData = new DataView(
    asset.binary.buffer,
    asset.binary.byteOffset,
    asset.binary.byteLength,
  );
  for (let index = 0; index < accessor.count; index += 1) {
    const row = [];
    for (let component = 0; component < componentCount; component += 1) {
      const at = start + index * stride + component * componentBytes;
      row.push(
        accessor.componentType === 5126
          ? viewData.getFloat32(at, true)
          : accessor.componentType === 5125
            ? viewData.getUint32(at, true)
            : accessor.componentType === 5123
              ? viewData.getUint16(at, true)
              : viewData.getUint8(at),
      );
    }
    values.push(row.length === 1 ? row[0] : row);
  }
  return values;
}

function topology(asset, primitive) {
  const primitives = Array.isArray(primitive) ? primitive : [primitive];
  const positions = [];
  const indices = [];
  for (const current of primitives) {
    if ((current.mode ?? 4) !== 4)
      throw new Error("body primitive is not triangles");
    const currentPositions = accessorValues(asset, current.attributes.POSITION);
    const currentIndices =
      current.indices === undefined
        ? currentPositions.map((_, index) => index)
        : accessorValues(asset, current.indices);
    const base = positions.length;
    positions.push(...currentPositions);
    indices.push(...currentIndices.map((index) => index + base));
  }
  // Exporters may split identical positions at material or normal seams.
  // Weld by position for topology only; this does not claim vertex identity.
  const welded = new Map();
  const vertexIds = positions.map((position) => {
    const key = position.map((value) => Math.round(value * 1e6)).join(":");
    let id = welded.get(key);
    if (id === undefined) {
      id = welded.size;
      welded.set(key, id);
    }
    return id;
  });
  const weldedIndices = indices.map((index) => vertexIds[index]);
  const edges = new Map();
  const parent = [...welded.values()];
  const find = (value) => {
    while (parent[value] !== value) {
      parent[value] = parent[parent[value]];
      value = parent[value];
    }
    return value;
  };
  const union = (left, right) => {
    const a = find(left);
    const b = find(right);
    if (a !== b) parent[b] = a;
  };
  let degenerateTriangles = 0;
  for (let index = 0; index < weldedIndices.length; index += 3) {
    const [a, b, c] = weldedIndices.slice(index, index + 3);
    if (c === undefined || a === b || b === c || c === a) {
      degenerateTriangles += 1;
      continue;
    }
    union(a, b);
    union(b, c);
    union(c, a);
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
  const components = new Set([...welded.values()].map((index) => find(index)))
    .size;
  return {
    vertices: welded.size,
    triangles: Math.floor(weldedIndices.length / 3),
    components,
    boundaryEdges,
    nonManifoldEdges,
    orientationConflicts,
    degenerateTriangles,
  };
}

const failures = [];
const reports = [];
for (const frame of manifest.frames) {
  const assetPath = resolve(
    root,
    "apps/web/public/models/pachanoi-sequence",
    frame.asset,
  );
  const asset = parseGlb(new Uint8Array(await readFile(assetPath)));
  const expectedRibs = frame.parameters?.["Rib Count"];
  if (expectedRibs !== frame.identity?.rib_ids?.length) {
    failures.push(`${frame.asset}: manifest rib count and identity disagree`);
  }
  const materials = asset.json.materials ?? [];
  const primitiveReports = [];
  for (const [meshIndex, mesh] of (asset.json.meshes ?? []).entries()) {
    for (const [primitiveIndex, primitive] of mesh.primitives.entries()) {
      const material = materials[primitive.material ?? -1]?.name ?? "unnamed";
      const isAccessory = /areole|spine/i.test(material);
      const result = topology(asset, primitive);
      primitiveReports.push({
        meshIndex,
        primitiveIndex,
        material,
        isAccessory,
        ...result,
      });
    }
  }
  const bodyPrimitives = (asset.json.meshes ?? []).flatMap((mesh) =>
    mesh.primitives.filter((primitive) => {
      const material = materials[primitive.material ?? -1]?.name ?? "unnamed";
      return !/areole|spine/i.test(material);
    }),
  );
  const body =
    bodyPrimitives.length > 0 ? topology(asset, bodyPrimitives) : null;
  if (!body) {
    failures.push(`${frame.asset}: no body primitive identified`);
  } else {
    if (body.boundaryEdges !== 0) {
      failures.push(
        `${frame.asset}: body has ${body.boundaryEdges} boundary edges`,
      );
    }
    if (body.nonManifoldEdges !== 0) {
      failures.push(`${frame.asset}: body has non-manifold edges`);
    }
    if (body.orientationConflicts !== 0) {
      failures.push(`${frame.asset}: body has inconsistent orientation`);
    }
    if (body.degenerateTriangles !== 0) {
      failures.push(`${frame.asset}: body has degenerate triangles`);
    }
  }
  reports.push({
    frame: frame.frame,
    asset: frame.asset,
    body,
    primitives: primitiveReports,
  });
}

console.log(
  JSON.stringify(
    {
      frames: reports.length,
      bodySurfaceChecks: reports.reduce((count) => count + 1, 0),
      failures,
      notMeasured: [
        "self-intersections",
        "rib continuity",
        "C0/C1/C2",
        "Jacobian",
        "shader single-application",
      ],
    },
    null,
    2,
  ),
);

if (failures.length > 0) process.exitCode = 1;
