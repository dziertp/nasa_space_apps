# Salud de astronautas | NASA Space Apps 2026

Prototipo para ayudar a la tripulación a registrar indicadores de salud, entender cambios y consultar orientación durante una misión.

## Alcance inicial

- Panel personal: mediciones, tendencias y calidad de los datos.
- Medición guiada: cómo medir, por qué importa y registro del resultado.
- Registro diario de sueño, fatiga, ánimo y síntomas.
- Alertas explicables y flujo de emergencia con protocolos de referencia pendientes de seleccionar y revisar.
- Vista completa para tableta y vista resumida de casco, simulada en navegador.
- Funcionamiento local; sensores y escenarios sintéticos identificados como simulados.

Estado: base ejecutable con pantalla inicial y comprobación de conexión con la API local. La importación del CSV y el dashboard quedan para tareas posteriores. El prototipo no está validado para uso clínico.

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

En este repositorio contamos con metadatos; el CSV CMP está pendiente de incorporar. La pantalla inicial no muestra resultados biomédicos. Los datos reales de NASA y los datos simulados conservan sus carpetas separadas.

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

La pantalla muestra **Cargando** al consultar, **Conectado** cuando recibe `{"status":"ok"}` y **Error** ante una respuesta inválida o si no responde en cinco segundos. El botón permite volver a comprobar; el estado corresponde a la última consulta, sin sondeo continuo.
Detener cada servicio con `Ctrl+C`.

## Comprobaciones

Con ambos servicios en ejecución, desde otra terminal en la raíz:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/health | ConvertTo-Json -Compress
Invoke-RestMethod http://127.0.0.1:5173/api/health | ConvertTo-Json -Compress
```

Ambas consultas deben devolver `{"status":"ok"}`; la segunda comprueba el proxy.
Para comprobar TypeScript y generar la compilación del frontend:

```powershell
fnm env --use-on-cd --shell powershell | Out-String | Invoke-Expression
fnm use 26.13.1
Set-Location frontend
npm.cmd run build
Set-Location ..
```

La compilación se guarda en `frontend/dist/`, excluida de Git. El proxy está configurado para desarrollo; un despliegue futuro deberá servir `/api` con su propia configuración.

## Trabajo en equipo

Clonar el repositorio y abrirlo en VS Code. Cada tarea se desarrolla en una rama y se integra mediante un pull request.

Comandos: [flujo de colaboración](docs/WORKFLOW.md).
