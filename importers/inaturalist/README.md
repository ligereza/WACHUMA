# Importador iNaturalist

Complementario y posterior al importador GBIF. La licencia se evalúa por
observación y por media; no se descargan imágenes `all rights reserved`.
Implementa el contrato `inaturalist` de `@wachuma/shared`: cada registro nace
como `pending`, conserva URL, timestamp, licencia, atribución y payload, y una
foto/sonido no hereda la licencia de la observación.
