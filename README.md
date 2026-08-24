# WACHUMA

Jardín digital, atlas biológico y base de conocimiento biocultural abierta.

WACHUMA representa organismos, ejemplares vivos, material biológico, linajes,
ecología, cultivo, historia y relaciones culturales con procedencia explícita.
La primera especie de demostración es _Echinopsis pachanoi_ / _Trichocereus
pachanoi_, y el corpus ya incluye _Opuntia ficus-indica_ y el primer hongo
_Pleurotus ostreatus_. Los nombres “wachuma”, “huachuma” y “San Pedro” se
tratarán como nombres o conceptos culturales contextualizados, no como
equivalencias taxonómicas automáticas.

## Estado

El repositorio ya contiene una primera vertical funcional de web/API/worker/db,
pero la experiencia sigue en evolución. La semilla ahora incluye un corte
pequeño de contenido real para dos especies vegetales y un hongo: 11 fuentes
atribuidas, identificadores IPNI/GBIF, claims que conservan la diferencia entre
proveedores y cuatro manuales versionados con alcance explícito. Los
ejemplares, la escena 3D, el linaje y la relación
cultural del jardín siguen siendo sintéticos o restringidos hasta incorporar
registros reales revisados.

- [Estudio de referencias](docs/architecture/reference-study.md)
- [ADR de arquitectura](docs/architecture/ADR-0001-plataforma.md)
- [Diagrama entidad-relación](docs/architecture/erd.md)
- [Matriz de licencias](docs/architecture/license-matrix.md)
- [Esquema de procedencia](docs/data/provenance-schema.md)
- [Estructura del monorepo](docs/architecture/monorepo-structure.md)
- [Roadmap del MVP](docs/roadmap/mvp.md)
- [Objetivo completo](docs/roadmap/full-objective.md)
- [Arquitectura de información y contrato editorial](docs/product/ia-and-editorial-v0.1.md)
- [Contrato del corpus público](docs/data/content-seeding-v0.1.md)
- [Calidad algorítmica y regresiones](docs/quality/algorithmic-quality.md)
- [Checklist de release reproducible](docs/quality/release-checklist.md)
- [Auditoría del objetivo completo](docs/quality/objective-audit-v0.1.md)
- [Preparación de release y revisión humana](docs/governance/release-readiness-v0.1.md)
- [Revisión comunitaria y takedown](docs/governance/review-and-takedown.md)
- [Licencia de código](LICENSE)
- [Licencia de contenido](LICENSE-CONTENT.md)
- [Tipos de dominio iniciales](packages/shared/src/types.ts)
- [ADR de escenas 3D](docs/architecture/ADR-0002-3d-garden-studio.md)
- [Límites de generadores procedurales](docs/architecture/procedural-generators.md)
- [Esquema de escenas 3D](schemas/garden-scene.schema.json)
- [Escena demo procedural](content/scenes/echinopsis-pachanoi-demo.json)

Para ejecutar la persistencia local, copia `.env.example` a `.env`, inicia
PostgreSQL/PostGIS con `pnpm db:up` y ejecuta `pnpm db:verify`. Si PowerShell
responde que `pnpm` no existe, ejecuta una vez `corepack enable` y usa
`corepack pnpm` en los comandos siguientes. Luego levanta el
API y la web en terminales separadas:

```powershell
$env:DATABASE_URL = "postgres://wachuma:wachuma-dev@localhost:5432/wachuma"
$env:PORT = "3001"
pnpm --filter @wachuma/api dev
```

```powershell
$env:WACHUMA_API_URL = "http://localhost:3001"
# También se acepta NEXT_PUBLIC_WACHUMA_API_URL.
pnpm --filter @wachuma/web dev
```

La web usa datos persistidos cuando tiene una URL de API. Solo usa el fixture
de demostración cuando se activa explícitamente `WACHUMA_DEMO_MODE=true`. Sin
API y sin ese modo, muestra estados vacíos o `404`; así una configuración rota
no queda oculta detrás de contenido falso.

Los gates locales se agrupan en `pnpm verify:release`. Incluyen typecheck,
tests, build, contenido, licencias, SBOM CycloneDX, política de preparación de
release, migraciones, GLB, formato, PostgreSQL/PostGIS y smoke web. El SBOM se
genera desde `pnpm-lock.yaml` y queda en `.local/release/`; CI lo conserva como
artefacto. La política de release mantiene separadas las verificaciones
automáticas de la aprobación jurídica y comunitaria.

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
