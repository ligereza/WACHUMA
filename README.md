# WACHUMA

Jardín digital, atlas biológico y base de conocimiento biocultural abierta.

WACHUMA representa organismos, ejemplares vivos, material biológico, linajes,
ecología, cultivo, historia y relaciones culturales con procedencia explícita.
La experiencia pública es monográfica y el eje no se mueve: _Echinopsis
pachanoi_ / _Trichocereus pachanoi_. El alcance admite dos órbitas alrededor de
ese eje, y sólo esas dos. Como cactáceas secundarias o terciarias entran los
hermanos y primos del pachanoi —_Echinopsis peruviana_, la antorcha boliviana
_Echinopsis lageniformis_ / _Trichocereus bridgesii_ y los ejemplares sobre los
que existan teorías que lo preceden o proceden—, siempre que la relación esté
documentada y no supuesta. Como organismos asociados entran los hongos que
comúnmente atacan al cactus o le causan pudrición, no la micología en general.
Lo que no colabora con el cactus, con las cactáceas emparentadas o con su
representación 3D queda fuera del repositorio. Los
nombres “wachuma”, “huachuma” y “San Pedro” se tratarán como nombres o
conceptos culturales contextualizados, no como equivalencias taxonómicas
automáticas.

## Estado

El repositorio ya contiene una primera vertical funcional de web/API/worker/db,
pero la experiencia sigue en evolución. La semilla pública incluye un corte
pequeño de contenido real para _Echinopsis pachanoi_: fuentes atribuidas,
identificadores GBIF/IPNI, claims que conservan la diferencia entre
proveedores y un manual versionado con alcance explícito. Los registros
históricos de otras especies permanecen restringidos y los ejemplares, la
escena 3D, el linaje y la relación
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
- [Corpus público reproducible v0.2](docs/data/public-corpus-v0.2.md)
- [Calidad algorítmica y regresiones](docs/quality/algorithmic-quality.md)
- [Checklist de release reproducible](docs/quality/release-checklist.md)
- [Auditoría del objetivo completo](docs/quality/objective-audit-v0.1.md)
- [Preparación de release y revisión humana](docs/governance/release-readiness-v0.1.md)
- [Revisión comunitaria y takedown](docs/governance/review-and-takedown.md)
- [Ledger de ejemplares reales](docs/data/garden-intake-v0.1.md)
- [Licencia de código](LICENSE)
- [Licencia de contenido](LICENSE-CONTENT.md)
- [Tipos de dominio iniciales](packages/shared/src/types.ts)
- [ADR de escenas 3D](docs/architecture/ADR-0002-3d-garden-studio.md)
- [ADR de estudios materiales de organismos](docs/architecture/ADR-0006-organism-material-fixtures.md)
- [ADR de experiencia móvil por scroll](docs/architecture/ADR-0007-mobile-scroll-experience.md)
- [Límites de generadores procedurales](docs/architecture/procedural-generators.md)
- [Esquema de escenas 3D](schemas/garden-scene.schema.json)
- [Esquema de estudios materiales](schemas/material-fixture.schema.json)
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

El seed normal usa `WACHUMA_SEED_PROFILE=public` y no incorpora fixtures
sintéticos a las rutas públicas. El perfil `verification` se reserva para
`pnpm db:verify`; la compuerta `pnpm quality:public-corpus` comprueba esta
separación antes del smoke test web.

Para actualizar el staging de fuentes sobre _Echinopsis pachanoi_, ejecuta
`pnpm harvest:pachanoi:pages`. La cosecha es una allowlist metadata-only:
respeta `robots.txt`, no guarda cuerpos ni imágenes y deja todo en cuarentena.
Con PostgreSQL disponible, `pnpm import:pachanoi:page-harvest` persiste esos
`source_records` como `pending`; nunca los publica automáticamente.

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
