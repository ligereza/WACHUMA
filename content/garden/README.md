# Entrada de ejemplares del jardín

El jardín no se rellena con ejemplares inventados para aparentar una colección
real. Una entrada verdadera se incorpora mediante el endpoint protegido:

```text
POST /api/v1/admin/garden/intake/specimens
```

La entrada exige:

- identificador estable del ejemplar y entidad biológica relacionada;
- estado y visibilidad inicial no pública;
- `sourceRecordId` estable del registro de jardín;
- fecha de registro, licencia, atribución, versión del importador y payload
  original;
- fuente `source-wachuma-garden-ledger` o una fuente interna equivalente.

La operación crea en una transacción el ejemplar, el `source_record` y su
`record_provenance`. Repetir la misma entrada no duplica el ejemplar ni su
procedencia. La revisión posterior del source record puede publicar el
ejemplar únicamente cuando licencia, atribución y privacidad están confirmadas.

Los nombres de custodios, coordenadas exactas y notas privadas deben permanecer
en el payload restringido y nunca en los DTOs públicos. Para probar el flujo
existe una entrada sintética en el test de integración; no se presenta como
ejemplar real del jardín.
