import { ArcGauge } from './charts';
import { IconFlask, IconRefresh, ModuleIcon, StateIcon } from './icons';
import { NoticeTag, noticeTone } from './missionView';
import { availabilityLabels, formatTime } from './panel';
import { useHabitatMission } from './useHabitatMission';

// Escala de visualización del medidor de presión; no es un límite operativo.
const PRESSURE_SCALE_MAX = 110;

export default function HabitatEnvironment() {
  const { request, refresh, perform, progress, actionError, requiresRefresh } = useHabitatMission();
  const mission = request.data;
  const pressure = mission?.measurements?.find(
    (reading) => reading.id === 'habitat_pressure' && reading.system === 'habitat',
  );
  const notices = mission?.events?.filter(
    (event) => event.hazard === 'entorno' && event.system === 'habitat' && event.activity === 'interior',
  ) ?? [];
  const activeNotice = notices.find((event) => event.resolved === false);
  const notice = activeNotice ?? notices.at(-1);
  const activity = mission?.activity === 'interior' ? 'Interior'
    : mission?.activity === 'EVA' ? 'EVA' : 'Sin datos';
  const pressureValue = pressure?.value ?? null;
  const busy = request.status === 'loading' || progress !== null;
  const canWrite = request.status === 'success' && !!mission && !busy && !requiresRefresh;
  const hasActiveEnvironment = mission?.events?.some(
    (event) => event.hazard === 'entorno' && event.resolved !== true,
  ) ?? true;
  const canActivate = canWrite && mission?.activity === 'interior' && !hasActiveEnvironment;
  const canAcknowledge = canWrite && !!activeNotice && activeNotice.acknowledged === false;
  // La lista del evento ya refleja su fase actual en FastAPI.
  const nextRecoveryAction = activeNotice?.actions?.find((action) =>
    ['iniciar_comprobacion', 'simular_contencion', 'simular_restauracion'].includes(action.id),
  );
  const tone = noticeTone(activeNotice);
  const pressureStatus = activeNotice
    ? { icon: tone === 'critico' ? 'critico' as const : 'precaucion' as const,
      label: activeNotice.priority === null ? 'Sin datos' : mission?.priorities?.[activeNotice.priority] ?? activeNotice.priority }
    : { icon: 'sindatos' as const, label: 'Sin aviso activo' };

  return (
    <section className="card mission-section" aria-labelledby="habitat-title">
      <div className="mission-head">
        <span className="mission-icon"><ModuleIcon id="nave" /></span>
        <div><p className="eyebrow">Misión simulada compartida</p><h2 id="habitat-title">Estado ambiental del hábitat</h2></div>
        <span className="simulation-label"><IconFlask />Datos simulados</span>
        <button type="button" disabled={busy} onClick={() => void refresh()}>
          <IconRefresh />Actualizar estado
        </button>
      </div>
      <p className="caption">Hábitat interior · Misión compartida. Sin actualización automática. Esta presión no corresponde al traje.</p>
      <div className="mission-toolbar">
        <button type="button" className={nextRecoveryAction ? undefined : 'primary'} disabled={!canActivate} onClick={() => void perform('/api/mission/scenarios/entorno/activate', 'Activando anomalía simulada…')}>
          Activar anomalía simulada
        </button>
        <button type="button" disabled={!canAcknowledge} onClick={() => {
          if (activeNotice) void perform(`/api/mission/events/${encodeURIComponent(activeNotice.id)}/acknowledge`, 'Reconociendo aviso…');
        }}>
          Reconocer aviso
        </button>
        {nextRecoveryAction && (
          <button type="button" className="primary" disabled={!canWrite} onClick={() => {
            if (activeNotice) void perform(
              `/api/mission/events/${encodeURIComponent(activeNotice.id)}/actions/${encodeURIComponent(nextRecoveryAction.id)}`,
              `Ejecutando: ${nextRecoveryAction.label}…`,
            );
          }}>
            {nextRecoveryAction.label}
          </button>
        )}
      </div>
      <p className="caption">La activación requiere actividad interior y ningún evento de entorno activo. Reconocer un aviso no resuelve su causa.</p>
      <div aria-live="polite" aria-busy={busy}>
        {progress && <p role="status" className="caption">{progress}</p>}
        {actionError && <p role="alert" className="error-notice">{actionError}</p>}
        {request.status === 'loading' && <p role="status" className="loading-panel">Cargando estado ambiental…</p>}
        {request.status === 'error' && <p role="alert" className="error-notice">Error de consulta del estado ambiental. No se pudo obtener la misión; vuelve a actualizar el estado.</p>}
        {request.status === 'success' && (
          <>
            <p role="status" className="caption">{requiresRefresh ? 'Último estado recibido; actualízalo para confirmar el resultado de la acción.' : 'Estado recibido de la API local.'}</p>
            {mission?.activity === 'EVA' && <p className="caption">La actividad de misión es EVA. Esta sección conserva el contexto del hábitat interior y no muestra el estado del traje.</p>}
            <div className="mission-grid">
              <article className="mission-tile">
                <div className="measurement-top">
                  <h3>Presión del hábitat</h3>
                  <p className="badge">{pressureValue === null ? 'Sin datos' : availabilityLabels[pressure!.availability] ?? 'Sin datos'}</p>
                </div>
                <ArcGauge label="Presión del hábitat" measure="Presión del hábitat" value={pressureValue}
                  unit={pressure?.unit ?? ''} min={0} max={PRESSURE_SCALE_MAX} state={tone} status={pressureStatus} />
                <dl>
                  <dt>Unidad recibida</dt><dd>{pressure?.unit ?? 'Sin datos'}</dd>
                  <dt>Calidad del dato</dt><dd>{pressureValue === null ? 'Sin datos' : availabilityLabels[pressure!.availability] ?? 'Sin datos'}</dd>
                  <dt>Fecha y hora de medición · Chile</dt><dd>{formatTime(pressure?.measured_at ?? null)}</dd>
                  <dt>Procedencia</dt><dd>{pressure?.source ?? 'Sin datos'}</dd>
                </dl>
                <p className="caption">Escala de visualización de 0 a 110 kPa; no es un límite operativo.</p>
              </article>
              <article className="mission-tile">
                <h3>Contexto de misión</h3>
                <dl>
                  <dt>Actividad de misión</dt><dd>{activity}</dd>
                  <dt>Sistema mostrado</dt><dd>Hábitat (habitat) · interior</dd>
                  <dt>Hora simulada de misión · Chile</dt><dd>{formatTime(mission?.clock ?? null)}</dd>
                  <dt>Estado ambiental registrado</dt>
                  <dd>{!mission ? 'Sin datos' : activeNotice ? 'Anomalía activa' : 'Sin aviso ambiental activo registrado'}</dd>
                </dl>
                <p className="caption">La ausencia de un aviso no certifica habitabilidad. La calidad de la lectura y el estado del aviso son independientes.</p>
              </article>
              <article className={`mission-tile notice-tile tone-border-${tone}`}>
                <h3>{activeNotice ? 'Aviso ambiental vigente' : notice ? 'Último aviso ambiental' : 'Aviso ambiental'}</h3>
                {notice ? (
                  <>
                    <NoticeTag notice={notice} empty="Sin datos" />
                    <dl>
                      <dt>Identificador</dt><dd>{notice.id}</dd>
                      <dt>Prioridad de demostración</dt><dd>{notice.priority === null ? 'Sin datos' : mission?.priorities?.[notice.priority] ?? notice.priority ?? 'Sin datos'}</dd>
                      <dt>Fase</dt><dd>{notice.label ?? notice.state ?? 'Sin datos'}</dd>
                      <dt>Reconocimiento</dt><dd>{notice.acknowledged === true ? 'Reconocido' : notice.acknowledged === false ? 'Pendiente de reconocimiento' : 'Sin datos'}</dd>
                      <dt>Resolución</dt><dd>{notice.resolved === true ? 'Resuelto' : notice.resolved === false ? 'No resuelto' : 'Sin datos'}</dd>
                      <dt>Siguiente paso del guion</dt><dd>{notice.next_step ?? 'Sin datos'}</dd>
                    </dl>
                  </>
                ) : <p className="no-notice"><StateIcon state="sindatos" />{mission ? 'No hay avisos de entorno para el hábitat interior en esta misión.' : 'Sin datos'}</p>}
              </article>
            </div>
          </>
        )}
      </div>
      <div className="mission-reset">
        <p className="caption">El reinicio restablece toda la misión compartida y elimina sus avisos anteriores para todos los clientes; no se limita al hábitat.</p>
        <button type="button" disabled={!canWrite} onClick={() => {
          if (!canWrite) return;
          const confirmed = window.confirm('¿Reiniciar la demostración de misión compartida? Se restablecerá el estado de toda la misión y se eliminarán sus avisos anteriores para todos los clientes. No es un reinicio exclusivo del hábitat.');
          if (confirmed) void perform('/api/mission/reset', 'Reiniciando misión compartida…', { confirm: true });
        }}>
          Reiniciar demostración de misión
        </button>
      </div>
    </section>
  );
}
