// Silueta esquemática del traje con las seis partes seleccionables. Dibujo propio; código asistido por Claude Code.
import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { StateIcon } from './icons';
import { suitStateLabels, type SuitPart } from './suit';

type Geometry = { marker: [number, number]; anchor: [number, number]; shapes: ReactNode };

// Coordenadas en el viewBox 0 0 340 330. La figura es ilustrativa, no un plano de un traje real.
const geometry: Record<string, Geometry> = {
  soporte_vital: {
    marker: [32, 96], anchor: [101, 100],
    shapes: <rect className="part-shape" x="100" y="88" width="140" height="138" rx="18" />,
  },
  presion: {
    marker: [308, 150], anchor: [240, 150],
    shapes: <>
      <path className="part-shape" d="M128 112 Q170 100 212 112 L218 160 Q216 202 204 222 L136 222 Q124 202 122 160 Z" />
      <path className="part-shape" d="M128 114 L110 120 Q96 158 94 196 L112 199 Q116 162 130 138 Z" />
      <path className="part-shape" d="M212 114 L230 120 Q244 158 246 196 L228 199 Q224 162 210 138 Z" />
      <path className="part-shape" d="M138 220 H168 L166 300 H142 Z" />
      <path className="part-shape" d="M172 220 H202 L198 300 H174 Z" />
      <rect className="part-shape" x="136" y="298" width="34" height="18" rx="6" />
      <rect className="part-shape" x="170" y="298" width="34" height="18" rx="6" />
      <rect className="figure-decor" x="152" y="128" width="36" height="26" rx="4" />
    </>,
  },
  comunicaciones: {
    marker: [308, 40], anchor: [254, 40],
    shapes: <>
      <rect className="part-hit" x="220" y="14" width="44" height="90" />
      <path className="part-line mast" d="M224 98 L246 46" />
      <circle className="part-shape" cx="247" cy="40" r="6" />
      <path className="part-line" d="M239 31.1 A12 12 0 0 0 239 48.9 M233.6 25.1 A20 20 0 0 0 233.6 54.9" />
    </>,
  },
  casco: {
    marker: [32, 40], anchor: [131, 52],
    shapes: <>
      <rect className="part-shape" x="148" y="96" width="44" height="12" rx="6" />
      <circle className="part-shape" cx="170" cy="62" r="40" />
      <path className="figure-visor" d="M144 58 a26 22 0 0 1 52 0 v6 a10 10 0 0 1 -10 10 h-32 a10 10 0 0 1 -10 -10 z" />
      <path className="figure-glare" d="M152 52 q8 -10 22 -10" />
    </>,
  },
  guantes: {
    marker: [308, 236], anchor: [249, 212],
    shapes: <>
      <ellipse className="part-shape" cx="103" cy="210" rx="12" ry="14" />
      <ellipse className="part-shape" cx="237" cy="210" rx="12" ry="14" />
    </>,
  },
  bateria: {
    marker: [32, 262], anchor: [148, 211],
    shapes: <>
      <rect className="part-shape" x="148" y="190" width="44" height="22" rx="4" />
      <rect className="part-shape" x="192" y="196" width="4" height="10" rx="1" />
      <path className="part-line thin" d="M157 195v12M165 195v12M173 195v12" />
    </>,
  },
};
// Orden de dibujo: lo que queda detrás primero.
const drawOrder = ['soporte_vital', 'presion', 'comunicaciones', 'casco', 'guantes', 'bateria'];

export default function SuitFigure({ parts, selectedId, onSelect }: {
  parts: SuitPart[]; selectedId: string | undefined; onSelect: (id: string) => void;
}) {
  const markers = useRef<Record<string, SVGGElement | null>>({});
  const numbered = parts.map((part, index) => ({ part, number: String(index + 1).padStart(2, '0') }));
  const byId = Object.fromEntries(numbered.map((item) => [item.part.id, item]));

  function onKey(event: KeyboardEvent, index: number) {
    const moves: Record<string, number> = {
      ArrowRight: index + 1, ArrowDown: index + 1, ArrowLeft: index - 1, ArrowUp: index - 1, Home: 0, End: parts.length - 1,
    };
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(parts[index].id);
      return;
    }
    if (!(event.key in moves)) return;
    event.preventDefault();
    const next = parts[(moves[event.key] + parts.length) % parts.length];
    onSelect(next.id);
    markers.current[next.id]?.focus();
  }

  return (
    <svg className="suit-figure" viewBox="0 0 340 330" role="group" aria-label="Silueta del traje. Usa las flechas para recorrer las partes.">
      <g aria-hidden="true">
        {numbered.map(({ part }) => {
          const shape = geometry[part.id];
          if (!shape) return null;
          const [mx, my] = shape.marker;
          const startX = mx < 170 ? mx + 26 : mx - 26;
          return <path key={part.id} className={`figure-leader ${part.status}`} d={`M${startX} ${my} L${shape.anchor[0]} ${shape.anchor[1]}`} />;
        })}
        {drawOrder.map((id) => {
          const item = byId[id];
          if (!item || !geometry[id]) return null;
          return (
            <g key={id} className={`figure-part ${item.part.status}${id === selectedId ? ' is-selected' : ''}`} onClick={() => onSelect(id)}>
              {geometry[id].shapes}
            </g>
          );
        })}
      </g>
      {numbered.map(({ part, number }, index) => {
        const shape = geometry[part.id];
        if (!shape) return null;
        const [mx, my] = shape.marker;
        const selected = part.id === selectedId;
        return (
          <g key={part.id} ref={(element) => { markers.current[part.id] = element; }}
            className={`figure-marker ${part.status}${selected ? ' is-selected' : ''}`}
            role="button" tabIndex={selected ? 0 : -1} aria-pressed={selected}
            aria-label={`${number} ${part.label}: ${suitStateLabels[part.status]}`}
            onClick={() => onSelect(part.id)} onKeyDown={(event) => onKey(event, index)}>
            <rect className="marker-focus" x={mx - 30} y={my - 15} width="60" height="30" rx="9" />
            <rect className="marker-box" x={mx - 26} y={my - 11} width="52" height="22" rx="6" />
            <text className="marker-number" x={mx - 9} y={my + 0.5} textAnchor="middle" dominantBaseline="middle">{number}</text>
            <StateIcon state={part.status} size={12} x={mx + 5} y={my - 6} />
          </g>
        );
      })}
    </svg>
  );
}
