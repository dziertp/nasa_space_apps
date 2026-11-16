// Módulo Estado del traje para tableta y casco. Código asistido por Claude Code; véase docs/AI_DISCLOSURE.md.
import { Fragment, useRef, useState, type ReactNode, type RefObject } from 'react';
import { ArcGauge } from './charts';
import { IconRefresh, StateIcon, StateTag } from './icons';
import { NoticeTag } from './missionView';
import type { DeviceId } from './modules';
import { formatNumber, formatTime } from './panel';
import SuitFigure from './SuitFigure';
import {
  applySuitEngine, countByState, countLabel, mostSevere, openSuitAnomaly, suitStateLabels, suitStates,
  type SuitPanel, type SuitPart,
} from './suit';
import { useHabitatMission } from './useHabitatMission';
import { useLocalApi } from './useLocalApi';

// Escalas de visualización de los medidores, no criterios: porcentaje 0–100 y presión 0–35 kPa.
const gaugeScales: Record<string, { label: string; max: number }> = {
  soporte_vital: { label: 'O₂', max: 100 },
  bateria: { label: 'Batería', max: 100 },
  presion: { label: 'Presión', max: 35 },
};
const partNumber = (index: number) => String(index + 1).padStart(2, '0');

// Sin unidad = parte sin magnitud numérica; null con unidad = «Sin datos», nunca cero.
function Reading({ part }: { part: SuitPart }) {
  if (part.unit === null) return <span className="suit-reading textual">Sin valor numérico</span>;
  if (part.value === null) return <span className="suit-reading textual">Sin datos</span>;
  return <span className="suit-reading">{formatNumber(part.value)}<small> {part.unit}</small></span>;
}

function StateLegend() {
  return (
    <p className="state-legend">
      {suitStates.map((state) => <span key={state} className={`state-tag state-${state}`}><StateIcon state={state} />{suitStateLabels[state]}</span>)}
    </p>
  );
}

function PartsGrid({ parts, selected, select }: { parts: SuitPart[]; selected?: SuitPart; select: (id: string) => void }) {
  return (
    <ul className="suit-grid" aria-label="Partes del traje">
      {parts.map((part, index) => (
        <li key={part.id}>
          <button type="button" className={`suit-part ${part.status}`} aria-pressed={part.id === selected?.id}
            aria-controls="suit-detail" onClick={() => select(part.id)}>
            <span className="suit-part-label"><span className="part-number" aria-hidden="true">{partNumber(index)}</span>{part.label}</span>
            <Reading part={part} />
            <StateTag state={part.status} />
            {part.engine && <span className="engine-tag">Motor de misión</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}

function TabletSuit({ suit, selected, select, detailRef }: {
  suit: SuitPanel; selected?: SuitPart; select: (id: string) => void; detailRef: RefObject<HTMLElement | null>;
}) {
  return (
    <>
      <div className="suit-gauges" role="group" aria-label="Medidores del traje">
        {suit.parts.filter((part) => part.id in gaugeScales).map((part) => (
          <ArcGauge key={part.id} label={gaugeScales[part.id].label} measure={part.measure ?? part.label} value={part.value}
            unit={part.unit ?? ''} min={0} max={gaugeScales[part.id].max} state={part.status} selected={part.id === selected?.id} />
        ))}
      </div>
      <div className="suit-split">
        <section className="card suit-figure-card" aria-labelledby="suit-figure-title">
          <h3 id="suit-figure-title" className="card-title">Silueta del traje</h3>
          <SuitFigure parts={suit.parts} selectedId={selected?.id} onSelect={select} />
          <StateLegend />
        </section>
        <section id="suit-detail" ref={detailRef} className={`card suit-detail ${selected?.status ?? ''}`}
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
                {selected.engine && <><dt>Evento del motor</dt><dd>{selected.engine.eventId} · {selected.engine.phase}</dd></>}
              </dl>
            </>
          ) : <h3 id="suit-detail-title">Sin datos de partes</h3>}
        </section>
      </div>
      <PartsGrid parts={suit.parts} selected={selected} select={select} />
    </>
  );
}

// Visor del casco: pocos datos y grandes; el resto queda debajo, como información complementaria.
function HelmetSuit({ suit, selected, select, detailRef, notes }: {
  suit: SuitPanel; selected?: SuitPart; select: (id: string) => void; detailRef: RefObject<HTMLElement | null>; notes: ReactNode;
}) {
  return (
    <>
      <div className="hud-screen">
        <section id="suit-detail" ref={detailRef} className={`hud-focus ${selected?.status ?? ''}`}
          aria-labelledby="suit-detail-title" aria-live="polite">
          {selected ? (
            <>
              <h3 id="suit-detail-title" className="hud-label">{selected.label}{selected.measure ? ` · ${selected.measure}` : ''}</h3>
              <p className="hud-focus-value"><Reading part={selected} /></p>
              <StateTag state={selected.status} />
              <p className="hud-focus-text"><span className="hud-label">Indicación</span> {selected.indication}
                <span className="review-tag">{selected.indication_review}</span></p>
              <p className="hud-focus-text"><span className="hud-label">Posible riesgo</span> {selected.risk}</p>
            </>
          ) : <h3 id="suit-detail-title" className="hud-label">Sin datos de partes</h3>}
        </section>
        <ul className="hud-parts" aria-label="Partes del traje">
          {suit.parts.map((part, index) => (
            <li key={part.id}>
              <button type="button" className={`hud-chip ${part.status}`} aria-pressed={part.id === selected?.id}
                aria-controls="suit-detail" onClick={() => select(part.id)}>
                <span className="hud-chip-label"><span className="part-number" aria-hidden="true">{partNumber(index)}</span>{part.label}</span>
                <StateTag state={part.status} />
                {part.engine && <span className="engine-tag">Motor de misión</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="hud-notes">
        <p className="eyebrow">Información complementaria</p>
        {selected && (
          <dl className="hud-detail">
            <dt>Lectura simulada</dt>
            <dd>{selected.measure ? <>{selected.measure}: <Reading part={selected} /></> : 'Sin valor numérico'}</dd>
            <dt>Observación</dt><dd>{selected.observation}</dd>
            <dt>Criterio del equipo</dt><dd>{selected.criterion}</dd>
            <dt>Procedencia</dt><dd>{selected.source}</dd>
            {selected.engine && <><dt>Evento del motor</dt><dd>{selected.engine.eventId} · {selected.engine.phase}</dd></>}
          </dl>
        )}
        {notes}
      </div>
    </>
  );
}

function SuitView({ suit, device }: { suit: SuitPanel; device: DeviceId }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const detailRef = useRef<HTMLElement>(null);
  const selected = suit.parts.find((part) => part.id === selectedId) ?? mostSevere(suit.parts);

  function select(id: string) {
    setSelectedId(id);
    // En pantallas estrechas el detalle puede quedar fuera de la vista.
    window.requestAnimationFrame(() => detailRef.current?.scrollIntoView({ block: 'nearest' }));
  }

  const context = (
    <>
      <p className="caption suit-policy">{suit.criteria_policy}</p>
      <p className="scenario-line">{suit.scenario.description}</p>
      <p className="caption">Toca una parte para ver su riesgo y su indicación.</p>
    </>
  );
  const identity = (
    <>
      <p className="caption">{suit.suit.name} de {suit.suit.astronaut_id} · estado al reloj de demostración ({formatTime(suit.demo_time)}).</p>
      <details className="provenance"><summary>Procedencia y generación del estado del traje</summary>
        <p>{suit.provenance.author}. Generado el {suit.provenance.generated_on}.</p>
        <p>{suit.provenance.method}</p>
        <p>Estos valores no proceden de NASA ni de un traje real. Las indicaciones no son protocolos aprobados.</p>
      </details>
    </>
  );

  if (device === 'casco') {
    return <HelmetSuit suit={suit} selected={selected} select={select} detailRef={detailRef} notes={<>{context}{identity}</>} />;
  }
  return (
    <>
      {context}
      <TabletSuit suit={suit} selected={selected} select={select} detailRef={detailRef} />
      {identity}
    </>
  );
}

export default function SuitModule({ scenarioId, attempt, device }: { scenarioId: string; attempt: number; device: DeviceId }) {
  const request = useLocalApi<SuitPanel>(`/api/scenarios/${encodeURIComponent(scenarioId)}/suit`, attempt);
  // Una consulta de la misión al abrir el módulo, sin sondeo; solo lectura.
  const missionRequest = useHabitatMission();
  const mission = missionRequest.request.status === 'success' ? missionRequest.request.data : null;
  const anomaly = openSuitAnomaly(mission);
  const base = request.status === 'success' ? request.data : null;
  const suit = base && { ...base, parts: applySuitEngine(base.parts, mission) };
  const counts = suit ? countByState(suit.parts) : null;
  const enginePressure = suit?.parts.find((part) => part.engine);

  return (
    <section aria-label="Estado de las partes del traje" className={`suit suit-${device}`}>
      <div aria-live="polite" aria-busy={request.status === 'loading'}>
        {request.status === 'loading' && <p className="loading-panel" role="status">Cargando estado del traje…</p>}
        {request.status === 'error' && <p className="error-notice" role="alert">No se pudo cargar el estado del traje; no se muestra un estado anterior. Vuelve a comprobar.</p>}
        {counts && (
          <p className="suit-summary">
            {suitStates.map((state, index) => (
              <Fragment key={state}>
                {index > 0 && <span className="summary-sep"> · </span>}
                <span className={`suit-count ${counts[state] > 0 ? `state-${state}` : 'zero'}`}>
                  <StateIcon state={state} />{countLabel(state, counts[state])}
                </span>
              </Fragment>
            ))}
          </p>
        )}
      </div>
      <div className={`suit-engine${anomaly ? ' active' : ''}`} aria-live="polite">
        <div>
          <p className="eyebrow">Motor de misión simulada</p>
          {missionRequest.request.status === 'loading' && <p className="caption">Consultando el motor de misión…</p>}
          {missionRequest.request.status === 'error' && <p className="caption" role="alert">No se pudo consultar el motor de misión; se muestra solo el estado base del traje.</p>}
          {mission && anomaly && (
            <>
              <NoticeTag notice={anomaly} empty="Sin datos" activePrefix="Prioridad del motor · " />
              <p className="caption">La presión del traje ({enginePressure?.value === null || enginePressure?.value === undefined ? 'Sin datos' : `${formatNumber(enginePressure.value)} ${enginePressure.unit ?? ''}`}) viene del motor y sustituye a la del estado base mientras la anomalía {anomaly.id} siga abierta. Las demás partes siguen el estado base del traje. Los pasos del guion están en Hazards.</p>
            </>
          )}
          {mission && !anomaly && <p className="caption">Sin anomalía de presión del traje abierta en el motor (actividad {mission.activity ?? 'sin datos'}). Se muestra el estado base del traje.</p>}
        </div>
        <button type="button" className="secondary" disabled={missionRequest.request.status === 'loading'} onClick={() => void missionRequest.refresh()}>
          <IconRefresh />Actualizar estado de misión
        </button>
      </div>
      {suit && <SuitView key={suit.scenario.id} suit={suit} device={device} />}
    </section>
  );
}
