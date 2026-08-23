# Checklist de release reproducible

La release mínima se considera verificable cuando todos los gates pasan en el
mismo checkout:

```text
pnpm verify:release
```

El comando ejecuta typecheck, tests, builds, validadores de contenido,
licencias, migraciones, el contrato del adaptador procedural, GLB, formato y la
verificación PostgreSQL/PostGIS. Si
un gate falla, se conserva el caso como fixture o prueba de regresión antes de
corregirlo.

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
y en la matriz de licencias.
