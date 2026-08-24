import type { PublicId } from "./types.js";

export type ScrollKnowledgeLayer =
  | "identity"
  | "cultivation"
  | "ecology"
  | "chemistry"
  | "history"
  | "culture"
  | "related-taxa"
  | "sources";

export interface ScrollCameraState {
  distance: number;
  height: number;
  targetHeight: number;
  fov: number;
}

export interface ScrollChapter {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  layer: ScrollKnowledgeLayer;
  sourcePublicIds: PublicId[];
  camera: ScrollCameraState;
  rotationTurns: number;
  accent: string;
  status?: "published" | "research-pending";
}

export interface ScrollExperience {
  schemaVersion: "1.0";
  publicId: PublicId;
  biologicalEntityPublicId: PublicId;
  title: string;
  subtitle: string;
  modelUri: string;
  representationType: "procedural-interpretation" | "artistic-representation";
  chapters: ScrollChapter[];
  fallbackText: string;
}

export function scrollChapterAt(
  experience: ScrollExperience,
  progress: number,
): ScrollChapter {
  const safeProgress = Math.min(Math.max(progress, 0), 0.999999);
  const index = Math.min(
    experience.chapters.length - 1,
    Math.floor(safeProgress * experience.chapters.length),
  );
  return experience.chapters[index] ?? experience.chapters[0]!;
}

export function interpolateScrollChapter(
  experience: ScrollExperience,
  progress: number,
): { current: ScrollChapter; next: ScrollChapter; localProgress: number } {
  const safeProgress = Math.min(Math.max(progress, 0), 0.999999);
  const scaled = safeProgress * experience.chapters.length;
  const index = Math.min(experience.chapters.length - 1, Math.floor(scaled));
  const nextIndex = Math.min(index + 1, experience.chapters.length - 1);
  return {
    current: experience.chapters[index] ?? experience.chapters[0]!,
    next: experience.chapters[nextIndex] ?? experience.chapters[0]!,
    localProgress: scaled - index,
  };
}
