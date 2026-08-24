# Importador iNaturalist

Importador API ejecutable y complementario a GBIF. Resuelve un taxón por nombre,
consulta una página acotada de observaciones y conserva cada observación, foto y
sonido como `source_record` independiente en estado `pending`.

Reglas importantes:

- la licencia de una foto o sonido nunca se hereda de la observación;
- no descarga multimedia: guarda la URI para que un editor evalúe el registro;
- una licencia ausente se normaliza a `all-rights-reserved`;
- sólo una observación con `geoprivacy=open` y `taxon_geoprivacy=open` puede
  recibir geometría pública redondeada;
- la proyección crea entidades restringidas y conserva el payload original,
  checksum, URL, fecha y atribución.

```powershell
$env:DATABASE_URL = "postgres://wachuma:wachuma-dev@localhost:55432/wachuma"
$env:INATURALIST_IMPORT_NAME = "Echinopsis pachanoi"
$env:INATURALIST_QUALITY_GRADE = "research"
$env:INATURALIST_OPEN_GEO_ONLY = "true"
pnpm --filter @wachuma/worker dev
```

El resultado requiere revisión posterior en `/admin/review`; no se publica de
forma automática.
