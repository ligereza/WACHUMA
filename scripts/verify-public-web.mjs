import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required for verify:public-web; this gate never falls back to fixtures.",
  );
}

const apiPort = process.env.WACHUMA_VERIFY_API_PORT ?? "3311";
const webPort = process.env.WACHUMA_VERIFY_WEB_PORT ?? "3312";
const apiBaseUrl = `http://127.0.0.1:${apiPort}`;
const webBaseUrl = `http://127.0.0.1:${webPort}`;
const apiEntry = resolve(root, "apps/api/dist/index.js");
const webRoot = resolve(root, "apps/web");
const nextBinary = resolve(webRoot, "node_modules/next/dist/bin/next");
const webBuildId = resolve(root, "apps/web/.next/BUILD_ID");

assert.ok(existsSync(apiEntry), "Build the API before the public web check");
assert.ok(
  existsSync(nextBinary),
  "Install web dependencies before the public web check",
);
assert.ok(existsSync(webBuildId), "Build the web before the public web check");

const children = [];
function start(command, args, env, cwd = root) {
  const child = spawn(process.execPath, [command, ...args], {
    cwd,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout?.on("data", (chunk) => {
    output += chunk.toString();
  });
  child.stderr?.on("data", (chunk) => {
    output += chunk.toString();
  });
  child.wachumaOutput = () => output;
  children.push(child);
  return child;
}

async function waitFor(url, label, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = "not attempted";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
      lastError = `${response.status} ${response.statusText}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }
  const output = children
    .map((child) => child.wachumaOutput?.() ?? "")
    .join("\n");
  throw new Error(`${label} did not become ready: ${lastError}\n${output}`);
}

try {
  start(apiEntry, [], {
    DATABASE_URL: databaseUrl,
    PORT: apiPort,
    WACHUMA_ADMIN_TOKEN: process.env.WACHUMA_ADMIN_TOKEN ?? "verify-only-token",
  });
  await waitFor(`${apiBaseUrl}/api/v1/health`, "API");

  start(
    nextBinary,
    ["start", "-p", webPort],
    {
      WACHUMA_API_URL: apiBaseUrl,
      NEXT_PUBLIC_WACHUMA_API_URL: apiBaseUrl,
      WACHUMA_DEMO_MODE: "false",
      WACHUMA_DISABLE_API_CACHE: "true",
      PORT: webPort,
    },
    webRoot,
  );
  await waitFor(`${webBaseUrl}/`, "web");

  const explorer = await (await fetch(`${webBaseUrl}/species`)).text();
  assert.match(explorer, /Echinopsis pachanoi/i);
  assert.match(explorer, /biological-entity-echinopsis-pachanoi/);
  assert.doesNotMatch(explorer, /Opuntia ficus-indica/i);
  assert.doesNotMatch(explorer, /Pleurotus ostreatus/i);

  const echinopsis = await (
    await fetch(`${webBaseUrl}/species/biological-entity-echinopsis-pachanoi`)
  ).text();
  assert.match(echinopsis, /Echinopsis pachanoi/i);
  assert.match(echinopsis, /Trichocereus pachanoi/i);
  assert.match(echinopsis, /Desacuerdo taxonómico no resuelto/i);
  assert.match(echinopsis, /Trichocereus macrogonus var\. pachanoi/i);
  assert.match(echinopsis, /77125731-1/);
  assert.match(echinopsis, /Plants of the World Online/i);
  assert.match(echinopsis, /Albesiano.*Kiesling.*2012/i);
  assert.match(echinopsis, /editorial/i);
  assert.match(echinopsis, /Estudio material/i);
  assert.match(echinopsis, /No hay claims químicos publicables/i);
  assert.match(echinopsis, /source-wachuma-material-fixture/i);

  const archivedOpuntia = await fetch(
    `${webBaseUrl}/species/biological-entity-opuntia-ficus-indica`,
  );
  assert.equal(archivedOpuntia.status, 404);

  const archivedPleurotus = await fetch(
    `${webBaseUrl}/species/biological-entity-pleurotus-ostreatus`,
  );
  assert.equal(archivedPleurotus.status, 404);

  const cultivation = await (await fetch(`${webBaseUrl}/cultivation`)).text();
  assert.doesNotMatch(cultivation, /Opuntia ficus-indica/i);
  assert.doesNotMatch(cultivation, /Pleurotus ostreatus/i);

  const cultivationDetail = await (
    await fetch(
      `${webBaseUrl}/cultivation/guide-echinopsis-pachanoi-general-cacti-v1`,
    )
  ).text();
  assert.match(cultivationDetail, /Orientación de cultivo/i);
  assert.match(cultivationDetail, /source-rhs-cacti-succulents-guide/i);
  assert.match(cultivationDetail, /Mapa de cobertura/i);
  assert.match(cultivationDetail, /sin documentar/i);
  assert.match(cultivationDetail, /Bibliografía del manual/i);

  const search = await (await fetch(`${webBaseUrl}/search?q=pachanoi`)).text();
  assert.match(search, /Echinopsis pachanoi/i);
  assert.match(search, /Manual de cultivo|Orientación de cultivo/i);
  assert.match(search, /source-rhs-cacti-succulents-guide/i);

  const restrictedSearch = await (
    await fetch(`${webBaseUrl}/search?q=wachuma`)
  ).text();
  assert.doesNotMatch(
    restrictedSearch,
    /cultural-relation-wachuma-demo|cultural-relation-san-pedro-saraguro-2014/i,
  );

  const culture = await (await fetch(`${webBaseUrl}/culture`)).text();
  assert.match(culture, /No hay relaciones culturales aceptadas y públicas/i);
  assert.doesNotMatch(culture, /cultural-relation-san-pedro-saraguro-2014/i);
  assert.doesNotMatch(culture, /community-saraguro-ecuador-source-scoped/i);

  console.log(
    JSON.stringify({
      databaseBacked: true,
      species: ["biological-entity-echinopsis-pachanoi"],
      routes: [
        "/species/biological-entity-echinopsis-pachanoi",
        "/species",
        "/cultivation",
        "/cultivation/guide-echinopsis-pachanoi-general-cacti-v1",
        "/search?q=pachanoi",
        "/culture",
      ],
    }),
  );
} finally {
  for (const child of children.reverse()) child.kill();
}
