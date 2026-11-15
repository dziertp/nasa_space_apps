# Módulos de la consola: lluvia de ideas y estado

Fuente: lluvia de ideas del equipo (2026-11-15). Este documento separa lo implementado de lo previsto y anota las condiciones de cada idea. El mapa visible está en `frontend/src/modules.ts`.

## Implementado en este hito

- Selector de dispositivo simulado: **Tableta · estación** (vista completa) y **Casco · EVA** (visor HUD de alto contraste con pocos datos grandes).
- **Sistema visual propio** (2026-11-15):
  - barra superior fija con tripulante, reloj de demostración, escenario, conexión y «Datos simulados»;
  - riel de módulos con iconos SVG y tarjetas tipo dashboard;
  - fuentes locales con @fontsource;
  - transiciones cortas y pulso solo en estados críticos, ambos desactivados con «reducir movimiento».
- Navegación por módulos numerados (pestañas con flechas, Inicio y Fin). Los módulos sin contenido muestran **En diseño** y la lista de funciones previstas.
- **Salud**: panel personal existente en tableta; resumen de tres lecturas y último registro diario en casco.
- **Hazards**: los cinco peligros de [NASA 5 Hazards](https://www.nasa.gov/hrp/hazards/) con los escenarios actuales asignados. Pulsar un escenario lo carga en Salud. La asignación es una decisión del equipo.

| Peligro | Escenarios asignados |
| --- | --- |
| Aislamiento y confinamiento | `descanso-reducido`, `estables` |
| Distancia de la Tierra | `sensor-sin-senal` |
| Radiación, gravedad, entornos hostiles | Ninguno todavía |

- **Estado del traje** (2026-11-15; en tableta desde el rediseño visual): en la tableta, medidores en arco de O₂, batería y presión y una silueta sincronizada con la cuadrícula; en el casco, visor HUD. Seis partes (casco y visor, guantes, soporte vital · O₂, batería, presión, comunicaciones) con estado **Correcto / Precaución / Crítico** en color, texto y forma; resumen por estado y, al tocar una parte, lectura, observación, posible riesgo, indicación, criterio del equipo y procedencia. Datos en `data/simulated/suit_status.json`, servidos por `GET /api/scenarios/{id}/suit`. Cada indicación lleva la marca «Protocolo pendiente de fuente y revisión»; estados y criterios son decisiones del equipo.

## Previsto (sin implementar)

| Dispositivo | Módulo | Idea | Condición |
| --- | --- | --- | --- |
| Casco | Estado del traje | Protocolos con fuente, evolución durante la EVA y consumo de batería/O₂ según la preparación | Indicaciones actuales pendientes de fuente y revisión; valores, criterios y fórmulas simulados. |
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
- Orden sugerido para lo que falta: preparación de EVA con efecto en el casco → tripulación/localizador → replay. El estado del traje simulado, primer paso del orden original, ya está implementado.
- Revisar con el equipo los criterios del traje (umbrales de batería, O₂, presión y enlace) y elegir fuentes para sus indicaciones.
- El estilo de consola es propio; no reproduce la marca ni el diseño de ningún videojuego.
