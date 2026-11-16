// Mapa de módulos navegables. Código asistido por Claude; véase docs/AI_DISCLOSURE.md.
// Las funciones "en diseño" vienen de la lluvia de ideas del equipo (docs/MODULES_ROADMAP.md);
// no tienen datos ni lógica todavía y no deben presentarse como implementadas.

export type DeviceId = 'tableta' | 'casco';
export type ModuleId =
  | 'salud' | 'traje' | 'mision' | 'equipamiento' | 'equipo' | 'hazards' | 'nave' | 'preparacion';

export type PlannedFeature = {
  title: string;
  detail: string;
  // Condición que el equipo debe resolver antes de implementarla.
  constraint?: string;
};

export type ModuleDef = {
  id: ModuleId;
  label: string;
  short: string;
  status: 'activo' | 'en-diseno';
  summary: string;
  planned: PlannedFeature[];
};

export const devices: Record<DeviceId, { label: string; context: string; modules: ModuleId[] }> = {
  tableta: {
    label: 'Tableta · estación',
    context: 'Vista completa para revisar datos, preparar la EVA y consultar riesgos dentro del hábitat.',
    modules: ['salud', 'traje', 'preparacion', 'nave', 'equipo', 'hazards'],
  },
  // El casco no usa este riel: muestra un HUD con dock propio (HelmetHud.tsx). La lista documenta sus sistemas.
  casco: {
    label: 'Casco · EVA',
    context: 'Vista resumida simulada en navegador: lectura rápida, pocos elementos y alto contraste.',
    modules: ['traje', 'salud', 'mision', 'equipamiento', 'equipo', 'hazards'],
  },
};

const comms = 'Necesita enlace de comunicaciones; en la demostración se simula localmente y debe indicar retardo o pérdida de señal.';

export const modules: Record<ModuleId, ModuleDef> = {
  salud: {
    id: 'salud', label: 'Salud del usuario', short: 'Salud', status: 'activo',
    summary: 'Mediciones simuladas, disponibilidad del dato, registro de sueño y fatiga y estado radiológico de la misión simulada.',
    planned: [
      { title: 'Refugio radiológico con fuente', detail: 'El refugio ilustrativo ya se recorre desde la interfaz; falta sustituirlo por un procedimiento citado.', constraint: 'Procedimiento ilustrativo pendiente de fuente y revisión.' },
      { title: 'Dosis al avanzar el reloj', detail: 'Mostrar la integración de la dosis acumulada cuando avance el reloj de misión.', constraint: 'Sin límites clínicos ni de misión hasta documentar una fuente revisada.' },
      { title: 'Botón de ayuda', detail: 'Solicitar contacto con el equipo médico ante una lesión; la IA solo podría ordenar información para el médico.', constraint: `${comms} Sin diagnóstico automático.` },
    ],
  },
  traje: {
    id: 'traje', label: 'Estado del traje', short: 'Traje', status: 'activo',
    summary: 'Seis partes del traje simulado con estado en color, forma y texto; riesgo e indicación de cada una.',
    planned: [
      { title: 'Protocolos con fuente', detail: 'Sustituir las indicaciones de demostración por protocolos seleccionados, citados y revisados.', constraint: 'Hasta entonces cada indicación se marca «Protocolo pendiente de fuente y revisión».' },
      { title: 'Evolución durante la EVA', detail: 'Cambios de estado en el tiempo y aviso al pasar a Precaución o Crítico.', constraint: 'Valores y criterios simulados; sin telemetría de un traje real.' },
      { title: 'Consumo según la preparación', detail: 'Reflejar en las partes del traje la batería estimada por el plan de EVA y añadir el O₂.', constraint: 'La preparación ya estima la batería al volver, pero no modifica el estado del traje; fórmulas propias y simuladas.' },
    ],
  },
  mision: {
    id: 'mision', label: 'Misión y objetivos', short: 'Misión', status: 'activo',
    summary: 'Objetivos, punto de retorno y tiempo estimado del plan de EVA activo, preparado en la tableta.',
    planned: [
      { title: 'Progreso de los objetivos', detail: 'Marcar objetivos cumplidos y ver el tiempo restante frente al estimado.', constraint: 'Requiere registrar el avance en el motor de misión.' },
      { title: 'Contexto de la misión', detail: 'Lugar, duración y condiciones del escenario ficticio.' },
    ],
  },
  equipamiento: {
    id: 'equipamiento', label: 'Equipamiento', short: 'Equipo EVA', status: 'activo',
    summary: 'Inventario y carga del plan de EVA activo, elegidos en la preparación desde la tableta.',
    planned: [
      { title: 'Consumibles durante la salida', detail: 'Descontar consumo de batería y uso de herramientas a medida que avanza la EVA.', constraint: 'Fórmulas propias y simuladas; sin telemetría real.' },
    ],
  },
  equipo: {
    id: 'equipo', label: 'Tripulación', short: 'Tripulación', status: 'en-diseno',
    summary: 'Coordinación con otros tripulantes ficticios durante la salida.',
    planned: [
      { title: 'Vista de compañeros', detail: 'Ver lo que otro tripulante está viendo y compartir anotaciones.', constraint: comms },
      { title: 'Localizador y baliza', detail: 'Orientación hacia un tripulante, rover o punto de encuentro con indicación visual y audio opcional.', constraint: 'Posiciones simuladas; sin navegación real.' },
    ],
  },
  hazards: {
    id: 'hazards', label: 'Hazards', short: 'Hazards', status: 'activo',
    summary: 'Los cinco peligros que describe NASA: activar y recorrer cada guion del motor de misión simulada, y los escenarios del panel.',
    planned: [
      { title: 'Interacciones entre peligros', detail: 'Comprobar qué ocurre con varios guiones abiertos a la vez (por ejemplo, refugio radiológico con una anomalía de entorno).', constraint: 'Hoy cada recorrido se comprobó por separado.' },
      { title: 'Nuevos escenarios', detail: 'Añadir escenarios a partir de experiencias del usuario y asignarlos a su peligro, con sus indicaciones.', constraint: 'Clasificación propuesta por IA solo con revisión humana; las indicaciones requieren fuente.' },
    ],
  },
  nave: {
    id: 'nave', label: 'Nave', short: 'Nave', status: 'activo',
    summary: 'Estado ambiental del hábitat en la misión simulada: presión, aviso y recuperación ilustrativa.',
    planned: [
      { title: 'Otros sistemas de la nave', detail: 'Energía, soporte vital del hábitat y comunicaciones de la nave ficticia.', constraint: 'Contenido pendiente de definir por el equipo.' },
      { title: 'Presión del traje en Nave', detail: 'La anomalía de presión del traje en EVA se muestra en el módulo Traje; Nave sigue mostrando solo el hábitat interior.', constraint: 'Decidir si Nave debe resumir también los sistemas del traje.' },
    ],
  },
  preparacion: {
    id: 'preparacion', label: 'Misión y equipamiento', short: 'Misión', status: 'activo',
    summary: 'Preparar la EVA: recorrido y equipamiento cambian la duración, la carga y la batería estimadas; el plan se inicia en el motor de misión y se ve en el casco.',
    planned: [
      { title: 'Replay de expedición', detail: 'Recorrer una línea de tiempo y reconstruir posiciones, mediciones, mensajes y acciones del escenario.', constraint: 'En diseño. Requiere un registro de eventos que sobreviva al reinicio del backend.' },
      { title: 'Consumo real del traje', detail: 'Enlazar la batería estimada del plan con la batería del módulo Traje.', constraint: 'Hoy son fuentes separadas: la estimación no modifica el estado del traje.' },
    ],
  },
};

// Nombres de NASA 5 Hazards of Human Spaceflight; la asignación de escenarios es una decisión del equipo.
// engine: identificador del escenario en el motor de misión (data/simulated/mission.json).
// followUp: dónde continúa el guion después de activarlo.
export const hazards: { id: string; engine: string; name: string; scenarioIds: string[]; note: string; followUp: string }[] = [
  { id: 'radiation', engine: 'radiacion', name: 'Radiación espacial', scenarioIds: [], note: 'Dosis y tasa del dosímetro simulado.',
    followUp: 'Lectura de dosis y tasa en Salud. El refugio ilustrativo avanza aquí o en Salud.' },
  { id: 'isolation', engine: 'aislamiento', name: 'Aislamiento y confinamiento', scenarioIds: ['descanso-reducido', 'estables'], note: 'Sueño y fatiga como señales a observar.',
    followUp: 'Cambia el historial interno del motor, no el selector del panel personal. La recuperación simulada avanza el reloj 7 días.' },
  { id: 'distance', engine: 'distancia', name: 'Distancia de la Tierra', scenarioIds: ['sensor-sin-senal'], note: 'Funcionar sin apoyo inmediato ni lecturas completas.',
    followUp: 'Interrumpe el enlace terrestre simulado; no afecta la conexión con la API local. La entrega llega al avanzar el reloj.' },
  { id: 'gravity', engine: 'gravedad', name: 'Campos de gravedad', scenarioIds: [], note: 'Movimiento de posible caída, sin inferir lesiones.',
    followUp: 'Confirmar o descartar no evalúa lesiones.' },
  { id: 'environment', engine: 'entorno', name: 'Entornos hostiles y cerrados', scenarioIds: [], note: 'Presión del hábitat en interior o del traje en EVA.',
    followUp: 'Interior: lectura del hábitat en Nave (tableta). EVA: presión del traje en el módulo Traje.' },
];
// Igual que en Salud: el guion radiológico solo se activa con actividad interior. El de entorno usa hábitat o traje según la actividad.
export const interiorOnlyHazards = ['radiacion'];
// Con estos guiones abiertos el motor no permite cambiar interior/EVA.
export const activityBoundHazards = ['radiacion', 'entorno'];
export const hazardsSource = 'https://www.nasa.gov/hrp/hazards/';
