// Componentes de la consola modular. Código asistido por Claude; véase docs/AI_DISCLOSURE.md.
import { useRef, type KeyboardEvent } from 'react';
import { hazards, hazardsSource, modules, type ModuleDef, type ModuleId } from './modules';
import { availabilityLabels, formatNumber, formatTime, type Panel, type Scenario } from './panel';

export function ModuleTabs({ ids, active, onSelect }: {
  ids: ModuleId[]; active: ModuleId; onSelect: (id: ModuleId) => void;
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
    <div role="tablist" aria-label="Módulos" aria-orientation="vertical" className="module-tabs">
      {ids.map((id, index) => {
        const module = modules[id];
        const selected = id === active;
        return (
          <button key={id} type="button" role="tab" id={`tab-${id}`} aria-selected={selected}
            aria-controls="module-panel" tabIndex={selected ? 0 : -1}
            ref={(element) => { refs.current[index] = element; }}
            onClick={() => onSelect(id)} onKeyDown={(event) => onKey(event, index)}>
            <span className="tab-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            <span className="tab-label">{module.short}</span>
            {module.status === 'en-diseno' && <span className="tab-state">En diseño</span>}
          </button>
        );
      })}
    </div>
  );
}

export function ModuleHeader({ module }: { module: ModuleDef }) {
  return (
    <div className="module-header">
      <div><p className="eyebrow">Módulo</p><h2>{module.label}</h2><p className="muted">{module.summary}</p></div>
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
            {feature.constraint && <span className="constraint">Condición: {feature.constraint}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}

// Resumen para el visor del casco: pocos datos, grandes y con texto de estado.
export function HelmetHealth({ panel }: { panel: Panel }) {
  const last = panel.history[panel.history.length - 1];
  return (
    <section aria-labelledby="helmet-health-title">
      <h3 id="helmet-health-title" className="sr-only">Resumen de salud</h3>
      <div className="hud-grid">
        {panel.measurements.map((measurement) => (
          <article key={measurement.id} className={`hud-reading ${measurement.availability}`}>
            <span className="hud-label">{measurement.label}</span>
            <span className="hud-value">{formatNumber(measurement.value)}
              {measurement.value !== null && <small> {measurement.unit}</small>}</span>
            <span className="hud-state">{measurement.measured_at
              ? `${availabilityLabels[measurement.availability]} · ${formatTime(measurement.measured_at).split(', ')[1] ?? ''}`
              : measurement.source}</span>
          </article>
        ))}
      </div>
      {last && <p className="hud-line">Último registro diario · sueño {formatNumber(last.sleep_hours)} h · fatiga {formatNumber(last.fatigue_score)}/10</p>}
      <p className="caption">Datos simulados de {panel.astronaut.id}. Disponible describe la recepción del dato, no un estado de salud. Detalle e historial en la tableta.</p>
    </section>
  );
}

export function HazardsModule({ scenarios, selectedId, onOpen }: {
  scenarios: Scenario[] | null; selectedId: string; onOpen: (id: string) => void;
}) {
  return (
    <section aria-label="Peligros y escenarios">
      <ul className="hazard-list">
        {hazards.map((hazard, index) => {
          const linked = hazard.scenarioIds
            .map((id) => scenarios?.find((scenario) => scenario.id === id))
            .filter((scenario): scenario is Scenario => scenario !== undefined);
          return (
            <li key={hazard.id} className={linked.length ? 'hazard has-scenarios' : 'hazard'}>
              <div className="hazard-title"><span className="tab-index" aria-hidden="true">H{index + 1}</span><h3>{hazard.name}</h3></div>
              <p className="muted">{hazard.note}</p>
              {linked.length > 0 && (
                <div className="hazard-scenarios">
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
