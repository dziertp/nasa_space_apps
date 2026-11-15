---
reviewed_on: 2026-11-14
tools: [ChatGPT, OpenAI Codex, GitHub Copilot]
code_and_data_assistance: true
code_artifacts: [frontend/src, backend/main.py, backend/panel.py, backend/test_panel.py]
data_artifacts: [data/simulated/personal_panel.json]
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
| GitHub Copilot | Revisión documental del proyecto y de las condiciones de entrega; elaboración de los borradores de envío y demostración. | `docs/SUBMISSION_DRAFT.md` y `docs/DEMO_SCRIPT_DRAFT.md`. Los nombres, enlaces y datos faltantes se dejaron como TODO. |

Los escenarios declaran autor, fecha, método, propósito y ausencia de mediciones NASA en sus metadatos `provenance`. No usan datos OSD-575, personas reales ni sensores conectados. Los textos de Risks/Hazards son paráfrasis asistidas y contrastadas con las páginas fuente; los valores, escala de fatiga y criterio de antigüedad son propios de la demostración. La licencia y distribución del contenido original están pendientes de decisión del equipo.

## Verificaciones y su procedencia

### Reportadas por OpenAI Codex

- Base anterior: se reportaron una compilación TypeScript/Vite, respuestas HTTP de `/api/health` directa y por proxy, y comprobaciones de exclusiones de Git. El usuario confirmó visualmente «Conectado» en esa base; esto no equivale a una revisión visual del panel nuevo.
- Panel actual: Codex reportó que `npm.cmd run build` completó TypeScript y Vite y que `python -m unittest backend.test_panel -v` pasó siete pruebas con HTTP real en servidor Uvicorn local: salud/catálogo, identidad/procedencia/siete fechas consecutivas, lecturas disponibles, tendencia de sueño/fatiga, `null` y antigüedad independientes de salud, 404 y frontera de antigüedad con cero distinto de ausente.

### Ejecutadas por GitHub Copilot

- Se revisaron la documentación del proyecto y el documento adjunto con las condiciones de entrega; se elaboraron `docs/SUBMISSION_DRAFT.md` y `docs/DEMO_SCRIPT_DRAFT.md`.
- En esta actualización se revisó y modificó únicamente esta declaración para registrar la participación de GitHub Copilot. No se ejecutaron compilaciones, pruebas de backend ni revisión visual del panel.

La revisión documental anterior registró consultas a Risks, Hazards y las aclaraciones oficiales #1849/#1858, además de problemas de acceso a la pestaña Resources y a las páginas global y legal. Esos registros no certifican las condiciones actuales del desafío.

Pendientes: revisión humana del panel, prueba visual e interacciones en navegador, accesibilidad con tecnologías de asistencia, validación científica/clínica y revisión de materiales de entrega externos al repositorio. No se han generado imágenes, audio o vídeo en esta tarea; no se afirma que el equipo carezca de otros medios generados con IA.

## Antes de entregar

Completar los usos de IA de otros integrantes y herramientas y revisar atribuciones. La [aclaración del equipo organizador #1849](https://github.com/nasa/spaceapps/discussions/1849) pide indicar dónde/cómo se usó IA: marcas visibles para imágenes/vídeos, texto/metadatos para audio y código/datos, y restricciones de elementos de marca NASA en contenido generado. Este hito usa texto y gráficos de interfaz propios, sin logotipos NASA ni imágenes generadas. Ver [contexto de entrega](DELIVERY_REQUIREMENTS.md) y confirmar las condiciones aplicables antes del envío.
