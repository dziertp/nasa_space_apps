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
- **Salud**: panel personal en tableta; resumen de tres lecturas y último registro diario en casco. Desde la integración del motor (2026-11-15) incluye el **estado radiológico** de la misión simulada: completo en tableta (activar, reconocer, dosis, tasa y aviso) y, en el casco, solo dosis, tasa y estado del aviso.
- **Nave** (tableta, activo desde la integración del motor): **estado ambiental del hábitat**, con presión, anomalía, reconocimiento, recuperación en tres pasos y reinicio de toda la misión.
- **Hazards**: los cinco peligros de [NASA 5 Hazards](https://www.nasa.gov/hrp/hazards/). Cada tarjeta muestra el escenario del motor (inactivo, fase actual o finalizado) con un botón para activarlo, y sus **escenarios de demostración del panel**. Pulsar un escenario del panel lo carga en Salud. La asignación es una decisión del equipo.

| Peligro | Escenario del motor | Escenarios del panel | Dónde continúa |
| --- | --- | --- | --- |
| Radiación | `radiacion` | Ninguno | Salud |
| Aislamiento y confinamiento | `aislamiento` | `descanso-reducido`, `estables` | Solo API |
| Distancia de la Tierra | `distancia` | `sensor-sin-senal` | Solo API |
| Gravedad | `gravedad` | Ninguno | Solo API |
| Entornos hostiles y cerrados | `entorno` | Ninguno | Nave (tableta) |

- **Estado del traje** (2026-11-15; en tableta desde el rediseño visual): en la tableta, medidores en arco de O₂, batería y presión y una silueta sincronizada con la cuadrícula; en el casco, visor HUD. Seis partes (casco y visor, guantes, soporte vital · O₂, batería, presión, comunicaciones) con estado **Correcto / Precaución / Crítico** en color, texto y forma; resumen por estado y, al tocar una parte, lectura, observación, posible riesgo, indicación, criterio del equipo y procedencia. Datos en `data/simulated/suit_status.json`, servidos por `GET /api/scenarios/{id}/suit`. Cada indicación lleva la marca «Protocolo pendiente de fuente y revisión»; estados y criterios son decisiones del equipo.

## Previsto (sin implementar)

| Dispositivo | Módulo | Idea | Condición |
| --- | --- | --- | --- |
| Casco | Estado del traje | Protocolos con fuente, evolución durante la EVA y consumo de batería/O₂ según la preparación | Indicaciones actuales pendientes de fuente y revisión; valores, criterios y fórmulas simulados. |
| Ambos | Salud | Refugio radiológico desde la interfaz y dosis al avanzar el reloj | Hoy el refugio solo avanza por API; sin límites clínicos o de misión sin fuente revisada. |
| Tableta | Hazards | Controles para los pasos de aislamiento, distancia y gravedad | Recorridos todavía no comprobados de extremo a extremo. |
| Casco | Salud | Botón de ayuda → médico en tiempo real o IA | Requiere comunicaciones: simular retardo y pérdida de señal. La IA no diagnostica. |
| Casco | Misión, Equipamiento | Objetivos, contexto e inventario de la EVA | Inventario procedente de la preparación en tableta. |
| Ambos | Tripulación | Vista en vivo de compañeros, anotaciones compartidas, localizador/baliza y orientación con audio opcional | Requiere comunicaciones; posiciones simuladas. |
| Tableta | Misión y equipamiento | Preparación de EVA: recorrido y equipamiento cambian duración, carga y batería estimadas, con consecuencias visibles en el casco | Fórmulas propias y simuladas. |
| Tableta | Misión y equipamiento | Replay de expedición en línea de tiempo | Requiere registrar eventos del escenario. |
| Tableta | Nave | Otros sistemas de la nave (energía, soporte vital del hábitat, comunicaciones) | Contenido por definir. |
| Ambos | Hazards | Añadir escenarios desde experiencias del usuario y clasificarlos con IA | Revisión humana obligatoria; funcionar sin internet; indicaciones con fuente. |

## Pendiente de decidir

- La lluvia de ideas cita "Salud Usuario: Det…" en la tableta; el texto quedó incompleto.
- Orden sugerido para lo que falta: preparación de EVA con efecto en el casco → tripulación/localizador → replay. El estado del traje simulado, primer paso del orden original, ya está implementado.
- Revisar con el equipo los criterios del traje (umbrales de batería, O₂, presión y enlace) y elegir fuentes para sus indicaciones.
- El estilo de consola es propio; no reproduce la marca ni el diseño de ningún videojuego.
- **Unificar la presión del traje (pendiente).**
  - `suit_status.json` y `mission.json` usan la misma presión nominal de guion, 29,6 kPa, pero son fuentes separadas.
  - El motor admite una anomalía de presión del traje en EVA (`entorno`: 22 kPa < 25 kPa), sin control de actividad en la interfaz ni recorrido comprobado.
  - Esa anomalía no se mezcla con el módulo Estado del traje. Antes de mostrarla, unificar las dos fuentes para que el traje tenga un único estado.
- **Propuesta, sin aplicar: mover la batería crítica a un hazard del motor.**
  - Hoy `descanso-reducido` muestra la batería del traje en Crítico. En la demo confunde: un traje en rojo dentro de un escenario de sueño parece una consecuencia de la fatiga.
  - Se propone mover esa situación a un hazard del motor, por ejemplo `entorno` durante la EVA, y dejar el traje de `descanso-reducido` en Correcto.
  - Requiere decisión del equipo y cambiar `suit_status.json`, sus pruebas y la documentación.
