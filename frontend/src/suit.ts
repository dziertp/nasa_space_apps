// Tipos y textos del estado del traje. Código asistido por Claude Code; véase docs/AI_DISCLOSURE.md.
import type { EnvironmentalMission, EnvironmentalNotice } from './mission';

export type SuitState = 'ok' | 'precaucion' | 'critico';
export type SuitPart = {
  id: string; label: string; measure: string | null; unit: string | null;
  source: string; criterion: string; status: SuitState; value: number | null;
  observation: string; risk: string; indication: string; indication_review: string;
  // Presente solo cuando el motor de misión sustituye la lectura base de esta parte.
  engine?: { eventId: string; phase: string };
};
export type SuitPanel = {
  data_kind: 'simulated'; label: string;
  provenance: { author: string; generated_on: string; method: string };
  suit: { id: string; name: string; astronaut_id: string };
  demo_time: string; criteria_policy: string;
  scenario: { id: string; description: string };
  parts: SuitPart[];
};

export const suitStates: SuitState[] = ['ok', 'precaucion', 'critico'];
export const suitStateLabels: Record<SuitState, string> = {
  ok: 'Correcto', precaucion: 'Precaución', critico: 'Crítico',
};
const severity: Record<SuitState, number> = { ok: 0, precaucion: 1, critico: 2 };
const countWords: Record<SuitState, [string, string]> = {
  ok: ['correcta', 'correctas'], precaucion: ['precaución', 'precauciones'], critico: ['crítica', 'críticas'],
};

export function countByState(parts: SuitPart[]): Record<SuitState, number> {
  return parts.reduce((result, part) => {
    result[part.status] += 1;
    return result;
  }, { ok: 0, precaucion: 0, critico: 0 });
}

export function countLabel(state: SuitState, count: number): string {
  return `${count} ${countWords[state][count === 1 ? 0 : 1]}`;
}

// Anomalía de presión del traje abierta en el motor (entorno en EVA). Se lee en cada render; no se copia a otro estado.
export function openSuitAnomaly(mission: EnvironmentalMission | null): EnvironmentalNotice | undefined {
  return mission?.events?.find((event) => event.hazard === 'entorno' && event.system === 'traje' && event.resolved === false);
}

// suit_status es la base; mientras la anomalía esté abierta, el motor tiene prioridad sobre la parte «presion».
export function applySuitEngine(parts: SuitPart[], mission: EnvironmentalMission | null): SuitPart[] {
  const anomaly = openSuitAnomaly(mission);
  if (!anomaly || !mission) return parts;
  const reading = mission.measurements?.find((item) => item.id === 'suit_pressure');
  const phase = anomaly.label ?? anomaly.state ?? 'Sin datos';
  return parts.map((part) => part.id !== 'presion' ? part : {
    ...part,
    value: reading?.value ?? null,
    unit: reading?.unit ?? part.unit,
    status: anomaly.priority === 'critica' ? 'critico' : 'precaucion',
    observation: `Anomalía de presión del traje abierta en el motor de misión · ${phase}.`,
    indication: anomaly.next_step ?? 'Sin datos',
    indication_review: 'Guion ilustrativo del motor, pendiente de revisión',
    source: `${reading?.source ?? 'Sensor de presión del traje simulado'} · motor de misión, con prioridad sobre el estado base`,
    criterion: `Estado fijado por la prioridad de demostración del motor (${mission.priorities?.[anomaly.priority ?? ''] ?? anomaly.priority ?? 'Sin datos'}), no por el criterio base. Criterio base: ${part.criterion}`,
    engine: { eventId: anomaly.id, phase },
  });
}

// El detalle se abre en la parte más grave; en empate, la primera del orden fijo.
export function mostSevere(parts: SuitPart[]): SuitPart | undefined {
  return parts.reduce<SuitPart | undefined>(
    (worst, part) => (!worst || severity[part.status] > severity[worst.status] ? part : worst), undefined,
  );
}
