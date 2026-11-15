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

export type EnvironmentalMission = {
  instance_id: string;
  revision: number;
  activity: 'interior' | 'EVA' | null;
  clock: string | null;
  measurements: (Measurement & { system: string })[];
  events: EnvironmentalNotice[];
  priorities: Record<string, string>;
};

// Ambas secciones utilizan el mismo contrato de misión y control de versión.
export type RadiologicalMission = Pick<EnvironmentalMission,
  'instance_id' | 'revision' | 'activity' | 'clock' | 'measurements' | 'events' | 'priorities'>;
