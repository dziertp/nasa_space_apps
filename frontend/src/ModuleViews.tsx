// Componentes de la consola modular. Código asistido por Claude; véase docs/AI_DISCLOSURE.md.
import { useRef, type KeyboardEvent } from 'react';
import { AvailabilityIcon, HazardIcon, IconRefresh, ModuleIcon } from './icons';
import { EventSteps, NoticeTag, noticeTone } from './missionView';
import { activityBoundHazards, hazards, hazardsSource, interiorOnlyHazards, modules, type ModuleDef, type ModuleId } from './modules';
import { availabilityLabels, formatNumber, formatTime, type Panel, type Scenario } from './panel';
import { useHabitatMission } from './useHabitatMission';

const twoDigits = (value: number) => String(value).padStart(2, '0');

export function ModuleTabs({ ids, active, onSelect, orientation }: {
  ids: ModuleId[]; active: ModuleId; onSelect: (id: ModuleId) => void; orientation: 'vertical' | 'horizontal';
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  function onKey(event: KeyboardEvent, index: number) {
    const moves: Record<string, number> = {
      ArrowRight: index + 1, ArrowDown: index + 1, ArrowLeft: index - 1, ArrowUp: index - 1,
      Home: 0, End: ids.length - 1,
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    const next = (moves[event.key] + ids.length) % ids.length;
    onSelect(ids[next]);
    refs.current[next]?.focus();
  }
  return (
    <div role="tablist" aria-label="Módulos" aria-orientation={orientation} className="module-tabs">
      {ids.map((id, index) => {
        const module = modules[id];
        const selected = id === active;
        return (
          <button key={id} type="button" role="tab" id={`tab-${id}`} aria-selected={selected}
            aria-controls="module-panel" tabIndex={selected ? 0 : -1}
            ref={(element) => { refs.current[index] = element; }}
            onClick={() => onSelect(id)} onKeyDown={(event) => onKey(event, index)}>
            <span className="tab-icon"><ModuleIcon id={id} /></span>
            <span className="tab-text">
              <span className="tab-label"><span className="tab-index" aria-hidden="true">{twoDigits(index + 1)}</span>{module.short}</span>
              {module.status === 'en-diseno' && <span className="tab-state">En diseño</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function ModuleHeader({ module, index }: { module: ModuleDef; index: number }) {
  return (
    <div className="module-header">
      <span className="module-icon"><ModuleIcon id={module.id} size={26} /></span>
      <div className="module-heading">
        <p className="eyebrow">Módulo {twoDigits(index)}</p>
        <h2>{module.label}</h2>
        <p className="muted">{module.summary}</p>
      </div>
      <span className={`module-status ${module.status}`}>{module.status === 'activo' ? 'Activo' : 'En diseño'}</span>
    </div>
  );
}

export function PlannedFeatures({ module }: { module: ModuleDef }) {
  if (module.planned.length === 0) return null;
  return (
    <section className="planned" aria-labelledby={`planned-${module.id}`}>
      <h3 id={`planned-${module.id}`}>{module.status === 'activo' ? 'Próximas funciones' : 'Funciones previstas'}</h3>
      <p className="caption">Ideas del equipo pendientes de implementar. No hay datos ni lógica detrás de esta lista.</p>
      <ul>
        {module.planned.map((feature) => (
          <li key={feature.title}>
            <strong>{feature.title}</strong>
            <span>{feature.detail}</span>
            {feature.constraint && <span className="constraint"><span className="constraint-label">Condición:</span> {feature.constraint}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}

// Marco del visor: esquinas de retícula y marcas decorativas, sin contenido.
export function VisorOverlay() {
  return (
    <div className="visor-overlay" aria-hidden="true">
      <span className="reticle tl" /><span className="reticle tr" /><span className="reticle bl" /><span className="reticle br" />
      <span className="reticle-tick top" /><span className="reticle-tick bottom" />
    </div>
  );
}

// Resumen para el visor del casco: pocos datos, grandes y con texto de estado.
export function HelmetHealth({ panel }: { panel: Panel }) {
  const last = panel.history[panel.history.length - 1];
  return (
    <section aria-labelledby="helmet-health-title">
      <h3 id="helmet-health-title" className="sr-only">Resumen de salud</h3>
      <div className="hud-screen">
        <div className="hud-grid">
          {panel.measurements.map((measurement) => (
            <article key={measurement.id} className={`hud-reading ${measurement.availability}`}>
              <span className="hud-label">{measurement.label}</span>
              <span className="hud-value">{formatNumber(measurement.value)}
                {measurement.value !== null && <small> {measurement.unit}</small>}</span>
              <span className={`hud-state avail-${measurement.availability}`}>
                <AvailabilityIcon availability={measurement.availability} />
                {measurement.measured_at
                  ? `${availabilityLabels[measurement.availability]} · ${formatTime(measurement.measured_at).split(', ')[1] ?? ''}`
                  : measurement.source}
              </span>
            </article>
          ))}
        </div>
        {last && <p className="hud-line">Último registro diario · sueño {formatNumber(last.sleep_hours)} h · fatiga {formatNumber(last.fatigue_score)}/10</p>}
      </div>
      <p className="caption">Datos simulados de {panel.astronaut.id}. Disponible describe la recepción del dato, no un estado de salud. Detalle e historial en la tableta.</p>
    </section>
  );
}

export function HazardsModule({ scenarios, selectedId, onOpen }: {
  scenarios: Scenario[] | null; selectedId: string; onOpen: (id: string) => void;
}) {
  // Una consulta de la misión compartida para todo el módulo, con el mismo hook y control de revisión.
  const { request, refresh, perform, progress, actionError, requiresRefresh } = useHabitatMission();
  const mission = request.data;
  const busy = request.status === 'loading' || progress !== null;
  const canWrite = request.status === 'success' && !!mission && !busy && !requiresRefresh;
  // El motor rechaza cambiar interior/EVA con radiación o entorno abiertos; la interfaz lo anticipa deshabilitando.
  const activityLocked = mission?.events?.some((event) => activityBoundHazards.includes(event.hazard) && event.resolved === false) ?? true;
  return (
    <section aria-label="Peligros y escenarios">
      <div className="mission-head compact">
        <div><p className="eyebrow">Motor de misión simulada</p>
          <p className="caption">Una misión compartida por tableta y casco. Cada paso se registra en el motor; no hay actualización automática.</p></div>
        <button type="button" disabled={busy} onClick={() => void refresh()}><IconRefresh />Actualizar estado de misión</button>
      </div>
      <div className="activity-control">
        <div>
          <p className="eyebrow" id="activity-label">Actividad de misión</p>
          <p className="caption">{activityLocked && mission ? 'Termina el guion de radiación o de entorno antes de cambiarla.' : 'EVA activa la lectura de presión del traje en el motor; el entorno afecta entonces al traje.'}</p>
        </div>
        <div className="segmented" role="group" aria-labelledby="activity-label">
          {(['interior', 'EVA'] as const).map((activity) => (
            <button key={activity} type="button" aria-pressed={mission?.activity === activity}
              disabled={!canWrite || activityLocked || mission?.activity === activity}
              onClick={() => void perform('/api/mission/activity', `Cambiando la actividad de misión a ${activity}…`, { activity })}>
              {activity === 'interior' ? 'Interior' : 'EVA'}
            </button>
          ))}
        </div>
      </div>
      <div aria-live="polite" aria-busy={busy}>
        {progress && <p role="status" className="caption">{progress}</p>}
        {actionError && <p role="alert" className="error-notice">{actionError}</p>}
        {request.status === 'error' && <p role="alert" className="error-notice">No se pudo consultar la misión simulada. El estado de los escenarios del motor no se puede evaluar; vuelve a actualizar.</p>}
      </div>
      <ul className="hazard-list">
        {hazards.map((hazard, index) => {
          const linked = hazard.scenarioIds
            .map((id) => scenarios?.find((scenario) => scenario.id === id))
            .filter((scenario): scenario is Scenario => scenario !== undefined);
          const active = linked.some((scenario) => scenario.id === selectedId);
          const events = mission?.events?.filter((event) => event.hazard === hazard.engine) ?? [];
          const running = events.find((event) => event.resolved === false);
          const latest = running ?? events.at(-1);
          const needsInterior = interiorOnlyHazards.includes(hazard.engine);
          const canActivate = canWrite && !running && (!needsInterior || mission?.activity === 'interior');
          const tone = noticeTone(running);
          return (
            <li key={hazard.id} className={`hazard${linked.length ? ' has-scenarios' : ''}${active ? ' is-active' : ''} engine-${tone}`}>
              <div className="hazard-title">
                <span className="hazard-icon"><HazardIcon id={hazard.id} /></span>
                <div>
                  <span className="tab-index" aria-hidden="true">H{index + 1}</span>
                  <h3>{hazard.name}</h3>
                </div>
              </div>
              <p className="muted">{hazard.note}</p>
              <div className="engine-state">
                <p className="eyebrow">Escenario del motor · {hazard.engine}</p>
                {request.status === 'loading' ? <p className="caption">Consultando la misión…</p>
                  : <NoticeTag notice={latest} empty={mission ? 'Inactivo' : 'Sin datos'} activePrefix="Activo · " />}
                {running && mission ? <EventSteps event={running} mission={mission} canWrite={canWrite} perform={perform} />
                  : (
                    <button type="button" className="primary" disabled={!canActivate}
                      onClick={() => void perform(`/api/mission/scenarios/${encodeURIComponent(hazard.engine)}/activate`, `Activando escenario del motor: ${hazard.name}…`)}>
                      {latest ? 'Volver a activar el escenario' : 'Activar escenario del motor'}
                    </button>
                  )}
                <p className="caption">{needsInterior ? 'Requiere actividad interior. ' : ''}{hazard.followUp}</p>
              </div>
              {linked.length > 0 && (
                <div className="hazard-scenarios">
                  <p className="eyebrow">Escenarios de demostración del panel</p>
                  {active && <span className="hazard-active">Escenario del panel activo</span>}
                  {linked.map((scenario) => (
                    <button key={scenario.id} type="button" className="secondary"
                      aria-pressed={scenario.id === selectedId} onClick={() => onOpen(scenario.id)}>
                      {scenario.name}{scenario.id === selectedId ? ' · activo' : ''}
                    </button>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {scenarios === null && <p className="caption">La lista de escenarios no está disponible; vuelve a comprobar la conexión.</p>}
      <p className="caption">Nombres de los peligros según <a href={hazardsSource} target="_blank" rel="noreferrer">NASA · 5 Hazards of Human Spaceflight ↗</a>. La asignación de escenarios es una decisión del equipo. Abrir un escenario lo carga en el módulo de salud.</p>
    </section>
  );
}
