# Corpus público reproducible v0.2

El seed de WACHUMA tiene dos perfiles explícitos:

- `WACHUMA_SEED_PROFILE=public` (por defecto): publica entidades biológicas,
  claims taxonómicos con procedencia, manuales de cultivo publicados y
  observaciones externas que ya pasaron revisión. No publica ejemplares,
  observaciones, ubicaciones, escenas, guías archivadas ni relaciones draft de
  demostración.
- `WACHUMA_SEED_PROFILE=verification`: añade fixtures sintéticos para las
  pruebas de API, privacidad, linaje, procedencia y escenas 3D. Este perfil no
  se usa para el corpus local que consume la web pública.

La separación se verifica con `pnpm quality:public-corpus`. La compuerta busca
registros públicos marcados como `demo`, `fixture` o sintéticos en ejemplares,
observaciones, lugares, claims, guías, cultura, medios, escenas y recetas.

El corte público actual contiene tres entidades biológicas, tres manuales
publicados y tres estudios materiales procedurales, uno por entidad. Estos
estudios son registros editoriales públicos con `scientificReconstruction=false`;
sus parámetros PBR no son datos químicos y sus capas de química permanecen
vacías hasta enlazar claims y fuentes de ensayos. La ficha de _Echinopsis pachanoi_ conserva _Trichocereus pachanoi_
como interpretación editorial de contexto taxonómico, con GBIF como fuente
trazada. Los nombres culturales sin una fuente y contexto específicos no se
publican; la relación `San Pedro` permanece restringida y bajo revisión.

Las imágenes no son requisito del corpus: la observación GBIF de _Opuntia
ficus-indica_ conserva una media externa atribuida porque su registro fue
revisado individualmente, mientras que la representación procedural 3D se
mantiene como escena artística separada y no como medio taxonómico. El GLB de
verificación y los ejemplares del jardín siguen restringidos; el estudio
material no los presenta como observaciones de organismos concretos.
