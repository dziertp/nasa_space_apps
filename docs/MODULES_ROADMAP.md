# Módulos de la consola: lluvia de ideas y estado

Fuente: lluvia de ideas del equipo (2026-11-15). Este documento separa lo implementado de lo previsto y anota las condiciones de cada idea. El mapa visible está en `frontend/src/modules.ts`.

## Implementado en este hito

- Selector de dispositivo simulado: **Tableta · estación** (vista completa) y **Casco · EVA** (vista resumida, alto contraste, monoespaciada).
- Navegación por módulos numerados (pestañas con flechas, Inicio y Fin). Los módulos sin contenido muestran **En diseño** y la lista de funciones previstas.
- **Salud**: panel personal existente en tableta; resumen de tres lecturas y último registro diario en casco.
- **Hazards**: los cinco peligros de [NASA 5 Hazards](https://www.nasa.gov/hrp/hazards/) con los escenarios actuales asignados. Pulsar un escenario lo carga en Salud. La asignación es una decisión del equipo.

| Peligro | Escenarios asignados |
| --- | --- |
| Aislamiento y confinamiento | `descanso-reducido`, `estables` |
| Distancia de la Tierra | `sensor-sin-senal` |
| Radiación, gravedad, entornos hostiles | Ninguno todavía |

## Previsto (sin implementar)

| Dispositivo | Módulo | Idea | Condición |
| --- | --- | --- | --- |
| Casco | Estado del traje | Partes del traje en verde/amarillo/rojo con riesgo e indicación | Colores siempre con texto; valores y criterios simulados; protocolos pendientes de fuente y revisión. |
| Casco | Salud | Radiación acumulada | Simulada; sin límites clínicos o de misión sin fuente revisada. |
| Casco | Salud | Botón de ayuda → médico en tiempo real o IA | Requiere comunicaciones: simular retardo y pérdida de señal. La IA no diagnostica. |
| Casco | Misión, Equipamiento | Objetivos, contexto e inventario de la EVA | Inventario procedente de la preparación en tableta. |
| Ambos | Tripulación | Vista en vivo de compañeros, anotaciones compartidas, localizador/baliza y orientación con audio opcional | Requiere comunicaciones; posiciones simuladas. |
| Tableta | Misión y equipamiento | Preparación de EVA: recorrido y equipamiento cambian duración, carga y batería estimadas, con consecuencias visibles en el casco | Fórmulas propias y simuladas. |
| Tableta | Misión y equipamiento | Replay de expedición en línea de tiempo | Requiere registrar eventos del escenario. |
| Tableta | Nave | Estado del hábitat | Contenido por definir. |
| Ambos | Hazards | Añadir escenarios desde experiencias del usuario y clasificarlos con IA | Revisión humana obligatoria; funcionar sin internet; indicaciones con fuente. |

## Pendiente de decidir

- La lluvia de ideas cita "Salud Usuario: Det…" en la tableta; el texto quedó incompleto.
- Orden de implementación sugerido: estado del traje (simulado) → preparación de EVA con efecto en el casco → tripulación/localizador → replay.
- El estilo de consola es propio; no reproduce la marca ni el diseño de ningún videojuego.
