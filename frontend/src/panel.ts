// Código asistido por OpenAI Codex. Véase docs/AI_DISCLOSURE.md.
export type Availability = 'available' | 'stale' | 'missing';
export type Scenario = { id: string; name: string; description: string };
export type Measurement = {
  id: string; label: string; value: number | null; unit: string;
  measured_at: string | null; source: string; availability: Availability;
};
export type DailyRecord = {
  date: string; recorded_at: string; sleep_hours: number | null;
  fatigue_score: number | null; source: string;
};
export type Panel = {
  data_kind: 'simulated'; label: string;
  astronaut: { id: string; name: string; role: string };
  mission: { id: string; name: string };
  demo_time: string; scenario: Scenario;
  measurements: Measurement[]; history: DailyRecord[];
  availability_policy: { stale_after_minutes: number; description: string };
  fatigue_scale: string;
  provenance: { author: string; generated_on: string; method: string };
};
export const availabilityLabels: Record<Availability, string> = {
  available: 'Disponible', stale: 'Desactualizado', missing: 'Sin datos',
};
export function formatNumber(value: number | null): string {
  return value === null ? 'Sin datos' : value.toLocaleString('es-CL', { maximumFractionDigits: 1 });
}
export function formatTime(value: string | null): string {
  return value === null ? 'Sin datos' : new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Santiago',
  }).format(new Date(value));
}
