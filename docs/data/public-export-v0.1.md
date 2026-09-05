# Exportación pública v0.1

La exportación pública se genera desde PostgreSQL, no desde fixtures ni desde
la interfaz. El comando reproducible es:

```bash
pnpm export:public
```

Escribe en `dist/public-export/` un Darwin Core Archive (`public-corpus.dwca.zip`),
un `ro-crate-metadata.json` y un `manifest.json`. La ruta se puede cambiar con
`WACHUMA_PUBLIC_EXPORT_DIR`. El paquete Darwin Core contiene un core `taxon` y
extensiones para ocurrencias, claims, manuales, claims de manual y fuentes.
Cada fila lleva el identificador público, la fuente, la licencia y la
atribución que justifican su presencia.

## Política de publicación

Sólo entran entidades públicas y claims aceptados con una fuente resoluble. Los
manuales deben estar publicados. Las observaciones necesitan procedencia
aceptada y sólo usan `geometry_public`; la geometría exacta, ejemplares,
ubicaciones y entidades restringidas quedan fuera. La licencia de un registro
no se hereda desde su dataset ni desde otro registro.

## Reversibilidad comprobada

`pnpm quality:public-export` genera dos veces el artefacto y compara sus bytes,
valida el ZIP con `unzip`, comprueba `meta.xml`, contrasta fuentes/licencias y
atribuciones de todas las filas, verifica que los identificadores reaparezcan
en el grafo RO-Crate y busca todos los identificadores actualmente restringidos
en la salida. También comprueba que no se serialice `geometry_exact`.

El hash SHA-256 del corpus canónico y de cada artefacto queda en el manifiesto.
El hash es reproducible mientras no cambie la proyección pública o la versión
del exportador. El exportador no pretende ser un snapshot de source records
pendientes ni publicar automáticamente observaciones: esas decisiones siguen
siendo humanas.
