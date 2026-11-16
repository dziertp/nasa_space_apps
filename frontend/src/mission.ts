import type { EvaPlan } from './eva';
import type { Measurement } from './panel';

export type EnvironmentalAction = {
  id: string;
  label: string;
  to: string;
};

// Subconjunto del contrato GET /api/mission utilizado por la vista ambiental.
export type EnvironmentalNotice = {
  id: string;
  hazard: string;
  system: string;
  activity: string;
  priority: string | null;
  state: string | null;
  label: string | null;
  acknowledged: boolean | null;
  resolved: boolean | null;
  next_step: string | null;
  actions: EnvironmentalAction[];
};

// Informe local del guion de distancia; no hay transmisión real.
export type MissionReport = {
  id: string;
  event_id: string;
  status: 'pendiente' | 'en_transito' | 'entregado';
  due_at: string | null;
  delivered_at: string | null;
};

export type EnvironmentalMission = {
  instance_id: string;
  revision: number;
  activity: 'interior' | 'EVA' | null;
  clock: string | null;
  measurements: (Measurement & { system: string })[];
  events: EnvironmentalNotice[];
  priorities: Record<string, string>;
  earth_link?: { connected: boolean; delay_minutes: number };
  reports?: MissionReport[];
  // Plan de EVA activo o último plan terminado; en memoria del motor.
  eva_plan?: EvaPlan | null;
  // Aviso de uso y procedencia de los guiones (mission.json).
  notice?: string;
  provenance?: { author: string; generated_on: string; method: string; rules_origin?: string };
};

// Ambas secciones utilizan el mismo contrato de misión y control de versión.
export type RadiologicalMission = Pick<EnvironmentalMission,
  'instance_id' | 'revision' | 'activity' | 'clock' | 'measurements' | 'events' | 'priorities'>;
