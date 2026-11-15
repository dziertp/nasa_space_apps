import { SleepFatigueChart } from './charts';
import { sleepContext, localContext } from './content';
import { AvailabilityIcon } from './icons';
import { availabilityLabels, formatNumber, formatTime, type Panel } from './panel';

export default function PersonalPanel({ panel }: { panel: Panel }) {
  const counts = panel.measurements.reduce((result, item) => {
    result[item.availability] += 1;
    return result;
  }, { available: 0, stale: 0, missing: 0 });
  return (
    <div className="dash">
      <section className="card profile" aria-label="Tripulante y misión ficticios">
        <div className="avatar" aria-hidden="true">01</div>
        <div><p className="eyebrow">{panel.astronaut.id} · {panel.astronaut.role}</p><h2>{panel.astronaut.name}</h2>
          <p>{panel.mission.name} <span className="muted">/ {panel.mission.id}</span></p></div>
        <div className="demo-clock"><span className="muted">Reloj de demostración fijo</span>
          <strong>{formatTime(panel.demo_time)}</strong><span>Hora de Chile · America/Santiago</span></div>
      </section>
      <section className="card scenario-info" aria-labelledby="scenario-title">
        <p className="eyebrow">Escenario activo</p><h2 id="scenario-title">{panel.scenario.name}</h2>
        <p>{panel.scenario.description}</p>
      </section>
      <section className="card span-full" aria-labelledby="measurements-title">
        <div className="section-heading"><h2 id="measurements-title">Mediciones simuladas</h2>
          <p className="muted">{counts.available} disponibles · {counts.stale} desactualizadas · {counts.missing} sin datos</p></div>
        <div className="measurement-grid">
          {panel.measurements.map((measurement) => (
            <article className={`measurement-card ${measurement.availability}`} key={measurement.id}>
              <div className="measurement-top">
                <h3>{measurement.label}</h3>
                <p className={`badge ${measurement.availability}`}><AvailabilityIcon availability={measurement.availability} />{availabilityLabels[measurement.availability]}</p>
              </div>
              <p className="measurement-value">{formatNumber(measurement.value)}
                {measurement.value !== null && <span className="unit"> {measurement.unit}</span>}</p>
              <dl><dt>Unidad</dt><dd>{measurement.unit}</dd>
                <dt>Fecha y hora · Chile</dt><dd>{formatTime(measurement.measured_at)}</dd>
                <dt>Procedencia</dt><dd>{measurement.source}</dd></dl>
              {measurement.availability === 'stale' && <p className="stale-note">Última lectura conservada; no representa una lectura actual.</p>}
            </article>
          ))}
        </div>
        <p className="caption">Disponible describe la recepción del dato; no significa un estado de salud normal.</p>
        <details className="policy"><summary>Criterio de disponibilidad</summary><p>{panel.availability_policy.description}</p></details>
      </section>
      <section className="card span-full history-section" aria-labelledby="history-title">
        <div className="section-heading"><h2 id="history-title">Sueño y fatiga</h2><span className="muted">7 días · Registro diario simulado</span></div>
        <SleepFatigueChart history={panel.history} />
        <p className="caption">Barras independientes: sueño de 0 a 12 h (escala visual); fatiga de 0 a 10. No son límites de salud.</p>
        <div className="table-scroll" role="region" aria-label="Historial de siete días, desplazable horizontalmente" tabIndex={0}>
          <table><caption className="sr-only">Historial simulado. Las barras acompañan a los valores numéricos.</caption>
            <thead><tr><th scope="col">Día</th><th scope="col">Sueño · h</th><th scope="col">Fatiga · /10</th><th scope="col">Registro · hora de Chile</th></tr></thead>
            <tbody>{panel.history.map((record) => (
              <tr key={record.date}>
                <th scope="row">{record.date.slice(8, 10)}/{record.date.slice(5, 7)}</th>
                <td><div className="bar-cell"><span>{formatNumber(record.sleep_hours)}</span>
                  {record.sleep_hours !== null && <span className="bar-track" aria-hidden="true"><span className="bar sleep" style={{ width: `${Math.min(100, record.sleep_hours / 12 * 100)}%` }} /></span>}</div></td>
                <td><div className="bar-cell"><span>{formatNumber(record.fatigue_score)}</span>
                  {record.fatigue_score !== null && <span className="bar-track" aria-hidden="true"><span className="bar fatigue" style={{ width: `${record.fatigue_score * 10}%` }} /></span>}</div></td>
                <td><time dateTime={record.recorded_at}>{formatTime(record.recorded_at)}</time><span className="record-source">{record.source}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <p className="caption">{panel.fatigue_scale}</p>
      </section>
      <section className="card span-full context-section" aria-labelledby="context-title">
        <div><p className="eyebrow">Contexto científico</p><h2 id="context-title">{sleepContext.title}</h2></div>
        <div><p>{sleepContext.text}</p><p className="muted">{sleepContext.qualification}</p>
          <a href={sleepContext.source} target="_blank" rel="noreferrer">{sleepContext.sourceLabel} ↗</a>
          <details><summary>Autonomía y funcionamiento local</summary><p>{localContext.text}</p><a href={localContext.source} target="_blank" rel="noreferrer">NASA · 5 Hazards of Human Spaceflight ↗</a></details>
        </div>
      </section>
      <details className="card span-full provenance"><summary>Procedencia y generación de la demostración</summary>
        <p>{panel.provenance.author}. Generado el {panel.provenance.generated_on}.</p>
        <p>{panel.provenance.method}</p><p>Estos valores no proceden de NASA ni de OSD-575. No hay sensores reales conectados.</p>
      </details>
    </div>
  );
}
