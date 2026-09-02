import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const HARVESTER_VERSION = "pachanoi-page-harvester-v0.2.1";
export const USER_AGENT =
  "WACHUMA-source-harvester/0.1 (+https://github.com/ligereza/WACHUMA)";
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const NAMED_HTML_ENTITIES = {
  aacute: "á",
  acirc: "â",
  agrave: "à",
  aring: "å",
  atilde: "ã",
  auml: "ä",
  ccedil: "ç",
  eacute: "é",
  ecirc: "ê",
  egrave: "è",
  euml: "ë",
  iacute: "í",
  icirc: "î",
  igrave: "ì",
  iuml: "ï",
  ntilde: "ñ",
  oacute: "ó",
  ocirc: "ô",
  ograve: "ò",
  otilde: "õ",
  ouml: "ö",
  uacute: "ú",
  ucirc: "û",
  ugrave: "ù",
  uuml: "ü",
  yacute: "ý",
  nbsp: " ",
  amp: "&",
  apos: "'",
  quot: '"',
  lt: "<",
  gt: ">",
  ldquo: "“",
  rdquo: "”",
  lsquo: "‘",
  rsquo: "’",
  ndash: "–",
  mdash: "—",
  hellip: "…",
};

/**
 * This is an allowlist, not a crawler. Each entry is one explicitly selected
 * page and the output is metadata-only quarantine. We do not store article
 * bodies, images, or copied prose.
 */
export const SOURCE_POLICIES = [
  {
    publicId: "page-utn-echinopsis-pachanoi-habitat-2017",
    sourceRecordId: "utn-handle:123456789/7458",
    url: "https://repositorio.utn.edu.ec/handle/123456789/7458?locale=es",
    robotsUrl: "https://repositorio.utn.edu.ec/robots.txt",
    sourceType: "scientific_publication",
    declaredLicense: "CC BY-NC-ND 4.0",
    attribution: "Tituaña Armas, Magaly Lisseth; Universidad Técnica del Norte",
    reuseMode: "metadata-only",
    reason:
      "El repositorio declara CC BY-NC-ND 4.0; se conserva metadato y enlace, no se redistribuye ni adapta el PDF.",
  },
  {
    publicId: "page-armijos-saraguro-yachakkuna-2014",
    sourceRecordId: "publication:10.1186/1746-4269-10-26",
    url: "https://link.springer.com/article/10.1186/1746-4269-10-26",
    robotsUrl: "https://link.springer.com/robots.txt",
    sourceType: "scientific_publication",
    declaredLicense: "CC BY 2.0",
    attribution:
      "Armijos, Cota y González; Journal of Ethnobiology and Ethnomedicine",
    reuseMode: "metadata-only",
    reason:
      "El artículo es open access CC BY 2.0; esta cosecha sólo registra metadatos para evitar redistribuir texto, tablas o figuras.",
  },
  {
    publicId: "page-lila-echinopsis-pachanoi",
    sourceRecordId: "url:visionary.art/pharmakon/plants/echinopsis-pachanoi",
    url: "https://visionary.art/pharmakon/plants/echinopsis-pachanoi/",
    robotsUrl: "https://visionary.art/robots.txt",
    sourceType: "editorial",
    declaredLicense: "license-pending-for-page-text",
    attribution:
      "LILA / visionary.art; las imágenes mantienen créditos individuales",
    reuseMode: "metadata-only",
    reason:
      "La página acredita imágenes individualmente, pero no declara licencia abierta para el texto completo.",
  },
  {
    publicId: "page-istmas-cactus-san-pedro",
    sourceRecordId: "url:herbario.istmas.edu.ec/cactaceae/cactus-san-pedro",
    url: "https://herbario.istmas.edu.ec/cactaceae/cactus-san-pedro/",
    robotsUrl: "https://herbario.istmas.edu.ec/robots.txt",
    sourceType: "editorial",
    declaredLicense: "license-pending-for-page-content",
    attribution: "Jardín Botánico ISTMAS, Ecuador",
    reuseMode: "metadata-only",
    reason:
      "Jardín botánico ecuatoriano; no se encontró una licencia de reutilización del contenido de la ficha.",
  },
  {
    publicId: "page-cactusysuculentas-echinopsis-pachanoi",
    sourceRecordId:
      "url:cactusysuculentas.org/cactus/echinopsis-pachanoi-historia-y-curiosidades-del-san-pedro",
    url: "https://www.cactusysuculentas.org/cactus/echinopsis-pachanoi-historia-y-curiosidades-del-san-pedro/",
    robotsUrl: "https://cactusysuculentas.org/robots.txt",
    sourceType: "editorial",
    declaredLicense: "license-pending-for-page-content",
    attribution: "Cactus y Suculentas",
    reuseMode: "metadata-only",
    reason:
      "Página especializada en español; robots permite la ruta, pero no se identificó licencia abierta del texto.",
  },
  {
    publicId: "page-arid-agriculture-trichocereus-pachanoi",
    sourceRecordId: "url:aridagriculture.org/crop/trichocereus-pachanoi",
    url: "https://aridagriculture.org/crop/trichocereus-pachanoi",
    robotsUrl: "https://aridagriculture.org/robots.txt",
    sourceType: "editorial",
    declaredLicense: "fair-use-no-republication",
    attribution: "Arid Agriculture",
    reuseMode: "metadata-only",
    reason:
      "La página declara material protegido y fair use; se respeta su Crawl-delay de 10 s y no se reutiliza el contenido.",
  },
  {
    publicId: "page-unprg-echinopsis-pachanoi-rhizosphere-2023",
    sourceRecordId: "unprg-handle:20.500.12893/11487",
    url: "https://repositorio.unprg.edu.pe/handle/20.500.12893/11487?show=full",
    robotsUrl: "https://repositorio.unprg.edu.pe/robots.txt",
    sourceType: "scientific_publication",
    declaredLicense: "https://creativecommons.org/licenses/by-sa/4.0/",
    attribution:
      "Núñez Montenegro, Angiela Tatiana; Universidad Nacional Pedro Ruiz Gallo",
    reuseMode: "metadata-only",
    reason:
      "El registro declara CC BY-SA 4.0; se conserva metadato y enlace, sin redistribuir la tesis ni sus archivos.",
  },
  {
    publicId: "page-untumbes-echinopsis-metabolomics-2020",
    sourceRecordId: "untumbes-item:b377be19-82a8-4a6b-bba6-c3f77c7b5ec9",
    url: "https://repositorio.untumbes.edu.pe/items/b377be19-82a8-4a6b-bba6-c3f77c7b5ec9",
    robotsUrl: "https://repositorio.untumbes.edu.pe/robots.txt",
    sourceType: "scientific_publication",
    declaredLicense: "https://creativecommons.org/licenses/by/4.0/",
    attribution:
      "Chang Coronado, Rosita Mercedes; Universidad Nacional de Tumbes",
    reuseMode: "metadata-only",
    reason:
      "El registro muestra licencia CC BY 4.0; se conserva metadato y enlace, sin redistribuir la tesis ni sus archivos.",
  },
  {
    publicId: "page-scielo-echinopsis-pachanoi-rhizosphere-2025",
    sourceRecordId: "scielo-pid:S0187-57792025000100601",
    url: "https://www.scielo.org.mx/scielo.php?lng=es&nrm=iso&pid=S0187-57792025000100601&script=sci_arttext",
    robotsUrl: "https://www.scielo.org.mx/robots.txt",
    sourceType: "scientific_publication",
    declaredLicense:
      "https://creativecommons.org/licenses/by-nc-nd/4.0/deed.es",
    attribution:
      "Cedeño-Moreira, Arellano-Ibarra, Álvarez-Sánchez, Espinoza-Guerra, Acosta-Farias y Pico-Saltos; Terra Latinoamericana",
    reuseMode: "metadata-only",
    reason:
      "El artículo declara acceso abierto CC BY-NC-ND 4.0; se conserva metadato y paráfrasis, sin redistribuir texto, tablas ni figuras.",
  },
  {
    publicId: "page-sanpedrosource-source-blog",
    sourceRecordId: "url:sanpedrosource.com/blogs/the-source-blog",
    url: "https://www.sanpedrosource.com/blogs/the-source-blog",
    robotsUrl: "https://www.sanpedrosource.com/robots.txt",
    sourceType: "editorial",
    declaredLicense: "license-pending-for-page-content",
    attribution: "San Pedro Source",
    reuseMode: "metadata-only",
    reason:
      "La página y sus instrucciones de agentes permiten lectura pública; la licencia del texto no está declarada, por lo que no se republica contenido.",
  },
];

function sha256(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function sleep(milliseconds) {
  return new Promise((resolvePromise) =>
    setTimeout(resolvePromise, milliseconds),
  );
}

function decodeHtml(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => {
      try {
        return String.fromCodePoint(Number.parseInt(code, 16));
      } catch {
        return _;
      }
    })
    .replace(/&#([0-9]+);/g, (_, code) => {
      try {
        return String.fromCodePoint(Number.parseInt(code, 10));
      } catch {
        return _;
      }
    })
    .replace(/&nbsp;/gi, " ")
    .replace(
      /&([a-z][a-z0-9]+);/gi,
      (entity, name) => NAMED_HTML_ENTITIES[name.toLowerCase()] ?? entity,
    )
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .trim();
}

function cleanText(value) {
  return decodeHtml(String(value ?? "").replace(/\s+/g, " "));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getTagAttributes(tag) {
  const attributes = {};
  const attributePattern =
    /([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let match;
  while ((match = attributePattern.exec(tag)) !== null) {
    attributes[match[1].toLowerCase()] = cleanText(
      match[2] ?? match[3] ?? match[4] ?? "",
    );
  }
  return attributes;
}

function firstMatch(html, pattern) {
  const match = html.match(pattern);
  return match ? cleanText(match[1]) : undefined;
}

function collectMeta(html) {
  const values = collectMetaValues(html);
  return Object.fromEntries(
    Object.entries(values).map(([key, items]) => [key, items[0]]),
  );
}

function collectMetaValues(html) {
  const metadata = {};
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attributes = getTagAttributes(match[0]);
    const key = attributes.property ?? attributes.name ?? attributes.itemprop;
    const content = attributes.content;
    if (key && content) {
      const normalizedKey = key.toLowerCase();
      (metadata[normalizedKey] ??= []).push(content);
    }
  }
  return metadata;
}

function firstMetaValue(html, keys, predicate = () => true) {
  const acceptedKeys = new Set(keys.map((key) => key.toLowerCase()));
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attributes = getTagAttributes(match[0]);
    const key = attributes.property ?? attributes.name ?? attributes.itemprop;
    const content = attributes.content;
    if (
      key &&
      content &&
      acceptedKeys.has(key.toLowerCase()) &&
      predicate(content)
    ) {
      return content;
    }
  }
  return undefined;
}

function collectJsonLd(html) {
  const values = [];
  for (const match of html.matchAll(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      values.push(JSON.parse(match[1].trim()));
    } catch {
      // A malformed JSON-LD block is ignored; page metadata remains useful.
    }
  }
  return values;
}

function firstRelHref(html, relation, pageUrl) {
  for (const match of html.matchAll(/<(?:link|a)\b[^>]*>/gi)) {
    const attributes = getTagAttributes(match[0]);
    const relations = (attributes.rel ?? "").toLowerCase().split(/\s+/);
    if (relations.includes(relation) && attributes.href) {
      return new URL(attributes.href, pageUrl).href;
    }
  }
  return undefined;
}

export function extractPageMetadata(html, pageUrl) {
  const meta = collectMeta(html);
  const metaValues = collectMetaValues(html);
  const jsonLd = collectJsonLd(html);
  const jsonLdObjects = jsonLd.flatMap((value) =>
    Array.isArray(value) ? value : [value],
  );
  const article = jsonLdObjects.find(
    (value) => value && typeof value === "object" && !Array.isArray(value),
  );
  const jsonAuthor =
    article?.author && typeof article.author === "object"
      ? article.author.name
      : article?.author;
  const author = meta.author ?? meta["citation_author"] ?? jsonAuthor;
  const authors = [
    ...(metaValues.citation_author ?? []),
    ...(metaValues.author ?? []),
    ...(author ? [author] : []),
  ]
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .map(cleanText)
    .filter(
      (value) => !/^(?:dspace|system|administrator|unknown)$/i.test(value),
    )
    .filter(Boolean);
  const canonical = firstMatch(
    html,
    /<link\b[^>]*rel=["'][^"']*canonical[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>/i,
  );
  const title =
    meta["og:title"] ??
    meta["citation_title"] ??
    article?.headline ??
    article?.name ??
    firstMatch(html, /<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const description =
    meta.description ?? meta["og:description"] ?? article?.description;
  const publishedAt =
    meta["article:published_time"] ??
    meta["citation_publication_date"] ??
    meta["citation_date"] ??
    article?.datePublished;
  const doi = meta["citation_doi"];
  const publisher = meta["citation_publisher"];
  const pageLicense =
    meta.license ??
    article?.license ??
    firstMetaValue(
      html,
      ["license", "dc.rights", "dcterms.rights", "rights"],
      (value) => /creativecommons\.org\/licenses|\/licenses\//i.test(value),
    ) ??
    firstRelHref(html, "license", pageUrl);
  const pageRights = meta["dc.rights"] ?? meta["dcterms.rights"] ?? meta.rights;
  return {
    requestedUrl: pageUrl,
    canonicalUrl: canonical ? new URL(canonical, pageUrl).href : pageUrl,
    ...(title ? { title: cleanText(title) } : {}),
    // Descriptions can contain an abstract or copied editorial prose. Keep
    // only its presence/size so this harvester remains metadata-only.
    ...(description
      ? { descriptionLength: cleanText(description).length }
      : {}),
    ...(authors.length ? { authors: [...new Set(authors)] } : {}),
    ...(publishedAt ? { publishedAt: cleanText(publishedAt) } : {}),
    ...(doi ? { doi: cleanText(doi) } : {}),
    ...(publisher ? { publisher: cleanText(publisher) } : {}),
    ...(pageLicense ? { pageLicense: cleanText(pageLicense) } : {}),
    ...(pageRights ? { pageRights: cleanText(pageRights) } : {}),
    metadataKeys: Object.keys(meta).sort(),
  };
}

function parseRobots(text) {
  const groups = [];
  let group = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.split("#", 1)[0].trim();
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const directive = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (directive === "user-agent") {
      if (!group || group.hasDirective) {
        group = {
          userAgents: [],
          rules: [],
          crawlDelaySeconds: undefined,
          hasDirective: false,
        };
        groups.push(group);
      }
      group.userAgents.push(value.toLowerCase());
      continue;
    }
    if (!group) continue;
    group.hasDirective = true;
    if (directive === "allow" || directive === "disallow") {
      group.rules.push({ type: directive, value });
    } else if (directive === "crawl-delay" && Number.isFinite(Number(value))) {
      group.crawlDelaySeconds = Number(value);
    }
  }
  return groups;
}

function ruleRegex(rule) {
  const escaped = escapeRegExp(rule);
  return new RegExp(`^${escaped.replaceAll("\\*", ".*")}`);
}

export function evaluateRobots(robotsText, targetUrl, userAgent = USER_AGENT) {
  const groups = parseRobots(robotsText);
  const ua = userAgent.toLowerCase().split(/[\s/]/, 1)[0];
  const selected =
    groups.find((group) => group.userAgents.includes(ua)) ??
    groups.find((group) => group.userAgents.includes("*"));
  if (!selected) {
    return { allowed: true, matchedRule: null, crawlDelaySeconds: 0 };
  }
  const target = new URL(targetUrl);
  const path = `${target.pathname}${target.search}`;
  const matches = selected.rules
    .filter((rule) => rule.value && ruleRegex(rule.value).test(path))
    .sort((left, right) => right.value.length - left.value.length);
  const winner = matches[0];
  return {
    allowed: winner?.type !== "disallow",
    matchedRule: winner ? `${winner.type}:${winner.value}` : null,
    crawlDelaySeconds: selected.crawlDelaySeconds ?? 0,
  };
}

async function fetchText(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? 20_000,
  );
  try {
    const response = await (options.fetchImpl ?? fetch)(url, {
      headers: {
        "user-agent": USER_AGENT,
        accept: "text/html, text/plain;q=0.9, application/xhtml+xml;q=0.8",
      },
      signal: controller.signal,
    });
    const buffer = Buffer.from(await response.arrayBuffer());
    return {
      ok: response.ok,
      status: response.status,
      contentType: response.headers.get("content-type") ?? "",
      bytes: buffer.byteLength,
      body: buffer.byteLength <= MAX_BODY_BYTES ? buffer.toString("utf8") : "",
      bodyTooLarge: buffer.byteLength > MAX_BODY_BYTES,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function waitForHost(lastRequestByHost, url, delaySeconds) {
  const host = new URL(url).host;
  const lastRequest = lastRequestByHost.get(host);
  const delayMs = Math.max(0, delaySeconds * 1000);
  if (lastRequest && Date.now() - lastRequest < delayMs) {
    await sleep(delayMs - (Date.now() - lastRequest));
  }
  lastRequestByHost.set(host, Date.now());
}

function assertionTypeFor(sourceType) {
  return sourceType === "scientific_publication"
    ? "academic_publication"
    : "editorial_interpretation";
}

function withProvenance(record) {
  const rawPayload = {
    sourceUrl: record.sourceUrl,
    robots: record.robots ?? null,
    http: record.http ?? null,
    metadata: record.metadata ?? null,
    accessStatus: record.status,
  };
  return {
    ...record,
    sourceRecord: {
      recordId: `web-page-record:${record.sourceRecordId}:${record.retrievedAt}`,
      entityType: "source",
      entityId: record.sourcePublicId,
      source: "web-page",
      sourceRecordId: record.sourceRecordId,
      sourceUrl: record.sourceUrl,
      retrievedAt: record.retrievedAt,
      license: record.declaredLicense,
      attribution: record.attribution,
      assertionType: assertionTypeFor(record.sourceType),
      rawPayload,
      rawChecksum: sha256(JSON.stringify(rawPayload)),
      importerVersion: HARVESTER_VERSION,
      status: "pending",
    },
  };
}

export async function harvestSources({
  policies = SOURCE_POLICIES,
  fetchImpl = fetch,
  now = () => new Date(),
} = {}) {
  const retrievedAt = now().toISOString();
  const lastRequestByHost = new Map();
  const sources = [];
  for (const policy of policies) {
    const baseRecord = {
      sourcePublicId: policy.publicId,
      sourceRecordId: policy.sourceRecordId ?? policy.publicId,
      source: "web-page",
      sourceUrl: policy.url,
      retrievedAt,
      robotsUrl: policy.robotsUrl,
      sourceType: policy.sourceType,
      declaredLicense: policy.declaredLicense,
      attribution: policy.attribution,
      reuseMode: policy.reuseMode,
      reason: policy.reason,
      publicationStatus: "quarantine-metadata-only",
      rawContentStored: false,
      imagesDownloaded: false,
    };
    try {
      await waitForHost(lastRequestByHost, policy.robotsUrl, 0);
      const robotsResponse = await fetchText(policy.robotsUrl, { fetchImpl });
      const robots = robotsResponse.body
        ? evaluateRobots(robotsResponse.body, policy.url)
        : {
            allowed: false,
            matchedRule: "robots-unavailable",
            crawlDelaySeconds: 0,
          };
      const record = {
        ...baseRecord,
        robots: {
          url: policy.robotsUrl,
          status: robotsResponse.status,
          allowed: robots.allowed,
          matchedRule: robots.matchedRule,
          crawlDelaySeconds: robots.crawlDelaySeconds,
        },
      };
      if (!robots.allowed) {
        sources.push(
          withProvenance({ ...record, status: "not-fetched-robots" }),
        );
        continue;
      }
      await waitForHost(
        lastRequestByHost,
        policy.url,
        robots.crawlDelaySeconds,
      );
      const pageResponse = await fetchText(policy.url, { fetchImpl });
      const accessChallenge =
        /(?:client challenge|checking your browser|enable javascript)/i.test(
          pageResponse.body,
        );
      const pageRecord = {
        ...record,
        http: {
          status: pageResponse.status,
          contentType: pageResponse.contentType,
          bytes: pageResponse.bytes,
          bodyTooLarge: pageResponse.bodyTooLarge,
          rawChecksum: sha256(pageResponse.body),
        },
        status: accessChallenge
          ? "access-challenge"
          : pageResponse.ok
            ? "fetched-metadata"
            : "http-error",
      };
      if (
        pageResponse.body &&
        pageResponse.contentType.includes("html") &&
        !accessChallenge
      ) {
        pageRecord.metadata = extractPageMetadata(
          pageResponse.body,
          policy.url,
        );
      }
      sources.push(withProvenance(pageRecord));
    } catch (error) {
      sources.push(
        withProvenance({
          ...baseRecord,
          status: "fetch-error",
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }
  return {
    schemaVersion: "0.1",
    harvester: HARVESTER_VERSION,
    userAgent: USER_AGENT,
    generatedAt: retrievedAt,
    policy: {
      allowlistOnly: true,
      robotsRequired: true,
      contentMode: "metadata-only-quarantine",
      noAutomaticPublication: true,
      noImagesDownloaded: true,
      note: "La presencia pública de una URL no equivale a licencia de republicación. La promoción al corpus requiere revisión individual.",
    },
    sources,
  };
}

async function main() {
  const harvested = await harvestSources();
  const date = harvested.generatedAt.slice(0, 10);
  const outputPath = resolve(
    ROOT,
    process.env.PACHANOI_HARVEST_PATH ??
      `.local/source-harvest/pachanoi-pages-${date}.json`,
  );
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(
    outputPath,
    `${JSON.stringify(harvested, null, 2)}\n`,
    "utf8",
  );
  console.log(
    JSON.stringify({
      outputPath,
      fetched: harvested.sources.filter(
        (source) => source.status === "fetched-metadata",
      ).length,
      notFetched: harvested.sources.filter(
        (source) => source.status !== "fetched-metadata",
      ).length,
      publicationStatus: harvested.policy.contentMode,
    }),
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await main();
}
