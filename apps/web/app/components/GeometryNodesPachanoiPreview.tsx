"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";

import { OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const FRAME_NUMBERS = [1, 24, 48, 72, 96, 118, 130, 145, 160, 180] as const;
const FRAME_URLS = FRAME_NUMBERS.map(
  (frame) => `/models/pachanoi-sequence/frame-${String(frame).padStart(3, "0")}.glb`,
);

type PreviewControls = {
  innerRoundness: number;
  pulpCoreRadius: number;
  pulpContrast: number;
  spineScale: number;
};

type WachumaShader = {
  uniforms: Record<string, { value: number }>;
  vertexShader: string;
  fragmentShader: string;
};

function patchWachumaMaterial(
  material: THREE.Material,
  kind: "pulp" | "spines",
  controls: PreviewControls,
) {
  const shaderMaterial = material as THREE.MeshStandardMaterial & {
    userData: {
      wachumaShader?: WachumaShader;
      wachumaControls?: PreviewControls;
      wachumaPatched?: boolean;
    };
  };
  shaderMaterial.userData.wachumaControls = controls;

  if (shaderMaterial.userData.wachumaPatched) {
    const shader = shaderMaterial.userData.wachumaShader;
    if (shader) {
      if (kind === "pulp") {
        shader.uniforms.uInnerRoundness.value = controls.innerRoundness;
        shader.uniforms.uPulpCoreRadius.value = controls.pulpCoreRadius;
        shader.uniforms.uPulpContrast.value = controls.pulpContrast;
      } else {
        shader.uniforms.uSpineScale.value = controls.spineScale;
      }
    }
    return;
  }

  const previousOnBeforeCompile = shaderMaterial.onBeforeCompile;
  shaderMaterial.onBeforeCompile = (shader, renderer) => {
    previousOnBeforeCompile(shader, renderer);
    const current = shaderMaterial.userData.wachumaControls ?? controls;

    if (kind === "pulp") {
      shader.uniforms.uInnerRoundness = { value: current.innerRoundness };
      shader.uniforms.uPulpCoreRadius = { value: current.pulpCoreRadius };
      shader.uniforms.uPulpContrast = { value: current.pulpContrast };
      shader.uniforms.uRibCount = { value: 7.0 };
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          "#include <common>\nuniform float uInnerRoundness;\nuniform float uRibCount;\nvarying vec3 vWachumaLocalPosition;",
        )
        .replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nfloat wachumaRadialLength = length(transformed.xz);\nif (wachumaRadialLength > 0.0001) {\n  float wachumaRibWave = cos(atan(transformed.z, transformed.x) * uRibCount);\n  float wachumaValleyLift = uInnerRoundness * 0.012 * (1.0 - wachumaRibWave);\n  transformed.xz += normalize(transformed.xz) * wachumaValleyLift;\n}\nvWachumaLocalPosition = transformed;",
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          "#include <common>\nuniform float uPulpCoreRadius;\nuniform float uPulpContrast;\nvarying vec3 vWachumaLocalPosition;",
        )
        .replace(
          "#include <color_fragment>",
          "#include <color_fragment>\nfloat wachumaPulpRadius = length(vWachumaLocalPosition.xz);\nfloat wachumaPulpT = smoothstep(0.08, 0.96, wachumaPulpRadius / max(uPulpCoreRadius, 0.08));\nvec3 wachumaLightPulp = vec3(0.42, 0.68, 0.28);\nvec3 wachumaDarkPulp = vec3(0.035, 0.14, 0.055);\nvec3 wachumaPulpColor = mix(wachumaLightPulp, wachumaDarkPulp, wachumaPulpT);\ndiffuseColor.rgb = mix(diffuseColor.rgb, wachumaPulpColor, clamp(uPulpContrast, 0.0, 1.0));",
        );
    } else {
      shader.uniforms.uSpineScale = { value: current.spineScale };
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          "#include <common>\nuniform float uSpineScale;",
        )
        .replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nfloat wachumaSpineRadius = length(transformed.xz);\nfloat wachumaSpineAnchor = 0.345;\nif (wachumaSpineRadius > wachumaSpineAnchor) {\n  float wachumaSpineExtra = wachumaSpineRadius - wachumaSpineAnchor;\n  float wachumaSpineTarget = wachumaSpineAnchor + wachumaSpineExtra * clamp(uSpineScale, 0.0, 2.0);\n  transformed.xz *= wachumaSpineTarget / wachumaSpineRadius;\n}",
        );
    }
    shaderMaterial.userData.wachumaShader = shader;
  };
  shaderMaterial.customProgramCacheKey = () => `wachuma-${kind}-controls-v1`;
  shaderMaterial.userData.wachumaPatched = true;
  shaderMaterial.needsUpdate = true;
}

function PachanoiFrame({ url, visible, controls }: { url: string; visible: boolean; controls: PreviewControls }) {
  const { scene } = useGLTF(url);
  const interactiveScene = useMemo(() => {
    const cloned = scene.clone(true);
    cloned.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry = object.geometry.clone();
      object.material = Array.isArray(object.material)
        ? object.material.map((material) => material.clone())
        : object.material.clone();
      object.castShadow = true;
      object.receiveShadow = true;
    });
    return cloned;
  }, [scene]);

  useEffect(() => {
    interactiveScene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => {
        if (material.name === "WACHUMA rib interior texture") patchWachumaMaterial(material, "pulp", controls);
        if (material.name === "WACHUMA spines") patchWachumaMaterial(material, "spines", controls);
      });
    });
  }, [controls, interactiveScene]);

  useEffect(() => () => {
    interactiveScene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => material.dispose());
    });
  }, [interactiveScene]);

  return <primitive object={interactiveScene} visible={visible} />;
}

function PachanoiSequence({
  frameIndex,
  playing,
  onFrame,
  controls,
}: {
  frameIndex: number;
  playing: boolean;
  onFrame: (index: number) => void;
  controls: PreviewControls;
}) {
  const elapsed = useRef(0);
  useFrame((_, delta) => {
    if (!playing) return;
    elapsed.current += delta;
    if (elapsed.current >= 0.18) {
      elapsed.current = 0;
      onFrame((frameIndex + 1) % FRAME_URLS.length);
    }
  });

  return (
    <>
      {FRAME_URLS.map((url, index) => (
        <PachanoiFrame key={url} url={url} visible={index === frameIndex} controls={controls} />
      ))}
    </>
  );
}

FRAME_URLS.forEach((url) => useGLTF.preload(url));

export function GeometryNodesPachanoiPreview() {
  const [frameIndex, setFrameIndex] = useState(FRAME_URLS.length - 1);
  const [playing, setPlaying] = useState(true);
  const [innerRoundness, setInnerRoundness] = useState(0.35);
  const [pulpCoreRadius, setPulpCoreRadius] = useState(0.46);
  const [pulpContrast, setPulpContrast] = useState(0.78);
  const [spineScale, setSpineScale] = useState(1.0);
  const frame = FRAME_NUMBERS[frameIndex];
  const branchBorn = false;
  const controls = useMemo(
    () => ({ innerRoundness, pulpCoreRadius, pulpContrast, spineScale }),
    [innerRoundness, pulpCoreRadius, pulpContrast, spineScale],
  );

  return (
    <section className="svg-loft-preview gn-pachanoi-project" aria-label="Pachanoi generado con Blender Geometry Nodes">
      <div className="svg-loft-preview-stage gn-pachanoi-project-stage">
        <Canvas
          shadows
          dpr={[1, 1.75]}
          camera={{ position: [3.4, 1.65, 3.4], fov: 39 }}
        >
          <color attach="background" args={["#101a15"]} />
          <ambientLight intensity={0.65} />
          <hemisphereLight args={["#d9e7ce", "#173226", 1.1]} />
          <directionalLight castShadow intensity={3.2} position={[3.5, 4.5, 3.2]} />
          <directionalLight intensity={0.5} position={[-2.5, 2.5, -3]} />
          <Suspense fallback={null}>
            <PachanoiSequence frameIndex={frameIndex} playing={playing} onFrame={setFrameIndex} controls={controls} />
          </Suspense>
          <gridHelper args={[3, 12, "#365646", "#1a3025"]} position={[0, -0.03, 0]} />
          <OrbitControls makeDefault enableDamping minDistance={1.2} maxDistance={5.2} target={[0, 1.3, 0]} />
        </Canvas>
      </div>
      <div className="svg-loft-preview-panel gn-pachanoi-project-panel">
        <p className="eyebrow">Blender 4.5.4 · Geometry Nodes · GLB horneado</p>
        <h1>Pachanoi: módulos de costilla</h1>
        <p>
          El volumen no se deforma desde un tubo. Geometry Nodes instancia la misma costilla paramétrica
          <code>M_i(s,u)</code> alrededor del eje; la retícula de areolas y las espinas se evalúa sobre esa
          superficie y el meristemo prolonga el crecimiento apical. El preview reproduce snapshots evaluados
          del mismo `.blend`, porque el exportador glTF no conserva el modificador Geometry Nodes animado.
        </p>
        <div className="gn-control-group" aria-label="Controles de desarrollo">
          <p className="eyebrow">Desarrollo apical</p>
          <div className="svg-loft-control">
            <button type="button" onClick={() => setPlaying((value) => !value)}>
              {playing ? "Pausar" : "Reproducir"}
            </button>
            <input
              type="range"
              min={0}
              max={FRAME_URLS.length - 1}
              step={1}
              value={frameIndex}
              onChange={(event) => {
                setPlaying(false);
                setFrameIndex(Number(event.target.value));
              }}
              aria-label="Frame de desarrollo"
            />
            <span>frame {frame}</span>
          </div>
        </div>
        <div className="gn-control-group" aria-label="Controles de forma de costilla">
          <p className="eyebrow">Forma de costilla</p>
          <label className="svg-loft-control"><span>redondeo interno · {(innerRoundness * 100).toFixed(0)}%</span><input type="range" min={0} max={1} step={0.01} value={innerRoundness} onChange={(event) => setInnerRoundness(Number(event.target.value))} /></label>
        </div>
        <div className="gn-control-group" aria-label="Controles de pulpa SVG">
          <p className="eyebrow">Pulpa inspirada en SVG</p>
          <label className="svg-loft-control"><span>radio de pulpa clara · {(pulpCoreRadius * 100).toFixed(0)}%</span><input type="range" min={0.18} max={0.9} step={0.01} value={pulpCoreRadius} onChange={(event) => setPulpCoreRadius(Number(event.target.value))} /></label>
          <label className="svg-loft-control"><span>contraste claro → oscuro · {(pulpContrast * 100).toFixed(0)}%</span><input type="range" min={0} max={1} step={0.01} value={pulpContrast} onChange={(event) => setPulpContrast(Number(event.target.value))} /></label>
        </div>
        <div className="gn-control-group" aria-label="Controles de areolas y espinas">
          <p className="eyebrow">Areolas y espinas</p>
          <label className="svg-loft-control"><span>longitud de espinas · {(spineScale * 100).toFixed(0)}%</span><input type="range" min={0} max={2} step={0.01} value={spineScale} onChange={(event) => setSpineScale(Number(event.target.value))} /></label>
        </div>
        <div className="svg-loft-metrics">
          <span>n=7 módulos</span>
          <span>u∈[-1,1], s∈[0,1]</span>
          <span>7 espinas Bézier / areola</span>
          <span>pulpa clara central → verde oscuro</span>
          <span>meristemo finito</span>
          <span>{branchBorn ? "rama nacida desde areola" : "brazo desactivado en la base aprobada"}</span>
        </div>
        <p className="svg-loft-metadata">
          `echinopsis-rib-progression.svg` se conserva como referencia visual de la textura interior únicamente;
          no define frames ni tiempo de crecimiento. La fuente editable y animada es
          `integrations/blender/projects/wachuma-pachanoi-geometry-nodes.blend`; la secuencia web son snapshots
          evaluados de ese mismo árbol Geometry Nodes. Los cuatro controles superiores se aplican en tiempo real
          al material y a la deformación de vértices del preview; sus equivalentes quedan expuestos en el grupo GN.
        </p>
      </div>
    </section>
  );
}
