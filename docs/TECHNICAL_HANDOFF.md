# Traspaso técnico: motor de misión

Checkpoint del 15 de noviembre de 2026. Rama `feat/motor-mision`, basada en `4464bd4` (PR #3 integrado). Este checkpoint conserva el trabajo local; no incorpora funcionalidades nuevas ni crea un PR.

## Integración en la consola (rama `feat/integrar-motor`)

El 15 de noviembre de 2026 `feat/motor-mision` se fusionó sobre `main` (consola modular, Estado del traje y rediseño visual, PR #4 y #5). La lógica del motor no cambió: backend, guiones, hook y condiciones de los componentes son los mismos. Cambió la ubicación y la presentación:

| Sección | Dónde está ahora |
| --- | --- |
| `RadiologicalStatus` | Módulo **Salud**. Tableta: completo, debajo del panel personal. Casco (`compact`): solo dosis, tasa y estado del aviso, sin controles de escritura. |
| `HabitatEnvironment` | Módulo **Nave**, solo en tableta; Nave pasó a `activo`. Incluye el reinicio de toda la misión. |
| Estado de los cinco escenarios | Módulo **Hazards**, una tarjeta por peligro: inactivo, «Activo · fase» o «Finalizado · fase», con **Activar escenario del motor** (`useHabitatMission`, `instance_id`/`revision`). Radiación y entorno exigen actividad interior, como sus secciones. Los escenarios del panel siguen en la misma tarjeta. |

- **Archivos:** `backend/main.py` registra los routers de panel, traje y misión. `frontend/src/missionView.tsx` comparte la etiqueta de aviso (prioridad → icono y texto; un aviso resuelto no se muestra como «Correcto»). `modules.ts` asigna a cada peligro su escenario del motor (`engine`).
- **Sin cambios de comportamiento:** cada sección sigue con su propia consulta (una por módulo abierto) y no hay sondeo. Al cambiar de módulo, la sección se vuelve a montar y consulta la misión: tras actuar en Hazards, Salud y Nave muestran el cambio al abrirse.
- **Pruebas:** 23 en total, 14 en `test_panel.py` (7 del panel y 7 del motor) y 9 en `test_suit.py`.
- **Presión del traje:** el motor y `suit_status.json` usan 29,6 kPa, pero la anomalía de traje en EVA del motor no se muestra en el módulo Traje. Queda pendiente unificarlas ([MODULES_ROADMAP](MODULES_ROADMAP.md)).

Las secciones siguientes describen el checkpoint original; donde difieren, prevalece esta sección.

## Arquitectura y archivos principales

React + TypeScript + Vite consume FastAPI mediante el proxy local `/api` (5173 → 8000). El motor mantiene una misión compartida por proceso de backend; consultar o recargar la página no crea otra misión ni avanza su reloj manual. Las escrituras requieren `instance_id` y `revision` vigentes; un conflicto devuelve HTTP 409.

| Archivo | Función |
| --- | --- |
| `backend/main.py` | Registra las rutas del panel y de misión; conserva `/api/health`. |
| `backend/mission.py` | Estado compartido, comandos, transiciones, reloj, avisos, informes y registro en memoria. |
| `data/simulated/mission.json` | Cinco hazards, magnitudes/unidades, fases, acciones, reglas propias, fuentes y procedencia de generación con Codex. |
| `backend/test_panel.py` | 14 pruebas; servidores HTTP temporales por clase para aislar los recorridos. |
| `frontend/src/App.tsx` | Integra el panel personal y las dos secciones de misión. |
| `frontend/src/HabitatEnvironment.tsx` | Consulta, activación, reconocimiento, recuperación ambiental en tres pasos y reinicio de toda la misión con confirmación. |
| `frontend/src/RadiologicalStatus.tsx` | Dosis/tasa y aviso; consulta, activación y reconocimiento radiológicos ya implementados. |
| `frontend/src/useHabitatMission.ts`, `mission.ts` | Hook de lectura/escritura y tipos; bloqueo de duplicados, progreso, errores y consulta tras 409 sin repetir escrituras. |
| `backend/panel.py`, `data/simulated/personal_panel.json`, `frontend/src/PersonalPanel.tsx` | Panel original de SIM-001, tres escenarios y siete días de sueño/fatiga, conservados. |

El panel personal sigue consultando `/api/scenarios/{id}`: su selector no modifica la misión de `/api/mission`. Hábitat y radiación consultan la misma misión, pero cada sección conserva su última respuesta: actualizar manualmente la otra sección después de una acción o reinicio. No hay sondeo automático ni cambios de mediciones anticipados en el frontend.

## Hazards configurados frente a recorridos comprobados

| Hazard | Presente en el motor | Alcance efectivamente comprobado |
| --- | --- | --- |
| `entorno` | Anomalía de presión de hábitat o traje según actividad. | **Interior / habitat**: HTTP e interfaz para activar, reconocer, `iniciar_comprobacion`, `simular_contencion`, `simular_restauracion` y reiniciar. Presión 101,3 → 80 → 101,3 kPa. EVA no comprobada. |
| `radiacion` | Activación y procedimiento ilustrativo de refugio. | **Interior / dosimetro**: HTTP para activar, reconocer, `iniciar_refugio` → `traslado`, `confirmar_refugio` → `protegido`, `simular_fin_evento` → `finalizado`. Interfaz: lectura de esas fases, activación y reconocimiento; refugio/finalización preparados mediante API. |
| `aislamiento` | Tendencia de sueño/fatiga, contacto, seguimiento y recuperación ficticia. | Configuración y código presentes; recorrido de misión todavía no comprobado. Las pruebas del historial original no validan este procedimiento. |
| `distancia` | Interrupción terrestre, informe pendiente, envío simulado y entrega tras retardo. | Recorrido todavía no comprobado; no equivale a una caída de la API local. |
| `gravedad` | Movimiento de posible caída, confirmación/descarte y cierre sin inferir lesiones. | Recorrido todavía no comprobado. |

En radiación, la tasa pasa de 0,001 a 0,08 mSv/h; refugio confirmado: 0,002; finalización: 0,001. La dosis acumulada conserva **0,2 mSv** durante todo el recorrido comprobado, sin avance temporal. Reconocer conserva magnitudes, prioridad y causa activa; solo la transición terminal resuelve el aviso y conserva su reconocimiento.

## Verificaciones utilizadas

Se reutilizan los resultados previos que cubren este código; en este checkpoint solo se añade este documento y se revisa Git, sin repetir ejecución ni navegador.

- Backend: **14/14 pruebas aprobadas**. Incluyen siete del panel original, dos de consulta inicial/lecturas desde clientes distintos sin efectos, tres ambientales y dos radiológicas. Cubren persistencia entre consultas, reconocimiento separado de resolución, recuperación y contrato de reinicio. No son pruebas de todos los hazards.
- Frontend: **compilación TypeScript/Vite aprobada** después de los últimos controles radiológicos.
- Navegador Edge de escritorio: panel anterior disponible; hábitat completo, cancelación/confirmación del reinicio y reactivación sin recargar; radiación inicial, activada, protegida y finalizada, activación/reconocimiento y conservación al recargar. Cero, `null`, carga, errores y bloqueos se revisaron también con respuestas interceptadas; errores de escritura HTTP 503 fueron simulados, y conflictos 409 se provocaron contra la API. Sin éxito falso ni reintento automático de escritura.
- La revisión de navegador no constituye una suite automatizada ni cubre móviles o tecnologías de asistencia. Las fases radiológicas protegida/finalizada se prepararon por API, no mediante controles de refugio en la interfaz.
- Para guardar el checkpoint: revisar diff preparado, exclusiones y `git diff --cached --check`; confirmar después la igualdad del hash local y remoto.

## Contratos y límites para continuar

- Consulta: `GET /api/mission`. Escrituras: `POST /api/mission/scenarios/{hazard}/activate`, `/api/mission/events/{id}/acknowledge` y `/api/mission/events/{id}/actions/{accion}`, con JSON `{ "instance_id": "...", "revision": 0 }` actualizado en cada respuesta.
- Reinicio: `POST /api/mission/reset`, con el contexto vigente y `confirm: true`. Devuelve **nueva instancia, revisión 1**, reloj inicial, sin eventos ni informes previos y un único registro de reinicio. Al arrancar el backend la revisión inicial es 0. El reinicio afecta a todos los clientes.
- El estado, los informes y el registro se pierden al reiniciar el backend o recargar Uvicorn. Usar un solo proceso, sin múltiples workers. No hay SQLite ni bitácora persistente.
- Datos ausentes: `null` / «Sin datos»; cero es válido. La antigüedad se calcula respecto al reloj simulado (más de 15 minutos). Calidad del dato, prioridad, reconocimiento, resolución, enlace terrestre y conexión con la API son conceptos separados; no todos tienen controles o vistas propios todavía.
- Pendientes de comprobar: integración de dosis al avanzar el reloj, EVA, tres hazards restantes, interacciones entre hazards y regresiones automatizadas de conflictos de instancia/revisión. Existen comandos de actividad, reloj, retardo y selección de panel en la API; no hay controles para ellos en la interfaz.
- Fuentes de contexto en `mission.json`: NASA HRP Risks/Hazards, radiación espacial, Crew Systems y distancia de la Tierra. Valores, prioridades y procedimientos son decisiones sintéticas propias, pendientes de revisión; no son protocolos NASA ni límites clínicos validados. No hay sensores reales ni IA conectada.
- El CSV NASA `data/raw/OSD-575/LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv` **ya está incorporado en Git**, con `data/metadata/OSD-575/CMP_PROVENANCE.json`; no alimenta el panel ni el motor. Los seis TXT extraídos permanecen locales, fuera del checkpoint. No se modificaron originales NASA.
- Documentación de Copilot conservada. README aún describe el hito anterior, siete pruebas y revisión visual pendiente: actualizar posteriormente README, referencias y declaración de IA con el motor y el alcance real de las comprobaciones. Este documento registra el estado técnico actual sin reescribirlos.

## Ejecutar y comprobar

PowerShell desde la raíz, con dependencias existentes. Instalación inicial e intérprete de VS Code: [README](../README.md). Terminal 1 (sin `--reload` para evitar reinicios involuntarios de la misión):

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Terminal 2:

```powershell
fnm env --use-on-cd --shell powershell | Out-String | Invoke-Expression
fnm use 26.13.1
Set-Location frontend
npm.cmd run dev
```

Abrir `http://127.0.0.1:5173`. Tras la integración, «Estado radiológico» está en **Salud**, «Estado ambiental del hábitat» y el reinicio de misión en **Nave** (tableta), y la activación de los cinco escenarios en **Hazards**. Tras un reinicio, las demás secciones muestran el estado nuevo al abrirse o con su botón Actualizar. Detener servicios con `Ctrl+C`.

Comprobaciones reproducibles (las pruebas arrancan y cierran sus propios servidores; no alteran la demostración abierta):

```powershell
# Desde la raíz
Invoke-RestMethod http://127.0.0.1:8000/api/mission
Invoke-RestMethod http://127.0.0.1:5173/api/health
.\.venv\Scripts\python.exe -m unittest discover -s backend -p 'test_*.py' -v
git diff --check
# Con fnm habilitado en esta terminal
Set-Location frontend
npm.cmd run build
Set-Location ..
```

Tras la integración, el comando de pruebas del README es `.\.venv\Scripts\python.exe -m unittest backend.test_panel backend.test_suit -v` (23 pruebas).

## Próxima tarea pequeña recomendada

Sigue vigente tras la integración. Añadir únicamente el control **«Iniciar refugio ilustrativo»** (`iniciar_refugio`) a la vista de tableta de `RadiologicalStatus.tsx` (módulo Salud), usando la acción recibida en `events[].actions` y el hook existente. Comprobar `aviso` → `traslado`, sin avance del reloj ni cambio de 0,2 mSv / 0,08 mSv/h. Activación y reconocimiento ya existen; confirmación de refugio y finalización en interfaz quedan para tareas siguientes.
