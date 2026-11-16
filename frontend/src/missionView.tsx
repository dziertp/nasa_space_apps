// Presentación compartida de los avisos del motor de misión. Código asistido por Claude Code; véase docs/AI_DISCLOSURE.md.
import { StateIcon, type IconState } from './icons';
import type { EnvironmentalMission, EnvironmentalNotice, MissionReport } from './mission';
import { formatTime } from './panel';
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

type Perform = (path: string, label: string, extra?: Record<string, unknown>) => Promise<void>;

const reportLabels: Record<MissionReport['status'], string> = {
  pendiente: 'Pendiente, sin enlace', en_transito: 'En tránsito simulado', entregado: 'Entregado en simulación',
};

// Minutos de reloj simulado hasta la entrega del informe, dentro del rango que acepta /api/mission/clock.
function minutesUntil(due: string | null, clock: string | null): number | null {
  if (!due || !clock) return null;
  const minutes = Math.ceil((Date.parse(due) - Date.parse(clock)) / 60000);
  return Number.isFinite(minutes) ? Math.min(Math.max(minutes, 1), 1440) : null;
}

// Pasos del guion de un evento abierto: reconocer y las acciones que FastAPI declara para su fase actual.
// La interfaz no decide transiciones; solo envía la acción recibida con instancia y revisión vigentes.
export function EventSteps({ event, mission, canWrite, perform, showAcknowledge = true }: {
  event: EnvironmentalNotice; mission: EnvironmentalMission; canWrite: boolean; perform: Perform; showAcknowledge?: boolean;
}) {
  const eventPath = `/api/mission/events/${encodeURIComponent(event.id)}`;
  const report = mission.reports?.filter((item) => item.event_id === event.id).at(-1);
  const waitMinutes = report?.status === 'en_transito' ? minutesUntil(report.due_at, mission.clock) : null;
  return (
    <div className="event-steps">
      <dl>
        <dt>Fase</dt><dd>{noticePhase(event)}</dd>
        <dt>Siguiente paso</dt><dd>{event.next_step ?? 'Sin datos'}</dd>
        <dt>Reconocimiento</dt><dd>{event.acknowledged === true ? 'Reconocido' : event.acknowledged === false ? 'Pendiente' : 'Sin datos'}</dd>
        {report && <><dt>Informe local</dt><dd>{reportLabels[report.status]}{report.due_at && report.status === 'en_transito' ? ` · entrega simulada ${formatTime(report.due_at)}` : ''}</dd></>}
      </dl>
      <div className="event-actions">
        {(event.actions ?? []).map((action, index) => (
          <button key={action.id} type="button" className={index === 0 ? 'primary' : undefined} disabled={!canWrite}
            onClick={() => void perform(`${eventPath}/actions/${encodeURIComponent(action.id)}`, `Ejecutando: ${action.label}…`)}>
            {action.label}
          </button>
        ))}
        {waitMinutes !== null && (
          <button type="button" className="primary" disabled={!canWrite}
            onClick={() => void perform('/api/mission/clock', `Avanzando el reloj simulado ${waitMinutes} min…`, { minutes: waitMinutes })}>
            Avanzar reloj simulado {waitMinutes} min
          </button>
        )}
        {showAcknowledge && event.acknowledged === false && (
          <button type="button" disabled={!canWrite} onClick={() => void perform(`${eventPath}/acknowledge`, 'Reconociendo aviso…')}>
            Reconocer aviso
          </button>
        )}
      </div>
      {waitMinutes !== null && <p className="caption">En tránsito no hay acción manual: el motor entrega el informe al llegar la hora. Avanzar el reloj también suma a la dosis acumulada la tasa programada.</p>}
      {showAcknowledge && <p className="caption">Reconocer no resuelve la causa; solo la fase final del guion cierra el evento.</p>}
    </div>
  );
}
