import type { PublicId } from "./types.js";

export type PublicSearchResultKind =
  "species" | "guide" | "cultural_relation" | "source" | "place" | "specimen";

/**
 * A public search hit is deliberately a projection, not a second knowledge
 * graph. It carries enough context to navigate and enough provenance to make
 * the result attributable without exposing restricted rows.
 */
export interface PublicSearchResult {
  kind: PublicSearchResultKind;
  publicId: PublicId;
  title: string;
  summary: string;
  path: string;
  subjectPublicId?: PublicId;
  sourcePublicIds: PublicId[];
}
