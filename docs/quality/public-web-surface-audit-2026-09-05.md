# Auditoría de superficies públicas — 2026-09-05

Esta auditoría se ejecuta contra una compilación de producción de Next y un
PostgreSQL/PostGIS sembrado con `WACHUMA_SEED_PROFILE=public`. No activa
`WACHUMA_DEMO_MODE`: si la API no responde, la prueba falla o la página queda
vacía según el contrato, pero no sustituye datos de la base por fixtures.

## Contratos comprobados

- La ficha monográfica conserva el nombre publicado, el desacuerdo taxonómico,
  las fuentes y la advertencia de que el estudio material no es química.
- El explorador y la búsqueda sólo devuelven el taxón en alcance y muestran un
  vacío declarado para una consulta de un taxón archivado.
- Las guías muestran estado, cobertura, nivel de evidencia y bibliografía; una
  guía inexistente responde 404.
- Cultura y mapa muestran el vacío público actual. No serializan relaciones
  bajo revisión, comunidades restringidas ni `geometry_exact`.
- Jardín, linaje y ejemplares no inventan registros públicos cuando el seed de
  release mantiene los ejemplares sintéticos restringidos.
- Fuentes conserva licencia y atribución visibles. La vista 3D sirve el asset
  procedural versionado; no expone procedencia privada.

## Superficies recorridas

| Superficie                                                | Evidencia de salida                                                                             |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `/`                                                       | Presenta WACHUMA y conduce a la ficha de _Echinopsis pachanoi_; no incluye tokens restringidos. |
| `/species`                                                | Sólo el taxón en alcance; no incluye _Opuntia_ ni _Pleurotus_.                                  |
| `/species?q=pachanoi`                                     | Coincidencia publicable con identidad estable.                                                  |
| `/species?q=opuntia`                                      | `No hay coincidencias publicables`.                                                             |
| `/species/biological-entity-echinopsis-pachanoi`          | Taxonomía, desacuerdo, IPNI, fuentes y vacío químico declarado.                                 |
| `/species/biological-entity-opuntia-ficus-indica`         | 404 para taxón fuera de alcance.                                                                |
| `/species/biological-entity-pleurotus-ostreatus`          | 404 para organismo fuera de alcance.                                                            |
| `/cultivation`                                            | Guías versionadas con estado y claims atribuibles.                                              |
| `/cultivation/guide-echinopsis-pachanoi-general-cacti-v1` | Mapa de cobertura, estados de evidencia y bibliografía.                                         |
| `/cultivation/not-a-public-guide`                         | 404 sin fallback editorial.                                                                     |
| `/search?q=pachanoi`                                      | Especie, manual y fuentes publicables.                                                          |
| `/search?q=wachuma`                                       | No muestra relaciones culturales restringidas.                                                  |
| `/culture`                                                | Vacío público explícito; no muestra la relación Saraguro bajo revisión.                         |
| `/garden`                                                 | Escena y estado de ejemplares sin serializar ejemplares restringidos.                           |
| `/map`                                                    | Vacío o geometrías aproximadas; nunca una clave `geometry_exact`.                               |
| `/sources`                                                | Licencia y atribución visibles por fuente.                                                      |
| `/lineage/biological-entity-echinopsis-pachanoi`          | Árbol seguro para la entidad pública, sin ejemplares privados.                                  |
| `/preview/svg-loft`                                       | Preview procedural/Geometry Nodes sin tokens de registros restringidos.                         |

Los endpoints de detalle de ejemplares y del linaje de
`specimen-public-demo-01` también se solicitan como controles negativos: con el
perfil público responden 404 porque esos fixtures permanecen restringidos.

## Puerta ejecutable

```text
pnpm verify:public-web
```

El script `scripts/verify-public-web.mjs` arranca el API y Next compilados,
recorre las superficies anteriores, comprueba los estados HTTP, busca las
etiquetas de evidencia y rechaza tokens de relaciones culturales, ejemplares
privados o geometría exacta. El mismo script forma parte de
`pnpm verify:release`.

Esto demuestra que la superficie no contradice el seed actual. No demuestra
que el corpus sea completo, ni que un registro restringido pueda publicarse sin
una decisión humana posterior.
