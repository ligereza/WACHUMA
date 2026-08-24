# Importador Wikidata

El importador usa la API oficial de Wikidata para buscar o recuperar un ítem,
pero persiste únicamente claims estructurados seleccionados e identificadores
externos. No copia etiquetas, descripciones, nombres vernáculos ni multimedia.

Los datos estructurados de Wikidata se registran como CC0 con fecha de
recuperación; cada registro queda `pending` hasta revisión taxonómica y de
procedencia. El texto de otros namespaces puede tener condiciones distintas y
queda deliberadamente fuera de este adaptador.

La API se consulta con `User-Agent`, compresión declarada y `maxlag` para
respetar las recomendaciones de acceso de Wikidata.
