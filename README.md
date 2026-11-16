# Salud de astronautas | NASA Space Apps 2026

Prototipo para ayudar a la tripulación a registrar indicadores de salud, entender cambios y consultar orientación durante una misión.

## Alcance inicial

- Panel personal: mediciones, tendencias y calidad de los datos.
- Medición guiada: cómo medir, por qué importa y registro del resultado.
- Registro diario de sueño, fatiga, ánimo y síntomas.
- Alertas explicables y flujo de emergencia con protocolos de referencia pendientes de seleccionar y revisar.
- Vista completa para tableta y visor HUD de casco, simulado en navegador.
- Funcionamiento local; sensores y escenarios sintéticos identificados como simulados.

Estado: panel personal de SIM-001 con tres mediciones simuladas, siete días de sueño/fatiga y tres escenarios locales; estado simulado del traje; y un motor de misión simulada compartida con cinco hazards. La radiación aparece en Salud, el hábitat en Nave y los cinco recorridos del motor se completan desde Hazards; en EVA, la anomalía de presión del traje se ve en Traje. La conexión con la API y la disponibilidad de las mediciones se muestran por separado. La importación del CSV, sensores reales, registro editable y alertas clínicas quedan fuera de este hito. El prototipo no está validado para uso clínico.

La interfaz es una consola con módulos navegables para **Tableta · estación** y **Casco · EVA**. Salud, Estado del traje, Nave, Hazards y la preparación de EVA (tableta) están activos, y el casco muestra un visor HUD con dock de sistemas; Tripulación y el replay de expedición siguen **En diseño**. Ideas y condiciones: [módulos](docs/MODULES_ROADMAP.md). El estilo visual es propio. Una barra superior fija muestra el tripulante, el reloj de demostración, el escenario, la conexión con la API y **Datos simulados**. La tableta usa un riel de módulos con iconos y tarjetas tipo dashboard; el casco, un visor limpio en reposo que solo muestra un aviso cuando la situación lo requiere.

## Tecnologías previstas

React + TypeScript + Vite para la interfaz; Python + FastAPI para la API y las reglas; SQLite para almacenamiento local.

## Organización

| Ruta | Contenido |
|---|---|
| frontend/ | Interfaz de tableta y visor |
| backend/ | API, reglas y almacenamiento |
| data/raw/ | Archivos de la fuente conservados sin modificaciones locales |
| data/metadata/ | Descripción de estudios, muestras y ensayos |
| data/processed/ | Transformaciones realizadas por el equipo |
| data/simulated/ | Datos sintéticos del prototipo |
| docs/references/ | Fuentes y referencias científicas |

## Datos iniciales

Estudio seleccionado: **OSD-575, SpaceX Inspiration4**. Incluye resultados de laboratorio; no representa telemetría continua de una muñequera. La misión duró tres días y contó con cuatro participantes.

El archivo `LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv` está disponible en `data/raw/OSD-575/`, junto con los metadatos del estudio. Sus resultados todavía no están integrados al panel: este usa exclusivamente [datos simulados](data/simulated/README.md), con procedencia y generación, sin resultados OSD-575 ni umbrales derivados de ellos. Los datos reales de NASA y los datos simulados conservan sus carpetas separadas.

Archivos y ubicaciones: [guía de datos](data/README.md). Referencias: [fuentes](docs/references/README.md).

## Instalación local en Windows

Entorno utilizado: PowerShell, Node.js 26.13.1, npm 11.20.0 y Python 3.13.13.
La instalación de dependencias necesita internet; después, ambos servicios funcionan localmente.

Desde la raíz del repositorio:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r .\backend\requirements.txt
```

Para instalar el frontend con la instalación existente de fnm:

```powershell
fnm env --use-on-cd --shell powershell | Out-String | Invoke-Expression
fnm use 26.13.1
Set-Location frontend
npm.cmd ci
Set-Location ..
```

Si Node ya está disponible sin fnm, omitir las dos líneas de fnm. Se usa `npm.cmd` para evitar restricciones de ejecución de scripts de PowerShell.

`npm.cmd ci` instala también las fuentes de la interfaz: `@fontsource/chakra-petch` (títulos y cifras), `@fontsource/atkinson-hyperlegible` (texto) y `@fontsource/jetbrains-mono` (etiquetas y datos), versión 5.3.0 y licencia OFL-1.1. Se empaquetan en la compilación: la interfaz no consulta Google Fonts ni otros CDN y funciona sin internet. Quien ya tenga `frontend/node_modules` debe repetir `npm.cmd ci` después de actualizar la rama.

En VS Code, abrir la raíz del proyecto y ejecutar `Python: Select Interpreter` desde la paleta (`Ctrl+Shift+P`). Seleccionar `.venv\Scripts\python.exe`; si no aparece, elegir `Enter interpreter path` e indicar ese archivo. Si falta el comando, habilitar la extensión Python de Microsoft.
Los comandos siguientes usan el intérprete explícito y no requieren activar el entorno ni cambiar la política de ejecución.

## Ejecutar los servicios

Abrir dos terminales de PowerShell en la raíz del repositorio.

Terminal 1 — API:

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Sin `--reload` y con un solo proceso: el motor guarda la misión en memoria y cada recarga de Uvicorn la reinicia ([traspaso técnico](docs/TECHNICAL_HANDOFF.md)).

Terminal 2 — interfaz:

```powershell
fnm env --use-on-cd --shell powershell | Out-String | Invoke-Expression
fnm use 26.13.1
Set-Location frontend
npm.cmd run dev
```

Abrir **http://127.0.0.1:5173**. Vite reenvía `/api` a **http://127.0.0.1:8000**, conservando la ruta. El puerto 5173 es fijo; si está ocupado, detener el otro servicio antes de iniciar Vite.

La conexión muestra **Cargando** al consultar `/api/health`, **Conectado** cuando recibe `{"status":"ok"}` y **Error** si falla o no responde en cinco segundos. La lista y los datos de cada escenario se cargan por separado. El botón permite volver a comprobar; los estados corresponden a la última consulta, sin sondeo continuo.
Detener cada servicio con `Ctrl+C`.

## Demostrar el panel personal

Con ambos servicios iniciados, abrir http://127.0.0.1:5173 y seleccionar:

| Escenario | Qué comprobar |
| --- | --- |
| Mediciones estables | SIM-001, misión ficticia, tres lecturas disponibles con unidad, fecha/hora y procedencia; siete días de sueño/fatiga con barras. |
| Disminución sostenida del sueño y aumento de fatiga | Las horas bajan de 8 a 4,4 y la fatiga sube de 2 a 8. Es un guion sintético sin diagnóstico ni alerta. |
| Sensor sin señal | API **Conectado**, lectura cardíaca **Desactualizado**, SpO₂ y temperatura **Sin datos** (`null`). El registro diario conserva su historial. |

En la tableta, dos gráficos pequeños acompañan a la tabla de sueño y fatiga, uno por medida y cada uno con su escala. Se recorren con el puntero o con ← → al enfocarlos; la tabla conserva todos los valores. También se puede cambiar a **Casco · EVA** para ver el visor (sección [Visor del casco](#visor-del-casco)), o abrir **Hazards** y pulsar un escenario para cargarlo en Salud; el peligro con el escenario activo queda resaltado.

### Motor de misión simulada

Una sola misión compartida por proceso del backend (`/api/mission`). Cada sección la consulta al abrirse o con su botón **Actualizar**; no hay actualización automática. Las escrituras envían `instance_id` y `revision`: si otro cliente cambió la misión, la acción no se aplica (HTTP 409) y se vuelve a consultar.

| Módulo | Qué comprobar |
| --- | --- |
| Hazards | Cada peligro muestra su escenario del motor: **Inactivo**, **Activo · fase** o **Finalizado · fase**. Con el guion abierto, la tarjeta muestra la fase, el siguiente paso, el reconocimiento y los botones de las acciones de esa fase. **Actividad de misión** cambia entre interior y EVA (bloqueado con radiación o entorno abiertos). Radiación requiere interior. Los escenarios del panel siguen en la misma tarjeta. |
| Hazards · recorridos | **Radiación**: refugio, confirmación y fin. **Aislamiento**: contacto, seguimiento y recuperación (avanza el reloj 7 días). **Distancia**: informe pendiente, recuperar enlace y **Avanzar reloj simulado** hasta la entrega. **Gravedad**: descartar, o confirmar y cerrar, sin inferir lesiones. **Entorno**: comprobación, contención y restauración, en hábitat (interior) o traje (EVA). |
| Salud (tableta) | **Estado radiológico**: dosis 0,2 mSv y tasa 0,001 mSv/h; al activar radiación, 0,08 mSv/h, aviso vigente, reconocimiento y los pasos del refugio ilustrativo. La escala del medidor (0–0,1 mSv/h) es de visualización, no un límite. |
| Nave (tableta) | **Estado ambiental del hábitat**: 101,3 kPa; la anomalía baja a 80 kPa. Reconocer y los tres pasos de recuperación restauran 101,3 kPa. **Reiniciar demostración de misión** restablece toda la misión para todos los clientes. |

| Traje | En EVA, con la anomalía de entorno abierta, Presión muestra 22 kPa en **Crítico** con la etiqueta «Motor de misión»: el motor tiene prioridad sobre el estado base del traje hasta restaurar la presión. |

Avanzar el reloj (recuperación de aislamiento, entrega de distancia) también suma a la dosis acumulada la tasa programada del motor. Valores, prioridades y procedimientos son decisiones propias de demostración, no protocolos NASA ni límites clínicos.

### Preparación de EVA

Abrir **Misión** en **Tableta · estación**:

| Paso | Qué comprobar |
| --- | --- |
| Elegir recorrido y equipamiento | Tres recorridos ficticios y siete elementos. Cada cambio pide `POST /api/eva/estimate` y actualiza tres medidores: duración, carga y batería al volver. Por defecto (Cráter Alfa con kit, contenedores y cámara): 99 min, 11 kg y 81,4 %. |
| Aviso de planificación | Llanura Gamma con todo el equipamiento supera los tres límites ficticios (31,8 kg, 446 min, batería agotada) y explica cada motivo. El aviso es de planificación, no clínico, y no impide iniciar. |
| **Iniciar EVA** | Guarda el plan en el motor de misión (`POST /api/mission/eva/start`) y cambia la actividad a EVA con la misma regla que el selector de Hazards. Con un guion de radiación o de entorno abierto, el botón queda bloqueado y muestra el motivo. |
| Casco · dock **Misión** | Objetivos, punto de retorno, tiempo estimado y equipamiento; el reloj superior pasa a **Tiempo de EVA**. Sin plan activo: «Sin plan de EVA; prepáralo en la tableta». |
| **Terminar EVA** | Vuelve a Interior y conserva el plan como último plan. Cambiar a Interior desde Hazards también lo termina. |

El plan vive en la memoria del motor: se pierde al reiniciar el backend o la misión, como el resto de la misión simulada. Recorridos, equipamiento, límites y fórmulas están en `data/simulated/eva_planning.json` ([detalle](data/simulated/README.md#preparación-de-eva)); son ficticios, no especificaciones NASA ni límites clínicos.

### Visor del casco

Cambiar a **Casco · EVA**. La consola se convierte en un visor sobre un horizonte lunar dibujado en SVG, sin imágenes externas:

| Situación | Qué comprobar |
| --- | --- |
| Reposo (Mediciones estables) | Arriba, **Traje EVA · Nominal**, el reloj de misión y el enlace (**Retardo 10 min**). A la izquierda, pulso, SpO₂ y O₂ del traje con su antigüedad («hace 2 min»). Abajo, el dock y «Datos simulados · Interfaz propuesta». Ningún aviso. |
| Sensor sin señal | Pulso **Desactualizado · hace 2 h** y SpO₂ **Sin datos** en ámbar. El aviso principal es Comunicaciones (Precaución) y **+3 avisos** despliega la lista. Puntos en Traje, Comunicaciones y Salud. |
| Radiación activa (desde Hazards en la tableta) | Aviso **Crítico** con la tasa, tres pasos ilustrativos y botones reales: **Iniciar refugio ilustrativo** y **Reconocer aviso**. |
| Presión del traje en EVA | **Traje EVA · Crítico**, aviso de presión a 22 kPa con el paso siguiente del motor y punto en Presión. |
| Dock | Ocho sistemas (Traje, O₂, Batería, Presión, Comunicaciones, Salud, Misión, Hazards). Cada uno abre un panel de vidrio que se cierra con **Esc** o **Cerrar**; **Abrir detalle en tableta** cambia al módulo de la tableta. Flechas izquierda y derecha recorren el dock. |
| **Acerca de estos datos** | Procedencia, criterios del traje y criterio de orden de los avisos, fuera de la vista principal. |

El orden de los avisos (crítico > precaución > sin datos; luego motor, traje, plan y lecturas) es un criterio del equipo pendiente de revisión, y los pasos están marcados «Ilustrativo · pendiente de revisión». El aviso entra con una animación corta y se anuncia a los lectores de pantalla; las animaciones se desactivan con «reducir movimiento». Las imágenes de referencia del equipo eran conceptos generados con IA y solo sirvieron de inspiración: no se incluyen en el repositorio.

### Estado del traje

Abrir **Traje** en **Tableta · estación** o en **Casco · EVA** y cambiar el escenario en el selector:

| Escenario | Resumen | Qué comprobar |
| --- | --- | --- |
| Mediciones estables | 6 correctas · 0 precauciones · 0 críticas | Seis partes en **Correcto**; el detalle se abre en Casco y visor. |
| Disminución sostenida del sueño y aumento de fatiga | 4 correctas · 2 precauciones · 0 críticas | Batería 34 % y Guantes en **Precaución**; el detalle se abre en Guantes. Guion independiente del sueño y la fatiga. |
| Sensor sin señal | 5 correctas · 1 precaución · 0 críticas | Comunicaciones 38 % en **Precaución**; las demás partes, correctas. |

En la tableta:
- Tres medidores en arco para O₂, batería y presión. Sus escalas, 0–100 % y 0–35 kPa, son de visualización, no criterios.
- Una silueta con las seis partes numeradas, sincronizada con la cuadrícula y el detalle. Se recorre con las flechas.

En el casco, el panel **Traje** del dock muestra la silueta y la lista de partes; al tocar una se ven su riesgo y su indicación.

Cada estado combina color, texto y forma: círculo (Correcto), triángulo (Precaución) y cuadrado (Crítico). Solo los estados críticos pulsan. Esa animación y las transiciones entre módulos se desactivan si el sistema pide reducir el movimiento. Tocar una parte muestra lectura, observación, posible riesgo, indicación, criterio del equipo y procedencia. Las indicaciones llevan la marca **Protocolo pendiente de fuente y revisión**. Estados y criterios son decisiones del equipo, no límites de NASA, de un fabricante ni clínicos. **Sin valor numérico** identifica partes sin magnitud (casco y guantes); **Sin datos** queda para valores ausentes. Detalle de los datos: [estado del traje](data/simulated/README.md#estado-del-traje).

Todos los escenarios muestran **Datos simulados**. El reloj de demostración está fijado en `2026-11-14T12:00:00-03:00`; no avanza con el reloj del equipo. La regla propia de más de 15 minutos solo clasifica antigüedad de sensores respecto a ese reloj, sin significado clínico. El historial diario no usa esa regla.

Detener el backend y pulsar **Volver a comprobar** permite demostrar el error de conexión/carga, que no se presenta como ausencia de un dato de sensor. Reiniciar el backend y volver a comprobar recupera el panel. No se guardan selecciones o mediciones del usuario entre sesiones.

Los valores y el texto explicativo se sirven desde archivos locales, sin consultas externas durante el uso. La explicación de sueño/fatiga se basa en [NASA Risks](https://www.nasa.gov/hrp/risks/); la autonomía local es una decisión de diseño apoyada en el contexto de [NASA Hazards](https://www.nasa.gov/hrp/hazards/). Abrir esas fuentes requiere internet, pero leer la explicación local no. Los valores sintéticos y reglas propias no se atribuyen a NASA.

## Comprobaciones

Con ambos servicios en ejecución, desde otra terminal en la raíz:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/health | ConvertTo-Json -Compress
Invoke-RestMethod http://127.0.0.1:5173/api/health | ConvertTo-Json -Compress
```

Ambas consultas deben devolver `{"status":"ok"}`; la segunda comprueba el proxy.
La API también ofrece `GET /api/scenarios`, `GET /api/scenarios/{id}` y `GET /api/scenarios/{id}/suit` (`estables`, `descanso-reducido`, `sensor-sin-senal`). Un ID desconocido devuelve 404. La preparación de EVA usa `GET /api/eva/catalog` y `POST /api/eva/estimate` (sin efectos en la misión). El motor usa `GET /api/mission` y escrituras `POST /api/mission/...`; contratos en el [traspaso técnico](docs/TECHNICAL_HANDOFF.md).

Las pruebas del backend arrancan su propio servidor temporal en un puerto libre y lo cierran al terminar. No requieren servicios ya iniciados ni dependencias de prueba adicionales:

```powershell
.\.venv\Scripts\python.exe -m unittest backend.test_panel backend.test_suit backend.test_eva -v
```

Para comprobar TypeScript y generar la compilación del frontend:

```powershell
fnm env --use-on-cd --shell powershell | Out-String | Invoke-Expression
fnm use 26.13.1
Set-Location frontend
npm.cmd run build
Set-Location ..
```

La compilación se guarda en `frontend/dist/`, excluida de Git. El proxy está configurado para desarrollo; un despliegue futuro deberá servir `/api` con su propia configuración.

Pasan 37 pruebas de API/contrato de datos: 18 en `test_panel.py` (7 del panel y 11 del motor, con los recorridos completos de aislamiento, distancia, gravedad y entorno en EVA), 9 en `test_suit.py` y 10 en `test_eva.py` (catálogo, fórmulas, plan en el motor, 409 y bloqueo por guion abierto). También pasa la compilación TypeScript/Vite. Tableta y casco se revisaron en Edge mediante sesiones automatizadas: rediseño a 1440, 1024 y 390 px; integración del motor a 1440 y 390 px; los cinco recorridos desde Hazards, con doble clic, conflicto 409 y la presión del motor en Traje; la preparación de EVA (tableta → iniciar → casco → terminar) a 1440 y 390 px; y el visor del casco (reposo, sensor sin señal, radiación, presión en EVA, panel Traje, varios avisos y teclado) a 1440 y 390 px ([detalle](docs/AI_DISCLOSURE.md#verificaciones-y-su-procedencia)). Quedan pendientes la revisión humana en navegador y la accesibilidad con tecnologías de asistencia; no están cubiertas por esas pruebas.

## Fuentes, IA y entrega

[Fuentes y relación con las funciones](docs/references/README.md) · [Uso conocido de IA](docs/AI_DISCLOSURE.md) · [Revisión de requisitos de entrega](docs/DELIVERY_REQUIREMENTS.md).

La revisión de entrega conserva contexto histórico y pendientes de confirmar; no implica que el proyecto esté publicado, licenciado o enviado.

### Public summary (draft)

Health Monitoring Software is a local astronaut health prototype built with React, TypeScript, Vite and FastAPI. Its first personal panel uses a fictional crew member (SIM-001), synthetic sensor readings and seven days of sleep/fatigue records. Three scenarios demonstrate stable readings, decreasing sleep with increasing fatigue, and sensor signal loss. NASA Risks and Hazards inform the educational context and local design; synthetic values and display rules are team decisions. This prototype has no clinical validation. See the [AI disclosure](docs/AI_DISCLOSURE.md) and [sources](docs/references/README.md).

## Trabajo en equipo

Clonar el repositorio y abrirlo en VS Code. Cada tarea se desarrolla en una rama y se integra mediante un pull request.

Comandos: [flujo de colaboración](docs/WORKFLOW.md).
