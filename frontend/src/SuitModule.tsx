// Módulo Estado del traje del casco. Código asistido por Claude Code; véase docs/AI_DISCLOSURE.md.
import { Fragment, useRef, useState } from 'react';
import { formatNumber, formatTime } from './panel';
import {
  countByState, countLabel, mostSevere, suitStateLabels, suitStates,
  type SuitPanel, type SuitPart, type SuitState,
} from './suit';
import { useLocalApi } from './useLocalApi';

// Cada estado tiene su forma (círculo, triángulo, cuadrado) además de color y texto.
function StateIcon({ state }: { state: SuitState }) {
  return (
    <svg className="suit-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      {state === 'ok' && <><circle cx="8" cy="8" r="7.2" fill="currentColor" /><path className="suit-icon-mark" d="M4.6 8.3 7 10.6l4.4-4.9" /></>}
      {state === 'precaucion' && <><path d="M8 .8 15.4 14.6H.6z" fill="currentColor" /><path className="suit-icon-mark" d="M8 5.6v3.9M8 12v.01" /></>}
      {state === 'critico' && <><rect x="1" y="1" width="14" height="14" fill="currentColor" /><path className="suit-icon-mark" d="m5.2 5.2 5.6 5.6m0-5.6-5.6 5.6" /></>}
    </svg>
  );
}

function StateTag({ state }: { state: SuitState }) {
  return <span className={`suit-state state-${state}`}><StateIcon state={state} />{suitStateLabels[state]}</span>;
}

// Sin unidad = parte sin magnitud numérica; null con unidad = «Sin datos», nunca cero.
function Reading({ part }: { part: SuitPart }) {
  if (part.unit === null) return <span className="suit-reading textual">Sin valor numérico</span>;
  if (part.value === null) return <span className="suit-reading textual">Sin datos</span>;
  return <span className="suit-reading">{formatNumber(part.value)}<small> {part.unit}</small></span>;
}

function SuitParts({ suit }: { suit: SuitPanel }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const detailRef = useRef<HTMLElement>(null);
  const selected = suit.parts.find((part) => part.id === selectedId) ?? mostSevere(suit.parts);

  function select(id: string) {
    setSelectedId(id);
    // En pantallas estrechas el detalle queda bajo la cuadrícula.
    window.requestAnimationFrame(() => detailRef.current?.scrollIntoView({ block: 'nearest' }));
  }

  return (
    <>
      <ul className="suit-grid" aria-label="Partes del traje">
        {suit.parts.map((part) => (
          <li key={part.id}>
            <button type="button" className={`suit-part ${part.status}`} aria-pressed={part.id === selected?.id}
              aria-controls="suit-detail" onClick={() => select(part.id)}>
              <span className="suit-part-label">{part.label}</span>
              <Reading part={part} />
              <StateTag state={part.status} />
            </button>
          </li>
        ))}
      </ul>
      <section id="suit-detail" ref={detailRef} className={`suit-detail ${selected?.status ?? ''}`}
        aria-labelledby="suit-detail-title" aria-live="polite">
        {selected ? (
          <>
            <div className="suit-detail-head">
              <h3 id="suit-detail-title">{selected.label}</h3>
              <StateTag state={selected.status} />
            </div>
            <dl>
              <dt>Lectura simulada</dt>
              <dd>{selected.measure ? <>{selected.measure}: <Reading part={selected} /></> : 'Sin valor numérico'}</dd>
              <dt>Observación</dt><dd>{selected.observation}</dd>
              <dt>Posible riesgo</dt><dd>{selected.risk}</dd>
              <dt>Indicación</dt>
              <dd>{selected.indication}<span className="review-tag">{selected.indication_review}</span></dd>
              <dt>Criterio del equipo</dt><dd>{selected.criterion}</dd>
              <dt>Procedencia</dt><dd>{selected.source}</dd>
            </dl>
          </>
        ) : <h3 id="suit-detail-title">Sin datos de partes</h3>}
      </section>
    </>
  );
}

export default function SuitModule({ scenarioId, attempt }: { scenarioId: string; attempt: number }) {
  const request = useLocalApi<SuitPanel>(`/api/scenarios/${encodeURIComponent(scenarioId)}/suit`, attempt);
  const suit = request.status === 'success' ? request.data : null;
  const counts = suit ? countByState(suit.parts) : null;

  return (
    <section aria-label="Estado de las partes del traje">
      <div aria-live="polite" aria-busy={request.status === 'loading'}>
        {request.status === 'loading' && <p className="loading-panel" role="status">Cargando estado del traje…</p>}
        {request.status === 'error' && <p className="error-notice" role="alert">No se pudo cargar el estado del traje; no se muestra un estado anterior. Vuelve a comprobar.</p>}
        {counts && (
          <p className="suit-summary">
            {suitStates.map((state, index) => (
              <Fragment key={state}>
                {index > 0 && ' · '}
                <span className={`suit-count ${counts[state] > 0 ? `state-${state}` : 'zero'}`}>
                  <StateIcon state={state} />{countLabel(state, counts[state])}
                </span>
              </Fragment>
            ))}
          </p>
        )}
      </div>
      {suit && (
        <>
          <p className="caption suit-policy">{suit.criteria_policy}</p>
          <p className="hud-line">{suit.scenario.description}</p>
          <p className="caption">Toca una parte para ver su riesgo y su indicación.</p>
          <SuitParts key={suit.scenario.id} suit={suit} />
          <p className="caption">{suit.suit.name} de {suit.suit.astronaut_id} · estado al reloj de demostración ({formatTime(suit.demo_time)}).</p>
          <details className="provenance"><summary>Procedencia y generación del estado del traje</summary>
            <p>{suit.provenance.author}. Generado el {suit.provenance.generated_on}.</p>
            <p>{suit.provenance.method}</p>
            <p>Estos valores no proceden de NASA ni de un traje real. Las indicaciones no son protocolos aprobados.</p>
          </details>
        </>
      )}
    </section>
  );
}
