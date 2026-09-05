export type Point2 = [number, number];
export type Point3 = [number, number, number];
type Face = number[];

type Areole = {
  position: Point3;
  theta: number;
  rib: number;
  row: number;
  s: number;
  maturity: number;
  activity: number;
};

type Spine = { start: Point3; end: Point3 };

type ShootNode = {
  id: string;
  parentId: string | null;
  parentAreoleId: string | null;
  origin: Point3;
  development: number;
  kind: "trunk" | "lateral-shoot";
};

type Birth = {
  order: number;
  rib: number;
  row: number;
  s: number;
  theta: number;
  activity: number;
};

export type PachanoiSurface = {
  vertices: Point3[];
  faces: Face[];
  areoles: Areole[];
  spines: Spine[];
  crossSection: Point2[];
  meridian: Point2[];
  ribCount: number;
  baseRadius: number;
  ribHeight: number;
  apexStart: number;
  diagnostics: {
    seam: number;
    c1: number;
    c2: number;
    symmetry: number;
    jacobianBody: number;
    jacobianApex: number;
    euler: number;
    closed: boolean;
  };
};

const TAU = Math.PI * 2;
export const clamp = (value: number, lo = 0, hi = 1) =>
  Math.max(lo, Math.min(hi, value));
const add = (a: Point3, b: Point3): Point3 => [
  a[0] + b[0],
  a[1] + b[1],
  a[2] + b[2],
];
const sub = (a: Point3, b: Point3): Point3 => [
  a[0] - b[0],
  a[1] - b[1],
  a[2] - b[2],
];
const mul = (a: Point3, scalar: number): Point3 => [
  a[0] * scalar,
  a[1] * scalar,
  a[2] * scalar,
];
const length = (a: Point3) => Math.hypot(a[0], a[1], a[2]);
const distance = (a: Point3, b: Point3) => length(sub(a, b));
const unit = (a: Point3): Point3 => {
  const l = length(a);
  return l > 1e-12 ? mul(a, 1 / l) : [0, 0, 0];
};
const cross = (a: Point3, b: Point3): Point3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

function sectorArcLength(radius: number, relief: number, angle: number) {
  const steps = 96;
  let total = 0;
  for (let index = 0; index < steps; index += 1) {
    const u = -1 + (2 * (index + 0.5)) / steps;
    const oneMinusUSquared = 1 - u * u;
    const r = radius + relief * oneMinusUSquared ** 3;
    const drdu = -6 * relief * u * oneMinusUSquared ** 2;
    total += Math.hypot(drdu, (r * angle) / 2);
  }
  return (total * 2) / steps;
}

// The mature epidermis is treated as nearly inextensible across a rib.
// Given a hydration-driven mean radius, solve the rib relief that preserves
// the transverse material arclength instead of hand-tuning an amplitude.
function reliefForArcLength(
  radius: number,
  targetLength: number,
  angle: number,
) {
  if (sectorArcLength(radius, 0, angle) >= targetLength) return 0;
  let lo = 0;
  let hi = radius * 1.5;
  for (let iteration = 0; iteration < 32; iteration += 1) {
    const mid = (lo + hi) / 2;
    if (sectorArcLength(radius, mid, angle) < targetLength) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/*
 * A rib is the primitive, not a decoration on a tube.
 *
 * M_i(s,u), i=0..n-1, s in [0,1], u in [-1,1]
 *
 *   theta = phi(s) + (i + u/2) 2pi/n
 *   rho   = R_v(s) + A(s) (1-u^2)^3
 *   z     = Z(s) + L(s) (1-u^2)^3
 *   M_i   = (rho cos theta, z, -rho sin theta)
 *
 * u=+1 of M_i and u=-1 of M_(i+1) are literally the same valley
 * curve.  b(u)=(1-u^2)^3 has b=b'=b''=0 at the two valleys, so
 * the module network is C2 across them.
 *
 * A rib is an orthostichy: a persistent ridge track carrying an areole
 * series, bounded by two persistent valley tracks.  The meristem is a
 * finite *domain* of this same surface: the rib amplitude falls faster
 * than the mean radius, so the tracks disappear smoothly into its centre.
 */
export function buildPachanoi(
  seed: number,
  ribCount: number,
  matureHeight: number,
  radiusScale: number,
  reliefScale: number,
  apicalFraction: number,
  phaseDriftDegrees: number,
  development: number,
  hydration: number,
  nodeScale: number,
): PachanoiSurface {
  if (!Number.isInteger(seed)) {
    throw new RangeError("Pachanoi surface seed must be an integer");
  }
  const n = Math.round(clamp(ribCount, 4, 10));
  const delta = TAU / n;
  const phase0 = -Math.PI / 2 + seed * 0.0001;
  const drift = (phaseDriftDegrees * Math.PI) / 180;
  // Pachanoi-like proportions: tall, broad ribs, and valleys deep enough
  // to remain structurally legible rather than a weak sinusoid on a tube.
  const matureRadius = 0.34 * radiusScale;
  const referenceRelief = 0.17 * reliefScale;
  const referenceArcLength = sectorArcLength(
    matureRadius,
    referenceRelief,
    delta,
  );
  const baseRadius = matureRadius * (1 + 0.115 * clamp(hydration, -1, 1));
  const ribHeight = reliefForArcLength(baseRadius, referenceArcLength, delta);
  const developmentAge = clamp(development);
  // Primary elongation is apical: the basal coordinate stays fixed and the
  // active SAM advances the top boundary.  This is not a uniform morph from
  // a finished cactus.
  const height = matureHeight * (0.22 + 0.78 * developmentAge);
  // The apical zone is set in units of the shoot radius, not as an
  // arbitrary percentage of total height.  A pachanoi crown is a low,
  // broad dome; a cap whose height scales with the whole column becomes a
  // cone as the plant gets taller.
  const requestedCapHeight = baseRadius * (0.72 + 1.05 * apicalFraction);
  const apexStart = clamp(1 - requestedCapHeight / height, 0.68, 0.94);
  const capHeight = height * (1 - apexStart);
  const rings = 72;
  const samplesPerRib = 12;
  const columns = n * samplesPerRib;
  // Development must not change topology.  The previous rounded row count
  // rebuilt the birth lattice at discrete slider values and caused jumps.
  const rows = 8;
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  // m is an explicit rational phyllotactic hypothesis, not a golden angle.
  // Pick a coprime step so one chronological sequence visits every rib.
  const parastichyStep =
    [2, 3, n - 1, 1].find((candidate) => gcd(candidate, n) === 1) ?? 1;

  const phase = (s: number) => phase0 + drift * s;
  const apexParameter = (s: number) => clamp((s - apexStart) / (1 - apexStart));
  // Areoles are born at the peripheral birth zone of the meristem, then
  // are advected down their orthostichy as the apex produces tissue.  The
  // very centre is not an areole, but the youngest n areoles must sit
  // immediately around it; stopping them at the shoulder was incorrect.
  const areoleStart = 0.11;
  const areoleEnd = 0.972;
  const totalBirths = rows * n;
  const advectionExponent = 1.65;
  const apicalAgeFraction = 0.2;
  const advectionDenominator =
    apicalAgeFraction ** advectionExponent +
    advectionExponent *
      apicalAgeFraction ** (advectionExponent - 1) *
      (1 - apicalAgeFraction);
  const advectionScale = (areoleEnd - areoleStart) / advectionDenominator;
  const advectedDistance = (age: number) => {
    if (age <= apicalAgeFraction)
      return advectionScale * age ** advectionExponent;
    // C1 continuation: mature internodes have nearly constant spacing.
    return (
      advectionScale *
      (apicalAgeFraction ** advectionExponent +
        advectionExponent *
          apicalAgeFraction ** (advectionExponent - 1) *
          (age - apicalAgeFraction))
    );
  };
  const smoothstep = (value: number) => {
    const t = clamp(value);
    return t * t * (3 - 2 * t);
  };
  const birthsByRib: Birth[][] = Array.from({ length: n }, () => []);
  const births: Birth[] = Array.from({ length: totalBirths }, (_, order) => {
    const rib = (order * parastichyStep) % n;
    const birthTime = (order + 1) / totalBirths;
    const age =
      developmentAge > birthTime
        ? clamp((developmentAge - birthTime) / (1 - birthTime))
        : 0;
    // Material age -> current longitudinal coordinate. Recent plastochrons
    // remain at the apex; mature internodes then become almost equally
    // spaced, matching the observed pachanoi rhythm.
    const matureAdvectionRange = advectedDistance(1);
    // New primordia are always placed in the finite peripheral SAM domain at
    // the top.  Development changes which primordia exist and how long they
    // have been advected; it does not move the birth zone down the stem.
    const s =
      areoleEnd -
      ((areoleEnd - areoleStart) * advectedDistance(age)) /
        matureAdvectionRange;
    const birth: Birth = {
      order,
      rib,
      row: birthsByRib[rib]!.length,
      s,
      theta: phase(s) + rib * delta,
      activity: smoothstep((developmentAge - birthTime + 0.18) / 0.28),
    };
    birthsByRib[rib]!.push(birth);
    return birth;
  });
  // Young apical areoles are visibly woolly and already carry short spines;
  // their length is reduced, never made to vanish.
  const areoleMaturity = (s: number) =>
    1 -
    0.66 *
      smoothstep((s - (apexStart - 0.04)) / (areoleEnd - apexStart + 0.04));

  // A node is not noise and is not another global wave.  It is a compact,
  // C2 growth kernel attached to one areole.  Its support is short compared
  // with the internode, so the visual rhythm is "growth at each areole →
  // relaxation", as in the reference rather than a corrugated tube.
  const nodeWidth = 0.068;
  const compactKernel = (x: number) => (Math.abs(x) < 1 ? (1 - x * x) ** 3 : 0);
  const nodeGrowth = (rib: number, s: number) => {
    let total = 0;
    for (const birth of birthsByRib[rib]!) {
      const x = (s - birth.s) / nodeWidth;
      total += birth.activity * compactKernel(x);
    }
    return total;
  };
  // Pachanoi ribs are not merely swollen at an areole: a shallow transverse
  // notch follows just above it. This signed pair creates the observed
  // relaxed, modular rhythm without a global sine wave.
  const nodeNotch = (rib: number, s: number) =>
    birthsByRib[rib]!.reduce(
      (total, birth) =>
        total + birth.activity * compactKernel((s - (birth.s + 0.028)) / 0.052),
      0,
    );

  const bodyTop = height * apexStart;

  // The outer silhouette is one C1 meridian: an almost vertical body
  // enters an ellipsoidal end directly.  There is no terminal ring and no
  // separately glued cap.  At t=0, d rho / dz = 0; at t=1 the tangent is
  // horizontal, as on a rounded dome rather than a cone.
  const z = (s: number) => {
    if (s <= apexStart) return height * s;
    const t = apexParameter(s);
    return bodyTop + capHeight * Math.sin((Math.PI * t) / 2);
  };

  const taper = (s: number) => Math.cos((Math.PI * apexParameter(s)) / 2);
  const bodyBreath = (s: number) => 1 - 0.028 * s ** 4;
  const valleyRadius = (s: number) => baseRadius * bodyBreath(s) * taper(s);
  // A ~rho^3 mode makes the angular rib pattern vanish before the polar
  // coordinate degenerates.  This is the condition that prevents a star
  // or a visible "sombrero" at the meristem.
  const ridgeRelief = (s: number) => ribHeight * bodyBreath(s) * taper(s) ** 3;
  const ridgeLift = (s: number) => {
    const t = apexParameter(s);
    return capHeight * 0.13 * Math.sin(Math.PI * t) ** 2;
  };
  // Wide convex rib module, with C2-flat valleys.  The shoulders are
  // deliberately broad; narrow sine-like ridges were the source of the
  // previous "tube with lines" appearance.
  const bump = (u: number) => {
    const m = 1 - u * u;
    return m ** 3 * (1 + 3 * u * u);
  };

  const modulePoint = (rib: number, s: number, u: number): Point3 => {
    const local = clamp(u, -1, 1);
    const b = bump(local);
    const theta = phase(s) + (rib + local / 2) * delta;
    // The nodal increment acts only on the convex rib: the valleys remain
    // shared material tracks.  That preserves the C2 joins between modules.
    const growth =
      nodeGrowth(rib, s) * nodeScale * taper(s) ** 2 * developmentAge;
    const notch =
      nodeNotch(rib, s) * nodeScale * taper(s) ** 2 * developmentAge;
    const radius =
      valleyRadius(s) +
      ridgeRelief(s) * b +
      baseRadius * (0.045 * growth - 0.021 * notch) * b;
    return [
      radius * Math.cos(theta),
      z(s) + ridgeLift(s) * b + height * (0.008 * growth - 0.0025 * notch) * b,
      -radius * Math.sin(theta),
    ];
  };

  // Do not sample the polar point as a full ring: one top vertex gives a
  // closed disk topology without a degenerate horizontal face.
  const ringS = Array.from({ length: rings }, (_, index) => index / rings);
  const vertices: Point3[] = [];
  const starts: number[] = [];
  for (const s of ringS) {
    starts.push(vertices.length);
    for (let column = 0; column < columns; column += 1) {
      const rib = Math.floor(column / samplesPerRib);
      const localIndex = column % samplesPerRib;
      const u = -1 + (2 * localIndex) / samplesPerRib;
      vertices.push(modulePoint(rib, s, u));
    }
  }

  const bottomPole = vertices.length;
  vertices.push([0, -0.028, 0]);
  const faces: Face[] = [];
  for (let column = 0; column < columns; column += 1) {
    const next = (column + 1) % columns;
    faces.push([bottomPole, starts[0]! + next, starts[0]! + column]);
  }
  for (let ring = 0; ring < starts.length - 1; ring += 1) {
    for (let column = 0; column < columns; column += 1) {
      const next = (column + 1) % columns;
      faces.push([
        starts[ring]! + column,
        starts[ring]! + next,
        starts[ring + 1]! + next,
        starts[ring + 1]! + column,
      ]);
    }
  }
  const meristem = vertices.length;
  vertices.push([0, height, 0]);
  const last = starts[starts.length - 1];
  for (let column = 0; column < columns; column += 1) {
    const next = (column + 1) % columns;
    faces.push([last! + column, last! + next, meristem]);
  }

  const areoles: Areole[] = [];
  const spines: Spine[] = [];
  // The ridge is an orthostichy.  Its areoles are a longitudinal series;
  // adjacent series are offset by an explicitly chosen integer parastichy
  // step m in Z_n.  This is deliberately not a golden-angle assumption.
  for (const birth of births) {
    const { rib, row, s, theta } = birth;
    const radial: Point3 = [Math.cos(theta), 0, -Math.sin(theta)];
    const circumferential: Point3 = [Math.sin(theta), 0, Math.cos(theta)];
    const position = add(modulePoint(rib, s, 0), mul(radial, 0.02));
    const maturity = areoleMaturity(s);
    areoles.push({
      position,
      theta,
      rib,
      row,
      s,
      maturity,
      activity: birth.activity,
    });
    if (birth.activity < 0.015) continue;
    for (let j = -1; j <= 1; j += 1) {
      const direction = unit(
        add(add(mul(radial, 0.92), mul(circumferential, 0.16 * j)), [
          0,
          j === 0 ? 0.1 : 0.035,
          0,
        ]),
      );
      const matureLength = j === 0 ? 0.065 : 0.046;
      spines.push({
        start: position,
        end: add(
          position,
          mul(
            direction,
            matureLength * Math.max(0.34, maturity) * birth.activity,
          ),
        ),
      });
    }
  }

  const sectionS = 0.35;
  const crossSection = Array.from({ length: columns }, (_, column) => {
    const rib = Math.floor(column / samplesPerRib);
    const localIndex = column % samplesPerRib;
    const point = modulePoint(
      rib,
      sectionS,
      -1 + (2 * localIndex) / samplesPerRib,
    );
    return [point[0], -point[2]] as Point2;
  });
  const meridian = [
    ...ringS.map(
      (s) => [z(s) + ridgeLift(s), valleyRadius(s) + ridgeRelief(s)] as Point2,
    ),
    [height, 0] as Point2,
  ];

  let seam = 0;
  let c1 = 0;
  let c2 = 0;
  const e = 1e-3;
  for (let sample = 0; sample < 14; sample += 1) {
    const s = 0.03 + (0.92 * sample) / 13;
    for (let rib = 0; rib < n; rib += 1) {
      const nextRib = (rib + 1) % n;
      seam = Math.max(
        seam,
        distance(modulePoint(rib, s, 1), modulePoint(nextRib, s, -1)),
      );
      const left1 = mul(
        sub(modulePoint(rib, s, 1), modulePoint(rib, s, 1 - e)),
        1 / e,
      );
      const right1 = mul(
        sub(modulePoint(nextRib, s, -1 + e), modulePoint(nextRib, s, -1)),
        1 / e,
      );
      c1 = Math.max(c1, distance(left1, right1));
      const left2 = mul(
        add(
          sub(modulePoint(rib, s, 1), mul(modulePoint(rib, s, 1 - e), 2)),
          modulePoint(rib, s, 1 - 2 * e),
        ),
        1 / (e * e),
      );
      const right2 = mul(
        add(
          sub(
            modulePoint(nextRib, s, -1 + 2 * e),
            mul(modulePoint(nextRib, s, -1 + e), 2),
          ),
          modulePoint(nextRib, s, -1),
        ),
        1 / (e * e),
      );
      c2 = Math.max(c2, distance(left2, right2));
    }
  }

  const symmetry = Math.max(
    ...Array.from({ length: n }, (_, rib) => {
      const angle = rib * delta;
      return Array.from({ length: 10 }, (_, index) => {
        const s = index / 9;
        const p = modulePoint(rib, s, 0);
        const base = modulePoint(0, s, 0);
        const expected: Point3 = [
          base[0] * Math.cos(angle) + base[2] * Math.sin(angle),
          base[1],
          base[2] * Math.cos(angle) - base[0] * Math.sin(angle),
        ];
        return distance(p, expected);
      }).reduce((max, value) => Math.max(max, value), 0);
    }),
  );

  const jacobian = (s: number, u: number) => {
    const h = 1e-4;
    const ds = mul(
      sub(modulePoint(0, s + h, u), modulePoint(0, s - h, u)),
      1 / (2 * h),
    );
    const du = mul(
      sub(modulePoint(0, s, u + h), modulePoint(0, s, u - h)),
      1 / (2 * h),
    );
    return length(cross(ds, du));
  };
  const jacobianBody = Math.min(
    ...[0.08, 0.25, 0.45, 0.62].map((s) => jacobian(s, 0)),
  );
  const jacobianApex = Math.min(
    ...[0.88, 0.92, 0.95, 0.97].map((s) => jacobian(s, 0)),
  );

  const edges = new Map<string, number>();
  for (const face of faces) {
    face.forEach((a, index) => {
      const b = face[(index + 1) % face.length]!;
      const key = Math.min(a, b) + ":" + Math.max(a, b);
      edges.set(key, (edges.get(key) ?? 0) + 1);
    });
  }
  const euler = vertices.length - edges.size + faces.length;
  const closed =
    [...edges.values()].every((count) => count === 2) && euler === 2;

  return {
    vertices,
    faces,
    areoles,
    spines,
    crossSection,
    meridian,
    ribCount: n,
    baseRadius,
    ribHeight,
    apexStart,
    diagnostics: {
      seam,
      c1,
      c2,
      symmetry,
      jacobianBody,
      jacobianApex,
      euler,
      closed,
    },
  };
}

// A secondary axis is not a translated vertical cylinder.  Its local shoot
// surface is transported along a curved centerline that leaves the parent
// areole radially and then relaxes into an upright direction.  This is a
// geometric representation of a lateral meristem becoming a new shoot; it
// does not claim a measured bend law for every pachanoi clone.
export function warpShoot(
  surface: PachanoiSurface,
  theta: number,
  bend: number,
): PachanoiSurface {
  const height = Math.max(...surface.meridian.map(([z]) => z));
  const radial: Point3 = [Math.cos(theta), 0, -Math.sin(theta)];
  const tangent: Point3 = [Math.sin(theta), 0, Math.cos(theta)];
  const mapPoint = (point: Point3): Point3 => {
    const t = clamp((point[1] + 0.028) / (height + 0.028));
    const radialOffset = bend * (1 - Math.cos((Math.PI * t) / 2));
    const localRadial = point[0] + radialOffset;
    return [
      localRadial * radial[0] + point[2] * tangent[0],
      point[1],
      localRadial * radial[2] + point[2] * tangent[2],
    ];
  };
  return {
    ...surface,
    vertices: surface.vertices.map(mapPoint),
    areoles: surface.areoles.map((areole) => ({
      ...areole,
      position: mapPoint(areole.position),
    })),
    spines: surface.spines.map((spine) => ({
      start: mapPoint(spine.start),
      end: mapPoint(spine.end),
    })),
  };
}
