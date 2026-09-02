import test from "node:test";
import assert from "node:assert/strict";

import {
  evaluateRobots,
  extractPageMetadata,
  harvestSources,
} from "./harvest-pachanoi-pages.mjs";

test("robots disallow wins over a shorter allow rule", () => {
  const robots = `User-agent: *\nAllow: /\nDisallow: /private\nCrawl-delay: 3\n`;
  assert.deepEqual(
    evaluateRobots(robots, "https://example.test/private/page"),
    {
      allowed: false,
      matchedRule: "disallow:/private",
      crawlDelaySeconds: 3,
    },
  );
});

test("robots permits a selected page and returns crawl delay", () => {
  const robots = "User-agent: *\nAllow: /plants/\nCrawl-delay: 10\n";
  assert.deepEqual(
    evaluateRobots(robots, "https://example.test/plants/pachanoi"),
    {
      allowed: true,
      matchedRule: "allow:/plants/",
      crawlDelaySeconds: 10,
    },
  );
});

test("page extraction keeps metadata and does not require article prose", () => {
  const html = `<!doctype html><html><head>
    <title>Echinopsis pachanoi</title>
    <link rel="canonical" href="/plants/pachanoi">
    <meta name="description" content="A public page">
    <meta name="citation_author" content="Author One">
    <script type="application/ld+json">{"@type":"Article","datePublished":"2026-08-27"}</script>
  </head><body><article>Long prose is intentionally not extracted.</article></body></html>`;
  assert.deepEqual(extractPageMetadata(html, "https://example.test/source"), {
    requestedUrl: "https://example.test/source",
    canonicalUrl: "https://example.test/plants/pachanoi",
    title: "Echinopsis pachanoi",
    descriptionLength: 13,
    authors: ["Author One"],
    publishedAt: "2026-08-27",
    metadataKeys: ["citation_author", "description"],
  });
});

test("rights-holder metadata is not mistaken for a reuse license", () => {
  const html = `<html><head>
    <title>Repository record</title>
    <meta name="rights" content="Institutional Library">
  </head></html>`;
  const metadata = extractPageMetadata(html, "https://example.test/item");
  assert.equal(metadata.pageLicense, undefined);
});

test("license link is captured without extracting page prose", () => {
  const html = `<html><head>
    <title>Open article</title>
    <a rel="license" href="https://creativecommons.org/licenses/by-nc-nd/4.0/">
  </head><body><p>Article text is not harvested.</p></body></html>`;
  const metadata = extractPageMetadata(html, "https://example.test/item");
  assert.equal(
    metadata.pageLicense,
    "https://creativecommons.org/licenses/by-nc-nd/4.0/",
  );
});

test("a repeated repository rights field can expose only its license URI", () => {
  const html = `<html><head>
    <meta name="DC.rights" content="info:eu-repo/semantics/openAccess">
    <meta name="DC.rights" content="Atribución-CompartirIgual 4.0 Internacional">
    <meta name="DC.rights" content="https://creativecommons.org/licenses/by-sa/4.0/">
  </head></html>`;
  const metadata = extractPageMetadata(html, "https://example.test/item");
  assert.equal(
    metadata.pageLicense,
    "https://creativecommons.org/licenses/by-sa/4.0/",
  );
});

test("bibliographic metadata keeps all declared authors and identifiers", () => {
  const html = `<html><head>
    <meta name="citation_title" content="A study">
    <meta name="citation_author" content="Author One">
    <meta name="citation_author" content="Author Two">
    <meta name="citation_date" content="12/2025">
    <meta name="citation_doi" content="10.1234/example">
    <meta name="citation_publisher" content="Revista de Prueba">
  </head></html>`;
  assert.deepEqual(extractPageMetadata(html, "https://example.test/item"), {
    requestedUrl: "https://example.test/item",
    canonicalUrl: "https://example.test/item",
    title: "A study",
    authors: ["Author One", "Author Two"],
    publishedAt: "12/2025",
    doi: "10.1234/example",
    publisher: "Revista de Prueba",
    metadataKeys: [
      "citation_author",
      "citation_date",
      "citation_doi",
      "citation_publisher",
      "citation_title",
    ],
  });
});

test("harvest output is provenance-aware and never stores page body or description text", async () => {
  const pageUrl = "https://example.test/plants/pachanoi";
  const robotsUrl = "https://example.test/robots.txt";
  const html = `<html><head>
    <title>Echinopsis pachanoi</title>
    <meta name="description" content="A long editorial description that must not be persisted">
  </head><body><article>Full page body must not be persisted.</article></body></html>`;
  const result = await harvestSources({
    policies: [
      {
        publicId: "page-test-pachanoi",
        sourceRecordId: "provider:test-pachanoi",
        url: pageUrl,
        robotsUrl,
        sourceType: "editorial",
        declaredLicense: "license-pending",
        attribution: "Test source",
        reuseMode: "metadata-only",
        reason: "Test policy",
      },
    ],
    now: () => new Date("2026-08-27T23:00:00.000Z"),
    fetchImpl: async (url) => {
      if (url === robotsUrl) {
        return new Response("User-agent: *\\nAllow: /\\n", {
          status: 200,
          headers: { "content-type": "text/plain" },
        });
      }
      return new Response(html, {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    },
  });
  const source = result.sources[0];
  assert.equal(source.status, "fetched-metadata");
  assert.equal(source.rawContentStored, false);
  assert.equal(source.imagesDownloaded, false);
  assert.equal(source.metadata.title, "Echinopsis pachanoi");
  assert.equal(source.metadata.description, undefined);
  assert.equal(source.metadata.descriptionLength, 55);
  assert.equal(source.sourceRecord.sourceRecordId, "provider:test-pachanoi");
  assert.equal(source.sourceRecord.rawPayload.http.status, 200);
  assert.equal(source.sourceRecord.rawPayload.body, undefined);
  assert.equal(source.sourceRecord.rawPayload.html, undefined);
});
