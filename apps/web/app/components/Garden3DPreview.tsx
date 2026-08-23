"use client";

import { Suspense, useState } from "react";

import { Canvas } from "@react-three/fiber";
import { Clone, Grid, Html, OrbitControls, useGLTF } from "@react-three/drei";
import { generateCactus, generateGardenLayout } from "@wachuma/procgen";
import type { GeneratedCactus, Vector3 } from "@wachuma/shared";

const cactus = generateCactus(304, {
  height: 2.35,
  radius: 0.34,
  ribs: 7,
  areolesPerRib: 14,
  branching: 0.24,
  maturity: 0.72,
});

type Placement = {
  id: string;
  label: string;
  position: [number, number, number];
  scale: number;
  rotationY: number;
};

const generatedLayout = generateGardenLayout(304, { maximumPoints: 2 });
const initialPlacements: Placement[] = generatedLayout.points.map(
  (point, index) => ({
    id: `specimen-demo-0${index + 1}`,
    label: `Ejemplar privado 0${index + 1}`,
    position: [...point.position] as [number, number, number],
    scale: index === 0 ? 1 : point.scale,
    rotationY: point.rotationY,
  }),
);

function Cactus({
  model,
  position,
}: {
  model: GeneratedCactus;
  position: Vector3;
}) {
  const { height, radius } = model.parameters;

  return (
    <group position={position}>
      <mesh castShadow receiveShadow position={[0, height / 2, 0]}>
        <cylinderGeometry args={[radius * 0.92, radius, height, 32]} />
        <meshStandardMaterial color="#6d8d63" roughness={0.86} />
      </mesh>

      {model.areoles.map((areole) => (
        <mesh
          key={areole.index}
          castShadow
          position={areole.position as [number, number, number]}
        >
          <sphereGeometry args={[0.037, 8, 8]} />
          <meshStandardMaterial color="#dfc58e" roughness={0.7} />
        </mesh>
      ))}

      <mesh
        castShadow
        position={[radius * 0.98, height * 0.58, 0]}
        rotation={[0, 0, -0.2]}
      >
        <cylinderGeometry
          args={[radius * 0.58, radius * 0.7, height * 0.42, 24]}
        />
        <meshStandardMaterial color="#78986d" roughness={0.86} />
      </mesh>

      <Html position={[0, height + 0.18, 0]} center distanceFactor={5}>
        <span className="scene-label">ejemplar privado · receta 0.1</span>
      </Html>
    </group>
  );
}

function CactusAsset({
  placement,
  selected,
  onSelect,
}: {
  placement: Placement;
  selected: boolean;
  onSelect: () => void;
}) {
  const { scene } = useGLTF("/models/echinopsis-pachanoi-demo.glb");

  return (
    <group
      position={placement.position}
      scale={placement.scale}
      rotation={[0, placement.rotationY, 0]}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
    >
      <Clone object={scene} castShadow receiveShadow />
      <Html position={[0, 2.55, 0]} center distanceFactor={5}>
        <span
          className={`scene-label${selected ? " scene-label-selected" : ""}`}
        >
          {placement.label} · GLB
        </span>
      </Html>
    </group>
  );
}

useGLTF.preload("/models/echinopsis-pachanoi-demo.glb");

function GardenSet({
  placements,
  selectedId,
  onSelect,
}: {
  placements: Placement[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <>
      <ambientLight intensity={1.35} />
      <directionalLight
        castShadow
        intensity={2.2}
        position={[4, 6, 3]}
        shadow-mapSize={[1024, 1024]}
      />
      <Suspense fallback={<Cactus model={cactus} position={[-0.95, 0, 0]} />}>
        {placements.map((placement) => (
          <CactusAsset
            key={placement.id}
            placement={placement}
            selected={placement.id === selectedId}
            onSelect={() => onSelect(placement.id)}
          />
        ))}
      </Suspense>
      <mesh
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.02, 0]}
      >
        <planeGeometry args={[6, 4]} />
        <meshStandardMaterial color="#d8cdb7" roughness={1} />
      </mesh>
      <Grid
        args={[6, 4]}
        cellSize={0.25}
        cellThickness={0.5}
        cellColor="#b5a78f"
        sectionSize={1}
        sectionThickness={0.8}
        sectionColor="#8d806d"
        fadeDistance={8}
        fadeStrength={1.2}
        position={[0, 0.005, 0]}
      />
    </>
  );
}

export function Garden3DPreview() {
  const [placements, setPlacements] = useState(initialPlacements);
  const [selectedId, setSelectedId] = useState(initialPlacements[0].id);
  const selected = placements.find((placement) => placement.id === selectedId);

  function updateSelected(change: Partial<Placement>) {
    setPlacements((current) =>
      current.map((placement) =>
        placement.id === selectedId ? { ...placement, ...change } : placement,
      ),
    );
  }

  function updatePosition(axis: 0 | 2, value: number) {
    if (!selected) return;
    const position: [number, number, number] = [...selected.position];
    position[axis] = value;
    updateSelected({ position });
  }

  function resetScene() {
    setPlacements(initialPlacements);
    setSelectedId(initialPlacements[0].id);
  }

  function exportSnapshot() {
    const snapshot = {
      schemaVersion: "1.0",
      scene: {
        id: "scene-demo-echinopsis",
        publicId: "garden-demo-echinopsis-pachanoi",
        name: "Patio de demostración · Echinopsis pachanoi",
        coordinateSystem: "local-meter",
        units: "meters",
        visibility: "restricted",
        version: 1,
        defaultSeed: 304,
      },
      assets: [
        {
          id: "asset-procedural-cactus-304",
          publicId: "procedural-cactus-echinopsis-304",
          format: "glb",
          origin: "procedural",
          uri: "/models/echinopsis-pachanoi-demo.glb",
          contentHash:
            "e14f510f05ea363fbe3f2fbde298f47c731e7e7ef597e46e824bae2e8701e209",
          license: "WACHUMA-PROJECT",
          attribution: "Generador parametric-cactus propio de WACHUMA",
          visibility: "restricted",
        },
      ],
      objects: placements.map((placement, index) => ({
        id: placement.id,
        publicId: `scene-object-${placement.id}`,
        objectType: "specimen",
        label: placement.label,
        specimenId: placement.id,
        sceneAssetId: "asset-procedural-cactus-304",
        transform: {
          position: placement.position,
          rotation: [
            0,
            Math.sin(placement.rotationY / 2),
            0,
            Math.cos(placement.rotationY / 2),
          ],
          scale: [placement.scale, placement.scale, placement.scale],
        },
        representationType: "procedural-interpretation",
        visibility: "restricted",
        metadata: { seed: index === 0 ? 304 : 914 },
      })),
      recipes: [],
    };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: "application/json",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "wachuma-garden-scene-snapshot.json";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <div
      className="scene-studio"
      aria-label="Vista 3D de un jardín de demostración"
    >
      <div className="scene-preview">
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [4, 3.1, 5], fov: 42 }}
          onPointerMissed={() => setSelectedId("")}
        >
          <color attach="background" args={["#e8e1d3"]} />
          <GardenSet
            placements={placements}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          <OrbitControls
            makeDefault
            enableDamping
            minDistance={3}
            maxDistance={9}
          />
        </Canvas>
      </div>
      <div
        className="scene-controls"
        aria-label="Controles de composición local"
      >
        <div className="scene-controls-heading">
          <span className="eyebrow">borrador local</span>
          <strong>{selected?.label ?? "Ningún objeto seleccionado"}</strong>
        </div>
        {selected ? (
          <div className="scene-control-grid">
            <label>
              X
              <input
                type="range"
                min="-2"
                max="2"
                step="0.05"
                value={selected.position[0]}
                onChange={(event) =>
                  updatePosition(0, Number(event.target.value))
                }
              />
            </label>
            <label>
              Z
              <input
                type="range"
                min="-1.5"
                max="1.5"
                step="0.05"
                value={selected.position[2]}
                onChange={(event) =>
                  updatePosition(2, Number(event.target.value))
                }
              />
            </label>
            <label>
              escala
              <input
                type="range"
                min="0.35"
                max="1.6"
                step="0.01"
                value={selected.scale}
                onChange={(event) =>
                  updateSelected({ scale: Number(event.target.value) })
                }
              />
            </label>
            <label>
              rotación
              <input
                type="range"
                min="-3.14"
                max="3.14"
                step="0.01"
                value={selected.rotationY}
                onChange={(event) =>
                  updateSelected({ rotationY: Number(event.target.value) })
                }
              />
            </label>
            <button type="button" className="scene-reset" onClick={resetScene}>
              Restablecer
            </button>
            <button
              type="button"
              className="scene-reset"
              onClick={exportSnapshot}
            >
              Descargar snapshot
            </button>
          </div>
        ) : (
          <p className="scene-control-empty">
            Haz clic en un organismo para editarlo.
          </p>
        )}
      </div>
    </div>
  );
}
