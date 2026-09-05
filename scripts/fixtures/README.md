# Fixtures de compatibilidad

`legacy-eff8048.sql` es una instantánea de datos del seed que existía en el
commit `eff8048`, antes de la migración de alcance `0024`. Se materializó una
sola vez con `pg_dump --data-only --inserts --column-inserts` después de aplicar
las migraciones `0001`–`0023` y ejecutar el seed histórico. El arnés
`scripts/test-legacy-db.mjs` carga esta copia en un esquema temporal, ejecuta el
seed actual y aplica `0024`.

El fixture está versionado para que CI no dependa de que el clon tenga el objeto
Git histórico. `__LEGACY_SCHEMA__` es un marcador reemplazado por el nombre del
esquema temporal durante la prueba; las líneas de control de `pg_dump` se
ignoran al cargarlo con el cliente SQL.
