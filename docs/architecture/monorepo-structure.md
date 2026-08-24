# Estructura del monorepo

La estructura propuesta separa apps desplegables, paquetes de dominio,
importadores y contenido. Los paquetes no deben importar desde `apps/`; las
apps consumen los paquetes.

```text
.
├── apps/
│   ├── web/                  # Next.js: páginas públicas, jardín visual, mapas
│   ├── api/                  # Fastify: REST/OpenAPI, auth boundary, filtros
│   └── worker/               # Jobs de importación, snapshots, reindexado
├── packages/
│   ├── taxonomy/             # Taxon, nombres, sync GBIF/POWO/iNat
│   ├── culture/               # Community, Place, Period, CulturalRelation
│   ├── cultivation/           # GrowingGuide, claims, events
│   ├── garden/                # Fixtures y DTOs de ejemplares/colecciones
│   ├── lineage/               # Specimen, Culture, relaciones, QR/public IDs
│   ├── maps/                  # PostGIS, geometría pública/privada, tiles
│   ├── scene3d/               # Contratos de escenas, assets y snapshots
│   ├── procgen/               # Generadores procedurales deterministas propios
│   ├── interop/                # Darwin Core, JSON-LD, PROV-O y RO-Crate
│   └── shared/                # IDs, enums, DTOs, errores, utilidades
├── importers/
│   ├── gbif/                  # Primer importador del MVP
│   ├── inaturalist/           # Complementario, licencia por registro/media
│   ├── wikidata/              # Identificadores/LOD, sin duplicar taxonomía
│   ├── fungaltraits/          # Traits versionados y citables
│   ├── garden/                # Ledger de custodia e intake protegido por lote
│   └── ethnobotany/           # Solo después de revisar fuentes individualmente
├── integrations/
│   └── blender/               # Adaptador externo; no dependencia del web/API
├── content/
│   ├── species/               # Fichas editoriales y ejemplos versionados
│   ├── cultivation-guides/    # Semillas o fixtures de manuales
│   ├── cultures/              # Contenido comunitario con revisión explícita
│   ├── garden/                 # Manifiestos de custodia; vacío hasta recibir datos reales
│   └── scenes/                # Escenas y recetas 3D versionadas
├── packages/db/
│   ├── src/                   # Schema Drizzle y repositorios
│   └── migrations/            # SQL versionado, revisable en PR
├── schemas/
│   ├── openapi.yaml           # Contrato REST público
│   ├── provenance-record.schema.json
│   ├── plant-descriptor.schema.json
│   ├── procedural-adapter-request.schema.json
│   ├── procedural-asset-manifest.schema.json
│   └── jsonld/                # Contexto y exportación futura
├── docs/
│   ├── architecture/
│   ├── data/
│   └── roadmap/
├── LICENSE
├── LICENSE-CONTENT.md
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

## Dependencias entre paquetes

```text
shared ──┬── taxonomy ──┐
        ├── lineage ────┤
        ├── cultivation ├── api ── web
        ├── culture ────┤     └── worker
        └── maps ───────┘
```

Los paquetes visuales mantienen el mismo límite: `scene3d` define contratos y
`procgen` produce recetas/estructuras; `apps/web` decide cómo renderizarlos.

```text
scene3d ──┬── web
procgen ──┘
```

`interop` consume DTOs públicos y genera representaciones derivadas; no es
fuente de verdad ni escribe directamente en PostgreSQL.

`importers/*` solo producen comandos/DTOs de importación y dependen de
`shared`, `taxonomy` y el contrato de procedencia. No escriben directamente en
la base: el worker coordina transacciones y conserva el payload original.

## Convenciones

- Node.js LTS y `pnpm` workspaces.
- TypeScript estricto, ESLint y Prettier.
- Tests unitarios por paquete y tests de integración de API con PostgreSQL
  - PostGIS en contenedor.
- IDs internos UUIDv7 generados por aplicación cuando sea posible, con UUIDv4
  como fallback de PostgreSQL; IDs públicos estables y no enumerables.
- Toda ruta REST se versiona bajo `/api/v1` y genera OpenAPI.
- Los DTOs públicos no contienen columnas `geometry_exact` ni payloads privados.
