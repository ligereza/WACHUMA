# Esquema de procedencia

La procedencia tiene dos niveles:

1. `Source` describe la obra, dataset, comunidad, observación o proveedor.
2. `SourceRecord` describe el registro exacto recuperado en una fecha y
   `RecordProvenance` lo enlaza con una entidad local.

Esto permite corregir o reimportar un registro sin perder el snapshot anterior.

Una observación contemporánea, un evento de cultivo y una recomendación de una
guía son registros distintos. Compartir una especie o un ejemplar no autoriza
a mezclar sus afirmaciones: el tipo de assertion y el timestamp deben viajar
con cada fila o claim.

En el dominio, `Culture` significa material biológico cultivado (por ejemplo,
agar, cultivo líquido o spawn) y `Community` significa el colectivo o contexto
cultural relacionado. Una `CulturalRelation` puede referenciar uno u otro como
contexto, pero nunca los trata como equivalentes. También conserva, cuando
corresponde, un `HistoricalPeriod` y un `documentedByAgent` identificables.

## Campos mínimos para cada import

| Campo             | Obligatorio              | Uso                                                      |
| ----------------- | ------------------------ | -------------------------------------------------------- |
| `source`          | Sí                       | ID estable de `DataSource`/`Source`                      |
| `sourceRecordId`  | Sí                       | Identificador del proveedor (`gbifID`, `taxon_id`, etc.) |
| `sourceUrl`       | Sí cuando exista         | URL canónica del registro                                |
| `retrievedAt`     | Sí                       | Timestamp UTC de recuperación                            |
| `license`         | Sí o `unknown` explícito | URI de licencia del registro/dataset/medio               |
| `attribution`     | Sí                       | Texto listo para mostrar y citar                         |
| `rawPayload`      | Sí para imports          | JSON original o referencia a objeto inmutable            |
| `rawChecksum`     | Recomendado              | Hash del payload para reproducibilidad                   |
| `importerVersion` | Sí                       | Versión del adaptador que normalizó el registro          |

## Tipos de afirmación

Cada afirmación técnica, cultural o histórica debe poder etiquetarse como una
de estas clases:

- `taxonomic_fact`: hecho/decisión taxonómica de una fuente.
- `contemporary_observation`: observación fechada y localizada.
- `historical_source`: relato o fuente histórica, sin convertirlo en hecho actual.
- `archaeological_evidence`: evidencia material arqueológica.
- `academic_publication`: afirmación respaldada por publicación académica.
- `community_knowledge`: conocimiento aportado/documentado por una comunidad.
- `editorial_interpretation`: síntesis editorial explícita, nunca presentada
  como fuente primaria.

## Ejemplo de registro importado

```json
{
  "recordId": "01J8WACHUMA00000000000001",
  "entityType": "taxon",
  "entityId": "01J8WACHUMA00000000000002",
  "source": "gbif",
  "sourceRecordId": "2435706",
  "sourceUrl": "https://www.gbif.org/species/2435706",
  "retrievedAt": "2026-08-21T14:30:00Z",
  "license": "https://creativecommons.org/publicdomain/zero/1.0/",
  "attribution": "GBIF Backbone Taxonomy, accessed 2026-08-21",
  "assertionType": "taxonomic_fact",
  "rawPayload": {
    "key": 2435706,
    "scientificName": "Echinopsis pachanoi"
  },
  "rawChecksum": "sha256:replace-with-real-hash",
  "importerVersion": "gbif-v0.1.0",
  "status": "accepted"
}
```

## Reglas de publicación

| Estado                 | API pública                    | Mapa                            | Exportación                |
| ---------------------- | ------------------------------ | ------------------------------- | -------------------------- |
| `public`               | Sí, con atribución             | Geometría pública               | Sí                         |
| `restricted`           | Solo resumen autorizado        | Región o sin geometría          | Solo roles autorizados     |
| `sensitive`            | No por defecto                 | No exacta; redondeada u omitida | No por defecto             |
| `community-controlled` | Solo tras revisión comunitaria | Según acuerdo de la comunidad   | Según licencia/restricción |

La API aplica el filtro de visibilidad antes de serializar. No se confía en que
el frontend o el mapa oculten coordenadas exactas.
