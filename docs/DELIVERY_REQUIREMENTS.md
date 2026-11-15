# Revisión de documentación y entrega — NASA Space Apps 2026

> Contexto aportado por el equipo en `Revision_Documentacion_NASA_Space_Apps_2026.md`, conservado a continuación. Describe la revisión de main tras PR #2; no es una orden de ampliar el hito actual. Para el estado actualizado, consultar [README](../README.md), [fuentes](references/README.md) y [declaración de IA](AI_DISCLOSURE.md).
>
> En `feat/panel-personal` se incorpora la relación fuente → función para Risks y Hazards, una declaración de IA, escenarios sintéticos con procedencia y la excepción de idioma en AGENTS.md. La entrega final, licencia, acceso público y revisión humana siguen pendientes. Las aclaraciones #1849 y #1858 se consultaron; las páginas global y legal devolvieron 502 en esta comprobación. La hora local de las 11:00, el inglés/subtitulado y las fotografías descritas proceden de esta revisión aportada: deben confirmarse con la sede y no se verificaron aquí de forma independiente. El estado histórico «dashboard/simulados pendientes» queda superado por este hito, sin importar resultados CMP.

**Proyecto:** NASA Space Apps - Health Monitoring Software  
**Fecha de revisión:** 14 de noviembre de 2026, hora de Chile.  
**Repositorio:** https://github.com/dziertp/nasa_space_apps  
**Versión revisada de main:** 738ebc936bcf386d0cd3324b6cf4616720a30a20, merge del PR #2 realizado el 14 de noviembre a las 18:28 de Chile.

## Resultado

La base React/FastAPI está integrada en main. La documentación explica correctamente el alcance inicial, la separación de datos y las limitaciones clínicas. Todavía faltan la trazabilidad del uso de una fuente NASA incluida en Resources del desafío, la declaración de uso de IA y la preparación de la entrega accesible al jurado.

Esta es una revisión y una propuesta de correcciones. No se modificó el repositorio, su visibilidad ni los mensajes de otros chats. No se ejecutó la aplicación como parte de esta revisión documental.

## Evidencias y alcance

Se revisaron README.md, AGENTS.md, docs/references/README.md, docs/WORKFLOW.md, data/README.md, frontend/src/App.tsx, frontend/index.html, backend/main.py y el árbol completo del repositorio. También se contrastaron las tres fotografías de la bienvenida con las aclaraciones oficiales disponibles.

Se recuperaron extractos del contexto de Main Healt Monitoring y Config GitHub. Estos extractos permiten reconocer el estado de trabajo, pero no verificar el contexto completo y activo de cada chat ni editarlo. No hay evidencia suficiente de que el nuevo requisito de fuentes haya sido incorporado en ambos. El contenido actual de main sí confirma que falta documentarlo.

## Hallazgos y correcciones

| Tema | Estado comprobado | Acción concreta |
|---|---|---|
| Integración de la base | PR #2 incorporado a main. | Continuar desde main actualizado; no repetir la preparación de la base. |
| Fuente NASA de Resources | Se cita HRP de forma general; no aparecen las páginas específicas Hazards, Risks u Ongoing HRP Research ni la regla de elegibilidad. | Incorporar al menos una fuente de la lista del desafío y describir su uso real en el diseño y las funciones. |
| OSD-575 | ZIP de metadatos incorporado; CSV CMP pendiente. | Mantenerlo como fuente científica adicional; no dar por satisfecho con él solo el requisito de Resources. |
| Datos reales y simulados | Carpetas y límites bien documentados; simulated y processed aún no contienen datos del prototipo. | Conservar esta separación y documentar cada incorporación real. |
| Uso de IA | No existe declaración de IA en los documentos revisados. | Declarar ChatGPT y Codex, para qué se usaron y qué archivos o resultados asistieron. |
| Material audiovisual IA | No se encontraron imágenes o vídeos de presentación en el árbol revisado. | Comprobar los materiales de entrega externos al repositorio; aplicar las reglas de atribución y marcas si corresponden. |
| Acceso al proyecto | El repositorio es privado. | Preparar una entrega accesible sin invitación, contraseña ni solicitud de acceso. Puede ser este repositorio publicado por el equipo u otra distribución pública adecuada. |
| Licencia | No hay archivo LICENSE. | Elegir y documentar una licencia para el contenido original y respetar por separado las condiciones de terceros. |
| Idioma | README, instrucciones internas e interfaz están en español. | Preparar los campos de entrega en inglés y una explicación/demo comprensible en inglés. Una versión inglesa del resumen público ayudaría; los documentos internos pueden mantenerse en español. |
| Instrucciones para Codex | AGENTS.md pide documentación en español y no incorpora las reglas de entrega. | Añadir una excepción para materiales de entrega en inglés y las reglas de fuentes, IA y trazabilidad. |
| Demo y formulario | No se encontraron materiales de entrega ni enlaces finales en los archivos revisados. | Preparar resumen, descripción, demo, proyecto final, referencias, declaración de IA y confirmación de originalidad. No afirmar que ya están enviados. |

Los nombres AI_DISCLOSURE.md y SUBMISSION.md que se sugieren a continuación son una forma de organizar el trabajo. La organización no exige esos nombres concretos.

## Fuentes obligatorias: criterio que debe compartirse

Para optar a premios globales se debe usar al menos una fuente NASA incluida en Resources del desafío seleccionado. No es necesario usar todas. Otras fuentes NASA, CSA y recursos permitidos pueden complementar el proyecto; todas las fuentes utilizadas deben citarse.

El equipo organizador global lo confirmó en:
- https://github.com/nasa/spaceapps/discussions/1849
- https://github.com/nasa/spaceapps/discussions/1827

Para este desafío, las fuentes NASA de la lista compartida por el equipo son:
- 5 Hazards of Human Spaceflight: https://www.nasa.gov/hrp/hazards/
- Risks of Human Spaceflight: https://www.nasa.gov/hrp/risks/
- Ongoing HRP Research in Space: https://www.nasa.gov/hrp/ongoing-hrp-research/

OSD-575 puede seguir usándose como fuente adicional. No debe reemplazar la incorporación explícita de un recurso de esa lista.

### Uso propuesto de las fuentes en este proyecto

| Fuente | Información pertinente | Aplicación propuesta y evidencia que debe quedar |
|---|---|---|
| Risks of Human Spaceflight | Riesgos asociados a sueño, horarios y salud conductual. | Justificar el registro de sueño, fatiga y ánimo; enlazar la explicación científica desde el módulo cuando exista. |
| 5 Hazards of Human Spaceflight | Aislamiento, distancia de la Tierra y autonomía de la tripulación. | Justificar funcionamiento local y orientación accesible sin conexión; documentar qué parte está implementada y qué parte está prevista. |
| OSD-575 | Metadatos del estudio y, cuando se incorpore, resultados de laboratorio descargados. | Registrar procedencia y mostrar únicamente resultados disponibles; mantener el CSV como pendiente hasta su incorporación. |

Las aplicaciones de esta tabla son propuestas de diseño del equipo, inferidas de las fuentes. Esas páginas no proporcionan por sí solas umbrales clínicos validados para las alertas del prototipo. Añadir una URL a la bibliografía debe acompañarse de una explicación verificable de cómo se usó.

## Declaración de IA

Las slides coinciden con la aclaración del equipo organizador:
- El uso de IA está permitido y debe declararse, indicando dónde y cómo se utilizó.
- Imágenes y vídeos generados con IA necesitan una marca visible.
- Audio generado con IA debe reconocerse en texto descriptivo y metadatos.
- Código y datos generados con IA deben reconocerse en texto descriptivo y metadatos.
- El contenido generado con IA no debe usar, contener ni modificar elementos de marca o diseño NASA, incluidos logotipos, banderas o identificadores de misión.

Fuente: https://github.com/nasa/spaceapps/discussions/1849

No se ha determinado qué materiales externos de presentación existen. No declarar “no usamos imágenes/audio/vídeo IA” sin revisarlos con el equipo.

### Borrador en inglés para completar antes del envío

> ChatGPT was used to support challenge interpretation, source discovery, technical planning, troubleshooting, and documentation drafting. OpenAI Codex assisted with the React/TypeScript frontend, FastAPI backend, and project setup. NASA source material, team-authored transformations, and synthetic scenarios are documented separately. At the reviewed revision, OSD-575 metadata are present; the CMP CSV, dashboard, clinical rules, and synthetic telemetry remain pending. The prototype has no clinical validation.

Este borrador refleja el contexto recuperado y el estado del commit revisado. Antes de enviarlo, el equipo debe ajustar los usos a lo efectivamente realizado, actualizar las funciones que ya existan e incorporar cualquier otra herramienta o material IA utilizado. No se han inventado nombres de modelos ni versiones.

Un registro breve puede complementar esa declaración:

| Herramienta | Uso y elementos afectados | Revisión humana |
|---|---|---|
| ChatGPT | Investigación y selección de fuentes, planificación, soporte de configuración y borradores de documentación; precisar documentos finales. | Registrar qué fuentes y textos se comprobaron y quién lo hizo. |
| OpenAI Codex | Asistencia en la base de frontend, backend y configuración; precisar archivos y commits. | Registrar revisión de cambios y comprobaciones realmente ejecutadas. |
| Otras herramientas | Completar únicamente si se usaron. | Completar con evidencias reales. |
| Generación de datos o medios | Registrar archivos, generador, parámetros o metadatos cuando existan. | Distinguir contenido sintético y revisar las marcas requeridas. |

Un archivo de declaración con tabla de procedencia por archivo o carpeta y un manifiesto de datos es una propuesta práctica para registrar el uso. La regla oficial requiere descripción y metadatos; no exige un formato de archivo concreto ni se ha verificado una obligación general de adjuntar todos los prompts.

## Entrega y plazos

La slide de bienvenida indica:
- Cierre local de envíos: domingo a las 11:00, después sin cambios.
- Subir una versión el sábado por la noche.
- Entrega en inglés.
- Nombre y resumen del proyecto.
- Enlace a demo y al proyecto final.
- Datos NASA y otras fuentes.
- Explicación de uso de IA.
- Confirmación de trabajo original.
- Equipos de 1 a 6, registrados en Punta Arenas, y selección de desafío oficial.
- Vídeos en español con subtítulos en inglés.

Por el contexto del evento, ese domingo corresponde al **15 de noviembre de 2026**. La hora de las 11:00 es la indicada por la sede en la imagen; no se sustituyó por el plazo global.

La web global indica cierre el 15 de noviembre a las 23:59, hora local del evento. Para planificar el trabajo de este equipo, usar las **11:00 de la sede** como límite operativo. La diferencia debe conservarse en la documentación, sin asumir que el plazo global extiende el local.

Fuente global: https://www.spaceappschallenge.org/2026/

La orientación de un Navigator en el foro NASA indica demo de hasta 30 segundos o presentación de hasta 7 diapositivas, incluyendo portada y cierre:
https://github.com/nasa/spaceapps/discussions/1947

Los campos de entrega y la obligación de listar fuentes y herramientas fueron aclarados por el equipo organizador global:
https://github.com/nasa/spaceapps/discussions/1858

Las páginas web de Project Submission Guide y Judging & Awards Guide no respondieron durante esta revisión. Las conclusiones se contrastaron con las slides, la página global, los términos indexados y las respuestas del foro; no se afirma haber inspeccionado un PDF completo de esas guías.

## Acceso, originalidad y licencias

El estado privado del repositorio es compatible con el desarrollo actual, pero ese enlace por sí solo no permite al jurado acceder. Preparar una distribución final accesible y comprobarla sin una sesión con permisos. Esta revisión no publica el repositorio ni cambia sus permisos.

Los términos exigen atribuir las fuentes, documentar las licencias aplicables y permitir la distribución del contenido original. Indican que NASA distribuirá el contenido original bajo Apache 2.0 si no se especifica otra licencia OSI compatible. La ausencia de LICENSE es un pendiente de claridad documental; no se ha afirmado que esa ausencia aislada descalifique automáticamente.

Fuente: https://www.spaceappschallenge.org/legal/

La originalidad y el uso declarado de IA son compatibles. El equipo debe responder por las contribuciones, verificar los resultados y citar código, texto, imágenes y datos externos. Una licencia del proyecto no reemplaza las condiciones de uso de datasets o materiales de terceros.

## Correcciones mínimas de documentación

1. **docs/references/README.md:** añadir el enlace oficial del desafío, al menos una fuente de Resources, la regla de elegibilidad y la relación fuente–función–archivo o módulo. Marcar como previsto cualquier uso aún no implementado.
2. **README.md:** mantener las instrucciones locales útiles y agregar un resumen público en inglés, enlaces de entrega cuando existan y enlaces a las declaraciones y referencias.
3. **docs/AI_DISCLOSURE.md, propuesto:** registrar herramientas, usos, elementos afectados, metadatos y revisiones realmente realizadas.
4. **docs/SUBMISSION.md, propuesto:** reunir el contenido inglés para el formulario y los enlaces finales. Distinguir borrador, revisado y enviado.
5. **AGENTS.md:** conservar español para trabajo interno, permitir inglés para la entrega e incorporar las reglas verificadas.
6. **Licencia y distribución:** documentarlas antes del envío; conservar las condiciones de terceros y preparar acceso al jurado.

No es necesario instalar servicios nuevos ni repetir pruebas de la base para resolver estos pendientes documentales.

## Contexto breve para pegar en Main Healt Monitoring, Config GitHub o una tarea Codex

> Proyecto NASA Space Apps 2026 — Health Monitoring Software. La base React/FastAPI ya está integrada en main mediante PR #2, commit 738ebc936bcf386d0cd3324b6cf4616720a30a20. Para premios globales debemos utilizar al menos una fuente NASA incluida en Resources del desafío; usaremos explícitamente Hazards o Risks con trazabilidad de su aplicación. OSD-575 continúa como fuente adicional: hay metadatos, el CSV CMP sigue pendiente y no equivale a telemetría continua. Debemos declarar ChatGPT/Codex y cualquier otra IA utilizada, registrar código/datos asistidos y cumplir las reglas de marcas para medios generados. El formulario y materiales de entrega deben estar en inglés; vídeos en español requieren subtítulos en inglés según la bienvenida. La sede señaló cierre el domingo 15 de noviembre a las 11:00, aunque el plazo global sea posterior. El repositorio sigue privado; preparar una entrega accesible sin permisos especiales. Faltan referencias específicas, declaración IA y contenido de entrega; no presentarlos como completados. Conservar separación de datos reales/simulados y ausencia de validación clínica. Comprobar la versión actual antes de editar y trabajar por rama/PR.

Pegar este contexto permite alinear cada conversación. Recuperar extractos de otros chats no equivale a modificar sus mensajes ni garantiza que sus siguientes respuestas incorporen automáticamente todas estas decisiones.

