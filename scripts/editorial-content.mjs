import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

async function readDirectory(root, directory) {
  const absoluteDirectory = join(root, "content", directory);
  const entries = await readdir(absoluteDirectory, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  return Promise.all(
    files.map(async (file) => {
      const path = join(absoluteDirectory, file);
      return {
        path: relative(root, path).replaceAll("\\", "/"),
        document: JSON.parse(await readFile(path, "utf8")),
      };
    }),
  );
}

export async function readEditorialContent(root) {
  const [species, guides, cultures] = await Promise.all([
    readDirectory(root, "species"),
    readDirectory(root, "cultivation-guides"),
    readDirectory(root, "cultures"),
  ]);

  const byPublicId = new Map();
  for (const item of [...species, ...guides]) {
    const publicId = item.document.publicId;
    if (!publicId) continue;
    if (byPublicId.has(publicId)) {
      throw new Error(`Duplicate editorial publicId: ${publicId}`);
    }
    byPublicId.set(publicId, item.path);
  }

  const culturalRelations = cultures.flatMap((item) =>
    (item.document.relations ?? []).map((relation) => ({
      ...relation,
      __path: item.path,
    })),
  );
  const relationIds = new Set();
  for (const relation of culturalRelations) {
    if (relationIds.has(relation.publicId)) {
      throw new Error(
        `Duplicate cultural relation publicId: ${relation.publicId}`,
      );
    }
    relationIds.add(relation.publicId);
  }

  const sourcesByPublicId = new Map();
  for (const speciesDocument of species.map((item) => item.document)) {
    for (const source of speciesDocument.sources ?? []) {
      if (!source.sourceType) {
        throw new Error(`Editorial source ${source.publicId} needs sourceType`);
      }
      const existing = sourcesByPublicId.get(source.publicId);
      if (existing && JSON.stringify(existing) !== JSON.stringify(source)) {
        throw new Error(
          `Editorial source ${source.publicId} has conflicting definitions`,
        );
      }
      sourcesByPublicId.set(source.publicId, source);
    }
  }
  for (const guide of guides.map((item) => item.document)) {
    for (const claim of guide.claims ?? []) {
      if (!sourcesByPublicId.has(claim.sourcePublicId)) {
        throw new Error(
          `Editorial guide ${guide.publicId} references missing source ${claim.sourcePublicId}`,
        );
      }
    }
  }
  for (const culture of cultures.map((item) => item.document)) {
    for (const relation of culture.relations ?? []) {
      if (!sourcesByPublicId.has(relation.sourcePublicId)) {
        throw new Error(
          `Editorial relation ${relation.publicId} references missing source ${relation.sourcePublicId}`,
        );
      }
    }
  }

  return {
    species: species.map((item) => item.document),
    sources: [...sourcesByPublicId.values()].sort((left, right) =>
      left.publicId.localeCompare(right.publicId),
    ),
    guides: guides.map((item) => item.document),
    cultures: cultures.map((item) => item.document),
    files: {
      species: species.map((item) => item.path),
      guides: guides.map((item) => item.path),
      cultures: cultures.map((item) => item.path),
    },
  };
}
