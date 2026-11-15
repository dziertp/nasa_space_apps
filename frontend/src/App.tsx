import { useState } from 'react';
import PersonalPanel from './PersonalPanel';
import { HazardsModule, HelmetHealth, ModuleHeader, ModuleTabs, PlannedFeatures } from './ModuleViews';
import { devices, modules, type DeviceId, type ModuleId } from './modules';
import type { Panel, Scenario } from './panel';
import SuitModule from './SuitModule';
import { useLocalApi } from './useLocalApi';

export default function App() {
  const [attempt, setAttempt] = useState(0);
  const [selectedId, setSelectedId] = useState('estables');
  const [device, setDevice] = useState<DeviceId>('tableta');
  const [moduleId, setModuleId] = useState<ModuleId>('salud');
  const health = useLocalApi<{ status: string }>('/api/health', attempt);
  const scenarios = useLocalApi<Scenario[]>('/api/scenarios', attempt);
  const panel = useLocalApi<Panel>(`/api/scenarios/${encodeURIComponent(selectedId)}`, attempt);
  const connection = health.status === 'loading' ? 'loading'
    : health.status === 'success' && health.data?.status === 'ok' ? 'connected' : 'error';
  const connectionLabel = { loading: 'Cargando', connected: 'Conectado', error: 'Error' }[connection];
  const busy = [health.status, scenarios.status, panel.status].includes('loading');
  const deviceModules = devices[device].modules;
  // Al cambiar de dispositivo se conserva el módulo si existe en ambos.
  const activeId = deviceModules.includes(moduleId) ? moduleId : deviceModules[0];
  const active = modules[activeId];

  const panelState = (
    <div aria-live="polite" aria-busy={panel.status === 'loading'}>
      {panel.status === 'loading' && <p className="loading-panel" role="status">Cargando escenario…</p>}
      {panel.status === 'error' && <p className="error-notice" role="alert">No se pudo cargar el escenario. La disponibilidad de sus mediciones no se puede evaluar. Vuelve a comprobar.</p>}
      {panel.status === 'success' && panel.data && (device === 'casco'
        ? <HelmetHealth panel={panel.data} /> : <PersonalPanel panel={panel.data} />)}
    </div>
  );

  return (
    <main>
      <header className="page-header">
        <div><p className="eyebrow">NASA Space Apps 2026 · Health Monitoring Software</p><h1>Consola de tripulación</h1><p className="intro">Salud de astronautas · Demostración local</p></div>
        <span className="simulation-label">Datos simulados</span>
      </header>
      <aside className="simulation-notice">SIM-001 y su misión son ficticios. Todas las mediciones e historias de esta demostración son sintéticas. Prototipo sin validación clínica.</aside>
      <section className="device-switch" aria-label="Dispositivo simulado">
        <div className="segmented" role="group" aria-label="Dispositivo">
          {(Object.keys(devices) as DeviceId[]).map((id) => (
            <button key={id} type="button" aria-pressed={device === id} onClick={() => setDevice(id)}>{devices[id].label}</button>
          ))}
        </div>
        <p className="caption">{devices[device].context}</p>
      </section>
      <section className="toolbar" aria-label="Conexión y selección de escenario">
        <div role="status" aria-live="polite"><span className="eyebrow">Conexión con la API</span><p className={`badge ${connection}`}><span className="dot" aria-hidden="true" />{connectionLabel}</p><p className="caption">Última comprobación; independiente de los sensores.</p></div>
        <div className="scenario-select"><label htmlFor="scenario">Escenario de demostración</label>
          <select id="scenario" value={selectedId} onChange={(event) => setSelectedId(event.target.value)} disabled={scenarios.status !== 'success'}>
            {scenarios.data?.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.name}</option>)}
          </select>
          {scenarios.status === 'error' && <p role="alert">No se pudo cargar la lista de escenarios.</p>}
        </div>
        <button type="button" disabled={busy} onClick={() => setAttempt((value) => value + 1)}>{busy ? 'Comprobando…' : 'Volver a comprobar'}</button>
      </section>
      {connection === 'error' && <p role="alert" className="error-notice">No se pudo confirmar la conexión con la API. Comprueba que el backend esté en ejecución y vuelve a comprobar.</p>}
      <div className={`console device-${device}`}>
        <nav aria-label={`Módulos de ${devices[device].label}`}>
          <ModuleTabs ids={deviceModules} active={activeId} onSelect={setModuleId} />
        </nav>
        <div className="module-panel" id="module-panel" role="tabpanel" aria-labelledby={`tab-${activeId}`}>
          <ModuleHeader module={active} />
          {activeId === 'salud' && panelState}
          {activeId === 'traje' && <SuitModule scenarioId={selectedId} attempt={attempt} />}
          {activeId === 'hazards' && <HazardsModule scenarios={scenarios.data} selectedId={selectedId}
            onOpen={(id) => { setSelectedId(id); setModuleId('salud'); }} />}
          <PlannedFeatures module={active} />
        </div>
      </div>
      <footer>Datos simulados · Sin diagnósticos ni alertas clínicas. La consulta de fuentes externas es opcional.</footer>
    </main>
  );
}
