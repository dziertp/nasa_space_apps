// Elementos decorativos del visor: barra de rumbo y retícula central. aria-hidden: no aportan datos.
// El rumbo llega como prop (grados) para conectarlo después al giro de la cámara de la escena 3D.
// Código asistido por Claude Code; véase docs/AI_DISCLOSURE.md.

// Puntos cardinales e intermedios en español: O = oeste.
const cardinals: Record<number, string> = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SO', 270: 'O', 315: 'NO' };
const normalize = (degrees: number) => ((degrees % 360) + 360) % 360;

// Cinta de rumbo: muestra «span» grados alrededor del rumbo actual, con una marca cada 5°.
export function HeadingTape({ heading, span = 120 }: { heading: number; span?: number }) {
  const width = 360;
  const current = normalize(heading);
  const scale = width / span;
  const marks: { key: number; value: number; x: number }[] = [];
  for (let degrees = Math.ceil((current - span / 2) / 5) * 5; degrees <= current + span / 2; degrees += 5) {
    marks.push({ key: degrees, value: normalize(degrees), x: width / 2 + (degrees - current) * scale });
  }
  return (
    <div className="hud-heading" aria-hidden="true">
      <svg viewBox={`0 0 ${width} 40`} preserveAspectRatio="xMidYMid meet" focusable="false">
        {marks.map(({ key, value, x }) => {
          const label = cardinals[value];
          const major = value % 15 === 0;
          return (
            <g key={key} className={label ? 'heading-cardinal' : major ? 'heading-major' : 'heading-minor'}>
              <line x1={x} x2={x} y1={label ? 6 : major ? 10 : 13} y2={19} />
              {label && <text x={x} y={33} textAnchor="middle">{label}</text>}
              {!label && value % 30 === 0 && <text x={x} y={32} textAnchor="middle" className="heading-degrees">{value}</text>}
            </g>
          );
        })}
        <path className="heading-caret" d={`M${width / 2 - 6} 0 H${width / 2 + 6} L${width / 2} 7 Z`} />
      </svg>
      <span className="hud-heading-value">{String(Math.round(current) % 360).padStart(3, '0')}°</span>
    </div>
  );
}

// Retícula central fina, sin significado de medición.
export function CenterReticle() {
  return (
    <svg className="hud-reticle-center" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <circle cx="60" cy="60" r="22" />
      <path d="M60 18v20M60 82v20M18 60h20M82 60h20" />
      <path className="reticle-fine" d="M38 38l5 5M82 38l-5 5M38 82l5-5M82 82l-5-5" />
      <circle className="reticle-dot" cx="60" cy="60" r="1.6" />
    </svg>
  );
}
