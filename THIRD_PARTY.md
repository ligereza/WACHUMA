# Third-party notices

WACHUMA no incluye datasets externos ni imágenes de terceros en el fixture
inicial. Los artefactos que se incorporen en una release deben conservar su
licencia y atribución individual.

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

El importador GBIF conserva `sourceRecordId`, URL, fecha de recuperación,
licencia, atribución, payload bruto y checksum. No se asume una licencia única
para ocurrencias, datasets, imágenes o sonidos. iNaturalist, Wikidata,
FungalTraits, POWO/IPNI y conocimiento comunitario requieren adaptadores y
revisión propios antes de añadir archivos al repositorio.

Para GBIF, las licencias y atribuciones se revisan por registro y por medio;
la documentación operativa de referencia es [Data use](https://techdocs.gbif.org/en/data-use/)
y [Multimedia publishing](https://techdocs.gbif.org/en/data-publishing/multimedia-publishing).
