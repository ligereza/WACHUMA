"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Clone, useGLTF } from "@react-three/drei";
import type { Group, PerspectiveCamera, DirectionalLight } from "three";
import { Color } from "three";
import {
  echinopsisScrollExperience,
  interpolateScrollChapter,
  type ScrollExperience,
} from "@wachuma/shared";

const TAU = Math.PI * 2;

function damp(current: number, target: number, speed: number, delta: number) {
  return current + (target - current) * (1 - Math.exp(-speed * delta));
}

function lerp(left: number, right: number, amount: number) {
  return left + (right - left) * amount;
}

function ScrollModel({
  experience,
  progressRef,
  reducedMotionRef,
}: {
  experience: ScrollExperience;
  progressRef: MutableRefObject<number>;
  reducedMotionRef: MutableRefObject<boolean>;
}) {
  const { scene } = useGLTF(experience.modelUri);
  const groupRef = useRef<Group>(null);
  const lightRef = useRef<DirectionalLight>(null);

  useFrame(({ camera }, delta) => {
    const progress = reducedMotionRef.current ? 0 : progressRef.current;
    const { current, next, localProgress } = interpolateScrollChapter(
      experience,
      progress,
    );
    const rotationTurns = lerp(
      current.rotationTurns,
      next.rotationTurns,
      localProgress,
    );
    const distance = lerp(
      current.camera.distance,
      next.camera.distance,
      localProgress,
    );
    const height = lerp(
      current.camera.height,
      next.camera.height,
      localProgress,
    );
    const targetHeight = lerp(
      current.camera.targetHeight,
      next.camera.targetHeight,
      localProgress,
    );
    const fov = lerp(current.camera.fov, next.camera.fov, localProgress);
    const group = groupRef.current;
    const directionalLight = lightRef.current;
    const perspectiveCamera = camera as PerspectiveCamera;

    if (group) {
      group.rotation.y = damp(group.rotation.y, rotationTurns * TAU, 7, delta);
    }

    perspectiveCamera.position.x = damp(
      perspectiveCamera.position.x,
      Math.sin(progress * Math.PI * 0.8) * 0.45,
      5,
      delta,
    );
    perspectiveCamera.position.y = damp(
      perspectiveCamera.position.y,
      height,
      5,
      delta,
    );
    perspectiveCamera.position.z = damp(
      perspectiveCamera.position.z,
      distance,
      5,
      delta,
    );
    perspectiveCamera.fov = damp(perspectiveCamera.fov, fov, 5, delta);
    perspectiveCamera.lookAt(0, targetHeight, 0);
    perspectiveCamera.updateProjectionMatrix();

    if (directionalLight) {
      directionalLight.intensity = damp(
        directionalLight.intensity,
        1.65 + Math.sin(progress * Math.PI) * 0.7,
        4,
        delta,
      );
      directionalLight.color.lerp(new Color(current.accent), 0.08);
    }
  });

  return (
    <>
      <directionalLight
        ref={lightRef}
        castShadow
        intensity={1.65}
        position={[4, 6, 4]}
      />
      <group ref={groupRef} position={[0, -1.15, 0]}>
        <Clone object={scene} castShadow receiveShadow />
      </group>
    </>
  );
}

function ScrollFallback({
  progressRef,
  reducedMotionRef,
}: {
  progressRef: MutableRefObject<number>;
  reducedMotionRef: MutableRefObject<boolean>;
}) {
  const groupRef = useRef<Group>(null);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const progress = reducedMotionRef.current ? 0 : progressRef.current;
    groupRef.current.rotation.y = damp(
      groupRef.current.rotation.y,
      progress * TAU,
      7,
      delta,
    );
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <mesh castShadow receiveShadow position={[0, 1.15, 0]}>
        <cylinderGeometry args={[0.34, 0.38, 2.3, 32]} />
        <meshStandardMaterial color="#6d8d63" roughness={0.82} />
      </mesh>
      <mesh castShadow position={[0.3, 1.35, 0]} rotation={[0, 0, -0.3]}>
        <cylinderGeometry args={[0.18, 0.22, 0.95, 24]} />
        <meshStandardMaterial color="#78986d" roughness={0.82} />
      </mesh>
    </group>
  );
}

function ScrollScene({
  experience,
  progressRef,
  reducedMotionRef,
}: {
  experience: ScrollExperience;
  progressRef: MutableRefObject<number>;
  reducedMotionRef: MutableRefObject<boolean>;
}) {
  return (
    <>
      <color attach="background" args={["#e8e1d3"]} />
      <ambientLight intensity={1.25} />
      <Suspense
        fallback={
          <ScrollFallback
            progressRef={progressRef}
            reducedMotionRef={reducedMotionRef}
          />
        }
      >
        <ScrollModel
          experience={experience}
          progressRef={progressRef}
          reducedMotionRef={reducedMotionRef}
        />
      </Suspense>
      <mesh
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -1.18, 0]}
      >
        <planeGeometry args={[8, 8]} />
        <meshStandardMaterial color="#d8cdb7" roughness={1} />
      </mesh>
    </>
  );
}

export function EchinopsisScrollExperience({
  experience = echinopsisScrollExperience,
}: {
  experience?: ScrollExperience;
}) {
  const experienceRef = useRef<HTMLElement>(null);
  const progressRef = useRef(0);
  const reducedMotionRef = useRef(false);
  const [activeChapter, setActiveChapter] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateReducedMotion = () => {
      reducedMotionRef.current = media.matches;
    };
    const updateScroll = () => {
      const element = experienceRef.current;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const start = rect.top + window.scrollY;
      const travel = Math.max(element.offsetHeight - window.innerHeight, 1);
      const progress = Math.min(
        Math.max((window.scrollY - start) / travel, 0),
        1,
      );
      progressRef.current = progress;
      setProgress(progress);
      const index = Math.min(
        experience.chapters.length - 1,
        Math.floor(Math.min(progress, 0.999999) * experience.chapters.length),
      );
      setActiveChapter((current) => (current === index ? current : index));
    };

    updateReducedMotion();
    updateScroll();
    media.addEventListener("change", updateReducedMotion);
    window.addEventListener("scroll", updateScroll, { passive: true });
    window.addEventListener("resize", updateScroll);
    return () => {
      media.removeEventListener("change", updateReducedMotion);
      window.removeEventListener("scroll", updateScroll);
      window.removeEventListener("resize", updateScroll);
    };
  }, [experience.chapters.length]);

  return (
    <section
      ref={experienceRef}
      className="scroll-experience"
      aria-label={`Experiencia 3D de ${experience.title}`}
    >
      <div className="scroll-experience-sticky">
        <div className="scroll-experience-canvas" aria-hidden="true">
          <Canvas
            shadows
            dpr={[1, 1.5]}
            camera={{ position: [0, 1.15, 4.9], fov: 38 }}
            gl={{ antialias: true, powerPreference: "high-performance" }}
          >
            <ScrollScene
              experience={experience}
              progressRef={progressRef}
              reducedMotionRef={reducedMotionRef}
            />
          </Canvas>
        </div>
        <div className="scroll-experience-hint">
          <span>desliza para girar</span>
          <span aria-hidden="true">↓</span>
        </div>
        <div className="scroll-experience-progress" aria-hidden="true">
          <span
            style={{
              transform: `scaleY(${Math.max(progress, 0.02)})`,
            }}
          />
        </div>
      </div>

      <div className="scroll-experience-chapters">
        {experience.chapters.map((chapter, index) => (
          <article
            className={`scroll-chapter${
              activeChapter === index ? " is-active" : ""
            }`}
            data-layer={chapter.layer}
            key={chapter.id}
          >
            <p className="eyebrow">{chapter.eyebrow}</p>
            <h2>{chapter.title}</h2>
            <p>{chapter.body}</p>
            <div className="scroll-chapter-meta">
              <span>
                {chapter.status === "research-pending"
                  ? "en investigación"
                  : "documentado"}
              </span>
              {chapter.sourcePublicIds.length ? (
                <span>{chapter.sourcePublicIds.length} fuente(s)</span>
              ) : (
                <span>sin claim publicable todavía</span>
              )}
            </div>
          </article>
        ))}
      </div>

      <p className="scroll-experience-fallback">{experience.fallbackText}</p>
    </section>
  );
}

useGLTF.preload(echinopsisScrollExperience.modelUri);
