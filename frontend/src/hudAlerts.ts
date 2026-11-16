// Avisos del visor del casco: función pura que reúne y ordena avisos a partir de los datos ya recibidos.
// No consulta la API ni guarda estado. Código asistido por Claude Code; véase docs/AI_DISCLOSURE.md.
//
// Criterio de orden (decisión del equipo, pendiente de revisión; no es un protocolo NASA ni un triaje clínico):
// 1. Severidad: crítico > precaución > sin datos.
// 2. Con igual severidad, origen: motor de misión > partes del traje > plan de EVA > lecturas > conexión.
// 3. Con igual origen, el orden en que llegan los datos (eventos, partes y lecturas en su orden fijo).
// La severidad de un aviso del motor viene de su prioridad de guion (crítica → crítico, atención → precaución);
// la de una parte del traje, de su estado; una lectura desactualizada o ausente es «sin datos», no un estado de salud.
import type { EnvironmentalMission, EnvironmentalNotice } from './mission';
import { hazards } from './modules';
import { formatNumber, type Panel } from './panel';
import type { SuitPart, SuitState } from './suit';

export type HudSeverity = 'critico' | 'precaucion' | 'sindatos';
export type DockId = 'traje' | 'o2' | 'bateria' | 'presion' | 'comms' | 'salud' | 'mision' | 'hazards';
export type HudOrigin = 'motor' | 'traje' | 'plan' | 'lectura' | 'conexion';
export type HudAction =
  | { kind: 'step' | 'acknowledge'; label: string; path: string }
  | { kind: 'refresh'; label: string };

export type HudAlert = {
  id: string;
  severity: HudSeverity;
  origin: HudOrigin;
  title: string;
  cause: string;
  // Pasos ilustrativos, pendientes de revisión. Como máximo tres.
  steps: string[];
  // Solo acciones que existen en la API (paso del motor, reconocer) o volver a consultar.
  actions: HudAction[];
  docks: DockId[];
};

export const severityRank: Record<HudSeverity, number> = { critico: 0, precaucion: 1, sindatos: 2 };
const originRank: Record<HudOrigin, number> = { motor: 0, traje: 1, plan: 2, lectura: 3, conexion: 4 };
export const severityLabels: Record<HudSeverity, string> = { critico: 'Crítico', precaucion: 'Precaución', sindatos: 'Sin datos' };
export const originLabels: Record<HudOrigin, string> = {
  motor: 'Motor de misión', traje: 'Estado del traje', plan: 'Plan de EVA', lectura: 'Lectura de salud', conexion: 'Conexión local',
};

// Pasos complementarios por guion, redactados por el equipo como ilustración. El primero siempre es el «next» del motor.
const hazardSteps: Record<string, string[]> = {
  radiacion: ['Mantener el contacto por voz con el hábitat.', 'La dosis acumulada no baja al reconocer el aviso.'],
  entorno: ['Interrumpir la tarea en curso.', 'Preparar el regreso a la esclusa o al módulo seguro.'],
  aislamiento: ['Registrar cómo se encuentra el tripulante, sin diagnosticar.'],
  distancia: ['Guardar el informe localmente hasta recuperar el enlace.'],
  gravedad: ['Comprobar el estado por voz; no se evalúan lesiones.'],
};
const hazardDocks: Record<string, DockId[]> = {
  radiacion: ['hazards', 'salud'], aislamiento: ['hazards', 'salud'], distancia: ['hazards', 'comms'], gravedad: ['hazards'],
};
const partDocks: Record<string, DockId[]> = {
  casco: ['traje'], guantes: ['traje'], soporte_vital: ['traje', 'o2'], bateria: ['traje', 'bateria'],
  presion: ['traje', 'presion'], comunicaciones: ['traje', 'comms'],
};
const readingSteps = ['Verificar la colocación del sensor simulado.', 'Confirmar el estado por voz con el hábitat.'];

function measurement(mission: EnvironmentalMission, id: string) {
  return mission.measurements?.find((item) => item.id === id);
}

function minutesBetween(from: string | null, to: string | null): number | null {
  if (!from || !to) return null;
  const minutes = Math.round((Date.parse(to) - Date.parse(from)) / 60000);
  return Number.isFinite(minutes) ? Math.max(0, minutes) : null;
}

// «ahora», «hace 2 min», «hace 2 h»: antigüedad respecto al reloj de demostración, no al del equipo.
export function formatAge(measuredAt: string | null, reference: string | null): string {
  const minutes = minutesBetween(measuredAt, reference);
  if (minutes === null) return 'Sin hora de medición';
  if (minutes === 0) return 'ahora';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `hace ${hours} h${minutes % 60 ? ` ${minutes % 60} min` : ''}`;
}

function eventAlert(event: EnvironmentalNotice, mission: EnvironmentalMission): HudAlert {
  const id = encodeURIComponent(event.id);
  const phase = event.label ?? event.state ?? 'Sin datos';
  const hazardName = hazards.find((item) => item.engine === event.hazard)?.name ?? event.hazard;
  let title = hazardName;
  let cause = phase;
  let docks = hazardDocks[event.hazard] ?? ['hazards'];
  if (event.hazard === 'entorno') {
    const suit = event.system === 'traje';
    const reading = measurement(mission, suit ? 'suit_pressure' : 'habitat_pressure');
    title = suit ? 'Presión del traje' : 'Presión del hábitat';
    cause = `${phase} · ${reading?.value == null ? 'Sin datos' : `${formatNumber(reading.value)} ${reading.unit}`}`;
    docks = suit ? ['presion', 'traje', 'hazards'] : ['hazards'];
  } else if (event.hazard === 'radiacion') {
    const rate = measurement(mission, 'radiation_rate');
    if (rate?.value != null) cause = `${phase} · tasa ${rate.value.toLocaleString('es-CL', { maximumSignificantDigits: 6 })} ${rate.unit}`;
  }
  const actions: HudAction[] = (event.actions ?? []).map((action) => ({
    kind: 'step', label: action.label, path: `/api/mission/events/${id}/actions/${encodeURIComponent(action.id)}`,
  }));
  if (event.acknowledged === false) {
    actions.push({ kind: 'acknowledge', label: 'Reconocer aviso', path: `/api/mission/events/${id}/acknowledge` });
  }
  const steps = [event.next_step, ...(hazardSteps[event.hazard] ?? [])].filter((step): step is string => !!step).slice(0, 3);
  return {
    id: `motor:${event.id}`, severity: event.priority === 'critica' ? 'critico' : 'precaucion', origin: 'motor',
    title, cause, steps, actions, docks,
  };
}

export function buildHudAlerts({ panel, parts, mission, missionError = false }: {
  panel: Panel | null; parts: SuitPart[] | null; mission: EnvironmentalMission | null; missionError?: boolean;
}): HudAlert[] {
  const alerts: HudAlert[] = [];

  // Guiones abiertos del motor, incluida la anomalía de presión del traje en EVA.
  for (const event of mission?.events ?? []) {
    if (event.resolved === false) alerts.push(eventAlert(event, mission!));
  }

  // Partes del traje en Precaución o Crítico. La presión sustituida por el motor ya tiene su aviso de guion.
  for (const part of parts ?? []) {
    if (part.status === 'ok' || part.engine) continue;
    const reading = part.unit !== null && part.value !== null ? `${formatNumber(part.value)} ${part.unit} · ` : '';
    alerts.push({
      id: `traje:${part.id}`, severity: part.status, origin: 'traje', title: part.label,
      cause: `${reading}${part.observation}`, steps: [part.indication], actions: [], docks: partDocks[part.id] ?? ['traje'],
    });
  }

  // Plan de EVA activo fuera de los límites ficticios de planificación.
  const plan = mission?.eva_plan;
  if (plan?.status === 'activo' && plan.estimate.warnings.length > 0) {
    const names = { carga: 'carga', duracion: 'duración', bateria: 'batería' } as const;
    const exceeded = plan.estimate.warnings.map((warning) => names[warning.id]).join(', ');
    alerts.push({
      id: `plan:${plan.id}`, severity: 'precaucion', origin: 'plan', title: 'Plan de EVA fuera de límites ficticios',
      cause: `Límites de planificación superados: ${exceeded}. Aviso no clínico.`,
      steps: ['Revisar el plan en la tableta.', `Respetar el punto de retorno: ${plan.route.return_point.label}.`],
      actions: [],
      docks: plan.estimate.warnings.some((warning) => warning.id === 'bateria') ? ['mision', 'bateria'] : ['mision'],
    });
  }

  // Lecturas de salud desactualizadas o ausentes: describen la recepción del dato, no la salud.
  for (const reading of panel?.measurements ?? []) {
    if (reading.availability === 'available') continue;
    const missing = reading.availability === 'missing' || reading.value === null;
    alerts.push({
      id: `lectura:${reading.id}`, severity: 'sindatos', origin: 'lectura',
      title: missing ? `${reading.label} sin datos` : `${reading.label} desactualizada`,
      cause: missing ? 'No se recibe la lectura del sensor simulado.'
        : `Última lectura ${formatAge(reading.measured_at, panel!.demo_time)}: ${formatNumber(reading.value)} ${reading.unit}.`,
      steps: readingSteps, actions: [], docks: ['salud'],
    });
  }

  if (missionError) {
    alerts.push({
      id: 'conexion:mision', severity: 'sindatos', origin: 'conexion', title: 'Misión simulada sin respuesta',
      cause: 'No se pudo consultar /api/mission: los guiones del motor no se pueden evaluar.',
      steps: ['Volver a consultar el estado de la misión.'], actions: [{ kind: 'refresh', label: 'Volver a consultar' }], docks: ['hazards'],
    });
  }

  // sort es estable: con igual severidad y origen se conserva el orden de llegada.
  return alerts.sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || originRank[a.origin] - originRank[b.origin]);
}

// Peor severidad por icono del dock, para el punto de aviso.
export function dockSeverity(alerts: HudAlert[]): Partial<Record<DockId, HudSeverity>> {
  const result: Partial<Record<DockId, HudSeverity>> = {};
  for (const alert of alerts) {
    for (const dock of alert.docks) {
      const current = result[dock];
      if (!current || severityRank[alert.severity] < severityRank[current]) result[dock] = alert.severity;
    }
  }
  return result;
}

// Estado global del traje: la parte más grave (con la presión del motor ya aplicada). null = sin datos.
export function suitOverall(parts: SuitPart[] | null): SuitState | null {
  if (!parts || parts.length === 0) return null;
  if (parts.some((part) => part.status === 'critico')) return 'critico';
  if (parts.some((part) => part.status === 'precaucion')) return 'precaucion';
  return 'ok';
}
