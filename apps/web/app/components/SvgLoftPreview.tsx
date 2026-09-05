"use client";

import { useEffect, useMemo, useState } from "react";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import {
  buildPachanoi,
  clamp,
  warpShoot,
  type PachanoiSurface,
  type Point3,
} from "@wachuma/procgen";

type ShootNode = {
  id: string;
  parentId: string | null;
  parentAreoleId: string | null;
  origin: Point3;
  development: number;
  kind: "trunk" | "lateral-shoot";
};

const add = (a: Point3, b: Point3): Point3 => [
  a[0] + b[0],
  a[1] + b[1],
  a[2] + b[2],
];
const mul = (a: Point3, scalar: number): Point3 => [
  a[0] * scalar,
  a[1] * scalar,
  a[2] * scalar,
];

function meshGeometry(surface: PachanoiSurface) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(surface.vertices.flat(), 3),
  );
  const indices: number[] = [];
  for (const face of surface.faces) {
    if (face.length === 3) indices.push(...face);
    else indices.push(face[0], face[1], face[2], face[0], face[2], face[3]);
  }
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function Cactus({
  surface,
  position = [0, 0, 0],
  branchTheta,
  branchBend = 0,
}: {
  surface: PachanoiSurface;
  position?: Point3;
  branchTheta?: number;
  branchBend?: number;
}) {
  const renderSurface = useMemo(
    () =>
      branchTheta === undefined
        ? surface
        : warpShoot(surface, branchTheta, branchBend),
    [surface, branchTheta, branchBend],
  );
  const geometry = useMemo(() => meshGeometry(renderSurface), [renderSurface]);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#628d7f",
        roughness: 0.86,
        metalness: 0,
      }),
    [],
  );
  useEffect(
    () => () => {
      geometry.dispose();
    },
    [geometry],
  );
  useEffect(
    () => () => {
      material.dispose();
    },
    [material],
  );

  const spineGeometry = useMemo(() => {
    const positions = new Float32Array(
      renderSurface.spines.flatMap((spine) => [...spine.start, ...spine.end]),
    );
    const result = new THREE.BufferGeometry();
    result.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return result;
  }, [renderSurface]);

  return (
    <group position={position}>
      <mesh geometry={geometry} material={material} castShadow receiveShadow />
      {renderSurface.areoles.map((areole) => (
        <mesh
          key={areole.rib + "-" + areole.row}
          position={areole.position}
          scale={Math.max(0.001, areole.activity)}
          castShadow
        >
          <sphereGeometry args={[0.009 + 0.008 * areole.maturity, 8, 6]} />
          <meshStandardMaterial color="#d1b690" roughness={0.96} />
        </mesh>
      ))}
      <lineSegments geometry={spineGeometry}>
        <lineBasicMaterial color="#e6d6b6" transparent opacity={0.9} />
      </lineSegments>
    </group>
  );
}

function Profile({ surface }: { surface: PachanoiSurface }) {
  const extent =
    Math.max(
      ...surface.crossSection.flatMap(([x, y]) => [Math.abs(x), Math.abs(y)]),
    ) + 0.05;
  const path =
    surface.crossSection
      .map(([x, y], index) => (index ? "L" : "M") + x + " " + -y)
      .join(" ") + "Z";
  return (
    <svg
      className="svg-loft-cross-section"
      viewBox={[-extent, -extent, 2 * extent, 2 * extent].join(" ")}
    >
      <circle className="svg-loft-cross-section-guide" r={surface.baseRadius} />
      <path className="svg-loft-cross-section-shape" d={path} />
      <circle className="svg-loft-cross-section-center" r="0.012" />
    </svg>
  );
}

function Meridian({ surface }: { surface: PachanoiSurface }) {
  const height = Math.max(...surface.meridian.map(([z]) => z));
  const radius = Math.max(...surface.meridian.map(([, r]) => r));
  const path = surface.meridian
    .map(([z, r], index) => (index ? "L" : "M") + z + " " + -r)
    .join(" ");
  return (
    <svg
      className="svg-loft-meridian"
      viewBox={"0 " + -1.2 * radius + " " + height + " " + 1.35 * radius}
    >
      <path className="svg-loft-meridian-shape" d={path} />
      <line
        className="svg-loft-meridian-axis"
        x1="0"
        x2={height}
        y1="0"
        y2="0"
      />
    </svg>
  );
}

function DevelopmentalCactus({
  surface,
  ribs,
  radius,
  relief,
  apex,
  twist,
  hydration,
  nodalRelief,
  basalPup,
}: {
  surface: PachanoiSurface;
  ribs: number;
  radius: number;
  relief: number;
  apex: number;
  twist: number;
  hydration: number;
  nodalRelief: number;
  basalPup: number;
}) {
  // The basal bud is a state transition of the shoot graph.  It starts as a
  // compact juvenile meristem and then derives a whole child surface; it is
  // never a scaled copy or a mesh extruded from the adult trunk.  The zero
  // state is a finite meristem bud, not a conditional mount/unmount, so the
  // transition begins continuously.
  const pupDevelopment = clamp(basalPup);
  const parentAreole = useMemo(() => {
    const candidates = surface.areoles
      .filter((areole) => areole.activity > 0.75)
      .sort((a, b) => Math.abs(a.s - 0.2) - Math.abs(b.s - 0.2));
    return candidates[0] ?? null;
  }, [surface]);
  const shootGraph = useMemo<ShootNode[]>(() => {
    const theta = parentAreole?.theta ?? -0.35;
    const radial = [Math.cos(theta), 0, -Math.sin(theta)] as Point3;
    const fallback = mul(radial, surface.baseRadius * 0.88);
    return [
      {
        id: "trunk",
        parentId: null,
        parentAreoleId: null,
        origin: [0, 0, 0],
        development: 1,
        kind: "trunk",
      },
      {
        id: "lateral-shoot-a",
        parentId: "trunk",
        parentAreoleId: parentAreole
          ? `${parentAreole.rib}-${parentAreole.row}`
          : null,
        origin: parentAreole
          ? add(parentAreole.position, mul(radial, 0.012))
          : fallback,
        development: pupDevelopment,
        kind: "lateral-shoot",
      },
    ];
  }, [parentAreole, surface.baseRadius, pupDevelopment]);
  const pup = useMemo(() => {
    // A young pup begins broad and low, then produces its own axial history.
    // Its height and birth count come from buildPachanoi rather than from a
    // uniform scale of the parent surface.
    return buildPachanoi(
      0,
      ribs,
      0.08 + 1.2 * pupDevelopment,
      radius * (0.04 + 0.55 * pupDevelopment),
      relief * 0.9,
      apex,
      twist * 0.4,
      0.2 + 0.8 * pupDevelopment,
      hydration,
      nodalRelief,
    );
  }, [
    ribs,
    radius,
    relief,
    apex,
    twist,
    hydration,
    nodalRelief,
    pupDevelopment,
  ]);
  const pupNode = shootGraph.find((node) => node.kind === "lateral-shoot");

  return (
    <>
      <Cactus surface={surface} />
      {pupNode ? (
        <Cactus
          surface={pup}
          position={pupNode.origin}
          branchTheta={parentAreole?.theta}
          branchBend={0.12 + 0.14 * pupDevelopment}
        />
      ) : null}
    </>
  );
}

function GardenScene({
  surface,
  top,
  ribs,
  radius,
  relief,
  apex,
  twist,
  hydration,
  nodalRelief,
  basalPup,
}: {
  surface: PachanoiSurface;
  top: boolean;
  ribs: number;
  radius: number;
  relief: number;
  apex: number;
  twist: number;
  hydration: number;
  nodalRelief: number;
  basalPup: number;
}) {
  return (
    <>
      <color attach="background" args={["#101a15"]} />
      <ambientLight intensity={0.48} />
      <hemisphereLight args={["#d9e7ce", "#173226", 0.9]} />
      <directionalLight position={[3.5, 4, 3.2]} intensity={3.2} castShadow />
      <directionalLight position={[-2.5, 2.2, -3]} intensity={0.35} />
      <DevelopmentalCactus
        surface={surface}
        ribs={ribs}
        radius={radius}
        relief={relief}
        apex={apex}
        twist={twist}
        hydration={hydration}
        nodalRelief={nodalRelief}
        basalPup={basalPup}
      />
      <gridHelper
        args={[3, 12, "#365646", "#1a3025"]}
        position={[0, -0.03, 0]}
      />
      <OrbitControls
        makeDefault
        enableDamping
        enableRotate={!top}
        enablePan={!top}
        minDistance={1.1}
        maxDistance={5.5}
        target={[0, 1.25, 0]}
      />
    </>
  );
}

export function SvgLoftPreview() {
  const [top, setTop] = useState(false);
  const [ribs, setRibs] = useState(7);
  const [radius, setRadius] = useState(1);
  const [relief, setRelief] = useState(1);
  const [apex, setApex] = useState(0.42);
  const [twist, setTwist] = useState(0);
  const [development, setDevelopment] = useState(1);
  const [hydration, setHydration] = useState(0);
  const [nodalRelief, setNodalRelief] = useState(0.72);
  const [basalPup, setBasalPup] = useState(0);

  useEffect(() => {
    setTop(new URLSearchParams(window.location.search).get("view") === "top");
  }, []);

  const surface = useMemo(
    () =>
      buildPachanoi(
        0,
        ribs,
        2.6,
        radius,
        relief,
        apex,
        twist,
        development,
        hydration,
        nodalRelief,
      ),
    [ribs, radius, relief, apex, twist, development, hydration, nodalRelief],
  );
  const d = surface.diagnostics;

  return (
    <section
      className="svg-loft-preview"
      aria-label="Modelo modular de cactus columnar"
    >
      <div className="svg-loft-preview-stage">
        <Canvas
          key={top ? "top" : "orbit"}
          shadows
          gl={{
            antialias: true,
            preserveDrawingBuffer: true,
            powerPreference: "high-performance",
          }}
          dpr={[1, 1.75]}
          camera={{
            position: top ? [0, 4.2, 0.001] : [2.35, 1.7, 3.15],
            fov: 42,
          }}
          onCreated={(state) => {
            if (top) {
              state.camera.up.set(0, 0, -1);
              state.camera.lookAt(0, 1.1, 0);
            }
          }}
        >
          <GardenScene
            surface={surface}
            top={top}
            ribs={ribs}
            radius={radius}
            relief={relief}
            apex={apex}
            twist={twist}
            hydration={hydration}
            nodalRelief={nodalRelief}
            basalPup={basalPup}
          />
        </Canvas>
      </div>
      <div className="svg-loft-preview-panel">
        <p className="eyebrow">generación material · modulación hídrica</p>
        <h1>Meristemo → costillas → volumen</h1>
        <p>
          La forma sale de material producido en el ápice. La hidratación
          conserva la longitud transversal de cada costilla y resuelve su
          relieve.
        </p>
        <label className="svg-loft-control">
          <span>desarrollo · {(development * 100).toFixed(0)}%</span>
          <input
            type="range"
            min="0.25"
            max="1"
            step="0.01"
            value={development}
            onChange={(event) => setDevelopment(Number(event.target.value))}
          />
        </label>
        <label className="svg-loft-control">
          <span>hidratación · {hydration.toFixed(2)}</span>
          <input
            type="range"
            min="-1"
            max="1"
            step="0.01"
            value={hydration}
            onChange={(event) => setHydration(Number(event.target.value))}
          />
        </label>
        <label className="svg-loft-control">
          <span>n costillas · {ribs}</span>
          <input
            type="range"
            min="5"
            max="8"
            value={ribs}
            onChange={(event) => setRibs(Number(event.target.value))}
          />
        </label>
        <label className="svg-loft-control">
          <span>radio basal · {(radius * 100).toFixed(0)}%</span>
          <input
            type="range"
            min="0.82"
            max="1.28"
            step="0.01"
            value={radius}
            onChange={(event) => setRadius(Number(event.target.value))}
          />
        </label>
        <label className="svg-loft-control">
          <span>relieve de costilla · {(relief * 100).toFixed(0)}%</span>
          <input
            type="range"
            min="0.7"
            max="1.45"
            step="0.01"
            value={relief}
            onChange={(event) => setRelief(Number(event.target.value))}
          />
        </label>
        <label className="svg-loft-control">
          <span>modulación por areola · {(nodalRelief * 100).toFixed(0)}%</span>
          <input
            type="range"
            min="0"
            max="1.4"
            step="0.01"
            value={nodalRelief}
            onChange={(event) => setNodalRelief(Number(event.target.value))}
          />
        </label>
        <label className="svg-loft-control">
          <span>
            liberación de yema desde areola · {(basalPup * 100).toFixed(0)}%
          </span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={basalPup}
            onChange={(event) => setBasalPup(Number(event.target.value))}
          />
        </label>
        <label className="svg-loft-control">
          <span>longitud apical continua · {(apex * 100).toFixed(0)}%</span>
          <input
            type="range"
            min="0.2"
            max="0.46"
            step="0.01"
            value={apex}
            onChange={(event) => setApex(Number(event.target.value))}
          />
        </label>
        <label className="svg-loft-control">
          <span>torsión común · {twist.toFixed(1)}°</span>
          <input
            type="range"
            min="-8"
            max="8"
            step="0.5"
            value={twist}
            onChange={(event) => setTwist(Number(event.target.value))}
          />
        </label>
        <div className="svg-loft-metrics">
          <span>
            {surface.ribCount} módulos / {surface.ribCount} valles
          </span>
          <span>
            Rᵥ={surface.baseRadius.toFixed(3)} · A resuelta=
            {surface.ribHeight.toFixed(3)}
          </span>
          <span>
            {surface.areoles.length} areolas · {surface.spines.length} espinas
          </span>
          <span>
            {surface.vertices.length} vértices · {surface.faces.length} caras
          </span>
          <span>
            {d.closed ? "malla cerrada" : "revisar malla"} · χ={d.euler}
          </span>
        </div>
        <div className="svg-loft-debug-panel">
          <span className="eyebrow">invariantes</span>
          <div className="svg-loft-debug-join">
            <span>seam={d.seam.toExponential(2)}</span>
            <span>
              {d.c1 < 1e-3 ? "C¹ ✓" : "C¹ ✕"} · {d.c1.toExponential(2)}
            </span>
            <span>
              {d.c2 < 1e-2 ? "C² ✓" : "C² ✕"} · {d.c2.toExponential(2)}
            </span>
            <span>simetría={d.symmetry.toExponential(2)}</span>
            <span>J cuerpo={d.jacobianBody.toExponential(2)}</span>
            <span>J ápice={d.jacobianApex.toExponential(2)}</span>
          </div>
        </div>
        <div className="svg-loft-cross-section-panel">
          <span className="eyebrow">sección: módulos convexos</span>
          <Profile surface={surface} />
        </div>
        <div className="svg-loft-cross-section-panel">
          <span className="eyebrow">
            meridiano: una costilla hasta el ápice
          </span>
          <Meridian surface={surface} />
        </div>
      </div>
    </section>
  );
}
