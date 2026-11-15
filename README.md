# Salud de astronautas | NASA Space Apps 2026

Prototipo para ayudar a la tripulación a registrar indicadores de salud, entender cambios y consultar orientación durante una misión.

## Alcance inicial

- Panel personal: mediciones, tendencias y calidad de los datos.
- Medición guiada: cómo medir, por qué importa y registro del resultado.
- Registro diario de sueño, fatiga, ánimo y síntomas.
- Alertas explicables y flujo de emergencia con protocolos de referencia pendientes de seleccionar y revisar.
- Vista completa para tableta y vista resumida de casco, simulada en navegador.
- Funcionamiento local; sensores y escenarios sintéticos identificados como simulados.

Estado: primer panel personal de SIM-001 y una misión ficticia, con tres mediciones simuladas, siete días de sueño/fatiga y tres escenarios locales. La conexión con la API y la disponibilidad de las mediciones se muestran por separado. La importación del CSV, sensores reales, registro editable y alertas clínicas quedan fuera de este hito. El prototipo no está validado para uso clínico.

La interfaz es una consola con módulos navegables para **Tableta · estación** y **Casco · EVA**. Salud, Hazards y Estado del traje (solo en el casco) están activos; misión, equipamiento, tripulación y nave están **En diseño**. Ideas y condiciones: [módulos](docs/MODULES_ROADMAP.md).

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

En VS Code, abrir la raíz del proyecto y ejecutar `Python: Select Interpreter` desde la paleta (`Ctrl+Shift+P`). Seleccionar `.venv\Scripts\python.exe`; si no aparece, elegir `Enter interpreter path` e indicar ese archivo. Si falta el comando, habilitar la extensión Python de Microsoft.
Los comandos siguientes usan el intérprete explícito y no requieren activar el entorno ni cambiar la política de ejecución.

## Ejecutar los servicios

Abrir dos terminales de PowerShell en la raíz del repositorio.

Terminal 1 — API:

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

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

También se puede cambiar a **Casco · EVA** para ver el resumen de salud, o abrir **Hazards** y pulsar un escenario para cargarlo en Salud.

### Estado del traje

En **Casco · EVA**, abrir **Traje** y cambiar el escenario en el selector:

| Escenario | Resumen | Qué comprobar |
| --- | --- | --- |
| Mediciones estables | 6 correctas · 0 precauciones · 0 críticas | Seis partes en **Correcto**; el detalle se abre en Casco y visor. |
| Disminución sostenida del sueño y aumento de fatiga | 4 correctas · 1 precaución · 1 crítica | Batería 14 % en **Crítico**, con el detalle abierto, y Guantes en **Precaución**. Guion independiente del sueño y la fatiga. |
| Sensor sin señal | 5 correctas · 1 precaución · 0 críticas | Comunicaciones 38 % en **Precaución**; las demás partes, correctas. |

Cada estado combina color, texto y forma: círculo (Correcto), triángulo (Precaución) y cuadrado (Crítico). Tocar una parte muestra lectura, observación, posible riesgo, indicación, criterio del equipo y procedencia. Las indicaciones llevan la marca **Protocolo pendiente de fuente y revisión**. Estados y criterios son decisiones del equipo, no límites de NASA, de un fabricante ni clínicos. **Sin valor numérico** identifica partes sin magnitud (casco y guantes); **Sin datos** queda para valores ausentes. Detalle de los datos: [estado del traje](data/simulated/README.md#estado-del-traje).

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
La API también ofrece `GET /api/scenarios`, `GET /api/scenarios/{id}` y `GET /api/scenarios/{id}/suit` (`estables`, `descanso-reducido`, `sensor-sin-senal`). Un ID desconocido devuelve 404.

Las pruebas del backend arrancan su propio servidor temporal en un puerto libre y lo cierran al terminar. No requieren servicios ya iniciados ni dependencias de prueba adicionales:

```powershell
.\.venv\Scripts\python.exe -m unittest backend.test_panel backend.test_suit -v
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

Con el estado del traje pasaron 16 pruebas de API/contrato de datos (7 del panel y 9 del traje) y la compilación TypeScript/Vite. El casco con los tres escenarios se revisó en Edge mediante una sesión automatizada ([detalle](docs/AI_DISCLOSURE.md#verificaciones-y-su-procedencia)). Quedan pendientes la revisión humana en navegador y la accesibilidad con tecnologías de asistencia; no están cubiertas por esas pruebas.

## Fuentes, IA y entrega

[Fuentes y relación con las funciones](docs/references/README.md) · [Uso conocido de IA](docs/AI_DISCLOSURE.md) · [Revisión de requisitos de entrega](docs/DELIVERY_REQUIREMENTS.md).

La revisión de entrega conserva contexto histórico y pendientes de confirmar; no implica que el proyecto esté publicado, licenciado o enviado.

### Public summary (draft)

Health Monitoring Software is a local astronaut health prototype built with React, TypeScript, Vite and FastAPI. Its first personal panel uses a fictional crew member (SIM-001), synthetic sensor readings and seven days of sleep/fatigue records. Three scenarios demonstrate stable readings, decreasing sleep with increasing fatigue, and sensor signal loss. NASA Risks and Hazards inform the educational context and local design; synthetic values and display rules are team decisions. This prototype has no clinical validation. See the [AI disclosure](docs/AI_DISCLOSURE.md) and [sources](docs/references/README.md).

## Trabajo en equipo

Clonar el repositorio y abrirlo en VS Code. Cada tarea se desarrolla en una rama y se integra mediante un pull request.

Comandos: [flujo de colaboración](docs/WORKFLOW.md).
