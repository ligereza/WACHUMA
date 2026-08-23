# Revisión comunitaria y takedown

Esta política forma parte del modelo de publicación de WACHUMA. Una relación
cultural no se publica solo porque exista en una importación, un borrador o una
fuente secundaria: debe conservar procedencia, perspectiva, licencia y estado
de revisión.

## Estados de publicación

- `draft`: propuesta interna; no se publica.
- `under-review`: en revisión editorial y, cuando corresponda, comunitaria; no
  se publica.
- `accepted`: puede publicarse únicamente si `accessLevel = public`,
  `sensitivity = normal`, tiene fuente, licencia, comunidad cuando aplique y
  perspectiva documentada.
- `rejected`: no se publica y conserva el motivo de revisión en el registro
  interno.

La API pública aplica estas condiciones en la consulta, no solo en la interfaz.
Un cambio accidental de la UI no puede convertir un registro restringido en
contenido público.

## Solicitud de revisión o retiro

Una comunidad, persona documentadora o titular de derechos puede solicitar:

1. corrección de atribución, contexto o traducción;
2. restricción de acceso;
3. retiro temporal durante una revisión;
4. retiro permanente de la publicación pública.

La solicitud debe identificar el registro, explicar el motivo y, si es posible,
indicar la comunidad, fuente o derecho afectado. No se exige publicar la
identidad de quien solicita el retiro.

## Respuesta operativa

El equipo editorial debe congelar la publicación del registro mientras evalúa
una solicitud razonable, registrar la decisión y conservar el historial de
cambios. Un retiro público no elimina automáticamente el registro de
procedencia: reemplaza su exposición por un estado restringido y un aviso
mínimo, salvo que exista una obligación legal o una instrucción comunitaria que
requiera otra retención.

Las ubicaciones exactas, sitios ceremoniales, especies amenazadas y datos
marcados `sensitive` o `community-controlled` se mantienen fuera de la API
pública por defecto. La publicación de una aproximación geográfica requiere una
decisión editorial explícita y no debe permitir reconstruir el dato exacto.

## Revisión humana

Los gates automatizados verifican estructura, procedencia, licencia, privacidad
y consistencia. No sustituyen el consentimiento, la revisión comunitaria ni la
interpretación histórica. Los casos ambiguos se mantienen restringidos hasta
que una persona responsable documente la decisión.
