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

## Pasos de los hazards en la interfaz (rama `feat/completar-hazards`)

Sin cambios en `backend/mission.py` ni en `mission.json`: se usan los endpoints y contratos existentes.

- **`EventSteps`** (`frontend/src/missionView.tsx`): con un evento abierto muestra fase, siguiente paso y reconocimiento, y un botón por cada acción de `events[].actions` (las que el motor declara para la fase actual), más **Reconocer aviso**. La interfaz no decide transiciones.
  - En `distancia · en_transito` no hay acción: muestra el informe y **Avanzar reloj simulado N min** (`POST /api/mission/clock`, N = minutos hasta `due_at`).
  - Se usa en las cinco tarjetas de Hazards y, sin el botón de reconocer, en la vista de tableta de `RadiologicalStatus` (refugio ilustrativo).
- **Actividad de misión** en Hazards: `POST /api/mission/activity` (interior/EVA). Deshabilitado con radiación o entorno abiertos, igual que la regla del motor. Radiación sigue exigiendo interior; entorno ya no: en EVA afecta al traje.
- **`useHabitatMission.perform`**: el tercer argumento pasa a ser un cuerpo adicional genérico (`{ confirm: true }`, `{ activity }`, `{ minutes }`). `instance_id` y `revision` siempre se toman del último estado y no se pueden sobrescribir. Bloqueo de duplicados, progreso, error y consulta tras 409 sin reintento no cambian.
- **Traje** (`SuitModule.tsx`, `suit.ts`): una lectura de `/api/mission` al abrirse, sin sondeo. Con un evento `entorno` abierto y `system: traje`, `applySuitEngine` sustituye la parte Presión por la lectura `suit_pressure`, el estado según la prioridad del evento y el siguiente paso como indicación, con la etiqueta «Motor de misión». Se calcula en cada render; no hay copia del estado.
- **Datos del traje**: la batería de `descanso-reducido` pasó de 14 % Crítico a 34 % Precaución.
- **Pruebas**: 27 en total. `test_panel.py` suma `IsolationRouteApiTests`, `DistanceRouteApiTests`, `GravityRouteApiTests` y `SuitPressureEvaApiTests` (18 en el archivo); `test_suit.py` sigue con 9, con el conteo nuevo de `descanso-reducido`.
- **Efectos del reloj**: la recuperación de aislamiento avanza 7 días y la entrega de distancia, el retardo configurado. Ambos suman dosis según la tasa programada y pueden dejar lecturas como desactualizadas (más de 15 min). Es el comportamiento del motor; no se corrige en la interfaz.

## Preparación de EVA (rama `feat/preparacion-eva`)

- **Catálogo y fórmulas** (`backend/eva.py`, `data/simulated/eva_planning.json`): `GET /api/eva/catalog` y `POST /api/eva/estimate` con `{ "route_id", "equipment_ids": [] }`. La estimación no lee ni escribe la misión. Recorrido o equipamiento desconocido: 404; equipamiento repetido: 422. Devuelve duración, desplazamiento, objetivos, carga, factor de velocidad, consumo, energía, batería al volver, límites y `warnings` (`carga`, `duracion`, `bateria`) con su motivo.
- **Plan en el motor** (`backend/mission.py`):
  - `POST /api/mission/eva/start` con `instance_id`, `revision`, `route_id` y `equipment_ids`. Recalcula la estimación en el servidor, cambia la actividad a EVA con `_set_activity` (la misma función que `/api/mission/activity`) y guarda `eva_plan` con estado `activo`, recorrido, equipamiento, estimación y hora simulada de inicio.
  - 409 si la revisión está vencida, si la actividad ya es EVA o si hay radiación o entorno abiertos (mismo mensaje que el selector).
  - `POST /api/mission/eva/end`: vuelve a Interior y marca el plan `terminado` (`ended_by: terminar_eva`); 409 si no hay EVA en curso.
  - Cambiar a Interior desde el selector de Hazards (`selector_actividad`) o el refugio radiológico (`refugio_radiologico`) también terminan el plan. El refugio no pasaba antes por la regla de actividad y sigue sin hacerlo; solo marca el plan.
  - `GET /api/mission` incluye `eva_plan` (null al arrancar y tras `reset`). Vive solo en memoria.
- **Interfaz** (`frontend/src/EvaModules.tsx`):
  - Tableta (`preparacion`): selección, tres medidores, aviso de planificación, Iniciar/Terminar EVA con el motivo del bloqueo.
  - Casco (`mision`, `equipamiento`): leen `eva_plan` con `useHabitatMission`, una consulta al abrir y sin sondeo.
- **Pruebas:** 37 en total; `backend/test_eva.py` añade 10 (cinco de fórmulas y catálogo sin servidor, dos HTTP de catálogo y estimación, y tres clases con su propio servidor para el plan, el bloqueo y el recorrido desconocido).
- **Límites:** las fórmulas no consideran gravedad, terreno ni tiempo transcurrido; la batería del plan no se conecta con la del módulo Traje. Avisos de planificación, no clínicos.

Las secciones siguientes describen el checkpoint original; donde difieren, prevalecen las secciones anteriores.

## Visor del casco (rama `feat/hud-casco`)

Solo frontend; sin cambios en el backend, la API ni el motor. La tableta no cambia.

- **`frontend/src/HelmetHud.tsx`**: con **Casco · EVA**, `App.tsx` muestra este componente en lugar del riel de módulos.
  - Lee la misma API que la tableta: el escenario del panel (que ya consulta `App`), `/api/scenarios/{id}/suit` y `/api/mission` con `useHabitatMission` (una consulta al montarse y botón de actualizar; sin sondeo).
  - La presión del traje usa `applySuitEngine` (el motor tiene prioridad durante la anomalía en EVA).
  - Las acciones del aviso usan `perform` con `instance_id`/`revision`: reconocer o el paso siguiente que declara el motor (`events[].actions`).
- **`frontend/src/hudAlerts.ts`**: función pura `buildHudAlerts({ panel, parts, mission, missionError })`.
  - Orígenes: guiones abiertos del motor (la severidad sale de su prioridad), partes del traje en Precaución o Crítico (la presión sustituida por el motor no se duplica), plan de EVA activo con avisos, lecturas del panel desactualizadas o ausentes, y misión sin respuesta.
  - Orden: severidad (crítico > precaución > sin datos), después origen (motor > traje > plan > lecturas > conexión) y orden de llegada. Es un criterio del equipo, documentado en el archivo y en «Acerca de estos datos».
  - `dockSeverity` da el punto de cada icono del dock y `suitOverall` el estado global del traje.
- **Enlace** (arriba a la derecha): «Sin señal» si `earth_link.connected` es falso, «Retardo N min» si está conectado y «Modo local» si no hay datos de la misión.
- **`frontend/src/LunarScene.tsx`**: horizonte SVG propio con estrellas deterministas.
- **Escena sustituible** (rama `feat/hud-pantalla-completa`): `HelmetHud` solo usa `VisorScene: ComponentType<VisorSceneProps>` (`{ heading: number }`, definido en `LunarScene.tsx`) dentro de `.visor-scene`, una capa absoluta al 100 % detrás del HUD. Para la escena 3D, cambiar esa constante por el nuevo componente; no hace falta tocar el HUD.
- **Rumbo:** `HelmetHud` recibe `heading` en grados (por defecto `DEMO_HEADING = 32`) y lo pasa a la escena y a `HeadingTape` (`HudOverlay.tsx`, decorativo y `aria-hidden`). El hito 2 lo conectará al giro de la cámara.
- **Pantalla completa:** el estado vive en `App` (`visorFullscreen`); con él activo no se renderizan el encabezado, el aviso ni la barra de escenario, y `html.hud-fullscreen` bloquea el desplazamiento. `HelmetHud` pide la Fullscreen API y, si la rechazan, queda `.hud-scene.is-fullscreen` (CSS a 100vw × 100vh). Las teclas F y Esc se escuchan en `document` y se ignoran en campos y selectores.
- **Accesibilidad:**
  - El dock es una barra de herramientas con flechas, Inicio y Fin. Los paneles reciben el foco al abrirse, se cierran con Esc y devuelven el foco al botón que los abrió.
  - El aviso principal se anuncia con `aria-live` (assertive si es crítico).
  - Cada estado lleva icono con forma y texto. `backdrop-filter` tiene alternativa sólida.
- **Código retirado:** las vistas de casco anteriores (`HelmetHealth`, `VisorOverlay`, la vista compacta de `RadiologicalStatus`, la rama de casco de `SuitModule` y `HelmetMission`/`HelmetEquipment`) y sus estilos.

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
| `entorno` | Anomalía de presión de hábitat o traje según actividad. | **Interior / habitat**: HTTP e interfaz para activar, reconocer, `iniciar_comprobacion`, `simular_contencion`, `simular_restauracion` y reiniciar. Presión 101,3 → 80 → 101,3 kPa. **EVA / traje** desde `feat/completar-hazards`: HTTP (`SuitPressureEvaApiTests`) e interfaz, 29,6 → 22 → 29,6 kPa, visible en Traje. |
| `radiacion` | Activación y procedimiento ilustrativo de refugio. | **Interior / dosimetro**: HTTP para activar, reconocer, `iniciar_refugio` → `traslado`, `confirmar_refugio` → `protegido`, `simular_fin_evento` → `finalizado`. Interfaz: lectura de esas fases, activación y reconocimiento; refugio/finalización preparados mediante API. |
| `aislamiento` | Tendencia de sueño/fatiga, contacto, seguimiento y recuperación ficticia. | Desde `feat/completar-hazards`: HTTP (`IsolationRouteApiTests`) e interfaz en Hazards, hasta `recuperado`. |
| `distancia` | Interrupción terrestre, informe pendiente, envío simulado y entrega tras retardo. | Desde `feat/completar-hazards`: HTTP (`DistanceRouteApiTests`) e interfaz, con entrega al avanzar el reloj. No equivale a una caída de la API local. |
| `gravedad` | Movimiento de posible caída, confirmación/descarte y cierre sin inferir lesiones. | Desde `feat/completar-hazards`: HTTP (`GravityRouteApiTests`) e interfaz, ambas ramas. |

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
- Pendientes de comprobar: integración de dosis al avanzar el reloj (sin vista propia), interacciones entre hazards y regresiones automatizadas de conflictos de instancia/revisión (la revisión de navegador cubre un 409). Desde `feat/completar-hazards` hay controles de actividad y de avance de reloj (solo para la entrega de distancia); retardo y selección de panel siguen solo en la API.
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

Tras la integración, el comando de pruebas del README es `.\.venv\Scripts\python.exe -m unittest backend.test_panel backend.test_suit -v` (27 pruebas desde `feat/completar-hazards`). Desde `feat/preparacion-eva`, añadir `backend.test_eva` (37 pruebas).

## Próxima tarea pequeña recomendada

El refugio radiológico ya está en la interfaz (`feat/completar-hazards`). Siguiente tarea pequeña: una prueba HTTP de **interacción entre hazards**, por ejemplo `confirmar_refugio` con una anomalía de entorno abierta (el motor devuelve 409), y comprobar en la interfaz que el conflicto se muestra sin reintento.
