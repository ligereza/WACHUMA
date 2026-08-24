import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const port = 3199;
const baseUrl = `http://127.0.0.1:${port}`;
const noDataPort = 3200;
const noDataBaseUrl = `http://127.0.0.1:${noDataPort}`;
const packageDirectory = fileURLToPath(new URL("..", import.meta.url));
const nextBinary = resolve(packageDirectory, "node_modules/next/dist/bin/next");

async function waitForServerAt(child, url) {
  let output = "";
  child.stdout?.on("data", (chunk) => {
    output += chunk.toString();
  });
  child.stderr?.on("data", (chunk) => {
    output += chunk.toString();
  });

  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetch(`${url}/`);
      if (response.ok) return;
    } catch {
      // The server may still be compiling its production manifest.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Next server did not start. Output:\n${output}`);
}

async function waitForServer(child) {
  return waitForServerAt(child, baseUrl);
}

test("production web routes expose the public garden surface", async (t) => {
  assert.ok(
    existsSync(".next/BUILD_ID"),
    "Run the web build before the production E2E smoke test",
  );
  const child = spawn(
    process.execPath,
    [nextBinary, "start", "-p", String(port)],
    {
      cwd: packageDirectory,
      env: {
        ...process.env,
        PORT: String(port),
        WACHUMA_DEMO_MODE: "true",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  t.after(() => child.kill());

  await waitForServer(child);
  for (const path of [
    "/",
    "/species",
    "/species?q=wachuma",
    "/search",
    "/search?q=pachanoi",
    "/garden",
    "/cultivation",
    "/cultivation/guide-echinopsis-pachanoi-demo-v1",
    "/culture",
    "/culture/submit",
    "/map",
    "/sources",
    "/specimens/specimen-public-demo-01",
    "/lineage/specimen-public-demo-01",
    "/admin/garden",
    "/admin/lineage",
    "/admin/review",
    "/admin/culture",
  ]) {
    const response = await fetch(`${baseUrl}${path}`);
    assert.equal(response.status, 200, path);
    const html = await response.text();
    assert.match(html, /WACHUMA/i, path);
  }

  const cultureHtml = await (await fetch(`${baseUrl}/culture`)).text();
  assert.doesNotMatch(cultureHtml, /cultural-relation-wachuma-demo/);
  assert.doesNotMatch(cultureHtml, /community-demo-pending-review/);

  const speciesHtml = await (
    await fetch(`${baseUrl}/species/biological-entity-echinopsis-pachanoi`)
  ).text();
  for (const section of [
    "Ecología",
    "Cultivo",
    "Ejemplares del jardín",
    "Observaciones públicas",
    "Linajes",
    "Relaciones culturales",
    "Historia",
    "Especies relacionadas",
  ]) {
    assert.match(speciesHtml, new RegExp(section, "i"), section);
  }

  const mapHtml = await (await fetch(`${baseUrl}/map`)).text();
  assert.match(mapHtml, /place-demo-public/);
  assert.match(mapHtml, /Geometría pública aproximada/);

  const privateResponse = await fetch(`${baseUrl}/specimens/specimen-demo-01`);
  assert.equal(privateResponse.status, 404);

  const intakeHtml = await (await fetch(`${baseUrl}/admin/garden`)).text();
  assert.match(intakeHtml, /Incorporar ejemplar/i);
  assert.match(intakeHtml, /no acepta `public`/i);
  assert.doesNotMatch(intakeHtml, /value="public"/i);

  const lineageIntakeHtml = await (
    await fetch(`${baseUrl}/admin/lineage`)
  ).text();
  assert.match(lineageIntakeHtml, /Registrar relación de linaje/i);
  assert.match(lineageIntakeHtml, /source record/i);

  const culturalReviewHtml = await (
    await fetch(`${baseUrl}/admin/culture`)
  ).text();
  assert.match(culturalReviewHtml, /Revisión cultural/i);
  assert.match(culturalReviewHtml, /no se vuelve una equivalencia taxonómica/i);
});

test("production web does not turn a missing API into demo content", async (t) => {
  assert.ok(
    existsSync(".next/BUILD_ID"),
    "Run the web build before the production E2E smoke test",
  );
  const child = spawn(
    process.execPath,
    [nextBinary, "start", "-p", String(noDataPort)],
    {
      cwd: packageDirectory,
      env: {
        ...process.env,
        PORT: String(noDataPort),
        WACHUMA_API_URL: "",
        NEXT_PUBLIC_WACHUMA_API_URL: "",
        WACHUMA_DEMO_MODE: "false",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  t.after(() => child.kill());

  await waitForServerAt(child, noDataBaseUrl);
  const explorer = await fetch(`${noDataBaseUrl}/species`);
  assert.equal(explorer.status, 200);
  const explorerHtml = await explorer.text();
  assert.doesNotMatch(explorerHtml, /biological-entity-echinopsis-pachanoi/);
  assert.match(explorerHtml, /No hay coincidencias publicables/i);

  const detail = await fetch(
    `${noDataBaseUrl}/species/biological-entity-echinopsis-pachanoi`,
  );
  assert.equal(detail.status, 404);
});
