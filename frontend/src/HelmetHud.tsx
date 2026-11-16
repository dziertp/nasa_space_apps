// Visor del casco (Casco · EVA): HUD limpio en reposo, aviso principal cuando la situación lo requiere,
// dock de sistemas y paneles de detalle bajo demanda. Lee la misma API que la tableta; no guarda un estado propio
// de misión y no consulta de forma periódica. Código asistido por Claude Code; véase docs/AI_DISCLOSURE.md.
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type KeyboardEvent, type ReactNode } from 'react';
import { ArcGauge } from './charts';
import { formatMinutes } from './eva';
import {
  buildHudAlerts, dockSeverity, formatAge, originLabels, severityLabels, suitOverall,
  type DockId, type HudAlert, type HudSeverity,
} from './hudAlerts';
import { CenterReticle, HeadingTape } from './HudOverlay';
import {
  IconBattery, IconChevron, IconClose, IconCollapse, IconDrop, IconExpand, IconGauge, IconHeart, IconInfo, IconO2,
  IconRefresh, IconSignal, IconTablet, ModuleIcon, StateIcon,
} from './icons';
import LunarScene, { type VisorSceneProps } from './LunarScene';
import type { EnvironmentalMission } from './mission';
import { NoticeTag } from './missionView';
import { hazards, type ModuleId } from './modules';
import { availabilityLabels, formatNumber, formatTime, type Measurement, type Panel, type Scenario } from './panel';
import SuitFigure from './SuitFigure';
import { applySuitEngine, suitStateLabels, type SuitPanel, type SuitPart, type SuitState } from './suit';
import { useHabitatMission } from './useHabitatMission';
import { useLocalApi } from './useLocalApi';

type PanelId = DockId | 'about';
type DockItem = { id: DockId; label: string; icon: ReactNode; tablet: ModuleId };

const DOCK_ICON = 28;
const dockItems: DockItem[] = [
  { id: 'traje', label: 'Traje', icon: <ModuleIcon id="traje" size={DOCK_ICON} />, tablet: 'traje' },
  { id: 'o2', label: 'O₂', icon: <IconO2 size={DOCK_ICON} />, tablet: 'traje' },
  { id: 'bateria', label: 'Batería', icon: <IconBattery size={DOCK_ICON} />, tablet: 'traje' },
  { id: 'presion', label: 'Presión', icon: <IconGauge size={DOCK_ICON} />, tablet: 'traje' },
  { id: 'comms', label: 'Comunicaciones', icon: <IconSignal size={DOCK_ICON} />, tablet: 'traje' },
  { id: 'salud', label: 'Salud', icon: <ModuleIcon id="salud" size={DOCK_ICON} />, tablet: 'salud' },
  { id: 'mision', label: 'Misión', icon: <ModuleIcon id="mision" size={DOCK_ICON} />, tablet: 'preparacion' },
  { id: 'hazards', label: 'Hazards', icon: <ModuleIcon id="hazards" size={DOCK_ICON} />, tablet: 'hazards' },
];
// Rumbo fijo de demostración (grados). El hito de la escena 3D lo conectará al giro de la cámara.
export const DEMO_HEADING = 32;
// Escena del visor: sustituir aquí el paisaje SVG por la escena 3D (mismas props, ocupa toda la capa .visor-scene).
const VisorScene: ComponentType<VisorSceneProps> = LunarScene;
const tabletLabels: Partial<Record<ModuleId, string>> = {
  traje: 'Estado del traje', salud: 'Salud', preparacion: 'Misión y equipamiento', hazards: 'Hazards',
};
const overallLabels: Record<SuitState, string> = { ok: 'Nominal', precaucion: 'Precaución', critico: 'Crítico' };
const REVIEW = 'Ilustrativo · pendiente de revisión';
const NO_PLAN = 'Sin plan de EVA; prepáralo en la tableta.';

const hhmm = (value: string | null) => (value ? formatTime(value).split(', ')[1] ?? formatTime(value) : 'Sin datos');
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

// Valor de una lectura: «Sin datos» en ámbar con forma propia, nunca un cero ni un guion ambiguo.
function Value({ value, unit, big = false }: { value: number | null; unit: string | null; big?: boolean }) {
  if (value === null) return <span className={`hud-value-missing${big ? ' big' : ''}`}><StateIcon state="sindatos" />Sin datos</span>;
  return <span className={`hud-number${big ? ' big' : ''}`}>{formatNumber(value)}{unit && <small> {unit}</small>}</span>;
}

type VitalTone = 'available' | 'stale' | 'missing' | SuitState;

// Chip de lectura: icono · etiqueta · valor · unidad en una línea; antigüedad o estado debajo.
function Vital({ icon, label, value, unit, note, tone }: {
  icon: ReactNode; label: string; value: number | null; unit: string | null; note: string; tone: VitalTone;
}) {
  const suitTone = tone === 'ok' || tone === 'precaucion' || tone === 'critico';
  return (
    <li className={`hud-vital glass hud-tone-${tone}`}>
      <span className="hud-vital-main">
        <span className="hud-vital-icon">{icon}</span>
        <span className="hud-vital-label">{label}</span>
        <Value value={value} unit={unit} />
      </span>
      <span className="hud-vital-note">
        {tone === 'stale' && <StateIcon state="precaucion" size={12} />}
        {suitTone && <StateIcon state={tone} size={12} />}
        {note}
      </span>
    </li>
  );
}

function healthVital(reading: Measurement | undefined, label: string, icon: ReactNode, reference: string | null) {
  if (!reading) return <Vital icon={icon} label={label} value={null} unit={null} note="Lectura no recibida" tone="missing" />;
  const missing = reading.availability === 'missing' || reading.value === null;
  const age = formatAge(reading.measured_at, reference);
  return (
    <Vital icon={icon} label={label} value={missing ? null : reading.value} unit={reading.unit}
      note={missing ? 'Sensor sin señal' : reading.availability === 'stale' ? `Desactualizado · ${age}` : age}
      tone={missing ? 'missing' : reading.availability === 'stale' ? 'stale' : 'available'} />
  );
}

function PartDetail({ part }: { part: SuitPart }) {
  return (
    <dl className="hud-data">
      <dt>Estado</dt><dd><span className={`state-tag state-${part.status}`}><StateIcon state={part.status} />{suitStateLabels[part.status]}</span>
        {part.engine && <span className="engine-tag">Motor de misión</span>}</dd>
      <dt>Observación</dt><dd>{part.observation}</dd>
      <dt>Posible riesgo</dt><dd>{part.risk}</dd>
      <dt>Indicación</dt><dd>{part.indication}<span className="review-tag">{part.indication_review}</span></dd>
    </dl>
  );
}

function PartGaugePanel({ part, max, label, scale }: { part: SuitPart | undefined; max: number; label: string; scale: string }) {
  if (!part) return <p className="hud-empty"><StateIcon state="sindatos" />Sin datos del traje.</p>;
  return (
    <div className="hud-panel-split">
      <ArcGauge label={label} measure={part.measure ?? part.label} value={part.value} unit={part.unit ?? ''} min={0} max={max} state={part.status} />
      <div>
        <PartDetail part={part} />
        <p className="hud-caption">{scale}</p>
      </div>
    </div>
  );
}

export default function HelmetHud({
  panel, panelStatus, scenarioId, attempt, onOpenTablet, scenarios, onSelectScenario,
  fullscreen, onFullscreenChange, heading = DEMO_HEADING,
}: {
  panel: Panel | null; panelStatus: 'loading' | 'success' | 'error'; scenarioId: string; attempt: number;
  onOpenTablet: (module: ModuleId) => void;
  // Escenarios del panel: el selector del panel (i) permite cambiarlos sin salir de la pantalla completa.
  scenarios: Scenario[] | null; onSelectScenario: (id: string) => void;
  // Modo visor a pantalla completa: el estado vive en App, que oculta encabezado, aviso y barra de escenario.
  fullscreen: boolean; onFullscreenChange: (value: boolean) => void;
  // Rumbo en grados (0 = N) para la barra de rumbo y la escena. Fijo por ahora.
  heading?: number;
}) {
  const suitRequest = useLocalApi<SuitPanel>(`/api/scenarios/${encodeURIComponent(scenarioId)}/suit`, attempt);
  const { request, refresh, perform, progress, actionError, requiresRefresh } = useHabitatMission();
  const mission: EnvironmentalMission | null = request.data;
  const suit = suitRequest.data;
  // suit_status es la base; la presión del motor tiene prioridad mientras su anomalía siga abierta.
  const parts = useMemo(() => (suit ? applySuitEngine(suit.parts, mission) : null), [suit, mission]);
  const alerts = useMemo(
    () => buildHudAlerts({ panel, parts, mission, missionError: request.status === 'error' }),
    [panel, parts, mission, request.status],
  );
  const dots = dockSeverity(alerts);
  const overall = suitOverall(parts);
  const part = (id: string) => parts?.find((item) => item.id === id);
  const plan = mission?.eva_plan ?? null;
  const activePlan = plan?.status === 'activo' ? plan : null;
  const busy = request.status === 'loading' || progress !== null;
  const canWrite = request.status === 'success' && !!mission && !busy && !requiresRefresh;

  const [openPanel, setOpenPanel] = useState<PanelId | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [chosenAlert, setChosenAlert] = useState<string | null>(null);
  const [dockFocus, setDockFocus] = useState(0);
  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const dockRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const panelHeading = useRef<HTMLHeadingElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const main: HudAlert | undefined = alerts.find((alert) => alert.id === chosenAlert) ?? alerts[0];

  // Pantalla completa: la Fullscreen API si el navegador la permite; si no (o sin gesto del usuario),
  // queda la alternativa CSS (.is-fullscreen a 100vw × 100vh), que ya aplica App al cambiar el estado.
  const fullscreenRef = useRef(fullscreen);
  useEffect(() => { fullscreenRef.current = fullscreen; }, [fullscreen]);
  const setFullscreen = useCallback(async (next: boolean) => {
    onFullscreenChange(next);
    try {
      if (next && document.fullscreenEnabled && !document.fullscreenElement) await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      else if (!next && document.fullscreenElement) await document.exitFullscreen();
    } catch {
      // Sin permiso o sin soporte: se mantiene el modo CSS.
    }
  }, [onFullscreenChange]);
  // Si el navegador sale de pantalla completa (su propia tecla Esc, F11), el visor vuelve a la vista normal.
  useEffect(() => {
    const sync = () => { if (!document.fullscreenElement && fullscreenRef.current) onFullscreenChange(false); };
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, [onFullscreenChange]);
  // Tecla F (fuera de campos de texto o selectores) alterna el modo; Esc sale si no hay un panel o lista que cerrar.
  useEffect(() => {
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.closest('input, select, textarea, [contenteditable="true"], [contenteditable=""]')) return;
      if (event.key === 'f' || event.key === 'F') { event.preventDefault(); void setFullscreen(!fullscreenRef.current); }
      else if (event.key === 'Escape' && fullscreenRef.current) { event.preventDefault(); void setFullscreen(false); }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [setFullscreen]);
  // Al desmontar el visor (cambio a tableta) no se queda el navegador en pantalla completa.
  useEffect(() => () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
  }, []);
  function openTablet(module: ModuleId) {
    void setFullscreen(false);
    onOpenTablet(module);
  }

  // El foco entra en el panel al abrirlo y vuelve al control que lo abrió al cerrarlo.
  useEffect(() => {
    if (openPanel) panelHeading.current?.focus();
  }, [openPanel]);

  function open(id: PanelId, trigger: HTMLElement | null) {
    returnFocus.current = trigger;
    setListOpen(false);
    setOpenPanel(id);
  }
  function close() {
    setOpenPanel(null);
    window.requestAnimationFrame(() => returnFocus.current?.focus());
  }
  function onSceneKey(event: KeyboardEvent) {
    if (event.key !== 'Escape') return;
    if (openPanel) { event.preventDefault(); close(); } else if (listOpen) { event.preventDefault(); setListOpen(false); }
  }
  function onDockKey(event: KeyboardEvent, index: number) {
    const moves: Record<string, number> = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: dockItems.length - 1 };
    if (!(event.key in moves)) return;
    event.preventDefault();
    const next = (moves[event.key] + dockItems.length) % dockItems.length;
    setDockFocus(next);
    dockRefs.current[next]?.focus();
  }
  function act(alert: HudAlert, index: number) {
    const action = alert.actions[index];
    if (action.kind === 'refresh') void refresh();
    else void perform(action.path, `${action.label}…`);
  }

  // Reloj: tiempo de EVA si hay plan activo; si no, reloj simulado de la misión (o el de demostración del panel).
  const evaElapsed = activePlan && mission?.clock
    ? Math.max(0, Math.round((Date.parse(mission.clock) - Date.parse(activePlan.started_at)) / 60000)) : null;
  // Enlace con la Tierra: el retardo no es un estado «correcto» ni un aviso; solo «Sin señal» va en ámbar.
  const link = !mission ? { text: 'Modo local · sin datos de enlace', note: 'No se pudo consultar la misión simulada', tone: 'none' as const }
    : mission.earth_link?.connected === false ? { text: 'Enlace Tierra · sin señal', note: 'Enlace terrestre interrumpido (guion de distancia)', tone: 'warn' as const }
      : { text: `Enlace Tierra · retardo ${mission.earth_link?.delay_minutes ?? 0} min`, note: 'Enlace terrestre simulado, retardo por trayecto', tone: 'accent' as const };
  const announce = main ? `${severityLabels[main.severity]}: ${main.title}. ${main.cause}${alerts.length > 1 ? ` Hay ${plural(alerts.length - 1, 'aviso')} más.` : ''}` : '';

  function panelContent(id: PanelId): { title: string; icon: ReactNode; body: ReactNode; tablet?: ModuleId } {
    const item = dockItems.find((entry) => entry.id === id);
    switch (id) {
      case 'traje': {
        const selected = parts?.find((entry) => entry.id === selectedPart) ?? parts?.find((entry) => entry.status !== 'ok') ?? parts?.[0];
        return {
          title: 'Estado del traje', icon: item!.icon, tablet: 'traje',
          body: !parts ? <p className="hud-empty"><StateIcon state="sindatos" />Sin datos del traje.</p> : (
            <div className="hud-suit">
              <SuitFigure parts={parts} selectedId={selected?.id} onSelect={setSelectedPart} />
              <div className="hud-suit-side">
                <ul className="hud-part-list" aria-label="Partes del traje">
                  {parts.map((entry) => (
                    <li key={entry.id}>
                      <button type="button" className={`hud-part ${entry.status}`} aria-pressed={entry.id === selected?.id} onClick={() => setSelectedPart(entry.id)}>
                        <span>{entry.label}</span>
                        <span className={`state-tag state-${entry.status}`}><StateIcon state={entry.status} />{suitStateLabels[entry.status]}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                {selected && (
                  <div className="hud-part-detail" aria-live="polite">
                    <p className="hud-k">{selected.label}{selected.unit && selected.value !== null ? ` · ${formatNumber(selected.value)} ${selected.unit}` : ''}</p>
                    <p><strong>Posible riesgo.</strong> {selected.risk}</p>
                    <p><strong>Indicación.</strong> {selected.indication} <span className="review-tag">{selected.indication_review}</span></p>
                  </div>
                )}
              </div>
            </div>
          ),
        };
      }
      case 'o2':
        return { title: 'Soporte vital · O₂', icon: item!.icon, tablet: 'traje',
          body: <PartGaugePanel part={part('soporte_vital')} max={100} label="O₂" scale="Escala visual de 0 a 100 %; no es un criterio." /> };
      case 'bateria':
        return { title: 'Batería del traje', icon: item!.icon, tablet: 'traje',
          body: (
            <>
              <PartGaugePanel part={part('bateria')} max={100} label="Batería" scale="Escala visual de 0 a 100 %; no es un criterio." />
              {activePlan && <p className="hud-caption">Plan de EVA: batería estimada al volver {formatNumber(activePlan.estimate.battery_return_pct)} %. Es una estimación de planificación, no una lectura del traje.</p>}
            </>
          ) };
      case 'presion': {
        const pressure = part('presion');
        return { title: 'Presión del traje', icon: item!.icon, tablet: 'traje',
          body: (
            <>
              <PartGaugePanel part={pressure} max={35} label="Presión" scale="Escala visual de 0 a 35 kPa; no es un límite operativo." />
              <p className="hud-caption">{pressure?.engine
                ? `Valor del motor de misión (${pressure.engine.phase}); tiene prioridad sobre el estado base del traje mientras la anomalía siga abierta.`
                : 'Valor del estado base del traje simulado (escenario de demostración).'}</p>
            </>
          ) };
      }
      case 'comms': {
        const comms = part('comunicaciones');
        const report = mission?.reports?.at(-1);
        return { title: 'Comunicaciones', icon: item!.icon, tablet: 'traje',
          body: (
            <dl className="hud-data">
              <dt>Enlace del traje</dt><dd>{comms ? <><Value value={comms.value} unit={comms.unit} /> · <span className={`state-tag state-${comms.status}`}><StateIcon state={comms.status} />{suitStateLabels[comms.status]}</span></> : 'Sin datos'}</dd>
              <dt>Enlace terrestre</dt><dd>{!mission ? 'Sin datos' : mission.earth_link?.connected === false ? 'Interrumpido (guion de distancia)' : 'Conectado en la simulación'}</dd>
              <dt>Retardo configurado</dt><dd>{mission?.earth_link ? `${mission.earth_link.delay_minutes} min por trayecto` : 'Sin datos'}</dd>
              <dt>Último informe local</dt><dd>{report ? { pendiente: 'Pendiente, sin enlace', en_transito: 'En tránsito simulado', entregado: 'Entregado en simulación' }[report.status] : 'Ninguno'}</dd>
            </dl>
          ) };
      }
      case 'salud': {
        const dose = mission?.measurements?.find((entry) => entry.id === 'radiation_dose');
        const rate = mission?.measurements?.find((entry) => entry.id === 'radiation_rate');
        return { title: 'Salud', icon: item!.icon, tablet: 'salud',
          body: (
            <dl className="hud-data">
              {(panel?.measurements ?? []).map((reading) => (
                <FragmentRow key={reading.id} label={reading.label}>
                  <Value value={reading.availability === 'missing' ? null : reading.value} unit={reading.unit} />
                  <span className="hud-muted"> · {availabilityLabels[reading.availability]}{reading.measured_at ? ` · ${formatAge(reading.measured_at, panel!.demo_time)}` : ''}</span>
                </FragmentRow>
              ))}
              <dt>Dosis acumulada</dt><dd>{dose?.value == null ? 'Sin datos' : `${dose.value.toLocaleString('es-CL', { maximumSignificantDigits: 6 })} ${dose.unit}`}</dd>
              <dt>Tasa de dosis</dt><dd>{rate?.value == null ? 'Sin datos' : `${rate.value.toLocaleString('es-CL', { maximumSignificantDigits: 6 })} ${rate.unit}`}</dd>
            </dl>
          ) };
      }
      case 'mision':
        return { title: 'Misión y objetivos', icon: item!.icon, tablet: 'preparacion',
          body: activePlan ? (
            <>
              <dl className="hud-data">
                <dt>Recorrido</dt><dd>{activePlan.route.name}</dd>
                <dt>Tiempo estimado</dt><dd>{formatMinutes(activePlan.estimate.duration_min)} · inicio {hhmm(activePlan.started_at)}</dd>
                <dt>Punto de retorno</dt><dd>{activePlan.route.return_point.label} · {formatNumber(activePlan.route.return_point.distance_km)} km</dd>
                <dt>Equipamiento</dt><dd>{plural(activePlan.equipment.length, 'elemento')} · {formatNumber(activePlan.estimate.load_kg)} kg</dd>
              </dl>
              <ol className="hud-objectives" aria-label="Objetivos">
                {activePlan.route.objectives.map((objective) => <li key={objective.id}><span>{objective.label}</span><span className="hud-muted">{objective.minutes} min</span></li>)}
              </ol>
            </>
          ) : (
            <>
              <p className="hud-empty"><StateIcon state="sindatos" />{NO_PLAN}</p>
              {plan && <p className="hud-caption">Último plan: {plan.route.name}, terminado a las {hhmm(plan.ended_at)}.</p>}
            </>
          ) };
      case 'hazards':
        return { title: 'Hazards · motor de misión', icon: item!.icon, tablet: 'hazards',
          body: (
            <>
              <p className="hud-caption">Actividad de misión: <strong>{mission?.activity === 'EVA' ? 'EVA' : mission?.activity === 'interior' ? 'Interior' : 'Sin datos'}</strong>. Activar y recorrer guiones en la tableta.</p>
              <ul className="hud-hazards">
                {hazards.map((hazard) => {
                  const events = mission?.events?.filter((event) => event.hazard === hazard.engine) ?? [];
                  const latest = events.find((event) => event.resolved === false) ?? events.at(-1);
                  return <li key={hazard.id}><span>{hazard.name}</span><NoticeTag notice={latest} empty={mission ? 'Inactivo' : 'Sin datos'} activePrefix="Activo · " /></li>;
                })}
              </ul>
            </>
          ) };
      case 'about':
        return { title: 'Acerca de estos datos', icon: <IconInfo size={22} />,
          body: (
            <div className="hud-about">
              {scenarios && scenarios.length > 0 && (
                <div className="hud-scenario">
                  <label htmlFor="hud-scenario">Escenario de demostración</label>
                  <select id="hud-scenario" value={scenarioId} onChange={(event) => onSelectScenario(event.target.value)}>
                    {scenarios.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.name}</option>)}
                  </select>
                  <p className="hud-caption">Cambia los datos simulados sin salir del visor.</p>
                </div>
              )}
              <p><strong>Todo es simulado.</strong> SIM-001, su misión y el traje son ficticios. No hay sensores reales ni validación clínica. La interfaz del casco es una propuesta.</p>
              {panel && <p><strong>Lecturas de salud.</strong> {panel.provenance.method} {panel.availability_policy.description}</p>}
              {suit && <p><strong>Estado del traje.</strong> {suit.criteria_policy} {suit.provenance.method}</p>}
              {mission?.notice && <p><strong>Motor de misión.</strong> {mission.notice}</p>}
              <p><strong>Avisos del visor.</strong> Se ordenan por severidad (crítico, precaución, sin datos) y luego por origen (motor, traje, plan, lecturas). Es un criterio del equipo, pendiente de revisión. Los pasos son ilustrativos, no protocolos NASA.</p>
              <p><strong>Plan de EVA.</strong> Vive en la memoria del motor: se pierde al reiniciar el backend o la misión.</p>
            </div>
          ) };
    }
  }

  const shown = openPanel ? panelContent(openPanel) : null;

  return (
    <section className={`hud-scene${fullscreen ? ' is-fullscreen' : ''}`} aria-label="Visor del casco · EVA simulada" onKeyDown={onSceneKey}>
      <div className="visor-scene"><VisorScene heading={heading} /></div>
      <div className="hud-visor" aria-hidden="true">
        <span className="hud-reticle tl" /><span className="hud-reticle tr" /><span className="hud-reticle bl" /><span className="hud-reticle br" />
      </div>
      <CenterReticle />
      <div className="sr-only" aria-live="assertive" aria-atomic="true">{main?.severity === 'critico' ? announce : ''}</div>
      <div className="sr-only" aria-live="polite" aria-atomic="true">{main && main.severity !== 'critico' ? announce : ''}</div>

      <div className="hud-layer">
        <header className="hud-top">
          <div className={`hud-suit-state glass hud-corners hud-tone-${overall ?? 'sindatos'}`}>
            <StateIcon state={overall ?? 'sindatos'} size={22} />
            <span><span className="hud-k">Traje EVA</span><strong>{overall ? overallLabels[overall] : suitRequest.status === 'loading' ? 'Cargando…' : 'Sin datos'}</strong></span>
          </div>
          <HeadingTape heading={heading} />
          <div className="hud-top-right">
            <div className="hud-clock glass">
              <span className="hud-k">{activePlan ? 'Tiempo de EVA' : mission ? 'Reloj de misión' : 'Reloj de demostración'}</span>
              <strong>{activePlan ? `${formatMinutes(evaElapsed ?? 0)} / ${formatMinutes(activePlan.estimate.duration_min)}` : hhmm(mission?.clock ?? panel?.demo_time ?? null)}</strong>
            </div>
            <div className={`hud-link glass hud-link-${link.tone}`} title={link.note}>
              {link.tone === 'warn' ? <StateIcon state="precaucion" size={14} /> : <IconSignal size={18} />}
              <span>{link.text}</span>
            </div>
            <button type="button" className="hud-icon-button glass" disabled={busy} onClick={() => void refresh()}
              aria-label="Actualizar estado de misión" title="Actualizar estado de misión">
              <IconRefresh />
            </button>
          </div>
        </header>

        <ul className="hud-vitals" aria-label="Indicadores principales">
          {panelStatus === 'error' ? <Vital icon={<ModuleIcon id="salud" size={18} />} label="Salud" value={null} unit={null} note="No se pudo cargar el escenario" tone="missing" /> : (
            <>
              {healthVital(panel?.measurements.find((entry) => entry.id === 'heart_rate'), 'Pulso', <IconHeart />, panel?.demo_time ?? null)}
              {healthVital(panel?.measurements.find((entry) => entry.id === 'spo2'), 'SpO₂', <IconDrop />, panel?.demo_time ?? null)}
            </>
          )}
          {(() => {
            const o2 = part('soporte_vital');
            return o2 ? <Vital icon={<IconO2 size={18} />} label="O₂ traje" value={o2.value} unit={o2.unit} note={suitStateLabels[o2.status]} tone={o2.status} />
              : <Vital icon={<IconO2 size={18} />} label="O₂ traje" value={null} unit={null} note={suitRequest.status === 'loading' ? 'Cargando…' : 'Sin datos del traje'} tone="missing" />;
          })()}
        </ul>

        <div className="hud-focus-area">
          {shown && openPanel ? (
            <>
              {main && (
                <button type="button" className={`hud-alert-peek glass sev-${main.severity}`} onClick={close}>
                  <StateIcon state={main.severity} size={14} />{severityLabels[main.severity]}: {main.title}{alerts.length > 1 ? ` · +${alerts.length - 1}` : ''}
                </button>
              )}
              <section id="hud-panel" className="hud-panel glass hud-corners" role="dialog" aria-modal="false" aria-labelledby="hud-panel-title">
                <div className="hud-panel-head">
                  <span className="hud-panel-icon">{shown.icon}</span>
                  <h3 id="hud-panel-title" ref={panelHeading} tabIndex={-1}>{shown.title}</h3>
                  <button type="button" className="hud-close" onClick={close}><IconClose />Cerrar<span className="hud-kbd" aria-hidden="true">Esc</span></button>
                </div>
                <div className="hud-panel-body">{shown.body}</div>
                {shown.tablet && (
                  <button type="button" className="hud-tablet-link" onClick={() => openTablet(shown.tablet!)}>
                    <IconTablet />Abrir detalle en tableta<span className="hud-muted"> · {tabletLabels[shown.tablet]}</span><IconChevron />
                  </button>
                )}
              </section>
            </>
          ) : main && (
            <div className="hud-alert-wrap">
              <article key={main.id} className={`hud-alert glass hud-corners sev-${main.severity}`} aria-labelledby="hud-alert-title">
                <p className="hud-alert-sev">
                  <StateIcon state={main.severity} size={18} />
                  <span>{severityLabels[main.severity]}</span>
                  <span className="hud-alert-origin">{originLabels[main.origin]}</span>
                </p>
                <h3 id="hud-alert-title">{main.title}</h3>
                <p className="hud-alert-cause">{main.cause}</p>
                {main.steps.length > 0 && (
                  <>
                    <ol className="hud-steps">{main.steps.map((step) => <li key={step}>{step}</li>)}</ol>
                    <p className="review-tag">{REVIEW}</p>
                  </>
                )}
                <div className="hud-alert-actions">
                  {main.actions.map((action, index) => (
                    <button key={action.label} type="button" className={index === 0 ? 'primary' : undefined}
                      disabled={action.kind === 'refresh' ? busy : !canWrite} onClick={() => act(main, index)}>
                      {action.label}
                    </button>
                  ))}
                  <button type="button" className="hud-ghost" onClick={(event) => open(main.docks[0], event.currentTarget)}>
                    Ver detalle<IconChevron />
                  </button>
                </div>
              </article>
              {alerts.length > 1 && (
                <div className="hud-more">
                  <button type="button" className="hud-more-toggle glass" aria-expanded={listOpen} aria-controls="hud-alert-list" onClick={() => setListOpen((value) => !value)}>
                    +{plural(alerts.length - 1, 'aviso')}
                  </button>
                  {listOpen && (
                    <ul id="hud-alert-list" className="hud-alert-list glass" aria-label="Todos los avisos">
                      {alerts.map((alert) => (
                        <li key={alert.id}>
                          <button type="button" className={`sev-${alert.severity}`} aria-current={alert.id === main.id} onClick={() => { setChosenAlert(alert.id); setListOpen(false); }}>
                            <StateIcon state={alert.severity} size={14} />
                            <span className="hud-list-sev">{severityLabels[alert.severity]}</span>
                            <span className="hud-list-title">{alert.title}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="hud-progress" aria-live="polite">
            {progress && <p className="glass">{progress}</p>}
            {actionError && <p className="glass hud-error" role="alert">{actionError}</p>}
          </div>
        </div>

        <div className="hud-dock glass">
          <div role="toolbar" aria-label="Sistemas del casco" className="hud-dock-items">
            {dockItems.map((item, index) => {
              const severity: HudSeverity | undefined = dots[item.id];
              return (
                <button key={item.id} type="button" ref={(element) => { dockRefs.current[index] = element; }}
                  className={`hud-dock-button${openPanel === item.id ? ' is-open' : ''}${severity ? ` has-alert sev-${severity}` : ''}`}
                  tabIndex={index === dockFocus ? 0 : -1} title={item.label}
                  aria-expanded={openPanel === item.id} aria-controls={openPanel === item.id ? 'hud-panel' : undefined}
                  aria-label={`${item.label}${severity ? ` · aviso: ${severityLabels[severity]}` : ''}`}
                  onFocus={() => setDockFocus(index)} onKeyDown={(event) => onDockKey(event, index)}
                  onClick={(event) => (openPanel === item.id ? close() : open(item.id, event.currentTarget))}>
                  <span className="hud-dock-icon">
                    {item.icon}
                    {severity && <span className="hud-dot" aria-hidden="true"><StateIcon state={severity} size={12} /></span>}
                  </span>
                  <span className="hud-dock-label" aria-hidden="true">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <footer className="hud-footer">
          <span>Datos simulados · Interfaz propuesta</span>
          <div className="hud-footer-actions">
            <button type="button" className="hud-fs-button" onClick={() => void setFullscreen(!fullscreen)}
              aria-label={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
              title={fullscreen ? 'Salir de pantalla completa (F o Esc)' : 'Pantalla completa (F)'}>
              {fullscreen ? <IconCollapse /> : <IconExpand />}
              <span className="hud-fs-label" aria-hidden="true">{fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}</span>
              <span className="hud-kbd" aria-hidden="true">F</span>
            </button>
            <button type="button" className="hud-about-button" aria-expanded={openPanel === 'about'}
              onClick={(event) => (openPanel === 'about' ? close() : open('about', event.currentTarget))}>
              <IconInfo />Acerca de estos datos
            </button>
          </div>
        </footer>
      </div>
    </section>
  );
}

function FragmentRow({ label, children }: { label: string; children: ReactNode }) {
  return <><dt>{label}</dt><dd>{children}</dd></>;
}
