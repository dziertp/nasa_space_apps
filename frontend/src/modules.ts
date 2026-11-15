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
    summary: 'Mediciones simuladas, disponibilidad del dato y registro de sueño y fatiga.',
    planned: [
      { title: 'Exposición a radiación simulada', detail: 'Dosis acumulada de la misión ficticia con su procedencia.', constraint: 'Sin límites clínicos ni de misión hasta documentar una fuente revisada.' },
      { title: 'Botón de ayuda', detail: 'Solicitar contacto con el equipo médico ante una lesión; la IA solo podría ordenar información para el médico.', constraint: `${comms} Sin diagnóstico automático.` },
    ],
  },
  traje: {
    id: 'traje', label: 'Estado del traje', short: 'Traje', status: 'activo',
    summary: 'Seis partes del traje simulado con estado en color, forma y texto; riesgo e indicación de cada una.',
    planned: [
      { title: 'Protocolos con fuente', detail: 'Sustituir las indicaciones de demostración por protocolos seleccionados, citados y revisados.', constraint: 'Hasta entonces cada indicación se marca «Protocolo pendiente de fuente y revisión».' },
      { title: 'Evolución durante la EVA', detail: 'Cambios de estado en el tiempo y aviso al pasar a Precaución o Crítico.', constraint: 'Valores y criterios simulados; sin telemetría de un traje real.' },
      { title: 'Consumo según la preparación', detail: 'Batería y O₂ estimados a partir del recorrido y el equipamiento elegidos en la tableta.', constraint: 'Fórmulas propias y simuladas; depende del módulo de preparación de EVA.' },
    ],
  },
  mision: {
    id: 'mision', label: 'Misión y objetivos', short: 'Misión', status: 'en-diseno',
    summary: 'Objetivos de la EVA, contexto de la misión ficticia y tiempo restante.',
    planned: [
      { title: 'Objetivos de la EVA', detail: 'Lista de tareas con progreso y punto de retorno.' },
      { title: 'Contexto de la misión', detail: 'Lugar, duración y condiciones del escenario ficticio.' },
    ],
  },
  equipamiento: {
    id: 'equipamiento', label: 'Equipamiento', short: 'Equipo EVA', status: 'en-diseno',
    summary: 'Herramientas y consumibles llevados en la salida.',
    planned: [
      { title: 'Inventario de la EVA', detail: 'Lo elegido en la preparación desde la tableta, con carga y batería.' },
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
    summary: 'Escenarios de demostración agrupados por los cinco peligros que describe NASA.',
    planned: [
      { title: 'Nuevos escenarios', detail: 'Añadir escenarios a partir de experiencias del usuario y asignarlos a su peligro, con sus indicaciones.', constraint: 'Clasificación propuesta por IA solo con revisión humana; las indicaciones requieren fuente.' },
    ],
  },
  nave: {
    id: 'nave', label: 'Nave', short: 'Nave', status: 'en-diseno',
    summary: 'Estado del hábitat o la nave ficticia.',
    planned: [
      { title: 'Sistemas de la nave', detail: 'Contenido pendiente de definir por el equipo.' },
    ],
  },
  preparacion: {
    id: 'preparacion', label: 'Misión y equipamiento', short: 'Misión', status: 'en-diseno',
    summary: 'Preparar la EVA y revisar salidas anteriores.',
    planned: [
      { title: 'Preparación de EVA', detail: 'Elegir recorrido y equipamiento y ver cómo cambian la duración, la carga y la batería estimadas; la elección se refleja luego en el casco.', constraint: 'Estimaciones con fórmulas propias y simuladas.' },
      { title: 'Replay de expedición', detail: 'Recorrer una línea de tiempo y reconstruir posiciones, mediciones, mensajes y acciones del escenario.' },
    ],
  },
};

// Nombres de NASA 5 Hazards of Human Spaceflight; la asignación de escenarios es una decisión del equipo.
export const hazards: { id: string; name: string; scenarioIds: string[]; note: string }[] = [
  { id: 'radiation', name: 'Radiación espacial', scenarioIds: [], note: 'Sin escenario todavía.' },
  { id: 'isolation', name: 'Aislamiento y confinamiento', scenarioIds: ['descanso-reducido', 'estables'], note: 'Sueño y fatiga como señales a observar.' },
  { id: 'distance', name: 'Distancia de la Tierra', scenarioIds: ['sensor-sin-senal'], note: 'Funcionar sin apoyo inmediato ni lecturas completas.' },
  { id: 'gravity', name: 'Campos de gravedad', scenarioIds: [], note: 'Sin escenario todavía.' },
  { id: 'environment', name: 'Entornos hostiles y cerrados', scenarioIds: [], note: 'Sin escenario todavía.' },
];
export const hazardsSource = 'https://www.nasa.gov/hrp/hazards/';
