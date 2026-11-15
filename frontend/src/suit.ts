// Tipos y textos del estado del traje. Código asistido por Claude Code; véase docs/AI_DISCLOSURE.md.
export type SuitState = 'ok' | 'precaucion' | 'critico';
export type SuitPart = {
  id: string; label: string; measure: string | null; unit: string | null;
  source: string; criterion: string; status: SuitState; value: number | null;
  observation: string; risk: string; indication: string; indication_review: string;
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

// El detalle se abre en la parte más grave; en empate, la primera del orden fijo.
export function mostSevere(parts: SuitPart[]): SuitPart | undefined {
  return parts.reduce<SuitPart | undefined>(
    (worst, part) => (!worst || severity[part.status] > severity[worst.status] ? part : worst), undefined,
  );
}
