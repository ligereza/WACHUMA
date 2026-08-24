# Checklist de release reproducible

La release mínima se considera verificable cuando todos los gates pasan en el
mismo checkout:

```text
pnpm verify:release
```

El comando ejecuta typecheck, tests, builds, validadores de contenido,
licencias, SBOM CycloneDX, política de preparación de release, migraciones, el
contrato del adaptador procedural, GLB, formato, la verificación
PostgreSQL/PostGIS y un smoke test de la web contra esa base. Si un gate falla,
se conserva el caso como fixture o prueba de regresión antes de corregirlo.

`quality:sbom` usa el comando nativo de pnpm 11 sobre el lockfile y además
ejecuta `pnpm licenses list --json`. Produce un archivo por workspace en
`.local/release/`; CI lo sube como artefacto para que la composición de
dependencias quede asociada a la corrida.

## Persistencia

La verificación de código no sustituye una instancia PostgreSQL/PostGIS. En un
entorno con Docker:

```text
pnpm db:up
pnpm db:verify
```

`db:verify` no usa fixtures: migra, ejecuta el seed idempotente y corre la
prueba de integración contra la base real. Si Docker/PostGIS no está
disponible, `pnpm verify:release` debe fallar y la release no se considera
cerrada.

`verify:public-web` levanta la API y Next contra el PostgreSQL ya verificado y
comprueba que el explorador, la ficha monográfica de _Echinopsis pachanoi_ y el
manual público rendericen filas sembradas desde la base; también confirma que la relación
cultural Saraguro restringida no se filtra a `/culture`. Las páginas públicas que consultan
la API son dinámicas en producción para no congelar el fallback de desarrollo
durante un build sin conexión a la base.

Antes de la auditoría de base, `quality:content-manifest` prueba que el
descubrimiento editorial acepta nuevos documentos sin editar listas paralelas;
`quality:content` y `quality:content-db` siguen siendo los gates de forma y
paridad con PostgreSQL.

El workflow [`ci.yml`](../../.github/workflows/ci.yml) ejecuta el mismo gate
con un servicio PostGIS efímero en cada push y pull request. Así, el checkout
local puede separar fallos de código de la ausencia de infraestructura, y CI
conserva la prueba de persistencia real como condición de release.

## Criterios que no se automatizan

- aprobación comunitaria o retiro de conocimiento;
- compatibilidad jurídica de una fuente concreta;
- interpretación histórica o etnobotánica;
- decisión de publicar una geometría aproximada;
- revisión final de atribuciones.

Estos criterios están descritos en
[`docs/governance/review-and-takedown.md`](../governance/review-and-takedown.md)
y en [`release-readiness-v0.1.md`](../governance/release-readiness-v0.1.md),
además de la matriz de licencias.
