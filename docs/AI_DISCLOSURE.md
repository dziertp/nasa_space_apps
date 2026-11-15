---
reviewed_on: 2026-11-15
tools: [ChatGPT, OpenAI Codex, GitHub Copilot, Claude Code]
code_and_data_assistance: true
code_artifacts: [frontend/src, backend/main.py, backend/panel.py, backend/test_panel.py, backend/suit.py, backend/test_suit.py, backend/mission.py]
data_artifacts: [data/simulated/personal_panel.json, data/simulated/suit_status.json, data/simulated/mission.json]
documentation_artifacts: [docs/SUBMISSION_DRAFT.md, docs/DEMO_SCRIPT_DRAFT.md]
data_generation_method: deterministic_handwritten_fixtures_with_ai_assistance
human_review_current_panel: pending
---

# Uso conocido de IA

Registro del contexto disponible y del trabajo realizado; no es una auditoría de todas las conversaciones o materiales externos del equipo. No se inventan modelos, versiones ni revisiones humanas.

| Herramienta | Uso conocido | Archivos o resultados afectados |
| --- | --- | --- |
| ChatGPT | Según la revisión documental aportada por el equipo: interpretación del desafío, selección de fuentes, planificación, soporte de configuración y borradores de documentación. | `docs/DELIVERY_REQUIREMENTS.md` conserva esa revisión; no se ha comprobado la autoría de cada documento anterior ni el historial completo de otros chats. El equipo debe completar la declaración antes del envío. |
| OpenAI Codex · base anterior | Preparación del frontend React/TypeScript/Vite, FastAPI, dependencias, exclusiones e instrucciones locales; análisis exploratorio de los seis TXT OSD-575. | Commit `83f87c9`: `frontend/`, `backend/main.py`, `backend/requirements.txt`, `.gitignore`, `README.md`. El análisis fue una respuesta en conversación y no modificó los metadatos. |
| OpenAI Codex · panel actual | Código, escenarios escritos con asistencia de IA, texto explicativo, pruebas y documentación. | `frontend/src/App.tsx`, `PersonalPanel.tsx`, `panel.ts`, `useLocalApi.ts`, `content.ts`, `styles.css`; `backend/main.py`, `panel.py`, `test_panel.py`; `data/simulated/personal_panel.json`, `data/simulated/README.md`, `data/README.md`, `README.md`, `AGENTS.md`, `docs/references/README.md`, este archivo y la nota de contexto en `docs/DELIVERY_REQUIREMENTS.md`. |
| Claude Code · consola modular | Código de la navegación por módulos, vistas de tableta/casco, módulo Hazards y documentación de la lluvia de ideas del equipo. | `frontend/src/modules.ts`, `ModuleViews.tsx`, `App.tsx`, `styles.css`; `docs/MODULES_ROADMAP.md`, `README.md`, `docs/references/README.md`, este archivo. |
| OpenAI Codex · motor de misión | Motor en memoria, guiones de los cinco hazards con procedencia de generación y pruebas del motor. El registro está en el docstring de `backend/mission.py` («Asistido por OpenAI Codex») y en `provenance` de `mission.json`. Los componentes de frontend del motor no registran la herramienta en el propio archivo; se incorporaron en el mismo checkpoint (`237bcb8`). | `backend/mission.py`, `data/simulated/mission.json`, las siete pruebas del motor en `backend/test_panel.py`, `docs/TECHNICAL_HANDOFF.md`; checkpoint con `frontend/src/HabitatEnvironment.tsx`, `RadiologicalStatus.tsx`, `useHabitatMission.ts` y `mission.ts`. |
| Claude Code · integración del motor (modelo Claude Opus 5.5) | Fusión de `feat/motor-mision` en la consola y resolución de conflictos (`backend/main.py`, `App.tsx`). Ubicación por módulos: radiación en Salud, hábitat en Nave y estado de los escenarios en Hazards. Adaptación visual de los componentes del motor sin cambiar su lógica, y documentación. | `backend/main.py`, `frontend/src/App.tsx`, `HabitatEnvironment.tsx`, `RadiologicalStatus.tsx`, `ModuleViews.tsx`, `modules.ts`, `missionView.tsx`, `charts.tsx`, `styles.css`; `README.md`, `docs/MODULES_ROADMAP.md`, `docs/references/README.md`, `docs/TECHNICAL_HANDOFF.md`, este archivo. |
| Claude Code · rediseño visual (modelo Claude Opus 5.5) | Sistema de diseño con variables CSS, composición de la consola, iconos SVG, marca de la consola, silueta del traje, medidores en arco, gráficos de sueño y fatiga y documentación. Las fuentes son de terceros (OFL-1.1, vía Fontsource) y no se generaron con IA. | `frontend/src/styles.css`, `App.tsx`, `ModuleViews.tsx`, `PersonalPanel.tsx`, `SuitModule.tsx`, `SuitFigure.tsx`, `charts.tsx`, `icons.tsx`, `main.tsx`, `modules.ts`; `frontend/index.html`, `frontend/package.json`, `frontend/package-lock.json`; `README.md`, `docs/MODULES_ROADMAP.md`, este archivo. |
| Claude Code · estado del traje (modelo Claude Opus 5.5) | Datos sintéticos del traje: estados, valores, criterios, riesgos e indicaciones redactados con asistencia de IA. Endpoint con validación Pydantic, pruebas, módulo del casco y documentación. | `data/simulated/suit_status.json`; `backend/suit.py`, `backend/main.py`, `backend/test_suit.py`; `frontend/src/suit.ts`, `SuitModule.tsx`, `App.tsx`, `modules.ts`, `styles.css`; `README.md`, `data/README.md`, `data/simulated/README.md`, `docs/MODULES_ROADMAP.md`, `docs/references/README.md`, este archivo. |
| GitHub Copilot | Revisión documental del proyecto y de las condiciones de entrega; elaboración de los borradores de envío y demostración. | `docs/SUBMISSION_DRAFT.md` y `docs/DEMO_SCRIPT_DRAFT.md`. Los nombres, enlaces y datos faltantes se dejaron como TODO. |

Los escenarios declaran autor, fecha, método, propósito y ausencia de mediciones NASA en sus metadatos `provenance`. No usan datos OSD-575, personas reales ni sensores conectados. Los textos de Risks/Hazards son paráfrasis asistidas y contrastadas con las páginas fuente; los valores, escala de fatiga y criterio de antigüedad son propios de la demostración. Los estados, criterios e indicaciones del traje también son propios; las indicaciones están marcadas «Protocolo pendiente de fuente y revisión». La licencia y distribución del contenido original están pendientes de decisión del equipo.

## Verificaciones y su procedencia

### Reportadas por OpenAI Codex

- Base anterior: se reportaron una compilación TypeScript/Vite, respuestas HTTP de `/api/health` directa y por proxy, y comprobaciones de exclusiones de Git. El usuario confirmó visualmente «Conectado» en esa base; esto no equivale a una revisión visual del panel nuevo.
- Panel actual: Codex reportó que `npm.cmd run build` completó TypeScript y Vite y que `python -m unittest backend.test_panel -v` pasó siete pruebas con HTTP real en servidor Uvicorn local: salud/catálogo, identidad/procedencia/siete fechas consecutivas, lecturas disponibles, tendencia de sueño/fatiga, `null` y antigüedad independientes de salud, 404 y frontera de antigüedad con cero distinto de ausente.

### Ejecutadas por GitHub Copilot

- Se revisaron la documentación del proyecto y el documento adjunto con las condiciones de entrega; se elaboraron `docs/SUBMISSION_DRAFT.md` y `docs/DEMO_SCRIPT_DRAFT.md`.
- En esta actualización se revisó y modificó únicamente esta declaración para registrar la participación de GitHub Copilot. No se ejecutaron compilaciones, pruebas de backend ni revisión visual del panel.

### Ejecutadas por Claude Code

- Consola modular: `npm run build` (TypeScript y Vite) y las siete pruebas de `backend.test_panel` pasaron en Linux con Node 22. Capturas con Playwright en 1200 px y 390 px: tableta, casco, Hazards y navegación con flechas; sin desplazamiento horizontal en móvil. Falta revisión humana y prueba con tecnologías de asistencia.
- Estado del traje (2026-11-15, Windows, Python 3.13.13, Node 26.13.1): `python -m unittest backend.test_panel backend.test_suit -v` pasó 16 pruebas. Las 9 del traje cubren:
  - seis partes con procedencia en los tres escenarios;
  - indicaciones marcadas y unidades;
  - conteos por escenario y 404;
  - panel de salud sin cambios;
  - rechazo Pydantic de datos incompletos o sin marca.

  `tsc --noEmit` y `vite build` (los dos pasos de `npm run build`) terminaron sin errores. Se ejecutaron con `node` porque el entorno de Claude Code no permitía lanzar `npm.cmd`.

  Revisión en Edge sin ventana, automatizada por el protocolo de depuración del navegador, a 1200 y 390 px:
  - casco con los tres escenarios: resumen, color con texto y forma en cada parte;
  - detalle al tocar con ratón y con Enter;
  - sin desplazamiento horizontal a 390 px;
  - error visible sin estado anterior al simular un fallo de `/suit`, y recuperación;
  - vuelta a Salud en tableta, sin errores de consola.

  Las capturas quedaron fuera del repositorio. Falta revisión humana y prueba con tecnologías de asistencia.
- Rediseño visual (2026-11-15, Windows, Node 26.13.1):
  - `tsc --noEmit` y `vite build` terminaron sin errores, con las fuentes incluidas en `dist/`.
  - Las 16 pruebas del backend siguen pasando sin cambios.
  - Revisión automatizada en Edge sin ventana: 33 capturas antes y 42 después, a 1440, 1024 y 390 px, de tableta y casco, con los tres escenarios y Hazards con escenario activo.
  - Sin desplazamiento horizontal y sin errores de consola.
  - Foco visible en los 36 controles recorridos con Tab.
  - Flechas, Inicio y Fin funcionan en el riel; la silueta y el gráfico responden al teclado.
  - El pulso solo aparece en estados críticos y se desactiva con «reducir movimiento».
  - Ninguna petición salió del servidor local.
  - El validador de color descartó un par azul/violeta para las series, indistinguible con deuteranopía; se usa un solo tono.

  Falta revisión humana y prueba con tecnologías de asistencia.
- Integración del motor (2026-11-15, Windows, Python 3.13.13, Node 26.13.1):
  - `python -m unittest backend.test_panel backend.test_suit -v` pasó 23 pruebas: 14 en `test_panel.py` (7 del panel y 7 del motor) y 9 en `test_suit.py`, que no cambió.
  - `tsc --noEmit` y `vite build` terminaron sin errores.
  - Revisión automatizada en Edge sin ventana, con backend y frontend propios en otros puertos, sin tocar los servicios abiertos del usuario:
    - Salud con radiación en tableta y casco; Nave con hábitat.
    - Las cinco tarjetas de Hazards empiezan en «Inactivo». Radiación y entorno se activaron desde Hazards con el hook existente, y el cambio se vio en Hazards, Salud (0,08 mSv/h, dosis 0,2 mSv conservada) y Nave (80 kPa, reconocimiento y primer paso de recuperación).
    - Cero consultas a `/api/mission` en 4 s de reposo (sin sondeo).
    - El casco muestra solo dosis, tasa y aviso, sin controles de escritura.
    - El traje sigue igual en ambos dispositivos.
    - Sin desplazamiento horizontal a 1440 y 390 px y sin errores de consola.

  Falta revisión humana y prueba con tecnologías de asistencia.

La revisión documental anterior registró consultas a Risks, Hazards y las aclaraciones oficiales #1849/#1858, además de problemas de acceso a la pestaña Resources y a las páginas global y legal. Esos registros no certifican las condiciones actuales del desafío.

Pendientes: revisión humana del panel, prueba visual e interacciones en navegador, accesibilidad con tecnologías de asistencia, validación científica/clínica, fuentes y revisión de los criterios e indicaciones del traje, y revisión de materiales de entrega externos al repositorio. No se han generado imágenes, audio o vídeo en esta tarea; no se afirma que el equipo carezca de otros medios generados con IA.

## Antes de entregar

Completar los usos de IA de otros integrantes y herramientas y revisar atribuciones. La [aclaración del equipo organizador #1849](https://github.com/nasa/spaceapps/discussions/1849) pide indicar dónde/cómo se usó IA: marcas visibles para imágenes/vídeos, texto/metadatos para audio y código/datos, y restricciones de elementos de marca NASA en contenido generado. La interfaz usa texto y gráficos vectoriales propios, sin logotipos ni elementos de marca de NASA. Los iconos, la marca de la consola y la silueta del traje se escribieron como código SVG con asistencia de Claude Code. No hay imágenes rasterizadas generadas con IA. Pendiente: confirmar con el equipo si esos gráficos asistidos por IA requieren una marca visible en la entrega. Ver [contexto de entrega](DELIVERY_REQUIREMENTS.md) y confirmar las condiciones aplicables antes del envío.
