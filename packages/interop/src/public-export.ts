export interface PublicExportTaxon {
  id: string;
  taxonId: string;
  scientificName: string;
  rank: string;
  taxonomicStatus: string;
  sourceIds: string[];
  license: string;
  rightsHolder: string;
}

export interface PublicExportClaim {
  id: string;
  subjectId: string;
  subjectType: string;
  predicate: string;
  objectId?: string;
  objectUri?: string;
  objectText?: string;
  valueJson?: Record<string, unknown>;
  assertionType: string;
  evidenceLevel: string;
  sourceId: string;
  sourceRecordId?: string;
  license: string;
  rightsHolder: string;
  reviewStatus: string;
}

export interface PublicExportGuide {
  id: string;
  subjectId: string;
  title: string;
  guideKey: string;
  version: number;
  status: string;
  summary?: string;
  sourceId: string;
  license: string;
  rightsHolder: string;
}

export interface PublicExportGuideClaim {
  id: string;
  subjectId: string;
  sectionKey: string;
  statement: string;
  evidenceLevel: string;
  assertionType: string;
  sourceId: string;
  license: string;
  rightsHolder: string;
}

export interface PublicExportObservation {
  id: string;
  subjectId: string;
  scientificName: string;
  eventDate: string;
  basisOfRecord: "HumanObservation" | "MachineObservation" | "MaterialEntity";
  decimalLatitude?: number;
  decimalLongitude?: number;
  coordinateUncertaintyInMeters?: number;
  locality?: string;
  sourceId: string;
  license: string;
  rightsHolder: string;
  informationWithheld?: string;
}

export interface PublicExportSource {
  id: string;
  title: string;
  citation: string;
  url?: string;
  license: string;
  rightsHolder: string;
}

export interface PublicExportCorpus {
  taxa: PublicExportTaxon[];
  claims: PublicExportClaim[];
  guides: PublicExportGuide[];
  guideClaims: PublicExportGuideClaim[];
  observations: PublicExportObservation[];
  sources: PublicExportSource[];
}

export interface ExportFile {
  name: string;
  content: string | Uint8Array;
}

function csvCell(value: string | number | undefined): string {
  const text = value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function serializeCsv(
  headers: readonly string[],
  rows: readonly (readonly (string | number | undefined)[])[],
): string {
  return [
    headers.map(csvCell).join(","),
    ...rows.map((row) => row.map(csvCell).join(",")),
  ].join("\n");
}

function xmlText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function buildDarwinCoreMeta(): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<archive xmlns="http://rs.tdwg.org/dwc/text/" metadata="eml.xml">',
    '  <core encoding="UTF-8" linesTerminatedBy="&#10;" fieldsTerminatedBy="," ignoreHeaderLines="1" rowType="http://rs.tdwg.org/dwc/terms/Taxon">',
    "    <files><location>taxon.csv</location></files>",
    '    <id index="0"/>',
    '    <field index="1" term="http://rs.tdwg.org/dwc/terms/identifier"/>',
    '    <field index="2" term="http://rs.tdwg.org/dwc/terms/taxonID"/>',
    '    <field index="3" term="http://rs.tdwg.org/dwc/terms/scientificName"/>',
    '    <field index="4" term="http://rs.tdwg.org/dwc/terms/taxonRank"/>',
    '    <field index="5" term="http://rs.tdwg.org/dwc/terms/taxonomicStatus"/>',
    '    <field index="6" term="http://purl.org/dc/terms/source"/>',
    '    <field index="7" term="http://purl.org/dc/terms/license"/>',
    '    <field index="8" term="http://purl.org/dc/terms/rightsHolder"/>',
    "  </core>",
    '  <extension encoding="UTF-8" linesTerminatedBy="&#10;" fieldsTerminatedBy="," ignoreHeaderLines="1" rowType="http://rs.tdwg.org/dwc/terms/Occurrence">',
    "    <files><location>occurrence.csv</location></files>",
    '    <coreid index="0"/>',
    '    <field index="1" term="http://rs.tdwg.org/dwc/terms/identifier"/>',
    '    <field index="2" term="http://rs.tdwg.org/dwc/terms/subject"/>',
    '    <field index="3" term="http://rs.tdwg.org/dwc/terms/scientificName"/>',
    '    <field index="4" term="http://rs.tdwg.org/dwc/terms/eventDate"/>',
    '    <field index="5" term="http://rs.tdwg.org/dwc/terms/basisOfRecord"/>',
    '    <field index="6" term="http://rs.tdwg.org/dwc/terms/decimalLatitude"/>',
    '    <field index="7" term="http://rs.tdwg.org/dwc/terms/decimalLongitude"/>',
    '    <field index="8" term="http://rs.tdwg.org/dwc/terms/coordinateUncertaintyInMeters"/>',
    '    <field index="9" term="http://rs.tdwg.org/dwc/terms/locality"/>',
    '    <field index="10" term="http://purl.org/dc/terms/source"/>',
    '    <field index="11" term="http://purl.org/dc/terms/license"/>',
    '    <field index="12" term="http://purl.org/dc/terms/rightsHolder"/>',
    '    <field index="13" term="http://purl.org/dc/terms/modified"/>',
    '    <field index="14" term="http://purl.org/dc/terms/accessRights"/>',
    "  </extension>",
    '  <extension encoding="UTF-8" linesTerminatedBy="&#10;" fieldsTerminatedBy="," ignoreHeaderLines="1" rowType="https://wachuma.org/terms/Claim">',
    "    <files><location>claims.csv</location></files>",
    '    <coreid index="0"/>',
    '    <field index="1" term="http://rs.tdwg.org/dwc/terms/identifier"/>',
    '    <field index="2" term="http://purl.org/dc/terms/subject"/>',
    '    <field index="3" term="https://wachuma.org/terms/subjectType"/>',
    '    <field index="4" term="https://wachuma.org/terms/predicate"/>',
    '    <field index="5" term="https://wachuma.org/terms/object"/>',
    '    <field index="6" term="https://wachuma.org/terms/assertionType"/>',
    '    <field index="7" term="https://wachuma.org/terms/evidenceLevel"/>',
    '    <field index="8" term="http://purl.org/dc/terms/source"/>',
    '    <field index="9" term="http://purl.org/dc/terms/license"/>',
    '    <field index="10" term="http://purl.org/dc/terms/rightsHolder"/>',
    "  </extension>",
    '  <extension encoding="UTF-8" linesTerminatedBy="&#10;" fieldsTerminatedBy="," ignoreHeaderLines="1" rowType="https://wachuma.org/terms/GrowingGuide">',
    "    <files><location>guides.csv</location></files>",
    '    <coreid index="0"/>',
    '    <field index="1" term="http://rs.tdwg.org/dwc/terms/identifier"/>',
    '    <field index="2" term="http://purl.org/dc/terms/subject"/>',
    '    <field index="3" term="http://purl.org/dc/terms/title"/>',
    '    <field index="4" term="https://wachuma.org/terms/guideKey"/>',
    '    <field index="5" term="https://wachuma.org/terms/version"/>',
    '    <field index="6" term="https://wachuma.org/terms/status"/>',
    '    <field index="7" term="http://purl.org/dc/terms/description"/>',
    '    <field index="8" term="http://purl.org/dc/terms/source"/>',
    '    <field index="9" term="http://purl.org/dc/terms/license"/>',
    '    <field index="10" term="http://purl.org/dc/terms/rightsHolder"/>',
    "  </extension>",
    '  <extension encoding="UTF-8" linesTerminatedBy="&#10;" fieldsTerminatedBy="," ignoreHeaderLines="1" rowType="https://wachuma.org/terms/GrowingGuideClaim">',
    "    <files><location>guide-claims.csv</location></files>",
    '    <coreid index="0"/>',
    '    <field index="1" term="http://rs.tdwg.org/dwc/terms/identifier"/>',
    '    <field index="2" term="http://purl.org/dc/terms/subject"/>',
    '    <field index="3" term="https://wachuma.org/terms/sectionKey"/>',
    '    <field index="4" term="http://purl.org/dc/terms/description"/>',
    '    <field index="5" term="https://wachuma.org/terms/evidenceLevel"/>',
    '    <field index="6" term="https://wachuma.org/terms/assertionType"/>',
    '    <field index="7" term="http://purl.org/dc/terms/source"/>',
    '    <field index="8" term="http://purl.org/dc/terms/license"/>',
    '    <field index="9" term="http://purl.org/dc/terms/rightsHolder"/>',
    "  </extension>",
    '  <extension encoding="UTF-8" linesTerminatedBy="&#10;" fieldsTerminatedBy="," ignoreHeaderLines="1" rowType="https://wachuma.org/terms/Source">',
    "    <files><location>sources.csv</location></files>",
    '    <coreid index="0"/>',
    '    <field index="1" term="http://rs.tdwg.org/dwc/terms/identifier"/>',
    '    <field index="2" term="http://purl.org/dc/terms/title"/>',
    '    <field index="3" term="http://purl.org/dc/terms/bibliographicCitation"/>',
    '    <field index="4" term="http://schema.org/url"/>',
    '    <field index="5" term="http://purl.org/dc/terms/license"/>',
    '    <field index="6" term="http://purl.org/dc/terms/rightsHolder"/>',
    "  </extension>",
    "</archive>",
    "",
  ].join("\n");
}

export function buildDarwinCoreFiles(corpus: PublicExportCorpus): ExportFile[] {
  const coreId = corpus.taxa[0]?.id ?? "";
  const sourceIds = (ids: readonly string[]) => ids.join("|");
  const taxon = serializeCsv(
    [
      "id",
      "entityID",
      "taxonID",
      "scientificName",
      "taxonRank",
      "taxonomicStatus",
      "sourceID",
      "license",
      "rightsHolder",
    ],
    corpus.taxa.map((row) => [
      row.id,
      row.id,
      row.taxonId,
      row.scientificName,
      row.rank,
      row.taxonomicStatus,
      sourceIds(row.sourceIds),
      row.license,
      row.rightsHolder,
    ]),
  );
  const occurrence = serializeCsv(
    [
      "coreID",
      "id",
      "subjectID",
      "scientificName",
      "eventDate",
      "basisOfRecord",
      "decimalLatitude",
      "decimalLongitude",
      "coordinateUncertaintyInMeters",
      "locality",
      "sourceID",
      "license",
      "rightsHolder",
      "modified",
      "accessRights",
    ],
    corpus.observations.map((row) => [
      coreId,
      row.id,
      row.subjectId,
      row.scientificName,
      row.eventDate,
      row.basisOfRecord,
      row.decimalLatitude,
      row.decimalLongitude,
      row.coordinateUncertaintyInMeters,
      row.locality,
      row.sourceId,
      row.license,
      row.rightsHolder,
      row.eventDate,
      row.informationWithheld ?? "",
    ]),
  );
  const claims = serializeCsv(
    [
      "coreID",
      "id",
      "subjectID",
      "subjectType",
      "predicate",
      "object",
      "assertionType",
      "evidenceLevel",
      "sourceID",
      "license",
      "rightsHolder",
    ],
    corpus.claims.map((row) => [
      coreId,
      row.id,
      row.subjectId,
      row.subjectType,
      row.predicate,
      row.objectId ??
        row.objectUri ??
        row.objectText ??
        (row.valueJson ? JSON.stringify(row.valueJson) : ""),
      row.assertionType,
      row.evidenceLevel,
      row.sourceId,
      row.license,
      row.rightsHolder,
    ]),
  );
  const guides = serializeCsv(
    [
      "coreID",
      "id",
      "subjectID",
      "title",
      "guideKey",
      "version",
      "status",
      "summary",
      "sourceID",
      "license",
      "rightsHolder",
    ],
    corpus.guides.map((row) => [
      coreId,
      row.id,
      row.subjectId,
      row.title,
      row.guideKey,
      row.version,
      row.status,
      row.summary,
      row.sourceId,
      row.license,
      row.rightsHolder,
    ]),
  );
  const guideClaims = serializeCsv(
    [
      "coreID",
      "id",
      "subjectID",
      "sectionKey",
      "statement",
      "evidenceLevel",
      "assertionType",
      "sourceID",
      "license",
      "rightsHolder",
    ],
    corpus.guideClaims.map((row) => [
      coreId,
      row.id,
      row.subjectId,
      row.sectionKey,
      row.statement,
      row.evidenceLevel,
      row.assertionType,
      row.sourceId,
      row.license,
      row.rightsHolder,
    ]),
  );
  const sources = serializeCsv(
    ["coreID", "id", "title", "citation", "url", "license", "rightsHolder"],
    corpus.sources.map((row) => [
      coreId,
      row.id,
      row.title,
      row.citation,
      row.url,
      row.license,
      row.rightsHolder,
    ]),
  );
  return [
    { name: "meta.xml", content: buildDarwinCoreMeta() },
    {
      name: "eml.xml",
      content: [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<eml:eml xmlns:eml="eml://ecoinformatics.org/eml-2.1.1" packageId="wachuma-public-corpus" system="WACHUMA">',
        "  <dataset><title>WACHUMA public corpus</title><creator><individualName><surName>WACHUMA editorial system</surName></individualName></creator><intellectualRights><para>Each row carries its own source, license and attribution. Publication excludes restricted and sensitive records.</para></intellectualRights></dataset>",
        "</eml:eml>",
        "",
      ].join("\n"),
    },
    { name: "taxon.csv", content: taxon },
    { name: "occurrence.csv", content: occurrence },
    { name: "claims.csv", content: claims },
    { name: "guides.csv", content: guides },
    { name: "guide-claims.csv", content: guideClaims },
    { name: "sources.csv", content: sources },
  ];
}

function asBytes(value: string | Uint8Array): Uint8Array {
  return typeof value === "string" ? new TextEncoder().encode(value) : value;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function writeU16(view: DataView, offset: number, value: number): void {
  view.setUint16(offset, value, true);
}

function writeU32(view: DataView, offset: number, value: number): void {
  view.setUint32(offset, value, true);
}

/** Builds a deterministic, uncompressed ZIP suitable for a Darwin Core Archive. */
export function buildZip(files: readonly ExportFile[]): Uint8Array {
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = new TextEncoder().encode(file.name);
    const content = asBytes(file.content);
    const checksum = crc32(content);
    const local = new Uint8Array(30 + name.length);
    const localView = new DataView(local.buffer);
    writeU32(localView, 0, 0x04034b50);
    writeU16(localView, 4, 20);
    writeU16(localView, 6, 0x800);
    writeU16(localView, 8, 0);
    writeU16(localView, 10, 0);
    writeU16(localView, 12, 0);
    writeU16(localView, 14, checksum & 0xffff);
    writeU16(localView, 16, checksum >>> 16);
    writeU32(localView, 18, content.length);
    writeU32(localView, 22, content.length);
    writeU16(localView, 26, name.length);
    writeU16(localView, 28, 0);
    local.set(name, 30);
    locals.push(local, content);

    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    writeU32(centralView, 0, 0x02014b50);
    writeU16(centralView, 4, 20);
    writeU16(centralView, 6, 20);
    writeU16(centralView, 8, 0x800);
    writeU16(centralView, 10, 0);
    writeU16(centralView, 12, 0);
    writeU16(centralView, 14, 0);
    writeU16(centralView, 16, checksum & 0xffff);
    writeU16(centralView, 18, checksum >>> 16);
    writeU32(centralView, 20, content.length);
    writeU32(centralView, 24, content.length);
    writeU16(centralView, 28, name.length);
    writeU16(centralView, 30, 0);
    writeU16(centralView, 32, 0);
    writeU16(centralView, 34, 0);
    writeU16(centralView, 36, 0);
    writeU32(centralView, 38, 0);
    writeU32(centralView, 42, offset);
    central.set(name, 46);
    centrals.push(central);
    offset += local.length + content.length;
  }
  const centralDirectory = concatBytes(centrals);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  writeU32(endView, 0, 0x06054b50);
  writeU16(endView, 4, 0);
  writeU16(endView, 6, 0);
  writeU16(endView, 8, files.length);
  writeU16(endView, 10, files.length);
  writeU32(endView, 12, centralDirectory.length);
  writeU32(endView, 16, offset);
  writeU16(endView, 20, 0);
  return concatBytes([...locals, centralDirectory, end]);
}
