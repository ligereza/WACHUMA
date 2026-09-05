# Nomenclatura

Las palabras que en este proyecto no son intercambiables. Casi todo el trabajo
de WACHUMA consiste en mantener separadas cosas que el lenguaje corriente
mezcla, así que una palabra usada de más ya es un error de contenido.

**Aquí no van hechos ni conteos.** Un hecho escrito envejece y termina mintiendo
con cara de medición. Los hechos del corpus editorial se preguntan con
`pnpm content:manifest`; los de la base, con `pnpm quality:corpus`.

## El sistema y sus copias

| Palabra                        | Qué es                                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| **WACHUMA**                    | el sistema y su documentación                                                                                |
| **el repo**                    | el repositorio remoto, `ligereza/WACHUMA`                                                                    |
| **el clon**                    | una copia local del repo. No se le dice "el repo"                                                            |
| **el repositorio** (en código) | la capa de acceso a datos: `search-repository.ts`, `createTaxonomyRepository`. No tiene nada que ver con git |

## El organismo

| Palabra                                  | Qué es                                                                                                                                |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **_Echinopsis pachanoi_**                | el nombre científico aceptado, según POWO                                                                                             |
| **_Trichocereus pachanoi_**              | combinación taxonómica histórica, conservada como variante documentada                                                                |
| **wachuma**, **huachuma**, **San Pedro** | nombres culturales situados, con fuente, contexto y revisión. **Nunca** sinónimos del taxón ni resolubles por el título de una página |

## Las tres capas de identidad

| Palabra               | Qué es                                                         |
| --------------------- | -------------------------------------------------------------- |
| **taxón**             | el nombre y su clasificación                                   |
| **entidad biológica** | el organismo como sujeto del catálogo                          |
| **ejemplar**          | un individuo vivo del jardín, con código público y procedencia |

## Las clases de afirmación

No se sustituyen entre sí. Confundirlas es el error que el modelo existe para
evitar.

| Palabra               | Qué es                                                  |
| --------------------- | ------------------------------------------------------- |
| **claim**             | una afirmación con fuente, perspectiva y evidencia      |
| **observación**       | un avistamiento con fecha y lugar                       |
| **relación cultural** | un vínculo situado, con comunidad, territorio y periodo |
| **medición de trait** | un valor con protocolo e incertidumbre                  |

## Procedencia

| Palabra             | Qué es                                                                         |
| ------------------- | ------------------------------------------------------------------------------ |
| **fuente**          | la referencia bibliográfica citable                                            |
| **source record**   | una recuperación inmutable desde un proveedor, con payload crudo y checksum    |
| **`sourceType`**    | qué clase de cosa lo dijo (publicación científica, dataset externo, editorial) |
| **`assertionType`** | qué clase de afirmación es (hecho taxonómico, interpretación editorial)        |

Una publicación científica no convierte lo que dice en un hecho taxonómico. Son
dos ejes distintos y se declaran por separado.

## Decisión

| Palabra                | Qué es                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------ |
| **visibilidad**        | hasta dónde puede verse: `public`, `restricted`, `sensitive`, `community-controlled` |
| **estado de revisión** | si ya se decidió: `draft`, `under-review`, `accepted`, `rejected`                    |
| **revisar**            | juzgar un source record: licencia, atribución, privacidad, taxonomía                 |
| **promover**           | llevar una proyección al catálogo público                                            |

Visibilidad y estado de revisión no son lo mismo, y revisar no es promover: son
actos separados y auditables por separado.

## Contenido y representación

| Palabra                         | Qué es                                                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **`content/`**                  | la verdad editorial. Un hecho se edita aquí y en ningún otro sitio                                            |
| **la base**                     | la proyección de `content/` en PostgreSQL, no una segunda verdad                                              |
| **fixture**                     | un doble de desarrollo. Nunca es corpus                                                                       |
| **`procedural-interpretation`** | rótulo que marca una representación 3D como traducción visual, no como reconstrucción científica ni evidencia |

## Alcance

| Palabra                   | Qué es                                                                                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **cactáceas secundarias** | los parientes del pachanoi: _Echinopsis peruviana_, la antorcha boliviana _Echinopsis lageniformis_ / _Trichocereus bridgesii_, y los taxones con teorías que lo preceden o proceden |
| **hongos asociados**      | los que atacan al cactus o le causan pudrición. No micología en general                                                                                                              |

Lo que no colabora con el pachanoi, con las cactáceas emparentadas o con su
representación 3D no pertenece a este repositorio.
