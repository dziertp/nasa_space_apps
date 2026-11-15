import { ArcGauge } from './charts';
import { HazardIcon, IconFlask, IconRefresh, StateIcon } from './icons';
import type { RadiologicalMission } from './mission';
import { NoticeTag, noticeTone } from './missionView';
import { availabilityLabels, formatTime } from './panel';
import { useHabitatMission } from './useHabitatMission';

function formatRadiologicalValue(value: number | null): string {
  // Mantiene visibles tasas como 0,001 mSv/h; solo formatea, sin integrar dosis.
  return value === null ? 'Sin datos' : value.toLocaleString('es-CL', { maximumSignificantDigits: 15 });
}

// Escala de visualización del medidor de tasa; no es un límite de exposición.
const RATE_SCALE_MAX = 0.1;

// compact: vista del casco con solo dosis, tasa y estado del aviso. La lógica es la misma en ambas vistas.
export default function RadiologicalStatus({ compact = false }: { compact?: boolean }) {
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
  const tone = noticeTone(activeNotice);
  const rateStatus = activeNotice
    ? { icon: tone === 'critico' ? 'critico' as const : 'precaucion' as const,
      label: activeNotice.priority === null ? 'Sin datos' : mission?.priorities?.[activeNotice.priority] ?? activeNotice.priority }
    : { icon: 'sindatos' as const, label: 'Sin aviso activo' };

  const states = (
    <>
      {progress && <p role="status" className="caption">{progress}</p>}
      {actionError && <p role="alert" className="error-notice">{actionError}</p>}
      {request.status === 'loading' && <p role="status" className="loading-panel">Cargando estado radiológico…</p>}
      {request.status === 'error' && <p role="alert" className="error-notice">Error de consulta del estado radiológico. No se pudo obtener la misión; pulsa Actualizar estado radiológico para reintentar.</p>}
    </>
  );

  if (compact) {
    return (
      <section className="hud-mission" aria-labelledby="radiological-title">
        <div className="hud-mission-head">
          <h3 id="radiological-title" className="hud-label"><HazardIcon id="radiation" />Estado radiológico · misión simulada</h3>
          <button type="button" className="secondary" disabled={busy} onClick={() => void refresh()}><IconRefresh />Actualizar estado radiológico</button>
        </div>
        <div aria-live="polite" aria-busy={busy}>
          {states}
          {request.status === 'success' && (
            <div className="hud-grid">
              {readings.map(({ id, label, reading }) => (
                <article key={id} className={`hud-reading ${reading?.value === null || reading?.value === undefined ? 'missing' : ''}`}>
                  <span className="hud-label">{reading?.label ?? label}</span>
                  <span className="hud-value">{formatRadiologicalValue(reading?.value ?? null)}
                    {reading?.value !== null && reading?.value !== undefined && <small> {reading.unit ?? 'Sin datos'}</small>}</span>
                </article>
              ))}
              <article className={`hud-reading hud-notice tone-${tone}`}>
                <span className="hud-label">{activeNotice ? 'Aviso radiológico vigente' : notice ? 'Último aviso radiológico' : 'Aviso radiológico'}</span>
                <NoticeTag notice={notice} empty={mission ? 'Sin avisos radiológicos' : 'Sin datos'} />
              </article>
            </div>
          )}
        </div>
        <p className="caption">Último estado recibido de la misión compartida, sin actualización automática. Datos simulados.</p>
      </section>
    );
  }

  return (
    <section className="card mission-section" aria-labelledby="radiological-title">
      <div className="mission-head">
        <span className="mission-icon"><HazardIcon id="radiation" /></span>
        <div><p className="eyebrow">Misión simulada compartida</p><h2 id="radiological-title">Estado radiológico</h2></div>
        <span className="simulation-label"><IconFlask />Datos simulados</span>
        <button type="button" disabled={busy} onClick={() => void refresh()}>
          <IconRefresh />Actualizar estado radiológico
        </button>
      </div>
      <p className="caption">Último estado recibido de la misión compartida. Actualiza esta sección después de acciones en otros clientes o secciones. Sin actualización automática ni cálculos locales de dosis.</p>
      <div className="mission-toolbar">
        <button type="button" className="primary" disabled={!canActivate} onClick={() => void perform('/api/mission/scenarios/radiacion/activate', 'Activando evento radiológico simulado…')}>
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
        {states}
        {request.status === 'success' && (
          <>
            <p role="status" className="caption">{requiresRefresh ? 'Último estado recibido; actualízalo para confirmar el resultado de la acción.' : 'Estado radiológico recibido de la API local.'}</p>
            <div className="mission-grid">
              {readings.map(({ id, label, reading }) => {
                const value = reading?.value ?? null;
                return (
                  <article className="mission-tile" key={id}>
                    <div className="measurement-top">
                      <h3>{reading?.label ?? label}</h3>
                      <p className="badge">{value === null ? 'Sin datos' : availabilityLabels[reading!.availability] ?? 'Sin datos'}</p>
                    </div>
                    {id === 'radiation_rate' ? (
                      <ArcGauge label="Tasa de dosis" measure={reading?.label ?? label} value={value} display={formatRadiologicalValue(value)}
                        unit={reading?.unit ?? ''} min={0} max={RATE_SCALE_MAX} state={tone} status={rateStatus} />
                    ) : (
                      <p className="measurement-value">{formatRadiologicalValue(value)}
                        {value !== null && <span className="unit"> {reading?.unit ?? 'Sin datos'}</span>}
                      </p>
                    )}
                    <dl>
                      <dt>Unidad recibida</dt><dd>{reading?.unit ?? 'Sin datos'}</dd>
                      <dt>Calidad del dato</dt><dd>{value === null ? 'Sin datos' : availabilityLabels[reading!.availability] ?? 'Sin datos'}</dd>
                      <dt>Sistema recibido</dt><dd>{reading?.system ?? 'Sin datos'}</dd>
                      <dt>Fecha y hora de medición · Chile</dt><dd>{formatTime(reading?.measured_at ?? null)}</dd>
                      <dt>Procedencia</dt><dd>{reading?.source ?? 'Sin datos'}</dd>
                    </dl>
                    {id === 'radiation_rate' && <p className="caption">Escala de visualización de 0 a 0,1 mSv/h; no es un límite de exposición.</p>}
                  </article>
                );
              })}
              <article className={`mission-tile notice-tile tone-border-${tone}`}>
                <h3>Misión y aviso radiológico</h3>
                <dl>
                  <dt>Actividad recibida</dt><dd>{mission?.activity ?? 'Sin datos'}</dd>
                  <dt>Sistema recibido</dt><dd>{system}</dd>
                  <dt>Hora simulada de misión · Chile</dt><dd>{formatTime(mission?.clock ?? null)}</dd>
                </dl>
                <h3>{activeNotice ? 'Aviso radiológico vigente' : notice ? 'Último aviso radiológico' : 'Aviso radiológico'}</h3>
                {notice ? (
                  <>
                    <NoticeTag notice={notice} empty="Sin datos" />
                    <dl>
                      <dt>Identificador</dt><dd>{notice.id}</dd>
                      <dt>Fase</dt><dd>{notice.label ?? notice.state ?? 'Sin datos'}</dd>
                      <dt>Prioridad de demostración</dt><dd>{notice.priority === null ? 'Sin datos' : mission?.priorities?.[notice.priority] ?? notice.priority ?? 'Sin datos'}</dd>
                      <dt>Reconocimiento</dt><dd>{notice.acknowledged === true ? 'Reconocido' : notice.acknowledged === false ? 'Pendiente de reconocimiento' : 'Sin datos'}</dd>
                      <dt>Resolución</dt><dd>{notice.resolved === true ? 'Resuelto' : notice.resolved === false ? 'No resuelto' : 'Sin datos'}</dd>
                    </dl>
                  </>
                ) : <p className="no-notice"><StateIcon state="sindatos" />{mission ? 'No hay avisos radiológicos registrados en esta misión.' : 'Sin datos'}</p>}
              </article>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
