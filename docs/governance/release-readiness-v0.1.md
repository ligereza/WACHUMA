# Preparación de release de contenido v0.1

Estado operativo actual: `not-ready-for-broad-public-release`.

Este documento separa los gates técnicos automatizados de las decisiones que
requieren responsabilidad editorial, comunitaria y jurídica. No constituye
asesoría legal ni aprobación para publicar datos de terceros.

## Gates automatizados

- `pnpm verify:release` ejecuta typecheck, tests, builds, contenido,
  migraciones, PostgreSQL/PostGIS, smoke web, formato y el adaptador procedural.
- `pnpm quality:sbom` genera un SBOM CycloneDX 1.5 desde el lockfile con pnpm y
  verifica que `pnpm licenses list` no deje expresiones sin resolver. Los
  artefactos quedan en `.local/release/` y no se versionan.
- `pnpm quality:release-policy` verifica que esta política y la de revisión y
  takedown sigan presentes antes de una release.
- El workflow de GitHub Actions ejecuta el mismo gate contra PostGIS efímero y
  conserva el SBOM como artefacto de la corrida.

## Reglas de publicación

1. El código original conserva MIT y el contenido editorial original conserva
   CC BY 4.0. Los datos, textos, imágenes y sonidos de terceros conservan su
   licencia de origen y su atribución individual.
2. Una importación solo puede pasar de `staged` a `published` después de
   verificar fuente, `sourceRecordId`, URL, fecha de recuperación, licencia,
   atribución, checksum y alcance de uso.
3. `restricted`, `sensitive` y `community-controlled` quedan fuera de la API
   pública por defecto. Esto incluye ubicaciones exactas de ejemplares,
   especies amenazadas y sitios culturales sensibles.
4. Una relación cultural requiere fuente, comunidad o contexto relacionado,
   perspectiva autoral, fecha o periodo, territorio, licencia o restricción,
   nivel de evidencia y estado de revisión. No se convierte un nombre local en
   sinónimo taxonómico sin evidencia explícita.
5. Las exportaciones públicas deben aplicar la misma política de visibilidad
   que la API. No se permite reconstruir un registro sensible a partir de
   geometrías, medios, identificadores o payloads brutos.

La revisión cultural se opera en `/admin/culture`, separada de la bandeja de
source records. La acción de publicación exige una decisión explícita de
contexto público; guardar una relación en revisión o retirarla no la hace
visible por accidente.

## Gates manuales antes de una publicación amplia

- [x] Se definieron MIT + CC BY 4.0 como licencias base, con excepciones por
      registro.
- [x] Existe procedimiento de corrección, revisión y takedown con historial.
- [x] El último workflow observado en `main` terminó correctamente; la
      evidencia está en `docs/quality/ci-evidence-2026-08-23.md`.
- [ ] Aprobación legal, con asesoría jurídica, de la combinación de CC BY-NC,
      CC BY-SA, datos comunitarios, exportaciones y medios individuales.
- [ ] Revisión comunitaria o autorización documentada para cada relación que
      describa conocimiento comunitario o sensible.
- [ ] Revisión final de atribuciones y alcance de cada medio externo.
- [ ] Decisión editorial sobre cualquier geometría aproximada que pueda
      facilitar la reidentificación de un sitio o ejemplar.

Mientras exista una casilla manual pendiente, el estado no puede cambiar a
`ready-for-broad-public-release`. Si una fuente, comunidad o titular solicita
corrección o retiro, se congela la publicación, se registra la decisión y se
ejecuta el procedimiento de
[`review-and-takedown.md`](./review-and-takedown.md).

## Rollback y corrección

Una release se revierte si falla un gate, aparece una licencia incompatible,
se detecta una filtración de sensibilidad o una atribución no verificable. El
rollback debe retirar la proyección pública y mantener el registro de
procedencia y el historial interno salvo que una obligación legal o comunitaria
exija otra retención. La corrección se publica como una nueva revisión, nunca
sobrescribiendo silenciosamente el payload original.
