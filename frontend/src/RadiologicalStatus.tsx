import type { RadiologicalMission } from './mission';
import { availabilityLabels, formatTime } from './panel';
import { useHabitatMission } from './useHabitatMission';

function formatRadiologicalValue(value: number | null): string {
  // Mantiene visibles tasas como 0,001 mSv/h; solo formatea, sin integrar dosis.
  return value === null ? 'Sin datos' : value.toLocaleString('es-CL', { maximumSignificantDigits: 15 });
}

export default function RadiologicalStatus() {
  const { request, refresh, perform, progress, actionError, requiresRefresh } = useHabitatMission();
  const mission: RadiologicalMission | null = request.data;
  const readings = [
    { id: 'radiation_dose', label: 'Dosis acumulada' },
    { id: 'radiation_rate', label: 'Tasa de dosis' },
  ].map((item) => ({
    ...item,
    reading: mission?.measurements?.find((reading) => reading.id === item.id && reading.system === 'dosimetro'),
  }));
  const notices = mission?.events?.filter((event) => event.hazard === 'radiacion') ?? [];
  const activeNotice = notices.find((event) => event.resolved === false);
  const notice = activeNotice ?? notices.at(-1);
  const system = notice?.system ?? readings.find((item) => item.reading)?.reading?.system ?? 'Sin datos';
  const busy = request.status === 'loading' || progress !== null;
  const canWrite = request.status === 'success' && !!mission && mission.activity === 'interior' && !busy && !requiresRefresh;
  const hasActiveRadiation = mission?.events?.some((event) => event.hazard === 'radiacion' && event.resolved !== true) ?? true;
  const canActivate = canWrite && !hasActiveRadiation;
  const canAcknowledge = canWrite && !!activeNotice && activeNotice.activity === 'interior'
    && activeNotice.system === 'dosimetro' && activeNotice.acknowledged === false;

  return (
    <section className="history-section" aria-labelledby="radiological-title">
      <div className="section-heading">
        <h2 id="radiological-title">Estado radiológico</h2>
        <span className="simulation-label">Datos simulados</span>
        <button type="button" disabled={busy} onClick={() => void refresh()}>
          Actualizar estado radiológico
        </button>
      </div>
      <p className="caption">Último estado recibido de la misión compartida. Actualiza esta sección después de acciones en otros clientes o secciones. Sin actualización automática ni cálculos locales de dosis.</p>
      <div className="section-heading">
        <button type="button" disabled={!canActivate} onClick={() => void perform('/api/mission/scenarios/radiacion/activate', 'Activando evento radiológico simulado…')}>
          Activar evento radiológico simulado
        </button>
        <button type="button" disabled={!canAcknowledge} onClick={() => {
          if (activeNotice) void perform(`/api/mission/events/${encodeURIComponent(activeNotice.id)}/acknowledge`, 'Reconociendo aviso radiológico…');
        }}>
          Reconocer aviso radiológico
        </button>
      </div>
      <p className="caption">Estos controles requieren actividad interior. El reconocimiento no resuelve el evento ni reduce la dosis acumulada.</p>
      <div aria-live="polite" aria-busy={busy}>
        {progress && <p role="status" className="caption">{progress}</p>}
        {actionError && <p role="alert" className="error-notice">{actionError}</p>}
        {request.status === 'loading' && <p role="status" className="loading-panel">Cargando estado radiológico…</p>}
        {request.status === 'error' && <p role="alert" className="error-notice">Error de consulta del estado radiológico. No se pudo obtener la misión; pulsa Actualizar estado radiológico para reintentar.</p>}
        {request.status === 'success' && (
          <>
            <p role="status" className="caption">{requiresRefresh ? 'Último estado recibido; actualízalo para confirmar el resultado de la acción.' : 'Estado radiológico recibido de la API local.'}</p>
            <div className="measurement-grid">
              {readings.map(({ id, label, reading }) => (
                <article className="measurement-card" key={id}>
                  <h3>{reading?.label ?? label}</h3>
                  <p className="measurement-value">{formatRadiologicalValue(reading?.value ?? null)}
                    {reading?.value !== null && reading?.value !== undefined && <span className="unit"> {reading.unit ?? 'Sin datos'}</span>}
                  </p>
                  <dl>
                    <dt>Unidad recibida</dt><dd>{reading?.unit ?? 'Sin datos'}</dd>
                    <dt>Calidad del dato</dt><dd>{reading?.value === null || reading?.value === undefined ? 'Sin datos' : availabilityLabels[reading.availability] ?? 'Sin datos'}</dd>
                    <dt>Sistema recibido</dt><dd>{reading?.system ?? 'Sin datos'}</dd>
                    <dt>Fecha y hora de medición · Chile</dt><dd>{formatTime(reading?.measured_at ?? null)}</dd>
                    <dt>Procedencia</dt><dd>{reading?.source ?? 'Sin datos'}</dd>
                  </dl>
                </article>
              ))}
              <article className="measurement-card">
                <h3>Misión y aviso radiológico</h3>
                <dl>
                  <dt>Actividad recibida</dt><dd>{mission?.activity ?? 'Sin datos'}</dd>
                  <dt>Sistema recibido</dt><dd>{system}</dd>
                  <dt>Hora simulada de misión · Chile</dt><dd>{formatTime(mission?.clock ?? null)}</dd>
                </dl>
                <h3>{activeNotice ? 'Aviso radiológico vigente' : notice ? 'Último aviso radiológico' : 'Aviso radiológico'}</h3>
                {notice ? (
                  <dl>
                    <dt>Identificador</dt><dd>{notice.id}</dd>
                    <dt>Fase</dt><dd>{notice.label ?? notice.state ?? 'Sin datos'}</dd>
                    <dt>Prioridad de demostración</dt><dd>{notice.priority === null ? 'Sin datos' : mission?.priorities?.[notice.priority] ?? notice.priority ?? 'Sin datos'}</dd>
                    <dt>Reconocimiento</dt><dd>{notice.acknowledged === true ? 'Reconocido' : notice.acknowledged === false ? 'Pendiente de reconocimiento' : 'Sin datos'}</dd>
                    <dt>Resolución</dt><dd>{notice.resolved === true ? 'Resuelto' : notice.resolved === false ? 'No resuelto' : 'Sin datos'}</dd>
                  </dl>
                ) : <p>{mission ? 'No hay avisos radiológicos registrados en esta misión.' : 'Sin datos'}</p>}
              </article>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
