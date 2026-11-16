# Módulos de la consola: lluvia de ideas y estado

Fuente: lluvia de ideas del equipo (2026-11-15). Este documento separa lo implementado de lo previsto y anota las condiciones de cada idea. El mapa visible está en `frontend/src/modules.ts`.

## Implementado en este hito

- Selector de dispositivo simulado: **Tableta · estación** (vista completa) y **Casco · EVA** (visor HUD).
- **Visor del casco** (2026-11-15, rama `feat/hud-casco`): sustituye las pestañas del casco por una escena de visor.
  - Horizonte lunar propio en SVG, marco curvo con viñeta y paneles de vidrio translúcido.
  - En reposo: estado global del traje, reloj de misión (o tiempo de EVA), enlace, tres indicadores (pulso, SpO₂, O₂ del traje) y un dock con ocho sistemas.
  - Avisos dinámicos reunidos por una función pura (`frontend/src/hudAlerts.ts`): guiones abiertos del motor, partes del traje en Precaución o Crítico, presión del motor en EVA, lecturas desactualizadas o ausentes y plan de EVA fuera de límites. Se muestra solo el principal, con pasos ilustrativos y acciones reales del motor; «+N avisos» despliega el resto.
  - Paneles de detalle por sistema (Traje con silueta, Presión con medidor) y «Abrir detalle en tableta». Procedencia y criterios, en «Acerca de estos datos».
  - El casco ya no tiene módulos Misión y Equipamiento propios: el plan de EVA se ve en el panel Misión del dock.
- **Sistema visual propio** (2026-11-15):
  - barra superior fija con tripulante, reloj de demostración, escenario, conexión y «Datos simulados»;
  - riel de módulos con iconos SVG y tarjetas tipo dashboard;
  - fuentes locales con @fontsource;
  - transiciones cortas y pulso solo en estados críticos, ambos desactivados con «reducir movimiento».
- Navegación por módulos numerados (pestañas con flechas, Inicio y Fin). Los módulos sin contenido muestran **En diseño** y la lista de funciones previstas.
- **Salud**: panel personal en tableta; en el casco, pulso y SpO₂ en reposo y el panel Salud del dock (lecturas, dosis y tasa). Desde la integración del motor (2026-11-15) incluye el **estado radiológico** de la misión simulada, completo en tableta.
- **Nave** (tableta, activo desde la integración del motor): **estado ambiental del hábitat**, con presión, anomalía, reconocimiento, recuperación en tres pasos y reinicio de toda la misión.
- **Hazards**: los cinco peligros de [NASA 5 Hazards](https://www.nasa.gov/hrp/hazards/). Cada tarjeta muestra el escenario del motor (inactivo, fase actual o finalizado) y sus **escenarios de demostración del panel**. Pulsar un escenario del panel lo carga en Salud. La asignación es una decisión del equipo.
  - Con el guion abierto, la tarjeta muestra la fase, el siguiente paso, el reconocimiento y los botones de las acciones que el motor declara para esa fase (desde 2026-11-15, rama `feat/completar-hazards`). Los cinco recorridos se completan desde la interfaz.
  - Selector **Actividad de misión** (interior / EVA) con el endpoint existente; se bloquea con radiación o entorno abiertos, como exige el motor.

| Peligro | Escenario del motor | Escenarios del panel | Pasos en la interfaz |
| --- | --- | --- | --- |
| Radiación | `radiacion` | Ninguno | Hazards y Salud (tableta): refugio, confirmación y fin. Requiere interior. |
| Aislamiento y confinamiento | `aislamiento` | `descanso-reducido`, `estables` | Hazards: contacto, seguimiento y recuperación (avanza el reloj 7 días). |
| Distancia de la Tierra | `distancia` | `sensor-sin-senal` | Hazards: informe, enlace y **Avanzar reloj simulado** hasta la entrega. |
| Gravedad | `gravedad` | Ninguno | Hazards: confirmar y cerrar, o descartar. Sin inferir lesiones. |
| Entornos hostiles y cerrados | `entorno` | Ninguno | Hazards y Nave (interior); en EVA, la presión se ve en Traje. |

- **Preparación de EVA** (2026-11-15, rama `feat/preparacion-eva`): módulo **Misión y equipamiento** (`preparacion`, tableta) y módulos **Misión** y **Equipamiento** del casco, ahora activos.
  - Catálogo sintético `data/simulated/eva_planning.json` (3 recorridos, 7 elementos, límites ficticios) y fórmulas propias en `backend/eva.py`: duración, carga y batería al volver, con un aviso de planificación (no clínico) que explica cada límite superado.
  - **Iniciar EVA** guarda el plan en el motor de misión y cambia la actividad a EVA con la misma regla que el selector de Hazards (bloqueado con radiación o entorno abiertos). **Terminar EVA** vuelve a Interior y conserva el último plan. No hay un estado de misión paralelo.
  - El casco lee el plan activo: objetivos, punto de retorno y tiempo estimado en Misión; inventario, carga y batería estimada en Equipamiento.
- **Estado del traje** (2026-11-15; en tableta desde el rediseño visual): en la tableta, medidores en arco de O₂, batería y presión y una silueta sincronizada con la cuadrícula; en el casco, visor HUD. Seis partes (casco y visor, guantes, soporte vital · O₂, batería, presión, comunicaciones) con estado **Correcto / Precaución / Crítico** en color, texto y forma; resumen por estado y, al tocar una parte, lectura, observación, posible riesgo, indicación, criterio del equipo y procedencia. Datos en `data/simulated/suit_status.json`, servidos por `GET /api/scenarios/{id}/suit`. Cada indicación lleva la marca «Protocolo pendiente de fuente y revisión»; estados y criterios son decisiones del equipo.
  - **Presión del motor con prioridad**: el módulo consulta `GET /api/mission` una vez al abrirse (sin sondeo). Si hay una anomalía de entorno abierta con sistema `traje` (EVA), la parte Presión toma valor, estado y paso del motor, con la etiqueta «Motor de misión» y un aviso que lo explica. `suit_status.json` sigue siendo la base y no se modifica; al cerrar la anomalía vuelve el valor base.

## Previsto (sin implementar)

| Dispositivo | Módulo | Idea | Condición |
| --- | --- | --- | --- |
| Casco | Estado del traje | Protocolos con fuente, evolución durante la EVA y consumo de batería/O₂ según la preparación | Indicaciones actuales pendientes de fuente y revisión; valores, criterios y fórmulas simulados. |
| Ambos | Salud | Mostrar la dosis al avanzar el reloj y un procedimiento de refugio con fuente | El reloj ya avanza con aislamiento y distancia y suma dosis según el modelo del motor; sin límites clínicos o de misión sin fuente revisada. |
| Ambos | Hazards | Interacciones entre peligros abiertos a la vez | Cada recorrido se comprobó por separado. |
| Casco | Salud | Botón de ayuda → médico en tiempo real o IA | Requiere comunicaciones: simular retardo y pérdida de señal. La IA no diagnostica. |
| Casco | Visor (dock Misión) | Progreso de objetivos, tiempo restante y consumibles durante la salida | Requiere registrar el avance en el motor; fórmulas simuladas. |
| Casco | Visor | Revisar con el equipo el criterio de orden de los avisos y sus pasos ilustrativos; probar con lectores de pantalla | Criterio propio pendiente de revisión; sin prueba con tecnologías de asistencia. |
| Ambos | Tripulación | Vista en vivo de compañeros, anotaciones compartidas, localizador/baliza y orientación con audio opcional | Requiere comunicaciones; posiciones simuladas. |
| Tableta | Misión y equipamiento | Replay de expedición en línea de tiempo (**En diseño**) | Requiere un registro de eventos que sobreviva al reinicio del backend. |
| Ambos | Traje | Enlazar la batería estimada del plan con la batería del módulo Traje | Hoy son fuentes separadas: la estimación no modifica el estado del traje. |
| Tableta | Nave | Otros sistemas de la nave (energía, soporte vital del hábitat, comunicaciones) | Contenido por definir. |
| Ambos | Hazards | Añadir escenarios desde experiencias del usuario y clasificarlos con IA | Revisión humana obligatoria; funcionar sin internet; indicaciones con fuente. |

## Pendiente de decidir

- La lluvia de ideas cita "Salud Usuario: Det…" en la tableta; el texto quedó incompleto.
- Orden sugerido para lo que falta: tripulación/localizador → replay. El estado del traje y la preparación de EVA con efecto en el casco ya están implementados.
- Revisar con el equipo los criterios del traje (umbrales de batería, O₂, presión y enlace) y elegir fuentes para sus indicaciones.
- El estilo de consola es propio; no reproduce la marca ni el diseño de ningún videojuego.
- **Presión del traje (resuelto en la interfaz, 2026-11-15).**
  - La anomalía del motor en EVA (`entorno`: 22 kPa < 25 kPa) se muestra en Traje con prioridad sobre `suit_status.json`, sin copiar estado: se calcula al mostrar cada respuesta de la API.
  - Siguen siendo dos fuentes: el escenario del panel (base del traje) y la misión (motor). Fuera de la anomalía, Traje muestra la presión base, aunque el motor tenga su propia lectura nominal en EVA (29,6 kPa, mismo valor).
  - Pendiente de decidir: si el motor debería servir también el resto de partes del traje.
- **Batería crítica retirada de `descanso-reducido` (2026-11-15).**
  - La batería pasa de 14 % en Crítico a 34 % en **Precaución**, con observación, riesgo e indicación acordes; el escenario queda con dos precauciones y ninguna parte en Crítico.
  - La situación crítica del traje en la demo es ahora la anomalía de presión del motor en EVA (hazard `entorno`).
  - Pruebas ajustadas en `backend/test_suit.py`.
