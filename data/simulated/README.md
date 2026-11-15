# Datos simulados

## Panel personal

`personal_panel.json` contiene exclusivamente **datos simulados** de SIM-001 y una misión ficticia. Los valores se escribieron con asistencia de OpenAI Codex el 14 de noviembre de 2026, sin sensores ni mediciones NASA. La procedencia y el método están también en `provenance`; el uso de IA se detalla en [AI_DISCLOSURE](../../docs/AI_DISCLOSURE.md).

| ID | Comportamiento esperado |
| --- | --- |
| `estables` | Tres lecturas disponibles y siete registros diarios con poca variación. |
| `descanso-reducido` | Sueño de 8 a 4,4 horas y fatiga de 2 a 8 en siete días; es un guion, no una inferencia causal. |
| `sensor-sin-senal` | Lectura cardíaca antigua conservada; SpO₂ y temperatura ausentes (`value` y `measured_at` son `null`). El historial diario permanece disponible. |

El reloj simulado está fijado en `2026-11-14T12:00:00-03:00`, independiente del reloj del computador. La regla de interfaz del equipo clasifica como `stale` una lectura con más de 15 minutos respecto a ese reloj; no es una regla de NASA ni un límite médico. `available` indica dato recibido, no salud normal; `missing` se muestra «Sin datos». Nunca reemplazar `null` por cero.

Las fechas llevan zona horaria. La interfaz muestra hora de Chile (`America/Santiago`). El historial corresponde a registros diarios de sueño en horas y fatiga percibida en una escala ficticia 0–10 (menor–mayor), sin validación clínica. No se aplica la regla de antigüedad de sensores al historial fechado.

FastAPI lee este archivo local desde `/api/scenarios` y `/api/scenarios/{id}`. No se importa OSD-575 ni se consulta internet durante el uso. Risks/Hazards respaldan el contexto y la decisión de diseño, nunca los valores sintéticos o umbrales.

## Estado del traje

`suit_status.json` contiene exclusivamente **datos simulados** del traje EVA ficticio de SIM-001 (`SIM-SUIT-001`). Estados, valores y textos se escribieron con asistencia de Claude Code el 15 de noviembre de 2026, sin telemetría de trajes reales ni mediciones NASA; la procedencia está también en `provenance`.

`parts` define seis partes con magnitud, unidad, procedencia simulada y criterio del equipo. Cada escenario asigna a cada parte estado (`ok`, `precaucion`, `critico`), valor, observación, posible riesgo e indicación. Todas las indicaciones llevan `indication_review: "Protocolo pendiente de fuente y revisión"`.

| ID | Estado del traje |
| --- | --- |
| `estables` | Seis partes en `ok`. |
| `descanso-reducido` | Batería 14 % en `critico` y guantes en `precaucion`. Guion independiente del sueño y la fatiga: no se deduce de ellos. |
| `sensor-sin-senal` | Comunicaciones 38 % en `precaucion`; coincide con la falta de lecturas de salud sin establecer una causa. |

Casco y guantes no tienen magnitud numérica: `measure`, `unit` y `value` son `null` y la interfaz muestra «Sin valor numérico». En una parte con unidad, `value: null` significa «Sin datos»; nunca reemplazarlo por cero. Los criterios (por ejemplo, batería crítica por debajo de 20 %) y la presión nominal de guion de 29,6 kPa son decisiones del equipo sin fuente revisada: no son especificaciones de NASA ni de un fabricante, ni límites clínicos. Los estados se asignan a mano en cada escenario; Pydantic valida la estructura, pero no recalcula los estados desde los criterios.

FastAPI lee este archivo en `/api/scenarios/{id}/suit`; un ID desconocido devuelve 404.
