// Horizonte lunar ilustrativo para el fondo del visor. Dibujo propio en SVG, sin imágenes externas.
// No reproduce un lugar real ni una fotografía. Código asistido por Claude Code; véase docs/AI_DISCLOSURE.md.
//
// Escena sustituible: HelmetHud solo depende de VisorSceneProps y la coloca dentro de .visor-scene
// (capa a pantalla completa detrás del HUD). Una escena 3D debe aceptar las mismas props y ocupar el 100 %.
import { memo } from 'react';

export type VisorSceneProps = {
  // Rumbo en grados (0 = N). El paisaje SVG es fijo; la escena 3D lo usará para girar la cámara.
  heading: number;
};

// Generador determinista: las estrellas quedan siempre en el mismo sitio (capturas reproducibles).
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const random = seeded(20261115);
const stars = Array.from({ length: 110 }, () => ({
  x: Math.round(random() * 1600), y: Math.round(random() * 420),
  r: 0.5 + random() * 1.1, o: 0.18 + random() * 0.5,
}));

function LunarScene({ heading }: VisorSceneProps) {
  return (
    <svg className="lunar-scene" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"
      data-heading={heading}>
      <defs>
        <linearGradient id="lunar-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#010309" />
          <stop offset="0.6" stopColor="#060b16" />
          <stop offset="1" stopColor="#0d1422" />
        </linearGradient>
        <radialGradient id="lunar-glare" cx="0.82" cy="0.1" r="0.22">
          <stop offset="0" stopColor="#dbe8ff" stopOpacity="0.22" />
          <stop offset="1" stopColor="#dbe8ff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="lunar-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5b616c" />
          <stop offset="1" stopColor="#30353e" />
        </linearGradient>
        <linearGradient id="lunar-mid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6a6f78" />
          <stop offset="1" stopColor="#3a3e46" />
        </linearGradient>
        <linearGradient id="lunar-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5d6168" />
          <stop offset="0.55" stopColor="#3d4047" />
          <stop offset="1" stopColor="#1d1f24" />
        </linearGradient>
        <radialGradient id="lunar-crater" cx="0.5" cy="0.42" r="0.6">
          <stop offset="0" stopColor="#16181d" />
          <stop offset="0.75" stopColor="#2b2e34" />
          <stop offset="1" stopColor="#4d5158" />
        </radialGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#lunar-sky)" />
      <g fill="#e6eeff">
        {stars.map((star, index) => <circle key={index} cx={star.x} cy={star.y} r={star.r} opacity={star.o} />)}
      </g>
      <rect width="1600" height="900" fill="url(#lunar-glare)" />
      {/* Relieve lejano, medio y suelo en primer plano */}
      <path d="M0 470 Q120 430 240 452 T470 440 Q560 405 660 432 T880 438 Q990 398 1110 426 T1340 418 Q1460 392 1600 430 V900 H0 Z" fill="url(#lunar-far)" opacity="0.75" />
      <path d="M0 520 Q160 488 330 506 T640 500 Q760 474 900 498 T1200 494 Q1380 466 1600 502 V900 H0 Z" fill="url(#lunar-mid)" opacity="0.9" />
      <path d="M0 560 Q260 540 520 552 T1040 548 Q1300 536 1600 556 V900 H0 Z" fill="url(#lunar-ground)" />
      {/* Cráter */}
      <ellipse cx="1080" cy="640" rx="210" ry="44" fill="#6b7078" opacity="0.55" />
      <ellipse cx="1080" cy="646" rx="188" ry="36" fill="url(#lunar-crater)" />
      <path d="M900 640 Q1080 600 1262 640" fill="none" stroke="#7d828b" strokeWidth="2" opacity="0.5" />
      <ellipse cx="420" cy="700" rx="70" ry="13" fill="#24272c" opacity="0.7" />
      {/* Rocas */}
      <g fill="#4a4e56">
        <ellipse cx="240" cy="790" rx="46" ry="20" />
        <ellipse cx="300" cy="804" rx="22" ry="9" />
        <ellipse cx="760" cy="690" rx="18" ry="7" />
        <ellipse cx="1380" cy="760" rx="34" ry="13" />
        <ellipse cx="1290" cy="842" rx="58" ry="20" />
        <ellipse cx="600" cy="850" rx="26" ry="10" />
      </g>
      <g fill="#7a7f88" opacity="0.6">
        <ellipse cx="232" cy="782" rx="30" ry="8" />
        <ellipse cx="1374" cy="754" rx="20" ry="5" />
        <ellipse cx="1280" cy="832" rx="36" ry="8" />
      </g>
    </svg>
  );
}

export default memo(LunarScene);
