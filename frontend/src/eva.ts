// Tipos de la preparación de EVA (GET /api/eva/catalog, POST /api/eva/estimate y eva_plan de /api/mission).
// Código asistido por Claude Code; véase docs/AI_DISCLOSURE.md.
export type EvaObjective = { id: string; label: string; minutes: number };
export type EvaRoute = {
  id: string; name: string; distance_km: number; ascent_m: number; objectives: EvaObjective[];
  return_point: { label: string; distance_km: number; note: string };
};
export type EvaEquipment = { id: string; label: string; mass_kg: number; power_w: number };
export type EvaLimits = { battery_capacity_wh: number; battery_reserve_pct: number; max_load_kg: number; max_duration_min: number };
export type EvaCatalog = {
  data_kind: 'simulated'; label: string;
  provenance: { author: string; generated_on: string; method: string };
  planning_policy: string; limits: EvaLimits;
  formula: { description: string[] } & Record<string, number | string[]>;
  routes: EvaRoute[]; equipment: EvaEquipment[];
};
export type EvaWarning = { id: 'carga' | 'duracion' | 'bateria'; message: string };
export type EvaEstimate = {
  route_id: string; equipment_ids: string[];
  duration_min: number; travel_min: number; task_min: number;
  load_kg: number; speed_factor: number; power_w: number; energy_wh: number; battery_return_pct: number;
  limits: EvaLimits; warnings: EvaWarning[];
};
export type EvaPlan = {
  id: string; status: 'activo' | 'terminado'; route_id: string;
  route: EvaRoute; equipment: EvaEquipment[]; estimate: EvaEstimate; planning_policy: string;
  started_at: string; ended_at: string | null; ended_by: 'terminar_eva' | 'selector_actividad' | 'refugio_radiologico' | null;
};

export const endedByLabels: Record<NonNullable<EvaPlan['ended_by']>, string> = {
  terminar_eva: 'Terminar EVA', selector_actividad: 'selector de actividad en Hazards', refugio_radiologico: 'refugio radiológico',
};

export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours === 0 ? `${rest} min` : `${hours} h ${String(rest).padStart(2, '0')} min`;
}
