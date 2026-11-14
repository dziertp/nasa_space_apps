# Salud de astronautas | NASA Space Apps 2026

Prototipo para ayudar a la tripulación a registrar indicadores de salud, entender cambios y consultar orientación durante una misión.

## Alcance inicial

- Panel personal: mediciones, tendencias y calidad de los datos.
- Medición guiada: cómo medir, por qué importa y registro del resultado.
- Registro diario de sueño, fatiga, ánimo y síntomas.
- Alertas explicables y flujo de emergencia con protocolos de referencia pendientes de seleccionar y revisar.
- Vista completa para tableta y vista resumida de casco, simulada en navegador.
- Funcionamiento local; sensores y escenarios sintéticos identificados como simulados.

Estado: estructura inicial del repositorio. La aplicación todavía no está implementada. El prototipo no está validado para uso clínico.

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

Archivos y ubicaciones: [guía de datos](data/README.md). Referencias: [fuentes](docs/references/README.md).

## Trabajo en equipo

Clonar el repositorio y abrirlo en VS Code. Cada tarea se desarrolla en una rama y se integra mediante un pull request.

Comandos: [flujo de colaboración](docs/WORKFLOW.md).
