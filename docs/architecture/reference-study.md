# Estudio de referencias

Fecha de revisión: 2026-08-21.

Este documento separa tres cosas: ideas de producto que se pueden estudiar,
interfaces o estándares que se pueden implementar de forma independiente, y
código/datos que no se incorporan sin una revisión específica.

## Síntesis por proyecto

| Referencia                                                                    | Qué se adopta como inspiración                                                                                   | Límite de reutilización                                                                                                                                                        |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [WACHUMA](https://github.com/ligereza/WACHUMA)                                | Punto de partida del producto: base pública de plantas y remedios naturales.                                     | El repositorio visible contiene README y no declara una licencia. No copiar contenido ni código de terceros desde allí.                                                        |
| [HortusFox](https://github.com/danielbrendel/hortusfox-web)                   | Jardín por ubicaciones, ejemplares, fotografías, eventos, inventario, calendario, API y QR.                      | La implementación es independiente; el repositorio declara MIT.                                                                                                                |
| [WOLS](https://github.com/wemush/open-standard)                               | Identificador estable, versión de etiqueta, material, generación, origen, linaje, etapa, QR, privacidad y firma. | Implementar el concepto de manera independiente; la especificación/documentación declara CC BY 4.0 y los ejemplos/bibliotecas de referencia Apache-2.0.                        |
| [Cultivare](https://github.com/cultivare/cultivare)                           | Strains, culturas, genealogía, barcodes y seguimiento de cultivo.                                                | El árbol visible no incluye LICENSE. Se estudia la función, no se copia código, esquema ni contenido.                                                                          |
| [OpenFarm](https://github.com/openfarmcc/openfarm)                            | Growing Guides como conocimiento estructurado para cultivar.                                                     | Está archivado desde el 2025-04-22; no será backend. Código MIT y datos CC0 según su README, pero no se importará contenido automáticamente.                                   |
| [farmOS](https://github.com/farmOS/farmOS)                                    | Assets, locations, logs, observations y actividades como vocabulario operativo.                                  | El repositorio declara GPL-2.0. Solo se adopta el modelo conceptual; no se integra código en el MVP.                                                                           |
| [Arches](https://github.com/archesproject/arches)                             | Patrimonio cultural, lugares, periodos, fuentes y datos geoespaciales.                                           | Declara AGPL-3.0. No se incorpora código ni módulos; se implementa un modelo propio y compatible con exportaciones.                                                            |
| [Wikibase Suite](https://github.com/wmde/wikibase-release-pipeline)           | Posible destino futuro para knowledge graph y Linked Open Data.                                                  | El repositorio de la suite declara BSD-3-Clause; sus componentes empaquetados mantienen licencias propias. En el MVP solo se reserva una capa de IRIs/exportación.             |
| [Enveda Ethnobotany](https://github.com/enveda/ethnobotany)                   | Normalización de relaciones planta–región–uso–fuente y exigencia de reproducibilidad.                            | El repositorio declara GPL-2.0 y reúne recursos externos con licencias independientes. No se importan datasets; cada fuente debe revisarse individualmente.                    |
| [pygbif](https://github.com/gbif/pygbif)                                      | Cliente de referencia para GBIF.                                                                                 | El cliente declara MIT; esa licencia no cubre los datos servidos por GBIF. Cada dataset/ocurrencia conserva licencia y citación propias.                                       |
| [iNaturalist Open Data](https://github.com/inaturalist/inaturalist-open-data) | Observaciones, taxones, observadores y medios como snapshots externos.                                           | La licencia se resuelve por registro. Observaciones e imágenes pueden tener CC0, CC BY, CC BY-NC, otras licencias o “all rights reserved”; nunca se asume una licencia global. |
| [FungalTraits](https://github.com/traitecoevo/fungaltraits)                   | Traits ecológicos/funcionales, metadatos, versión de release, DOI y citación.                                    | El paquete declara MIT + archivo LICENSE; las mediciones tienen fuentes y metadatos propios. Se importarán solo con snapshot, DOI, cita y licencia verificadas.                |
| [Mycodo](https://github.com/kizniche/Mycodo)                                  | Integración futura de sensores, eventos ambientales y automatización.                                            | Declara GPL-3.0. Queda fuera del MVP y no se copia código.                                                                                                                     |

## Decisiones derivadas

- WACHUMA tendrá una capa de `Source` y `SourceRecord` incluso para datos que
  parezcan “públicos”. La visibilidad pública no elimina la obligación de
  atribuir.
- Los imports externos son snapshots reproducibles y no una copia silenciosa
  de bases externas.
- El MVP evita una dependencia de Arches, farmOS, Wikibase, OpenFarm o Mycodo.
- La futura interoperabilidad se hará por API, Darwin Core, JSON-LD, CSV/JSON y
  enlaces persistentes, no por copiar sus tablas internas.

El research complementario compartido añadió decisiones de producto sobre
observaciones frente a recomendaciones, identidad genética frente a material,
incertidumbre explícita, herbario, offline-first y el backlog de IA. Se
conservan en [decisiones derivadas del research](research-derived-decisions.md)
sin incorporar código ni datasets externos.

## Referencias operativas de datos

- [GBIF Terms of Use](https://www.gbif.org/terms): los datasets usan CC0, CC BY
  o CC BY-NC y la atribución/citación debe conservarse.
- [GBIF Citation Guidelines](https://www.gbif.org/citation-guidelines): se
  conserva DOI de descarga o cita de dataset cuando exista.
- [iNaturalist licenses](https://help.inaturalist.org/en/support/solutions/articles/151000175695):
  cada observación, foto y sonido tiene licencia propia o puede quedar sin
  licencia.
- [Wikidata licensing](https://www.wikidata.org/wiki/Wikidata:Licensing): los
  datos estructurados están bajo CC0; el texto de otros namespaces puede tener
  CC BY-SA 4.0.
- [Kew Terms of Use](https://www.kew.org/science/collections-and-resources/data-and-digital/terms-of-use):
  se revisa la licencia del dataset y de cada multimedia de POWO/IPNI.
- [GeoNames license](https://www.geonames.org/export/): datos bajo CC BY con
  atribución.
