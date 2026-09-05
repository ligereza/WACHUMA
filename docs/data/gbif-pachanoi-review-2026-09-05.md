# Revisión de ocurrencias GBIF de _Echinopsis pachanoi_

Fecha de consulta: 2026-09-05. La consulta viva de GBIF solicitó 20
ocurrencias para el nombre _Echinopsis pachanoi_ (`taxon_key=5622352`). El
snapshot reproducible está en `.local/gbif-snapshots/` y la importación dejó
20 observaciones y 8 medios en PostgreSQL. Todos siguen `pending` y
`restricted`; esta revisión no ejecuta una decisión editorial.

## Regla aplicada

La licencia se evalúa por ocurrencia y por medio, nunca se hereda del dataset.
Sólo `CC BY 4.0` pasa el filtro técnico de licencia potencialmente publicable;
incluso esos registros necesitan aceptación humana, atribución, privacidad y
calidad confirmadas. La geometría pública se redondea a dos decimales; la
coordenada original sólo queda en `source_records.raw_payload`. Cuando no hay
coordenadas, la observación no fabrica una geometría. Una observación de GBIF
es evidencia de presencia contemporánea o de un ejemplar depositado, no prueba
rango nativo ni abundancia.

## Ocurrencias, una por una

|                                                  ID GBIF | Fecha · base                      | País / lugar                  | Licencia del registro | Coordenada y precisión recibida                   | Resultado de revisión                                                                                           |
| -------------------------------------------------------: | --------------------------------- | ----------------------------- | --------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| [1851887029](https://www.gbif.org/occurrence/1851887029) | 2018-06-18 · `LIVING_SPECIMEN`    | BE · Meise Botanic Garden     | CC BY 4.0             | sin coordenadas                                   | Candidato a revisión humana; no publicar hasta confirmar la ficha del jardín y atribución.                      |
| [1851887040](https://www.gbif.org/occurrence/1851887040) | 2018-06-18 · `LIVING_SPECIMEN`    | BE · Meise Botanic Garden     | CC BY 4.0             | sin coordenadas                                   | Candidato a revisión humana; no publicar hasta confirmar la ficha del jardín y atribución.                      |
| [3997535429](https://www.gbif.org/occurrence/3997535429) | 2022-11-09 · `HUMAN_OBSERVATION`  | ES · Busot                    | CC BY-NC 4.0          | 38.480817, -0.421752; incertidumbre no declarada  | Mantener restringida: licencia no compatible con el filtro público; 2 medios CC BY-NC-ND 4.0 se revisan aparte. |
| [5902412599](https://www.gbif.org/occurrence/5902412599) | 2024-12-01 · `HUMAN_OBSERVATION`  | ES · Salobreña, Granada       | CC BY-NC 4.0          | 36.779253, -3.556380; incertidumbre no declarada  | Mantener restringida por licencia; 1 medio CC BY-NC-ND 4.0 separado.                                            |
| [5902518312](https://www.gbif.org/occurrence/5902518312) | 2024-12-01 · `HUMAN_OBSERVATION`  | ES · Salobreña, Granada       | CC BY-NC 4.0          | 36.779272, -3.556380; 9 m                         | Mantener restringida por licencia; 4 medios CC BY-NC-ND 4.0 separados.                                          |
| [3996103821](https://www.gbif.org/occurrence/3996103821) | 2018-11-22 · `HUMAN_OBSERVATION`  | ES · San Bartolomé, Lanzarote | CC BY-NC 4.0          | 28.955320, -13.577685; 10 m                       | Mantener restringida por licencia; 1 medio CC BY-NC-ND 4.0 separado.                                            |
| [4040708106](https://www.gbif.org/occurrence/4040708106) | 2018-11-10 · `HUMAN_OBSERVATION`  | ES · Serra d'Irta             | CC BY-NC 4.0          | 40.390000, 0.370000; 707 m                        | Mantener restringida por licencia; sólo geometría redondeada en eventual publicación.                           |
| [4040697402](https://www.gbif.org/occurrence/4040697402) | 2017-02-09 · `HUMAN_OBSERVATION`  | ES · Castellón                | CC BY-NC 4.0          | 40.430000, 0.410000; 707 m                        | Mantener restringida por licencia; sólo geometría redondeada en eventual publicación.                           |
| [4041022277](https://www.gbif.org/occurrence/4041022277) | 2017-02-09 · `HUMAN_OBSERVATION`  | ES · Basseta del Bovalar      | CC BY-NC 4.0          | 40.450000, 0.390000; 707 m                        | Mantener restringida por licencia; sólo geometría redondeada en eventual publicación.                           |
| [4041010608](https://www.gbif.org/occurrence/4041010608) | 2017-03-14 · `HUMAN_OBSERVATION`  | ES · Rambla de Cervera        | CC BY-NC 4.0          | 40.430000, 0.420000; 707 m                        | Mantener restringida por licencia; sólo geometría redondeada en eventual publicación.                           |
| [4041094250](https://www.gbif.org/occurrence/4041094250) | 2017-04-07 · `HUMAN_OBSERVATION`  | ES · Rambla de Cervera        | CC BY-NC 4.0          | 40.440000, 0.400000; 707 m                        | Mantener restringida por licencia; sólo geometría redondeada en eventual publicación.                           |
| [4040955211](https://www.gbif.org/occurrence/4040955211) | 2017-11-01 · `HUMAN_OBSERVATION`  | ES · Barranc de Pàndols       | CC BY-NC 4.0          | 40.450000, 0.390000; 707 m                        | Mantener restringida por licencia; sólo geometría redondeada en eventual publicación.                           |
| [4067892476](https://www.gbif.org/occurrence/4067892476) | 2016-09-27 · `PRESERVED_SPECIMEN` | EC · Loja, Barrio Época       | CC BY-NC 4.0          | -4.011110, -79.217500; incertidumbre no declarada | Mantener restringida por licencia; ejemplar de colección con titular UTPL.                                      |
| [4040698850](https://www.gbif.org/occurrence/4040698850) | 2015-04-11 · `HUMAN_OBSERVATION`  | ES · Barranc d'Aiguaoliva     | CC BY-NC 4.0          | 40.450000, 0.440000; 707 m                        | Mantener restringida por licencia; sólo geometría redondeada en eventual publicación.                           |
| [4529014280](https://www.gbif.org/occurrence/4529014280) | 2015-04-11 · `PRESERVED_SPECIMEN` | ES · Baix Maestrat, Benicarló | CC BY-NC 4.0          | 40.487873, 0.463232; incertidumbre no declarada   | Mantener restringida por licencia; titular Generalitat de Catalunya.                                            |
| [4529014281](https://www.gbif.org/occurrence/4529014281) | 2015-11-10 · `OCCURRENCE`         | ES · Baix Ebre, Tortosa       | CC BY-NC 4.0          | 40.757871, 0.452990; incertidumbre no declarada   | Mantener restringida por licencia; titular Generalitat de Catalunya.                                            |
| [4040721665](https://www.gbif.org/occurrence/4040721665) | 2014-01-27 · `HUMAN_OBSERVATION`  | ES · La Cañada, Valencia      | CC BY-NC 4.0          | 39.530000, -0.480000; 707 m                       | Mantener restringida por licencia; sólo geometría redondeada en eventual publicación.                           |
| [4067900115](https://www.gbif.org/occurrence/4067900115) | 2014-02-18 · `PRESERVED_SPECIMEN` | EC · Loja, Ciudadela Época    | CC BY-NC 4.0          | -4.009881, -79.209692; incertidumbre no declarada | Mantener restringida por licencia; ejemplar de colección con titular UTPL.                                      |
| [4041000362](https://www.gbif.org/occurrence/4041000362) | 2013-08-08 · `HUMAN_OBSERVATION`  | ES · Valencia                 | CC BY-NC 4.0          | 39.270000, -0.610000; 707 m                       | Mantener restringida por licencia; sólo geometría redondeada en eventual publicación.                           |
| [4041047563](https://www.gbif.org/occurrence/4041047563) | 2013-08-08 · `HUMAN_OBSERVATION`  | ES · Valencia                 | CC BY-NC 4.0          | 39.540000, -0.430000; 707 m                       | Mantener restringida por licencia; sólo geometría redondeada en eventual publicación.                           |

> Nota: las dos ocurrencias de Meise (`1851887029`, `1851887040`) aparecen una
> vez cada una en el snapshot y en la tabla. El orden de la
> tabla conserva la identificación por registro y no implica que una fuente
> sea más confiable que otra.

## Medios asociados

Los ocho medios provienen de `observation.org` y declaran `CC BY-NC-ND 4.0`:

- `5902412599`: `109261547.jpg` (Pacdiaz).
- `5902518312`: `109272466.jpg`, `109272467.jpg`, `109272468.jpg` y
  `109272469.jpg` (Pacdiaz).
- `3997535429`: `60862160.jpg` y `61161124.jpg` (Mieke).
- `3996103821`: `19204767.jpg` (Erik Toorman).

Cada medio tiene su propio `source_record_id`, titular/creador y licencia; no
se muestra en la superficie pública mientras siga pendiente. No se descargaron
ni se incorporaron bytes de las imágenes.

## Estado operativo

La compuerta `pnpm quality:gbif-pachanoi` comprueba para cada fila importada que
la observación y el medio estén pendientes/restringidos, que la licencia exista,
que la geometría pública sea la versión redondeada y que el medio conserve una
procedencia separada. Una corrida limpia sin observaciones devuelve cero filas;
la corrida local del 5 de septiembre devuelve 20 observaciones, 8 medios y dos
candidatos `CC BY 4.0`, sin publicación automática.
