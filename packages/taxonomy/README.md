# `@wachuma/taxonomy`

Dominio de `Taxon`, nombres, sinónimos e identificadores externos. No duplica
la taxonomía de proveedores; conserva enlaces y snapshots seleccionados.

# `@wachuma/taxonomy`

Contratos y fixture editorial del explorador taxonómico. El fixture de
`Echinopsis pachanoi` es deliberadamente conservador: no inventa
identificadores GBIF ni distribución; los nombres `wachuma`, `huachuma` y
`San Pedro` aparecen como relaciones culturales contextualizadas, con fuente y
revisión `draft`.

La fuente canónica editable vive en
`content/species/echinopsis-pachanoi.json`; el test del paquete/API debe
mantener el fixture ejecutable alineado con ese contenido.
