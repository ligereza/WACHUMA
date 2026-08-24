import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { readEditorialContent } from "./editorial-content.mjs";

test("discovers a newly added editorial document without a hardcoded list", async () => {
  const root = await mkdtemp(join(tmpdir(), "wachuma-editorial-"));
  try {
    for (const directory of ["species", "cultivation-guides", "cultures"]) {
      await mkdir(join(root, "content", directory), { recursive: true });
    }

    await writeFile(
      join(root, "content", "species", "new-species.json"),
      JSON.stringify({
        schemaVersion: "1.0",
        publicId: "biological-entity-new-species",
        scientificName: "Specimen novum",
      }),
    );
    await writeFile(
      join(root, "content", "cultivation-guides", "new-guide.json"),
      JSON.stringify({
        schemaVersion: "1.0",
        publicId: "guide-new-species-v1",
        guideKey: "new-species",
        version: 1,
        title: "Nueva guía",
        status: "draft",
        coverage: { sections: [] },
        claims: [],
      }),
    );
    await writeFile(
      join(root, "content", "cultures", "new-culture.json"),
      JSON.stringify({
        schemaVersion: "1.0",
        relations: [],
      }),
    );

    const catalog = await readEditorialContent(root);
    assert.deepEqual(
      catalog.species.map((document) => document.publicId),
      ["biological-entity-new-species"],
    );
    assert.deepEqual(
      catalog.guides.map((document) => document.publicId),
      ["guide-new-species-v1"],
    );
    assert.deepEqual(catalog.files.guides, [
      "content/cultivation-guides/new-guide.json",
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("builds one source catalog shared by species documents", async () => {
  const root = await mkdtemp(join(tmpdir(), "wachuma-editorial-"));
  try {
    for (const directory of ["species", "cultivation-guides", "cultures"]) {
      await mkdir(join(root, "content", directory), { recursive: true });
    }
    const source = {
      publicId: "source-shared",
      title: "Fuente compartida",
      citation: "Cita de prueba",
      sourceType: "scientific_publication",
      license: "CC BY 4.0",
      attribution: "Autora de prueba",
      accessedAt: "2026-08-23T00:00:00Z",
      assertionType: "academic_publication",
    };
    for (const [file, publicId, scientificName] of [
      ["a.json", "entity-a", "Specimen a"],
      ["b.json", "entity-b", "Specimen b"],
    ]) {
      await writeFile(
        join(root, "content", "species", file),
        JSON.stringify({
          schemaVersion: "1.0",
          publicId,
          scientificName,
          sources: [source],
        }),
      );
    }

    const catalog = await readEditorialContent(root);
    assert.deepEqual(
      catalog.sources.map((item) => item.publicId),
      ["source-shared"],
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects conflicting definitions for one source public identifier", async () => {
  const root = await mkdtemp(join(tmpdir(), "wachuma-editorial-"));
  try {
    for (const directory of ["species", "cultivation-guides", "cultures"]) {
      await mkdir(join(root, "content", directory), { recursive: true });
    }
    const base = {
      schemaVersion: "1.0",
      publicId: "entity-a",
      scientificName: "Specimen a",
      sources: [
        {
          publicId: "source-conflict",
          title: "Fuente original",
          citation: "Cita original",
          sourceType: "editorial",
          license: "WACHUMA-PROJECT",
          attribution: "WACHUMA",
          accessedAt: "2026-08-23T00:00:00Z",
          assertionType: "editorial_interpretation",
        },
      ],
    };
    await writeFile(
      join(root, "content", "species", "a.json"),
      JSON.stringify(base),
    );
    await writeFile(
      join(root, "content", "species", "b.json"),
      JSON.stringify({
        ...base,
        publicId: "entity-b",
        sources: [{ ...base.sources[0], title: "Fuente divergente" }],
      }),
    );

    await assert.rejects(
      () => readEditorialContent(root),
      /Editorial source source-conflict has conflicting definitions/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects duplicate editorial public identifiers", async () => {
  const root = await mkdtemp(join(tmpdir(), "wachuma-editorial-"));
  try {
    for (const directory of ["species", "cultivation-guides", "cultures"]) {
      await mkdir(join(root, "content", directory), { recursive: true });
    }
    const duplicate = JSON.stringify({
      schemaVersion: "1.0",
      publicId: "duplicate",
      scientificName: "Specimen duplicatum",
    });
    await writeFile(join(root, "content", "species", "a.json"), duplicate);
    await writeFile(join(root, "content", "species", "b.json"), duplicate);
    await assert.rejects(
      () => readEditorialContent(root),
      /Duplicate editorial publicId: duplicate/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
