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

  async function page(path, expectedStatus = 200) {
    const response = await fetch(`${webBaseUrl}${path}`);
    assert.equal(response.status, expectedStatus, `${path} status`);
    return response.text();
  }

  const restrictedTokens = [
    "cultural-relation-wachuma-demo",
    "cultural-relation-san-pedro-saraguro-2014",
    "community-saraguro-ecuador-source-scoped",
    "specimen-demo-01",
    "specimen-demo-02",
  ];
  function assertNoRestrictedTokens(html, path) {
    for (const token of restrictedTokens) {
      assert.doesNotMatch(
        html,
        new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
        `${path} leaked ${token}`,
      );
    }
  }

  const home = await page("/");
  assert.match(home, /WACHUMA/i);
  assert.match(home, /Echinopsis pachanoi/i);
  assertNoRestrictedTokens(home, "/");

  const explorer = await page("/species");
  assert.match(explorer, /Echinopsis pachanoi/i);
  assert.match(explorer, /biological-entity-echinopsis-pachanoi/);
  assert.doesNotMatch(explorer, /Opuntia ficus-indica/i);
  assert.doesNotMatch(explorer, /Pleurotus ostreatus/i);
  assertNoRestrictedTokens(explorer, "/species");

  const speciesSearch = await page("/species?q=pachanoi");
  assert.match(speciesSearch, /Echinopsis pachanoi/i);
  assertNoRestrictedTokens(speciesSearch, "/species?q=pachanoi");

  const speciesEmptySearch = await page("/species?q=opuntia");
  assert.match(speciesEmptySearch, /No hay coincidencias publicables/i);
  assertNoRestrictedTokens(speciesEmptySearch, "/species?q=opuntia");

  const echinopsis = await page(
    "/species/biological-entity-echinopsis-pachanoi",
  );
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
  assertNoRestrictedTokens(echinopsis, "/species/:publicId");

  await page("/species/biological-entity-opuntia-ficus-indica", 404);
  await page("/species/biological-entity-pleurotus-ostreatus", 404);

  const cultivation = await page("/cultivation");
  assert.doesNotMatch(cultivation, /Opuntia ficus-indica/i);
  assert.doesNotMatch(cultivation, /Pleurotus ostreatus/i);
  assert.match(cultivation, /versión|en revisión|documentado/i);
  assertNoRestrictedTokens(cultivation, "/cultivation");

  const cultivationDetail = await page(
    "/cultivation/guide-echinopsis-pachanoi-general-cacti-v1",
  );
  assert.match(cultivationDetail, /Orientación de cultivo/i);
  assert.match(cultivationDetail, /source-rhs-cacti-succulents-guide/i);
  assert.match(cultivationDetail, /Mapa de cobertura/i);
  assert.match(cultivationDetail, /no aplica/i);
  assert.doesNotMatch(cultivationDetail, /sin documentar/i);
  assert.match(cultivationDetail, /Bibliografía del manual/i);
  assertNoRestrictedTokens(cultivationDetail, "/cultivation/:publicId");

  await page("/cultivation/not-a-public-guide", 404);

  const search = await page("/search?q=pachanoi");
  assert.match(search, /Echinopsis pachanoi/i);
  assert.match(search, /Manual de cultivo|Orientación de cultivo/i);
  assert.match(search, /source-rhs-cacti-succulents-guide/i);
  assertNoRestrictedTokens(search, "/search?q=pachanoi");

  const restrictedSearch = await page("/search?q=wachuma");
  assert.doesNotMatch(
    restrictedSearch,
    /cultural-relation-wachuma-demo|cultural-relation-san-pedro-saraguro-2014/i,
  );
  assert.match(
    restrictedSearch,
    /No hay coincidencias publicables|Echinopsis/i,
  );
  assertNoRestrictedTokens(restrictedSearch, "/search?q=wachuma");

  const culture = await page("/culture");
  assert.match(culture, /No hay relaciones culturales aceptadas y públicas/i);
  assert.doesNotMatch(culture, /cultural-relation-san-pedro-saraguro-2014/i);
  assert.doesNotMatch(culture, /community-saraguro-ecuador-source-scoped/i);
  assertNoRestrictedTokens(culture, "/culture");

  const garden = await page("/garden");
  assert.match(garden, /Jardín/i);
  assert.match(garden, /Ejemplares públicos/i);
  assert.doesNotMatch(garden, /No hay|specimen-public-demo-01/i);
  assertNoRestrictedTokens(garden, "/garden");

  const map = await page("/map");
  assert.match(map, /geometry_public|aproximaciones deliberadas/i);
  assert.doesNotMatch(map, /["']geometry_exact["']\s*:/i);
  assertNoRestrictedTokens(map, "/map");

  const sources = await page("/sources");
  assert.match(sources, /Fuentes/i);
  assert.match(sources, /licencia|atribución/i);
  assertNoRestrictedTokens(sources, "/sources");

  const speciesLineage = await page(
    "/lineage/biological-entity-echinopsis-pachanoi",
  );
  assert.match(speciesLineage, /Linaje|Árbol público/i);
  assertNoRestrictedTokens(speciesLineage, "/lineage/:species");

  await page("/lineage/specimen-public-demo-01", 404);
  await page("/specimens/specimen-public-demo-01", 404);
  await page("/specimens/specimen-demo-01", 404);

  const preview = await page("/preview/svg-loft");
  assert.match(preview, /Pachanoi|Geometry Nodes/i);
  assertNoRestrictedTokens(preview, "/preview/svg-loft");

  console.log(
    JSON.stringify({
      databaseBacked: true,
      publicSurfaceChecks: 18,
      species: ["biological-entity-echinopsis-pachanoi"],
      routes: [
        "/",
        "/species/biological-entity-echinopsis-pachanoi",
        "/species",
        "/species?q=pachanoi",
        "/species?q=opuntia",
        "/cultivation",
        "/cultivation/guide-echinopsis-pachanoi-general-cacti-v1",
        "/cultivation/not-a-public-guide",
        "/search?q=pachanoi",
        "/search?q=wachuma",
        "/culture",
        "/garden",
        "/map",
        "/sources",
        "/lineage/biological-entity-echinopsis-pachanoi",
        "/lineage/specimen-public-demo-01",
        "/specimens/specimen-public-demo-01",
        "/preview/svg-loft",
      ],
    }),
  );
} finally {
  for (const child of children.reverse()) child.kill();
}
