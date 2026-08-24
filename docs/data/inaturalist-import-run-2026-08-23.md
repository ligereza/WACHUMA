# Ejecución iNaturalist · 2026-08-23

Se ejecutó una importación real local mediante el worker, separada del seed
editorial. El objetivo fue probar el recorrido completo API → `source_records`
→ proyección PostgreSQL, no publicar automáticamente observaciones o medios.

## Consultas ejecutadas

```powershell
$env:DATABASE_URL = "postgres://wachuma:wachuma-dev@localhost:55432/wachuma"
$env:INATURALIST_IMPORT_NAME = "Echinopsis pachanoi"
$env:INATURALIST_PER_PAGE = "5"
$env:INATURALIST_QUALITY_GRADE = "research"
node apps/worker/dist/index.js
```

La consulta devolvió el taxón de iNaturalist `829212`, denominado
`Trichocereus macrogonus pachanoi` y rank `variety`. WACHUMA lo conservó como
identificador externo propio; no lo convirtió silenciosamente en una
equivalencia absoluta de `Echinopsis pachanoi`.

Una primera consulta con `geoprivacy=open`, `taxon_geoprivacy=open` y filtros de
licencia de media devolvió cero observaciones. Al retirar esos filtros de la
consulta —sin relajar la regla de proyección— se persistieron:

- 5 observaciones iNaturalist;
- 9 medios asociados;
- todos los `source_records` en estado `pending`;
- todas las observaciones y multimedia como `restricted`;
- las coordenadas sólo se proyectan si ambas banderas de privacidad son
  explícitamente `open`, y se redondean a dos decimales.

También se ejecutó una prueba real de una observación de
`Pleurotus ostreatus` (`taxon 1196165`): 1 observación y 1 foto, ambas
restringidas, enlazadas al taxón editorial local mediante el identificador
externo iNaturalist.

Estado persistido del proveedor después de ambas ejecuciones:

```text
source_records: 22
pending: 22
accepted: 0
observations: 6
media: 10
```

## Política aplicada

iNaturalist declara que observaciones, imágenes y sonidos pueden tener licencias
separadas; el importador conserva cada una por separado y no descarga archivos.
La revisión editorial debe confirmar licencia, atribución, privacidad y alcance
antes de publicar. La referencia operativa es la [política de licencias de
iNaturalist](https://help.inaturalist.org/en/support/solutions/articles/151000175695).

La revisión se realiza en `/admin/review`; una licencia compatible no basta por
sí sola para publicar. El payload exacto, la URL, fecha de recuperación,
atribución y checksum permanecen en `source_records`.
