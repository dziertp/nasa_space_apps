// Gráfico de tendencia y medidores en arco, en SVG propio. Código asistido por Claude Code; véase docs/AI_DISCLOSURE.md.
import { Fragment, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { StateIcon, StateTag, type IconState } from './icons';
import { formatNumber, type DailyRecord } from './panel';
import { suitStateLabels, type SuitState } from './suit';

// Mide el ancho real para dibujar en píxeles: el texto no se escala con el SVG.
function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => setWidth(Math.floor(entries[0].contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

type SeriesKey = 'sleep_hours' | 'fatigue_score';
type Series = { key: SeriesKey; title: string; scale: string; max: number; ticks: number[]; format: (value: number) => string };

// Un eje por gráfico (nunca doble eje) y un solo tono: el título identifica cada serie.
const series: Series[] = [
  { key: 'sleep_hours', title: 'Sueño', scale: 'horas, escala visual 0–12', max: 12, ticks: [0, 4, 8, 12], format: (value) => `${formatNumber(value)} h` },
  { key: 'fatigue_score', title: 'Fatiga', scale: 'escala ficticia 0–10', max: 10, ticks: [0, 5, 10], format: (value) => `${formatNumber(value)}/10` },
];
const HEIGHT = 132;
const MARGIN = { top: 12, right: 52, bottom: 24, left: 28 };
const dayLabel = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;

function MiniLine({ spec, history, active, onHover }: {
  spec: Series; history: DailyRecord[]; active: number | null; onHover: (index: number | null) => void;
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const plotWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const last = history.length - 1;
  const x = (index: number) => MARGIN.left + (last <= 0 ? plotWidth / 2 : (index * plotWidth) / last);
  const y = (value: number) => MARGIN.top + plotHeight - (Math.min(value, spec.max) / spec.max) * plotHeight;
  const values = history.map((record) => record[spec.key]);
  // Un valor null corta la línea: nunca se dibuja como cero.
  const segments: [number, number][][] = [];
  values.forEach((value, index) => {
    if (value === null) return;
    if (index === 0 || values[index - 1] === null) segments.push([]);
    segments[segments.length - 1].push([x(index), y(value)]);
  });
  const lastIndex = values.reduce<number>((found, value, index) => (value === null ? found : index), -1);
  const compact = last > 0 && plotWidth / last < 40;

  function onPointerMove(event: PointerEvent<SVGSVGElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const index = Math.round(((event.clientX - box.left - MARGIN.left) / Math.max(plotWidth, 1)) * last);
    onHover(Math.min(last, Math.max(0, index)));
  }

  return (
    <div className="trend-plot" ref={ref}>
      <h4>{spec.title} <span>· {spec.scale}</span></h4>
      {width === 0 ? <div style={{ height: HEIGHT }} /> : (
        <svg width={width} height={HEIGHT} aria-hidden="true" onPointerMove={onPointerMove} onPointerLeave={() => onHover(null)}>
          <g className="trend-grid">
            {spec.ticks.map((tick) => (
              <g key={tick}>
                <line x1={MARGIN.left} x2={MARGIN.left + plotWidth} y1={y(tick)} y2={y(tick)} />
                <text x={MARGIN.left - 8} y={y(tick)} textAnchor="end" dominantBaseline="middle">{tick}</text>
              </g>
            ))}
            {history.map((record, index) => (
              <text key={record.date} x={x(index)} y={HEIGHT - 6} textAnchor="middle">
                {compact ? record.date.slice(8, 10) : dayLabel(record.date)}
              </text>
            ))}
          </g>
          {segments.map((points, index) => (
            <g key={index}>
              <path className="trend-area" d={`M${points[0][0]},${y(0)} ${points.map(([px, py]) => `L${px},${py}`).join(' ')} L${points[points.length - 1][0]},${y(0)} Z`} />
              <path className="trend-line" d={points.map(([px, py], step) => `${step === 0 ? 'M' : 'L'}${px},${py}`).join(' ')} />
            </g>
          ))}
          {active !== null && <line className="trend-crosshair" x1={x(active)} x2={x(active)} y1={MARGIN.top - 4} y2={MARGIN.top + plotHeight} />}
          {values.map((value, index) => value === null ? null : (
            <circle key={index} className="trend-dot" cx={x(index)} cy={y(value)} r={index === active ? 5.5 : 4} />
          ))}
          {lastIndex >= 0 && (
            <text className="trend-end" x={x(lastIndex) + 10} y={y(values[lastIndex] as number)} dominantBaseline="middle">
              {spec.format(values[lastIndex] as number)}
            </text>
          )}
        </svg>
      )}
    </div>
  );
}

export function SleepFatigueChart({ history }: { history: DailyRecord[] }) {
  const [active, setActive] = useState<number | null>(null);
  const last = history.length - 1;
  const shown = active ?? last;
  const record = history[shown];

  function onKey(event: KeyboardEvent) {
    const moves: Record<string, number> = { ArrowRight: shown + 1, ArrowLeft: shown - 1, Home: 0, End: last };
    if (!(event.key in moves)) return;
    event.preventDefault();
    setActive(Math.min(last, Math.max(0, moves[event.key])));
  }

  if (!record) return null;
  return (
    <div className="trend">
      <p className="trend-readout" aria-live="polite">
        <span className="trend-day">{dayLabel(record.date)}</span>{' '}
        {series.map((spec) => (
          <Fragment key={spec.key}>
            <span><span className="trend-key" aria-hidden="true" />
              <strong>{record[spec.key] === null ? 'Sin datos' : spec.format(record[spec.key] as number)}</strong> {spec.title.toLowerCase()}
            </span>{' '}
          </Fragment>
        ))}
      </p>
      <div className="trend-plots" tabIndex={0} role="group"
        aria-label="Gráficos de sueño y fatiga de siete días. Usa las flechas izquierda y derecha para recorrer los días; los valores también están en la tabla."
        onKeyDown={onKey} onFocus={() => setActive((value) => value ?? last)} onBlur={() => setActive(null)}>
        {series.map((spec) => <MiniLine key={spec.key} spec={spec} history={history} active={active} onHover={setActive} />)}
      </div>
    </div>
  );
}

// Medidor en arco: el relleno lleva el color del estado y la pista es el mismo tono atenuado.
// min y max son una escala de visualización, no un criterio ni un límite.
const SWEEP = 240;
const START = -120;
function polar(angle: number) {
  const radians = (angle * Math.PI) / 180;
  return [60 + 46 * Math.sin(radians), 60 - 46 * Math.cos(radians)];
}
function arc(from: number, to: number) {
  const [x1, y1] = polar(from);
  const [x2, y2] = polar(to);
  return `M${x1.toFixed(2)} ${y1.toFixed(2)} A46 46 0 ${to - from > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

// status sustituye la etiqueta del traje cuando el medidor no representa una parte del traje.
// display permite conservar la precisión del motor (p. ej., 0,001 mSv/h) en lugar de redondear a un decimal.
export function ArcGauge({ label, measure, value, unit, min, max, state, selected = false, status, display }: {
  label: string; measure: string; value: number | null; unit: string; min: number; max: number;
  state: SuitState | 'neutral'; selected?: boolean; status?: { icon: IconState; label: string }; display?: string;
}) {
  const ratio = value === null ? 0 : Math.min(1, Math.max(0, (value - min) / (max - min)));
  const shown = value === null ? 'Sin datos' : display ?? formatNumber(value);
  const reading = value === null ? 'Sin datos' : `${shown} ${unit}`;
  const statusLabel = status?.label ?? (state === 'neutral' ? 'Sin datos' : suitStateLabels[state]);
  return (
    <figure className={`gauge ${state}${selected ? ' is-selected' : ''}`} role="img"
      aria-label={`${label}, ${measure}: ${reading}. Estado: ${statusLabel}. Escala de visualización de ${min} a ${max} ${unit}.`}>
      <div className="gauge-dial">
        <svg viewBox="0 0 120 108" aria-hidden="true">
          <path className="gauge-track" d={arc(START, START + SWEEP)} />
          {ratio > 0 && <path className="gauge-value" d={arc(START, START + SWEEP * ratio)} />}
        </svg>
        <p className="gauge-readout">
          <span className="gauge-number">{shown}</span>
          {value !== null && <span className="gauge-unit">{unit}</span>}
        </p>
        <p className="gauge-scale"><span>{formatNumber(min)}</span><span>{formatNumber(max)}</span></p>
      </div>
      <figcaption><span className="gauge-label">{label}</span>
        {status ? <span className={`state-tag tone-${state}`}><StateIcon state={status.icon} />{status.label}</span>
          : state !== 'neutral' && <StateTag state={state} />}
      </figcaption>
    </figure>
  );
}
