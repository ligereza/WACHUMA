import {
  buildPachanoi,
  clamp,
  type PachanoiSurface,
  type Point3,
} from "./pachanoi-surface.js";

export type AreoleState =
  "nascent" | "spinous" | "dormant" | "vegetative" | "shoot_meristem";

export type HydrationEvent = "dry" | "riego" | "water";

export type DevelopmentalEvent =
  | { kind: "advance"; days: number }
  | { kind: HydrationEvent }
  | { kind: "activate-basal-bud"; areoleId: string };

/** Versioned procedural policy. Values are visual hypotheses, not species facts. */
export interface DevelopmentalProfile {
  modelVersion: "developmental-pachanoi-v0.1.0";
  developmentDays: number;
  childDevelopmentDays: number;
  hydrationTauDays: number;
  ribCount: number;
  matureHeight: number;
  radiusScale: number;
  reliefScale: number;
  apicalFraction: number;
  phaseDriftDegrees: number;
  nodalRelief: number;
}

export const defaultDevelopmentalProfile: DevelopmentalProfile = {
  modelVersion: "developmental-pachanoi-v0.1.0",
  developmentDays: 180,
  childDevelopmentDays: 120,
  hydrationTauDays: 3,
  ribCount: 7,
  matureHeight: 2.6,
  radiusScale: 1,
  reliefScale: 1,
  apicalFraction: 0.42,
  phaseDriftDegrees: 0,
  nodalRelief: 0.72,
};

export interface DevelopmentalAreole {
  id: string;
  shootId: string;
  order: number;
  rib: number;
  row: number;
  birthTime: number;
  state: AreoleState;
  evidence: "unknown" | "observed";
}

export interface DevelopmentalShoot {
  id: string;
  parentShootId: string | null;
  parentAreoleId: string | null;
  apexId: string;
  origin: Point3;
  seed: number;
  birthTime: number;
  development: number;
}

export interface DevelopmentalHistoryEntry {
  kind: "birth" | "hydration" | "activation";
  time: number;
  areoleId?: string;
  shootId?: string;
  value?: string;
}

export interface DevelopmentalState {
  profile: DevelopmentalProfile;
  seed: number;
  time: number;
  hydration: number;
  hydrationTarget: number;
  areoles: DevelopmentalAreole[];
  shoots: DevelopmentalShoot[];
  history: DevelopmentalHistoryEntry[];
}

export interface DevelopmentalProjection {
  time: number;
  hydration: number;
  shoots: Array<{
    shoot: DevelopmentalShoot;
    surface: PachanoiSurface;
    areoleIds: string[];
  }>;
}

export function sigmoid(value: number, slope = 1, midpoint = 0): number {
  if (!Number.isFinite(value) || !Number.isFinite(slope) || slope <= 0) {
    return 0.5;
  }
  const exponent = Math.max(-60, Math.min(60, -slope * (value - midpoint)));
  return 1 / (1 + Math.exp(exponent));
}

function requireIntegerSeed(seed: number): void {
  if (!Number.isInteger(seed)) {
    throw new RangeError("Developmental state seed must be an integer");
  }
}

function normalizedDevelopment(
  time: number,
  birthTime: number,
  duration: number,
): number {
  return clamp((time - birthTime) / Math.max(1, duration));
}

function withNewBirths(
  state: DevelopmentalState,
  time: number,
): { areoles: DevelopmentalAreole[]; history: DevelopmentalHistoryEntry[] } {
  const profile = state.profile;
  const total = Math.max(1, Math.round(profile.ribCount) * 8);
  const development = clamp(time / Math.max(1, profile.developmentDays));
  const existing = new Set(state.areoles.map((areole) => areole.id));
  const areoles = [...state.areoles];
  const history = [...state.history];
  for (let order = 0; order < total; order += 1) {
    const birthTime = (0.86 * order) / Math.max(total - 1, 1);
    if (birthTime > development) continue;
    const id = `trunk:areole:${order}`;
    if (existing.has(id)) continue;
    const rib = (order * 2) % Math.max(1, Math.round(profile.ribCount));
    const areole: DevelopmentalAreole = {
      id,
      shootId: "trunk",
      order,
      rib,
      row: Math.floor(order / Math.max(1, Math.round(profile.ribCount))),
      birthTime,
      state: "nascent",
      evidence: "unknown",
    };
    areoles.push(areole);
    history.push({ kind: "birth", time, areoleId: id });
  }
  return { areoles, history };
}

export function createDevelopmentalState(
  seed: number,
  overrides: Partial<DevelopmentalProfile> = {},
): DevelopmentalState {
  requireIntegerSeed(seed);
  const profile: DevelopmentalProfile = {
    ...defaultDevelopmentalProfile,
    ...overrides,
  };
  const trunk: DevelopmentalShoot = {
    id: "trunk",
    parentShootId: null,
    parentAreoleId: null,
    apexId: "trunk:apex",
    origin: [0, 0, 0],
    seed,
    birthTime: 0,
    development: 0,
  };
  const initial: DevelopmentalState = {
    profile,
    seed,
    time: 0,
    hydration: 0,
    hydrationTarget: 0,
    areoles: [],
    shoots: [trunk],
    history: [],
  };
  const births = withNewBirths(initial, 0);
  return { ...initial, areoles: births.areoles, history: births.history };
}

/** Advance irreversible tissue production and reversible hydration together. */
export function advanceDevelopment(
  state: DevelopmentalState,
  days: number,
): DevelopmentalState {
  if (!Number.isFinite(days) || days < 0) {
    throw new RangeError("Developmental time must be non-negative");
  }
  const time = state.time + days;
  const tau = Math.max(0.001, state.profile.hydrationTauDays);
  const hydration =
    state.hydrationTarget +
    (state.hydration - state.hydrationTarget) * Math.exp(-days / tau);
  const births = withNewBirths(state, time);
  const areoles = births.areoles.map((areole) => {
    if (areole.state === "nascent" && days > 0) {
      return { ...areole, state: "spinous" as const };
    }
    if (areole.state === "spinous" && days > 0) {
      return { ...areole, state: "dormant" as const };
    }
    return areole;
  });
  const shoots = state.shoots.map((shoot) => ({
    ...shoot,
    development:
      shoot.id === "trunk"
        ? clamp(time / state.profile.developmentDays)
        : normalizedDevelopment(
            time,
            shoot.birthTime,
            state.profile.childDevelopmentDays,
          ),
  }));
  return {
    ...state,
    time,
    hydration,
    areoles,
    shoots,
    history: births.history,
  };
}

export function setHydration(
  state: DevelopmentalState,
  event: HydrationEvent,
): DevelopmentalState {
  const hydrationTarget = event === "dry" ? 0 : 1;
  return {
    ...state,
    hydrationTarget,
    history: [
      ...state.history,
      { kind: "hydration", time: state.time, value: event },
    ],
  };
}

export function applyDevelopmentalEvent(
  state: DevelopmentalState,
  event: DevelopmentalEvent,
): DevelopmentalState {
  if (event.kind === "advance") return advanceDevelopment(state, event.days);
  if (event.kind === "activate-basal-bud") {
    return activateBasalBud(state, event.areoleId);
  }
  return setHydration(state, event.kind);
}

/** Explicit release is required; evidence remains unknown/dormant otherwise. */
export function activateBasalBud(
  state: DevelopmentalState,
  areoleId: string,
): DevelopmentalState {
  const parentAreole = state.areoles.find((areole) => areole.id === areoleId);
  if (!parentAreole) throw new RangeError(`Unknown areole: ${areoleId}`);
  if (parentAreole.state !== "dormant") {
    throw new Error("A basal bud can only be released from a dormant areole");
  }
  const parentShoot = state.shoots.find(
    (shoot) => shoot.id === parentAreole.shootId,
  );
  if (!parentShoot) throw new Error(`Areole has no shoot: ${areoleId}`);
  const childIndex = state.shoots.filter((shoot) => shoot.parentShootId).length;
  const childId = `lateral-shoot:${childIndex}`;
  const child: DevelopmentalShoot = {
    id: childId,
    parentShootId: parentShoot.id,
    parentAreoleId: areoleId,
    apexId: `${childId}:apex`,
    origin: [0, 0, 0],
    seed: state.seed + childIndex + 1,
    birthTime: state.time,
    development: 0,
  };
  return {
    ...state,
    areoles: state.areoles.map((areole) =>
      areole.id === areoleId
        ? {
            ...areole,
            state: "shoot_meristem" as const,
            evidence: "observed" as const,
          }
        : areole,
    ),
    shoots: [...state.shoots, child],
    history: [
      ...state.history,
      {
        kind: "activation",
        time: state.time,
        areoleId,
        shootId: childId,
      },
    ],
  };
}

export function projectDevelopmentalState(
  state: DevelopmentalState,
): DevelopmentalProjection {
  const profile = state.profile;
  return {
    time: state.time,
    hydration: state.hydration,
    shoots: state.shoots.map((shoot) => ({
      shoot,
      surface: buildPachanoi(
        shoot.seed,
        profile.ribCount,
        profile.matureHeight * (shoot.id === "trunk" ? 1 : 0.55),
        profile.radiusScale * (shoot.id === "trunk" ? 1 : 0.55),
        profile.reliefScale,
        profile.apicalFraction,
        profile.phaseDriftDegrees,
        shoot.development,
        state.hydration,
        profile.nodalRelief,
      ),
      areoleIds: state.areoles
        .filter((areole) => areole.shootId === shoot.id)
        .map((areole) => areole.id),
    })),
  };
}
