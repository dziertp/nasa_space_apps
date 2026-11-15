# Fuentes

Consultadas el 14 de noviembre de 2026.

## Fuente → función implementada

| Fuente | Uso y evidencia local | Límites |
| --- | --- | --- |
| [NASA Risks of Human Spaceflight](https://www.nasa.gov/hrp/risks/), sección de sueño insuficiente y horarios irregulares | Paráfrasis local en `frontend/src/content.ts`, visible junto al historial de sueño/fatiga en `PersonalPanel.tsx`. Fundamenta observar su evolución. | La fuente trata pérdida crónica de sueño, carga de trabajo y reloj biológico. Elegir un registro de fatiga y su escala es una decisión del equipo; no prescribe nuestros valores ni alertas. |
| [NASA 5 Hazards of Human Spaceflight](https://www.nasa.gov/hrp/hazards/), distancia de la Tierra | Contexto local en `frontend/src/content.ts`; decisión del equipo de servir escenarios por `backend/panel.py` desde disco, sin servicios externos durante el uso. | La autonomía local es una aplicación de diseño inferida de la dificultad de recibir apoyo, no una certificación NASA. |
| [NASA 5 Hazards of Human Spaceflight](https://www.nasa.gov/hrp/hazards/), nombres de los cinco peligros | Módulo Hazards en `frontend/src/modules.ts` y `ModuleViews.tsx`. | Solo se usan los nombres. Asignar escenarios a cada peligro es una decisión del equipo. |
| [Desafío oficial: Health Monitoring Software](https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/) | Alcance de reunir indicadores y facilitar su revisión; primer panel personal. | Página del desafío localizada; la pestaña Resources no fue accesible en esta comprobación. La revisión del equipo identifica Risks/Hazards como recursos; confirmar su listado antes del envío. |
| [OSD-575](https://osdr.nasa.gov/bio/repo/data/studies/OSD-575) | Metadatos en `data/metadata/OSD-575/` y CSV CMP disponible en `data/raw/OSD-575/`. No alimenta el panel. | Los resultados CMP todavía no están integrados ni se muestran en el panel; no son telemetría continua. |
| Escenarios propios, `data/simulated/personal_panel.json` | Tres escenarios servidos por `/api/scenarios/{id}`, con fecha, método de generación y atribución de IA. | Datos sintéticos; no son resultados NASA, sensores reales ni reglas clínicas. |

El texto de contexto se conserva en el frontend y se puede leer sin internet; abrir los enlaces externos es opcional. No se usan logotipos ni identificadores de misión NASA en los escenarios.

## Entrega y atribución

La [aclaración #1849 del equipo organizador](https://github.com/nasa/spaceapps/discussions/1849) exige al menos una fuente NASA de Resources para premios globales y declarar dónde/cómo se usa IA, incluyendo descripción y metadatos para código y datos. La [aclaración #1858](https://github.com/nasa/spaceapps/discussions/1858) enumera campos de entrega y referencias. Son respuestas generales publicadas en otro desafío; confirmar la aplicación y la lista del nuestro antes de enviar.

Se implementan Risks/Hazards con la trazabilidad anterior; no se afirma que una URL o OSD-575 por sí solos acrediten elegibilidad. Ver [revisión de entrega](../DELIVERY_REQUIREMENTS.md) para condiciones aportadas por el equipo y pendientes; [declaración de IA](../AI_DISCLOSURE.md) para usos conocidos. No se han publicado materiales ni enviado formularios en este hito.

| Recurso | Uso previsto |
|---|---|
| [Desafío: transcripción compartida por el equipo](#requisitos-del-desafío) | Definir funciones de medición y orientación |
| [Misión SpaceX Inspiration4](https://osdr.nasa.gov/bio/repo/data/missions/SpaceX%20Inspiration4) | Contexto de misión y estudios asociados |
| [OSD-575](https://osdr.nasa.gov/bio/repo/data/studies/OSD-575) | Datos de laboratorio y metadatos seleccionados |
| [Jones et al., Nature, 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11357997/) | Cambios fisiológicos, mediciones con smartwatch y bienestar; DOI: 10.1038/s41586-024-07648-x |
| [NASA Human Research Program](https://www.nasa.gov/hrp/) | Riesgos de salud en misiones espaciales |
| [OSDR: preguntas frecuentes](https://science.nasa.gov/reference/osdr-faq/) | Búsqueda, descarga y restricciones de acceso |
| [OSDR en AWS Open Data](https://registry.opendata.aws/nasa-osdr/) | Acceso público al bucket nasa-osdr, región us-west-2 |

## Requisitos del desafío

Según la transcripción del video aportada por el equipo:

- Ayudar a la tripulación a evaluar su salud y orientarse ante una emergencia.
- Explicar cómo tomar cada medición, por qué importa y qué hacer ante un resultado anormal.
- Incorporar recordatorios y considerar distintos entornos de misión.

## Archivos seleccionados

- OSD-575: LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv.
- OSD-575: OSD-575_metadata_OSD-575-ISA.zip.

Ambos archivos están disponibles en las carpetas indicadas arriba. El CSV CMP no se ha integrado al panel ni se usa en los escenarios simulados.

Conservar los originales y citar el estudio en cualquier visualización o análisis derivado. Para nuevas descargas, registrar identificador del estudio, URL, nombre del archivo, versión si está disponible y fecha de descarga.

## Metadatos incorporados

- Archivo: OSD-575_metadata_OSD-575-ISA.zip (71.702 bytes).
- Fuente: [OSD-575, NASA OSDR](https://osdr.nasa.gov/bio/repo/data/studies/OSD-575).
- Recibido del equipo e incorporado el 14 de noviembre de 2026; conservado sin modificaciones.
- Contenido: seis archivos de texto ISA con la investigación, las muestras y los ensayos.
- SHA-256: `a1d3e49e2b61ab427a8760d0c98e0324a53272d0e1314632290266b014476f1d`.

## Límites de interpretación

- Inspiration4 fue una misión de tres días con cuatro participantes.
- El filtro Human (Homo sapiens) también puede incluir muestras y cultivos celulares humanos.
- OSD-575 aporta resultados de laboratorio; no valida alertas clínicas ni escenarios de emergencia.
- Los protocolos y límites operativos del prototipo están pendientes de seleccionar y revisar.
