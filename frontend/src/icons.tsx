// Iconos SVG propios, en línea y sin librerías externas. Código asistido por Claude Code; véase docs/AI_DISCLOSURE.md.
import type { ReactNode } from 'react';
import type { ModuleId } from './modules';
import type { Availability } from './panel';
import { suitStateLabels, type SuitState } from './suit';

function Stroke({ children, size = 20 }: { children: ReactNode; size?: number }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
  );
}

const modulePaths: Record<ModuleId, ReactNode> = {
  salud: <><path d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10c0 5.65-7 10-7 10Z" /><path d="M7.5 11.5h2.1l1.3-2.3 1.9 4.3 1.2-2h2.5" /></>,
  traje: <><path d="M5 14a7 7 0 1 1 14 0v3.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 17.5Z" /><path d="M8.5 12.5a3.5 2.6 0 0 1 7 0v1a1.5 1.5 0 0 1-1.5 1.5h-4a1.5 1.5 0 0 1-1.5-1.5Z" /></>,
  mision: <><circle cx="12" cy="12" r="7.5" /><circle cx="12" cy="12" r="3.2" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" /></>,
  equipamiento: <><path d="M4 9h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z" /><path d="M9 9V6.5A1.5 1.5 0 0 1 10.5 5h3A1.5 1.5 0 0 1 15 6.5V9" /><path d="M4 13.5h16M11 12.5h2v2h-2z" /></>,
  equipo: <><circle cx="9" cy="8.5" r="3" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><circle cx="16.5" cy="9.5" r="2.5" /><path d="M15.6 14.3a4.5 4.5 0 0 1 4.9 4.7" /></>,
  hazards: <><path d="M12 3.2 20.4 9.3l-3.2 9.9H6.8L3.6 9.3Z" /><path d="M12 8.6v4.4M12 16v.01" /></>,
  nave: <><rect x="3" y="9" width="18" height="6" rx="3" /><path d="M9 9V5.5M15 9V5.5M9 15v3.5M15 15v3.5M7 5.5h4M13 5.5h4M7 18.5h4M13 18.5h4" /></>,
  preparacion: <><circle cx="5.5" cy="18" r="2" /><circle cx="18.5" cy="6" r="2" /><path d="M7.4 17.1c3.7-1.3 3.5-6.4 7.6-7.8 1-.3 1.8-.9 2.3-1.6" strokeDasharray="2 2.6" /></>,
};

export function ModuleIcon({ id, size }: { id: ModuleId; size?: number }) {
  return <Stroke size={size}>{modulePaths[id]}</Stroke>;
}

const hazardPaths: Record<string, ReactNode> = {
  radiation: <><circle cx="12" cy="12" r="2.4" /><path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3M6 6l2.1 2.1M15.9 15.9 18 18M6 18l2.1-2.1M15.9 8.1 18 6" /></>,
  isolation: <><path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z" /><circle cx="12" cy="12.5" r="2" /><path d="M8.8 18.5a3.2 3.2 0 0 1 6.4 0" /></>,
  distance: <><circle cx="6" cy="17.5" r="3" /><circle cx="18" cy="6" r="2" /><path d="M8.6 15.4c2.4-4.6 5.4-7.4 7.6-8.4" strokeDasharray="2 2.4" /></>,
  gravity: <><path d="M12 3.5V15M8 11.5l4 4 4-4" /><path d="M4.5 19.5h15" /></>,
  environment: <><path d="M4 18.5a8 8 0 0 1 16 0" /><path d="M2.5 18.5h19M9 14.5h6M10.5 11.5h3" /></>,
};

export function HazardIcon({ id }: { id: string }) {
  return <Stroke size={22}>{hazardPaths[id] ?? modulePaths.hazards}</Stroke>;
}

export type IconState = SuitState | 'sindatos';

// Forma distinta por estado: círculo, triángulo, cuadrado y círculo discontinuo. Nunca solo color.
export function StateIcon({ state, size = 16, x, y }: { state: IconState; size?: number; x?: number; y?: number }) {
  return (
    <svg className="state-icon" viewBox="0 0 16 16" width={size} height={size} x={x} y={y} aria-hidden="true">
      {state === 'ok' && <><circle cx="8" cy="8" r="7.2" fill="currentColor" /><path className="icon-mark" d="M4.6 8.3 7 10.6l4.4-4.9" /></>}
      {state === 'precaucion' && <><path d="M8 .8 15.4 14.6H.6z" fill="currentColor" /><path className="icon-mark" d="M8 5.6v3.9M8 12v.01" /></>}
      {state === 'critico' && <><rect x="1" y="1" width="14" height="14" fill="currentColor" /><path className="icon-mark" d="m5.2 5.2 5.6 5.6m0-5.6-5.6 5.6" /></>}
      {state === 'sindatos' && <><circle cx="8" cy="8" r="6.3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="2.2 1.8" /><path d="M5 8h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></>}
    </svg>
  );
}

export function StateTag({ state }: { state: SuitState }) {
  return <span className={`state-tag state-${state}`}><StateIcon state={state} />{suitStateLabels[state]}</span>;
}

// Disponibilidad describe la recepción del dato, no un estado de salud: no usa el verde de «Correcto».
export function AvailabilityIcon({ availability }: { availability: Availability }) {
  return (
    <svg className="state-icon" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {availability === 'available' && <><circle cx="8" cy="8" r="6.3" /><circle cx="8" cy="8" r="2.8" fill="currentColor" stroke="none" /></>}
      {availability === 'stale' && <><circle cx="8" cy="8" r="6.3" /><path d="M8 4.6V8l2.4 1.6" /></>}
      {availability === 'missing' && <><circle cx="8" cy="8" r="6.3" strokeDasharray="2.2 1.8" /><path d="M5 8h6" strokeWidth="1.8" /></>}
    </svg>
  );
}

export const IconCrew = () => <Stroke size={15}><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></Stroke>;
export const IconClock = () => <Stroke size={15}><circle cx="12" cy="12" r="8" /><path d="M12 7.5V12l3 2" /></Stroke>;
export const IconLayers = () => <Stroke size={15}><path d="m12 4 8 4-8 4-8-4Z" /><path d="m4 12 8 4 8-4M4 16l8 4 8-4" /></Stroke>;
export const IconLink = () => <Stroke size={15}><path d="M10 14a4 4 0 0 0 5.66 0l2.83-2.83a4 4 0 0 0-5.66-5.66l-1.06 1.06" /><path d="M14 10a4 4 0 0 0-5.66 0l-2.83 2.83a4 4 0 0 0 5.66 5.66l1.06-1.06" /></Stroke>;
export const IconFlask = () => <Stroke size={15}><path d="M9.5 3.5h5M10.5 3.5v5.2l-4.9 8.6a2 2 0 0 0 1.74 3h9.32a2 2 0 0 0 1.74-3L13.5 8.7V3.5" /><path d="M7.6 14.5h8.8" /></Stroke>;
export const IconTablet = () => <Stroke size={18}><rect x="4.5" y="3" width="15" height="18" rx="2" /><path d="M11 17.5h2" /></Stroke>;
export const IconHelmet = () => <Stroke size={18}>{modulePaths.traje}</Stroke>;
export const IconRefresh = () => <Stroke size={16}><path d="M19 12a7 7 0 1 1-2.05-4.95" /><path d="M19 4.5V8h-3.5" /></Stroke>;

// Marca propia de la consola: visor con órbita. No es un logotipo de NASA ni de otra organización.
export function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 32 32" width="34" height="34" aria-hidden="true">
      <circle cx="16" cy="16" r="9" fill="none" stroke="var(--accent)" strokeWidth="2" />
      <path d="M11.6 15.6a4.4 3.4 0 0 1 8.8 0" fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" />
      <ellipse cx="16" cy="16" rx="14.5" ry="5.2" transform="rotate(-24 16 16)" fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.3" />
      <circle cx="27.6" cy="11.2" r="2.1" fill="var(--accent)" />
    </svg>
  );
}
