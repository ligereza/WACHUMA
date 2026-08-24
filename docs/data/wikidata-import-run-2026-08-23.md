# Ejecución de importación Wikidata — 2026-08-23

## Alcance

Se ejecutó el worker contra la API oficial para el ítem `Q133426`, asociado en
Wikidata a _Echinopsis pachanoi_. Se usó el QID explícito para evitar que una
búsqueda ambigua decidiera por sí sola la identidad taxonómica.

La integración solo selecciona claims estructurados: nombre científico (`P225`),
rango (`P105`), estado (`P141`), padre (`P171`), instancia (`P31`) y los
identificadores externos configurados. No persiste etiquetas, descripciones,
nombres vernáculos (`P1843`) ni multimedia (`P18`).

## Resultado persistido

| Campo             | Valor                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------- |
| Provider          | `wikidata`                                                                               |
| Source record     | `item:Q133426`                                                                           |
| Taxón enlazado    | `taxon-echinopsis-pachanoi`                                                              |
| Entidad enlazada  | `biological-entity-echinopsis-pachanoi`                                                  |
| Identificadores   | `wikidata:Q133426`, `inaturalist:327669`, `ncbi:1001097`, `gbif:5622352`, `ipni:88444-2` |
| Estado            | `pending`                                                                                |
| Claims publicados | ninguno; permanecen en `source_records.raw_payload`                                      |

El proyector encontró el taxón editorial existente por nombre científico y no
creó una segunda fila. Cada identificador quedó como entidad externa con una
fila propia de `record_provenance`, por lo que puede revisarse sin convertir
automáticamente el enlace en una afirmación taxonómica aceptada.

## Licencia y acceso

La documentación oficial de [licenciamiento de Wikidata](https://www.wikidata.org/wiki/Wikidata:Licensing)
indica que los datos estructurados de los namespaces principales, de
propiedades y lexemas se ofrecen bajo CC0. La consulta siguió las
[recomendaciones oficiales de acceso a datos](https://www.wikidata.org/wiki/Help:Data_access),
incluyendo `User-Agent`, compresión declarada y `maxlag`.

La licencia CC0 del dato estructurado no resuelve por sí sola la exactitud
taxonómica ni la licencia de recursos enlazados. Por eso el registro y sus
identificadores continúan pendientes de revisión editorial.
