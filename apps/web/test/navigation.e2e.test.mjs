import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const port = 3199;
const baseUrl = `http://127.0.0.1:${port}`;
const packageDirectory = fileURLToPath(new URL("..", import.meta.url));
const nextBinary = resolve(packageDirectory, "node_modules/next/dist/bin/next");

async function waitForServer(child) {
  let output = "";
  child.stdout?.on("data", (chunk) => {
    output += chunk.toString();
  });
  child.stderr?.on("data", (chunk) => {
    output += chunk.toString();
  });

  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/`);
      if (response.ok) return;
    } catch {
      // The server may still be compiling its production manifest.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Next server did not start. Output:\n${output}`);
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
      env: { ...process.env, PORT: String(port) },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  t.after(() => child.kill());

  await waitForServer(child);
  for (const path of [
    "/",
    "/species",
    "/species?q=wachuma",
    "/garden",
    "/cultivation",
    "/culture",
    "/culture/submit",
    "/map",
    "/sources",
    "/specimens/specimen-public-demo-01",
    "/lineage/specimen-public-demo-01",
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
});
