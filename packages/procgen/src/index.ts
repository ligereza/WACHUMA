import type {
  CactusRecipeParameters,
  GeneratedAreole,
  GeneratedCactus,
  Quaternion,
  Vector3,
} from "@wachuma/shared";

export { buildPachanoi, clamp, warpShoot } from "./pachanoi-surface.js";
export type { PachanoiSurface, Point2, Point3 } from "./pachanoi-surface.js";
export {
  activateBasalBud,
  applyDevelopmentalEvent,
  advanceDevelopment,
  createDevelopmentalState,
  defaultDevelopmentalProfile,
  projectDevelopmentalState,
  setHydration,
  sigmoid,
} from "./developmental-state.js";
export type {
  AreoleState,
  DevelopmentalEvent,
  DevelopmentalAreole,
  DevelopmentalHistoryEntry,
  DevelopmentalProfile,
  DevelopmentalProjection,
  DevelopmentalShoot,
  DevelopmentalState,
  HydrationEvent,
} from "./developmental-state.js";

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

function normalize(vector: Vector3): Vector3 {
  const length = Math.hypot(vector[0], vector[1], vector[2]);
  if (length === 0) return [0, 1, 0];
  return [vector[0] / length, vector[1] / length, vector[2] / length];
}

function quaternionFromDirection(direction: Vector3): Quaternion {
  const [x, y, z] = normalize(direction);
  const yaw = Math.atan2(x, z);
  const pitch = Math.atan2(Math.hypot(x, z), y);
  const halfYaw = yaw / 2;
  const halfPitch = pitch / 2;
  return [
    Math.sin(halfPitch) * Math.sin(halfYaw),
    Math.sin(halfPitch) * Math.cos(halfYaw),
    Math.cos(halfPitch) * Math.sin(halfYaw),
    Math.cos(halfPitch) * Math.cos(halfYaw),
  ];
}

export const defaultCactusParameters: CactusRecipeParameters = {
  height: 2.2,
  radius: 0.38,
  ribs: 7,
  areolesPerRib: 13,
  branching: 0.2,
  maturity: 0.65,
};

export function generateCactus(
  seed: number,
  overrides: Partial<CactusRecipeParameters> = {},
): GeneratedCactus {
  const parameters = { ...defaultCactusParameters, ...overrides };
  const areoles: GeneratedAreole[] = [];
  const total = Math.max(
    1,
    Math.round(parameters.ribs * parameters.areolesPerRib),
  );

  for (let index = 0; index < total; index += 1) {
    const heightRatio = (index + 0.5) / total;
    const ribIndex = index % Math.max(1, Math.round(parameters.ribs));
    const phase = seed * 0.0001 + index * GOLDEN_ANGLE + ribIndex * 0.17;
    const radialAngle =
      ribIndex * ((Math.PI * 2) / Math.max(1, parameters.ribs)) + phase * 0.08;
    const radialOffset = Math.sin(phase) * 0.035;
    const radius = parameters.radius + radialOffset;
    const direction: Vector3 = [
      Math.cos(radialAngle),
      0.14,
      Math.sin(radialAngle),
    ];

    areoles.push({
      position: [
        Math.cos(radialAngle) * radius,
        parameters.height * heightRatio,
        Math.sin(radialAngle) * radius,
      ],
      rotation: quaternionFromDirection(direction),
      heightRatio,
      ribIndex,
      index,
    });
  }

  return {
    algorithm: "parametric-cactus",
    algorithmVersion: "0.1.0",
    seed,
    parameters,
    areoles,
  };
}

export interface LSystemParameters {
  axiom: string;
  rules: Record<string, string>;
  iterations: number;
  angleDegrees: number;
  step: number;
}

export interface LSystemSegment {
  start: Vector3;
  end: Vector3;
  depth: number;
}

export interface GeneratedLSystem {
  algorithm: "l-system";
  algorithmVersion: "0.1.0";
  seed: number;
  parameters: LSystemParameters;
  expanded: string;
  segments: LSystemSegment[];
}

export interface PhyllotaxisPoint {
  position: Vector3;
  index: number;
  normalizedHeight: number;
}

export interface GeneratedPhyllotaxis {
  algorithm: "phyllotaxis";
  algorithmVersion: "0.1.0";
  seed: number;
  count: number;
  radius: number;
  height: number;
  points: PhyllotaxisPoint[];
}

function boundedInteger(
  value: number,
  fallback: number,
  maximum: number,
): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(0, Math.floor(value)));
}

export function expandLSystem(
  axiom: string,
  rules: Record<string, string>,
  iterations: number,
  maxSymbols = 200_000,
): string {
  let current = axiom;
  const rounds = boundedInteger(iterations, 0, 8);
  for (let round = 0; round < rounds; round += 1) {
    let next = "";
    for (const symbol of current) {
      next += rules[symbol] ?? symbol;
      if (next.length > maxSymbols) {
        throw new RangeError("L-system expansion exceeds the symbol limit");
      }
    }
    current = next;
  }
  return current;
}

export function generateLSystem(
  seed: number,
  overrides: Partial<LSystemParameters> = {},
): GeneratedLSystem {
  const parameters: LSystemParameters = {
    axiom: "F",
    rules: { F: "F[+F]F[-F]F" },
    iterations: 3,
    angleDegrees: 24,
    step: 0.35,
    ...overrides,
  };
  if (!Number.isFinite(parameters.step) || parameters.step <= 0) {
    throw new RangeError("L-system step must be positive");
  }
  const expanded = expandLSystem(
    parameters.axiom,
    parameters.rules,
    parameters.iterations,
  );
  const segments: LSystemSegment[] = [];
  const stack: Array<{ position: Vector3; angle: number; depth: number }> = [];
  let position: Vector3 = [0, 0, 0];
  let angle = (seed * 0.0001 * Math.PI) / 180;
  let depth = 0;
  const turn = (parameters.angleDegrees * Math.PI) / 180;

  for (const symbol of expanded) {
    if (symbol === "F" || symbol === "G") {
      const next: Vector3 = [
        position[0] + Math.cos(angle) * parameters.step,
        position[1] + Math.sin(angle) * parameters.step,
        position[2],
      ];
      if (symbol === "F") segments.push({ start: position, end: next, depth });
      position = next;
    } else if (symbol === "+") {
      angle += turn;
    } else if (symbol === "-") {
      angle -= turn;
    } else if (symbol === "|") {
      angle += Math.PI;
    } else if (symbol === "[") {
      stack.push({ position, angle, depth });
      depth += 1;
    } else if (symbol === "]") {
      const previous = stack.pop();
      if (!previous) throw new RangeError("L-system has an unmatched ]");
      position = previous.position;
      angle = previous.angle;
      depth = previous.depth;
    }
  }
  if (stack.length > 0) throw new RangeError("L-system has an unmatched [");

  return {
    algorithm: "l-system",
    algorithmVersion: "0.1.0",
    seed,
    parameters,
    expanded,
    segments,
  };
}

export function generatePhyllotaxis(
  seed: number,
  count: number,
  radius: number,
  height: number,
): GeneratedPhyllotaxis {
  const safeCount = boundedInteger(count, 1, 100_000);
  if (!Number.isFinite(radius) || radius < 0) {
    throw new RangeError("Phyllotaxis radius must be non-negative");
  }
  if (!Number.isFinite(height) || height < 0) {
    throw new RangeError("Phyllotaxis height must be non-negative");
  }
  const points: PhyllotaxisPoint[] = [];
  for (let index = 0; index < safeCount; index += 1) {
    const normalizedHeight = (index + 0.5) / safeCount;
    const angle = seed * 0.0001 + index * GOLDEN_ANGLE;
    const radialDistance = radius * Math.sqrt(normalizedHeight);
    points.push({
      position: [
        Math.cos(angle) * radialDistance,
        height * normalizedHeight,
        Math.sin(angle) * radialDistance,
      ],
      index,
      normalizedHeight,
    });
  }
  return {
    algorithm: "phyllotaxis",
    algorithmVersion: "0.1.0",
    seed,
    count: safeCount,
    radius,
    height,
    points,
  };
}

export interface PoissonDiscParameters {
  width: number;
  depth: number;
  minimumDistance: number;
  maximumPoints: number;
  attemptsPerPoint: number;
}

export interface GardenPlacementPoint {
  position: Vector3;
  index: number;
  scale: number;
  rotationY: number;
}

export interface GeneratedGardenLayout {
  algorithm: "poisson-disc-garden";
  algorithmVersion: "0.1.0";
  seed: number;
  parameters: PoissonDiscParameters;
  points: GardenPlacementPoint[];
}

function seededUnit(seed: number): () => number {
  let state = Math.trunc(seed) >>> 0 || 1;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export function generateGardenLayout(
  seed: number,
  overrides: Partial<PoissonDiscParameters> = {},
): GeneratedGardenLayout {
  const parameters: PoissonDiscParameters = {
    width: 6,
    depth: 4,
    minimumDistance: 0.72,
    maximumPoints: 18,
    attemptsPerPoint: 30,
    ...overrides,
  };
  if (!Number.isFinite(parameters.width) || parameters.width <= 0) {
    throw new RangeError("Garden layout width must be positive");
  }
  if (!Number.isFinite(parameters.depth) || parameters.depth <= 0) {
    throw new RangeError("Garden layout depth must be positive");
  }
  if (
    !Number.isFinite(parameters.minimumDistance) ||
    parameters.minimumDistance <= 0
  ) {
    throw new RangeError("Garden layout minimum distance must be positive");
  }
  const maximumPoints = boundedInteger(parameters.maximumPoints, 1, 512);
  const attemptsPerPoint = boundedInteger(parameters.attemptsPerPoint, 1, 256);
  parameters.maximumPoints = maximumPoints;
  parameters.attemptsPerPoint = attemptsPerPoint;

  const random = seededUnit(seed);
  const points: GardenPlacementPoint[] = [];
  const minimumDistanceSquared =
    parameters.minimumDistance * parameters.minimumDistance;
  const maximumAttempts = maximumPoints * attemptsPerPoint;

  for (
    let attempt = 0;
    attempt < maximumAttempts && points.length < maximumPoints;
    attempt += 1
  ) {
    const x = (random() - 0.5) * parameters.width;
    const z = (random() - 0.5) * parameters.depth;
    const isFarEnough = points.every((point) => {
      const dx = point.position[0] - x;
      const dz = point.position[2] - z;
      return dx * dx + dz * dz >= minimumDistanceSquared;
    });
    if (!isFarEnough) continue;
    points.push({
      position: [x, 0, z],
      index: points.length,
      scale: 0.68 + random() * 0.48,
      rotationY: random() * Math.PI * 2,
    });
  }

  return {
    algorithm: "poisson-disc-garden",
    algorithmVersion: "0.1.0",
    seed,
    parameters,
    points,
  };
}

export { createPlantDescriptor } from "./plant-descriptor.js";
export type { PlantDescriptor } from "./plant-descriptor.js";
