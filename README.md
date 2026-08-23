# WACHUMA

Jardín digital, atlas biológico y base de conocimiento biocultural abierta.

WACHUMA representa organismos, ejemplares vivos, material biológico, linajes,
ecología, cultivo, historia y relaciones culturales con procedencia explícita.
La primera especie de demostración será _Echinopsis pachanoi_ / _Trichocereus
pachanoi_. Los nombres “wachuma”, “huachuma” y “San Pedro” se tratarán como
nombres o conceptos culturales contextualizados, no como equivalencias
taxonómicas automáticas.

## Estado

El repositorio ya contiene una primera vertical funcional de web/API/worker/db:
explorador y ficha taxonómica demo, colección y ficha de ejemplar sintético,
linaje público filtrado, manuales versionados con claims en revisión, relaciones culturales
con procedencia, mapa seguro, bibliografía, escena 3D y un importador GBIF
reproducible que conserva snapshots `pending`. No se publican ni se cargan
automáticamente datasets externos, y los dos ejemplares privados del fixture
siguen fuera de las rutas públicas.

- [Estudio de referencias](docs/architecture/reference-study.md)
- [ADR de arquitectura](docs/architecture/ADR-0001-plataforma.md)
- [Diagrama entidad-relación](docs/architecture/erd.md)
- [Matriz de licencias](docs/architecture/license-matrix.md)
- [Esquema de procedencia](docs/data/provenance-schema.md)
- [Estructura del monorepo](docs/architecture/monorepo-structure.md)
- [Roadmap del MVP](docs/roadmap/mvp.md)
- [Objetivo completo](docs/roadmap/full-objective.md)
- [Calidad algorítmica y regresiones](docs/quality/algorithmic-quality.md)
- [Checklist de release reproducible](docs/quality/release-checklist.md)
- [Revisión comunitaria y takedown](docs/governance/review-and-takedown.md)
- [Licencia de código](LICENSE)
- [Licencia de contenido](LICENSE-CONTENT.md)
- [Tipos de dominio iniciales](packages/shared/src/types.ts)
- [ADR de escenas 3D](docs/architecture/ADR-0002-3d-garden-studio.md)
- [Límites de generadores procedurales](docs/architecture/procedural-generators.md)
- [Esquema de escenas 3D](schemas/garden-scene.schema.json)
- [Escena demo procedural](content/scenes/echinopsis-pachanoi-demo.json)

Para ejecutar la persistencia local, copia `.env.example` a `.env`, inicia
PostgreSQL/PostGIS con `pnpm db:up` y ejecuta `pnpm db:verify`. El API usa
`DATABASE_URL` cuando está disponible y conserva el fixture público como
fallback para desarrollo sin base de datos; ese fallback no cuenta como
verificación de release.

Los gates locales son `pnpm typecheck`, `pnpm test`, `pnpm build`,
`pnpm quality:content`, `pnpm quality:licenses`, `pnpm quality:migrations`,
`pnpm validate:glb` y `pnpm format:check`.

Los avisos de terceros se mantienen en [THIRD_PARTY.md](THIRD_PARTY.md).

## Principios

1. La taxonomía, la observación, la historia, la arqueología, la publicación
   académica y el conocimiento comunitario son capas distintas.
2. Toda afirmación importante conserva fuente, licencia, atribución y fecha de
   recuperación cuando procede de un sistema externo.
3. El conocimiento cultural no es anónimo: se registra comunidad, perspectiva,
   documentador, territorio, sensibilidad y estado de revisión.
4. Ubicaciones exactas de especies amenazadas, sitios sensibles y ejemplares
   privados nunca se publican automáticamente.
5. Las referencias se estudian por función. No se copia código ni datasets sin
   revisar licencia, atribución y compatibilidad.

## Licencias

El código propio está bajo MIT y el contenido original bajo CC BY 4.0, con
excepciones por registro para material comunitario, sensible o externo. Las
licencias de terceros y sus atribuciones conservan prioridad.
