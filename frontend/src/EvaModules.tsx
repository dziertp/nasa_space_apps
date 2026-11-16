// Preparación de EVA (tableta) y módulos Misión y Equipamiento del casco.
// El plan vive en el motor de misión (/api/mission); este archivo no guarda un estado de misión propio.
// Código asistido por Claude Code; véase docs/AI_DISCLOSURE.md.
import { useEffect, useState, type ReactNode } from 'react';
import { ArcGauge } from './charts';
import {
  endedByLabels, formatMinutes, type EvaCatalog, type EvaEstimate, type EvaPlan, type EvaWarning,
} from './eva';
import { IconFlask, IconRefresh, ModuleIcon, StateIcon } from './icons';
import type { EnvironmentalMission } from './mission';
import { activityBoundHazards } from './modules';
import { formatNumber, formatTime } from './panel';
import { useHabitatMission } from './useHabitatMission';
import { useLocalApi } from './useLocalApi';

const MEMORY_NOTICE = 'El plan se guarda en el motor de misión, solo en memoria: se pierde al reiniciar el backend o la misión.';
const NO_PLAN = 'Sin plan de EVA; prepáralo en la tableta.';
const DEFAULT_ROUTE = 'crater-alfa';
const DEFAULT_EQUIPMENT = ['kit-geologico', 'contenedores', 'camara'];
// Escalas de visualización de los medidores: un margen sobre el límite ficticio para que el exceso se vea.
const gaugeHeadroom = 1.25;

type EstimateState = { status: 'idle' | 'loading' | 'success' | 'error'; data: EvaEstimate | null; error?: string };

// POST /api/eva/estimate al cambiar la selección (no es sondeo): el cálculo está en el backend.
function useEstimate(routeId: string | null, equipmentIds: string[]) {
  const key = `${routeId}|${equipmentIds.join(',')}`;
  const [state, setState] = useState<EstimateState>({ status: 'idle', data: null });
  useEffect(() => {
    if (!routeId) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000);
    setState((previous) => ({ status: 'loading', data: previous.data }));
    fetch('/api/eva/estimate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
      body: JSON.stringify({ route_id: routeId, equipment_ids: equipmentIds }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        setState({ status: 'success', data: await response.json() as EvaEstimate });
      })
      .catch(() => { if (!controller.signal.aborted) setState({ status: 'error', data: null }); })
      .finally(() => window.clearTimeout(timeout));
    return () => { controller.abort(); window.clearTimeout(timeout); };
    // key resume la selección; equipmentIds cambia de identidad en cada render.
  }, [key]);
  return state;
}

function warningFor(estimate: EvaEstimate, id: EvaWarning['id']) {
  return estimate.warnings.some((warning) => warning.id === id);
}

function Indicators({ estimate }: { estimate: EvaEstimate }) {
  const { limits } = estimate;
  const status = (exceeded: boolean) => exceeded
    ? { icon: 'precaucion' as const, label: 'Supera el límite' }
    : { icon: 'ok' as const, label: 'Dentro del límite' };
  const duration = warningFor(estimate, 'duracion');
  const load = warningFor(estimate, 'carga');
  const battery = warningFor(estimate, 'bateria');
  return (
    <div className="suit-gauges eva-gauges" role="group" aria-label="Indicadores estimados del plan">
      <ArcGauge label="Duración" measure="Duración estimada" value={estimate.duration_min} unit="min"
        min={0} max={Math.round(limits.max_duration_min * gaugeHeadroom)} state={duration ? 'precaucion' : 'neutral'} status={status(duration)} />
      <ArcGauge label="Carga" measure="Carga total" value={estimate.load_kg} unit="kg"
        min={0} max={Math.round(limits.max_load_kg * gaugeHeadroom)} state={load ? 'precaucion' : 'neutral'} status={status(load)} />
      <ArcGauge label="Batería al volver" measure="Batería estimada al volver" value={estimate.battery_return_pct} unit="%"
        min={0} max={100} state={battery ? 'precaucion' : 'neutral'} status={status(battery)} />
    </div>
  );
}

function PlanningNotice({ estimate }: { estimate: EvaEstimate }) {
  if (estimate.warnings.length === 0) {
    return <p className="eva-ok"><StateIcon state="ok" />El plan cumple los límites ficticios de planificación.</p>;
  }
  return (
    <div className="eva-warning" role="note" aria-label="Aviso de planificación">
      <p className="eva-warning-title"><StateIcon state="precaucion" />Aviso de planificación · no clínico</p>
      <ul>{estimate.warnings.map((warning) => <li key={warning.id}>{warning.message}</li>)}</ul>
      <p className="caption">Estos límites son decisiones ficticias del equipo para planificar, no límites del cuerpo ni del traje real. Puedes iniciar la EVA igualmente; el aviso queda guardado en el plan.</p>
    </div>
  );
}

// Motivo por el que no se puede iniciar; null si se puede. Las mismas reglas aplica el motor (409).
function startBlock(mission: EnvironmentalMission | null, ready: boolean): string | null {
  if (!mission) return 'Sin estado de misión: actualiza antes de iniciar.';
  const open = mission.events?.find((event) => activityBoundHazards.includes(event.hazard) && event.resolved === false);
  if (open) {
    return `Hay un guion de ${open.hazard === 'radiacion' ? 'radiación' : 'entorno'} abierto (${open.label ?? open.state ?? 'Sin datos'}). El motor no permite cambiar a EVA hasta terminarlo en Hazards.`;
  }
  if (mission.eva_plan?.status === 'activo') return 'Ya hay una EVA en curso. Termínala antes de iniciar otra.';
  if (mission.activity === 'EVA') return 'La actividad ya es EVA (cambiada desde Hazards). Vuelve a Interior para iniciar una EVA con plan.';
  if (!ready) return 'Esperando la estimación del plan.';
  return null;
}

function PlanSummary({ plan, priorities }: { plan: EvaPlan; priorities?: boolean }) {
  return (
    <dl className="eva-plan-summary">
      <dt>Recorrido</dt><dd>{plan.route.name}</dd>
      <dt>Punto de retorno</dt><dd>{plan.route.return_point.label} · {formatNumber(plan.route.return_point.distance_km)} km</dd>
      <dt>Duración estimada</dt><dd>{formatMinutes(plan.estimate.duration_min)}</dd>
      <dt>Carga</dt><dd>{formatNumber(plan.estimate.load_kg)} kg · {plan.equipment.length} elementos</dd>
      <dt>Batería al volver</dt><dd>{formatNumber(plan.estimate.battery_return_pct)} %</dd>
      <dt>Inicio · hora simulada</dt><dd>{formatTime(plan.started_at)}</dd>
      {plan.status === 'terminado' && <><dt>Fin · hora simulada</dt><dd>{formatTime(plan.ended_at)}{plan.ended_by ? ` · ${endedByLabels[plan.ended_by]}` : ''}</dd></>}
      {priorities && plan.estimate.warnings.length > 0 && <><dt>Avisos de planificación</dt><dd>{plan.estimate.warnings.length}</dd></>}
    </dl>
  );
}

export function EvaPlanning() {
  const catalogRequest = useLocalApi<EvaCatalog>('/api/eva/catalog', 0);
  const catalog = catalogRequest.data;
  const { request, refresh, perform, progress, actionError, requiresRefresh } = useHabitatMission();
  const mission = request.data;
  const [routeId, setRouteId] = useState(DEFAULT_ROUTE);
  const [equipmentIds, setEquipmentIds] = useState<string[]>(DEFAULT_EQUIPMENT);
  // Conserva el orden del catálogo para que la misma selección produzca la misma petición.
  const ordered = catalog ? catalog.equipment.map((item) => item.id).filter((id) => equipmentIds.includes(id)) : equipmentIds;
  const estimate = useEstimate(catalog ? routeId : null, ordered);
  const route = catalog?.routes.find((item) => item.id === routeId);
  const busy = request.status === 'loading' || progress !== null;
  const canWrite = request.status === 'success' && !!mission && !busy && !requiresRefresh;
  const blocked = startBlock(mission, estimate.status === 'success');
  const plan = mission?.eva_plan ?? null;

  function toggle(id: string) {
    setEquipmentIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  return (
    <section className="eva" aria-label="Preparación de EVA">
      {catalogRequest.status === 'loading' && <p className="loading-panel" role="status">Cargando catálogo de EVA…</p>}
      {catalogRequest.status === 'error' && <p className="error-notice" role="alert">No se pudo cargar el catálogo de EVA. Vuelve a comprobar la conexión con la API.</p>}
      {catalog && (
        <>
          <p className="caption suit-policy">{catalog.planning_policy}</p>
          <div className="eva-layout">
            <div className="eva-choices">
              <fieldset className="card eva-fieldset">
                <legend className="card-title">Recorrido</legend>
                {catalog.routes.map((item) => (
                  <label key={item.id} className={`eva-option${item.id === routeId ? ' is-selected' : ''}`}>
                    <input type="radio" name="eva-route" value={item.id} checked={item.id === routeId} onChange={() => setRouteId(item.id)} />
                    <span className="eva-option-text">
                      <strong>{item.name}</strong>
                      <span>{formatNumber(item.distance_km)} km ida y vuelta · desnivel {formatNumber(item.ascent_m)} m · {item.objectives.length} objetivos</span>
                    </span>
                  </label>
                ))}
              </fieldset>
              <fieldset className="card eva-fieldset">
                <legend className="card-title">Equipamiento</legend>
                {catalog.equipment.map((item) => (
                  <label key={item.id} className={`eva-option${equipmentIds.includes(item.id) ? ' is-selected' : ''}`}>
                    <input type="checkbox" checked={equipmentIds.includes(item.id)} onChange={() => toggle(item.id)} />
                    <span className="eva-option-text">
                      <strong>{item.label}</strong>
                      <span>{formatNumber(item.mass_kg)} kg · {item.power_w === 0 ? 'sin consumo eléctrico' : `${formatNumber(item.power_w)} W`}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
            </div>
            <div className="eva-result">
              <section className="card" aria-labelledby="eva-estimate-title" aria-live="polite" aria-busy={estimate.status === 'loading'}>
                <div className="eva-result-head">
                  <h3 id="eva-estimate-title" className="card-title">Estimación del plan</h3>
                  <span className="simulation-label"><IconFlask />Datos simulados</span>
                </div>
                {estimate.status === 'error' && <p className="error-notice" role="alert">No se pudo calcular la estimación. Cambia la selección o vuelve a comprobar la API.</p>}
                {estimate.status === 'loading' && <p className="caption" role="status">Recalculando en la API local…</p>}
                {estimate.data && (
                  <>
                    <Indicators estimate={estimate.data} />
                    <p className="caption">
                      {formatNumber(estimate.data.travel_min)} min de desplazamiento + {formatNumber(estimate.data.task_min)} min de objetivos ·
                      {' '}consumo {formatNumber(estimate.data.power_w)} W · energía {formatNumber(estimate.data.energy_wh)} Wh de {formatNumber(estimate.data.limits.battery_capacity_wh)} Wh.
                      {' '}Escalas de visualización: hasta {formatMinutes(Math.round(estimate.data.limits.max_duration_min * gaugeHeadroom))}, {formatNumber(Math.round(estimate.data.limits.max_load_kg * gaugeHeadroom))} kg y 100 %.
                    </p>
                    <PlanningNotice estimate={estimate.data} />
                  </>
                )}
                {route && (
                  <dl className="eva-plan-summary">
                    <dt>Objetivos</dt><dd>{route.objectives.map((item) => `${item.label} (${item.minutes} min)`).join(' · ')}</dd>
                    <dt>Punto de retorno</dt><dd>{route.return_point.label} · {formatNumber(route.return_point.distance_km)} km. {route.return_point.note}</dd>
                  </dl>
                )}
                <details className="provenance"><summary>Fórmulas y límites ficticios</summary>
                  <ul>{catalog.formula.description.map((line) => <li key={line}>{line}</li>)}</ul>
                  <p>Límites: carga {formatNumber(catalog.limits.max_load_kg)} kg, duración {formatMinutes(catalog.limits.max_duration_min)}, batería {formatNumber(catalog.limits.battery_capacity_wh)} Wh con reserva de planificación del {formatNumber(catalog.limits.battery_reserve_pct)} % al volver.</p>
                  <p>{catalog.provenance.author}. Generado el {catalog.provenance.generated_on}. {catalog.provenance.method}</p>
                </details>
              </section>

              <section className="card mission-section eva-mission" aria-labelledby="eva-mission-title">
                <div className="mission-head">
                  <span className="mission-icon"><ModuleIcon id="mision" /></span>
                  <div><p className="eyebrow">Misión simulada compartida</p><h2 id="eva-mission-title">EVA en el motor de misión</h2></div>
                  <span />
                  <button type="button" disabled={busy} onClick={() => void refresh()}><IconRefresh />Actualizar estado de misión</button>
                </div>
                <p className="caption">{MEMORY_NOTICE} Sin actualización automática.</p>
                <div aria-live="polite" aria-busy={busy}>
                  {progress && <p role="status" className="caption">{progress}</p>}
                  {actionError && <p role="alert" className="error-notice">{actionError}</p>}
                  {request.status === 'error' && <p role="alert" className="error-notice">No se pudo consultar la misión simulada; vuelve a actualizar.</p>}
                  {mission && (
                    <>
                      <p className="eva-activity">Actividad de misión: <strong>{mission.activity === 'EVA' ? 'EVA' : mission.activity === 'interior' ? 'Interior' : 'Sin datos'}</strong>
                        {plan ? <> · plan {plan.status === 'activo' ? <strong>en curso</strong> : 'terminado (último plan)'}</> : ' · sin plan guardado'}</p>
                      {plan && <PlanSummary plan={plan} priorities />}
                    </>
                  )}
                </div>
                <div className="mission-toolbar">
                  <button type="button" className="primary" disabled={!canWrite || blocked !== null}
                    onClick={() => void perform('/api/mission/eva/start', 'Iniciando EVA…', { route_id: routeId, equipment_ids: ordered })}>
                    Iniciar EVA
                  </button>
                  <button type="button" disabled={!canWrite || plan?.status !== 'activo'}
                    onClick={() => void perform('/api/mission/eva/end', 'Terminando EVA…')}>
                    Terminar EVA
                  </button>
                </div>
                {blocked && mission && <p className="caption eva-block" role="status"><StateIcon state="sindatos" />{blocked}</p>}
                <p className="caption">Iniciar EVA guarda el plan seleccionado y cambia la actividad a EVA con la misma regla que el selector de Hazards. Terminar EVA vuelve a Interior y conserva el plan como último plan.</p>
              </section>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

// Casco: lectura del plan activo en el motor. Una consulta al abrir el módulo, sin sondeo.
function useActivePlan() {
  const { request, refresh } = useHabitatMission();
  const plan = request.data?.eva_plan ?? null;
  return { request, refresh, plan, active: plan?.status === 'activo' ? plan : null };
}

function HelmetPlanFrame({ title, children, plan, request, refresh }: {
  title: string; children: ReactNode; plan: EvaPlan | null;
  request: ReturnType<typeof useHabitatMission>['request']; refresh: () => Promise<void>;
}) {
  return (
    <section className="hud-mission eva-hud" aria-labelledby="eva-hud-title">
      <div className="hud-mission-head">
        <h3 id="eva-hud-title" className="hud-label">{title}</h3>
        <button type="button" className="secondary" disabled={request.status === 'loading'} onClick={() => void refresh()}><IconRefresh />Actualizar plan</button>
      </div>
      <div aria-live="polite" aria-busy={request.status === 'loading'}>
        {request.status === 'loading' && <p className="loading-panel" role="status">Consultando el plan de EVA…</p>}
        {request.status === 'error' && <p className="error-notice" role="alert">No se pudo consultar la misión simulada; vuelve a actualizar.</p>}
        {request.status === 'success' && children}
        {request.status === 'success' && plan?.status === 'terminado' && (
          <p className="caption">Último plan: {plan.route.name}, terminado a las {formatTime(plan.ended_at).split(', ')[1] ?? formatTime(plan.ended_at)}.</p>
        )}
      </div>
      <p className="caption">{MEMORY_NOTICE} Datos simulados.</p>
    </section>
  );
}

export function HelmetMission() {
  const { request, refresh, plan, active } = useActivePlan();
  return (
    <HelmetPlanFrame title="Plan de EVA · misión simulada" plan={plan} request={request} refresh={refresh}>
      {active ? (
        <div className="hud-screen">
          <div className="hud-grid">
            <article className="hud-reading">
              <span className="hud-label">Tiempo estimado</span>
              <span className="hud-value">{formatMinutes(active.estimate.duration_min)}</span>
              <span className="hud-state">Inicio {formatTime(active.started_at).split(', ')[1] ?? ''}</span>
            </article>
            <article className="hud-reading">
              <span className="hud-label">Punto de retorno</span>
              <span className="hud-value eva-hud-text">{active.route.return_point.label}</span>
              <span className="hud-state">{formatNumber(active.route.return_point.distance_km)} km desde la esclusa</span>
            </article>
          </div>
          <p className="hud-line">{active.route.name}</p>
          <ol className="eva-objectives">
            {active.route.objectives.map((objective) => (
              <li key={objective.id}><span>{objective.label}</span><span className="eva-minutes">{objective.minutes} min</span></li>
            ))}
          </ol>
          <p className="hud-line">{active.route.return_point.note}</p>
          {active.estimate.warnings.length > 0 && (
            <p className="hud-line eva-hud-warning"><StateIcon state="precaucion" />{active.estimate.warnings.length} aviso{active.estimate.warnings.length === 1 ? '' : 's'} de planificación, no clínico{active.estimate.warnings.length === 1 ? '' : 's'}: detalle en la tableta.</p>
          )}
        </div>
      ) : <p className="no-notice eva-empty"><StateIcon state="sindatos" />{NO_PLAN}</p>}
    </HelmetPlanFrame>
  );
}

export function HelmetEquipment() {
  const { request, refresh, plan, active } = useActivePlan();
  return (
    <HelmetPlanFrame title="Equipamiento de la EVA · misión simulada" plan={plan} request={request} refresh={refresh}>
      {active ? (
        <div className="hud-screen">
          <div className="hud-grid">
            <article className={`hud-reading${warningFor(active.estimate, 'carga') ? ' eva-over' : ''}`}>
              <span className="hud-label">Carga total</span>
              <span className="hud-value">{formatNumber(active.estimate.load_kg)}<small> kg</small></span>
              <span className="hud-state">Máximo ficticio {formatNumber(active.estimate.limits.max_load_kg)} kg</span>
            </article>
            <article className={`hud-reading${warningFor(active.estimate, 'bateria') ? ' eva-over' : ''}`}>
              <span className="hud-label">Batería estimada al volver</span>
              <span className="hud-value">{formatNumber(active.estimate.battery_return_pct)}<small> %</small></span>
              <span className="hud-state">Estimación del plan, no lectura del traje</span>
            </article>
          </div>
          {active.equipment.length === 0 ? <p className="hud-line">Plan sin equipamiento.</p> : (
            <ul className="eva-inventory">
              {active.equipment.map((item) => (
                <li key={item.id}><span>{item.label}</span><span className="eva-minutes">{formatNumber(item.mass_kg)} kg{item.power_w ? ` · ${formatNumber(item.power_w)} W` : ''}</span></li>
              ))}
            </ul>
          )}
        </div>
      ) : <p className="no-notice eva-empty"><StateIcon state="sindatos" />{NO_PLAN}</p>}
    </HelmetPlanFrame>
  );
}
