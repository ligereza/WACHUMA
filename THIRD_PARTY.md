# Third-party notices

WACHUMA no incluye datasets externos completos, fotografías ni imágenes de
terceros en el repositorio. El seed contiene pequeños snapshots de metadatos taxonómicos
atribuidos de POWO/Kew y GBIF para demostrar procedencia; mantienen su URL,
fecha, licencia y atribución y no sustituyen una sincronización completa.
Los artefactos que se incorporen en una release deben conservar su licencia y
atribución individual.

## Dependencias de ejecución principales

| Paquete                                    | Uso                                | Licencia esperada |
| ------------------------------------------ | ---------------------------------- | ----------------- |
| Next.js                                    | Web                                | MIT               |
| React / React DOM                          | Interfaz                           | MIT               |
| Fastify                                    | API                                | MIT               |
| `@fastify/swagger` / `@fastify/swagger-ui` | OpenAPI                            | MIT               |
| `postgres`                                 | PostgreSQL                         | MIT               |
| `zod`                                      | Validación                         | MIT               |
| `yaml`                                     | Carga de OpenAPI                   | ISC               |
| `pg-boss`                                  | Cola durable del worker PostgreSQL | MIT               |
| Three.js                                   | Render 3D                          | MIT               |
| React Three Fiber / Drei                   | Integración 3D                     | MIT               |
| glTF Validator                             | Validación de assets               | Apache-2.0        |

La matriz ampliada, las referencias estudiadas y las reglas para datasets están
en [`docs/architecture/license-matrix.md`](docs/architecture/license-matrix.md).

## Fuentes externas

Los importadores GBIF, iNaturalist y Wikidata conservan `sourceRecordId`, URL, fecha de
recuperación, licencia, atribución, payload bruto y checksum. No se asume una
licencia única para ocurrencias, datasets, imágenes o sonidos. En iNaturalist
la observación y cada foto/sonido tienen licencias separadas; los registros sin
licencia quedan restringidos y no se descargan. Wikidata, FungalTraits,
POWO/IPNI, RHS y conocimiento comunitario requieren revisión propia antes de
publicar. Wikidata ya cuenta con un adaptador de claims estructurados y staging
de identificadores, pero sus source records siguen pendientes. FungalTraits cuenta
con un parser de snapshots en staging; todavía no se redistribuyen sus filas
ni se publican traits hasta resolver la licencia del release exacto y sus
estudios de origen.

La guía experimental de _Pleurotus ostreatus_ se basa en De Bonis, Pecchia y
Nicoletto (2026), artículo abierto de Frontiers in Horticulture bajo CC BY 4.0.
WACHUMA conserva metadata, DOI, atribución y paráfrasis estructurada; no
redistribuye tablas, figuras ni el artículo completo, y marca explícitamente el
contexto experimental de sus condiciones.

Para GBIF, las licencias y atribuciones se revisan por registro y por medio;
la documentación operativa de referencia es [Data use](https://techdocs.gbif.org/en/data-use/)
y [Multimedia publishing](https://techdocs.gbif.org/en/data-publishing/multimedia-publishing).

El corpus conserva metadata y una paráfrasis acotada del artículo abierto de
Armijos, Cota y González sobre yachakkuna Saraguro, con DOI
`10.1186/1746-4269-10-26` y licencia CC BY 2.0. No se redistribuye el artículo,
sus tablas ni una representación de conocimiento comunitario como si fuera
una voz autorizada; la relación asociada permanece restringida y bajo revisión.
