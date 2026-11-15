// Presentación compartida de los avisos del motor de misión. Código asistido por Claude Code; véase docs/AI_DISCLOSURE.md.
import { StateIcon, type IconState } from './icons';
import type { EnvironmentalNotice } from './mission';
import type { SuitState } from './suit';

export type NoticeTone = SuitState | 'neutral';

// Prioridad propia del guion → tono y forma. Un aviso resuelto no se muestra como «Correcto»:
// la resolución del guion no certifica habitabilidad ni ausencia de riesgo.
export function noticeTone(notice: EnvironmentalNotice | undefined): NoticeTone {
  if (!notice || notice.resolved !== false) return 'neutral';
  return notice.priority === 'critica' ? 'critico' : 'precaucion';
}

function noticeIcon(notice: EnvironmentalNotice | undefined): IconState {
  if (!notice) return 'sindatos';
  if (notice.resolved === true) return 'ok';
  return notice.priority === 'critica' ? 'critico' : 'precaucion';
}

export function noticePhase(notice: EnvironmentalNotice) {
  return notice.label ?? notice.state ?? 'Sin datos';
}

export function NoticeTag({ notice, empty, activePrefix = '' }: {
  notice: EnvironmentalNotice | undefined; empty: string; activePrefix?: string;
}) {
  const text = !notice ? empty
    : notice.resolved === true ? `Finalizado · ${noticePhase(notice)}`
      : `${activePrefix}${noticePhase(notice)}`;
  return <span className={`state-tag tone-${noticeTone(notice)}`}><StateIcon state={noticeIcon(notice)} />{text}</span>;
}
