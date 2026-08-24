import { fileURLToPath } from "node:url";
import { readEditorialContent } from "./editorial-content.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const content = await readEditorialContent(root);

console.log(
  JSON.stringify(
    {
      schema: "wachuma.editorial-manifest.v1",
      generatedAt: new Date().toISOString(),
      counts: {
        species: content.species.length,
        sources: content.sources.length,
        guides: content.guides.length,
        culturalRelations: content.cultures.reduce(
          (count, document) => count + (document.relations?.length ?? 0),
          0,
        ),
      },
      files: content.files,
      publicIds: {
        species: content.species.map((document) => document.publicId),
        sources: content.sources.map((source) => source.publicId),
        guides: content.guides.map((document) => document.publicId),
        culturalRelations: content.cultures.flatMap((document) =>
          (document.relations ?? []).map((relation) => relation.publicId),
        ),
      },
    },
    null,
    2,
  ),
);
