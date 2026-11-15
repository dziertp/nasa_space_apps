# Escenarios del panel personal

`personal_panel.json` contiene exclusivamente **datos simulados** de SIM-001 y una misión ficticia. Los valores se escribieron con asistencia de OpenAI Codex el 14 de noviembre de 2026, sin sensores ni mediciones NASA. La procedencia y el método están también en `provenance`; el uso de IA se detalla en [AI_DISCLOSURE](../../docs/AI_DISCLOSURE.md).

| ID | Comportamiento esperado |
| --- | --- |
| `estables` | Tres lecturas disponibles y siete registros diarios con poca variación. |
| `descanso-reducido` | Sueño de 8 a 4,4 horas y fatiga de 2 a 8 en siete días; es un guion, no una inferencia causal. |
| `sensor-sin-senal` | Lectura cardíaca antigua conservada; SpO₂ y temperatura ausentes (`value` y `measured_at` son `null`). El historial diario permanece disponible. |

El reloj simulado está fijado en `2026-11-14T12:00:00-03:00`, independiente del reloj del computador. La regla de interfaz del equipo clasifica como `stale` una lectura con más de 15 minutos respecto a ese reloj; no es una regla de NASA ni un límite médico. `available` indica dato recibido, no salud normal; `missing` se muestra «Sin datos». Nunca reemplazar `null` por cero.

Las fechas llevan zona horaria. La interfaz muestra hora de Chile (`America/Santiago`). El historial corresponde a registros diarios de sueño en horas y fatiga percibida en una escala ficticia 0–10 (menor–mayor), sin validación clínica. No se aplica la regla de antigüedad de sensores al historial fechado.

FastAPI lee este archivo local desde `/api/scenarios` y `/api/scenarios/{id}`. No se importa OSD-575 ni se consulta internet durante el uso. Risks/Hazards respaldan el contexto y la decisión de diseño, nunca los valores sintéticos o umbrales.
