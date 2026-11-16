import { useState } from 'react';
import {
  BrandMark, IconClock, IconCrew, IconFlask, IconHelmet, IconLayers, IconLink, IconRefresh, IconTablet, StateIcon,
} from './icons';
import { HazardsModule, HelmetHealth, ModuleHeader, ModuleTabs, PlannedFeatures, VisorOverlay } from './ModuleViews';
import { devices, modules, type DeviceId, type ModuleId } from './modules';
import { EvaPlanning, HelmetEquipment, HelmetMission } from './EvaModules';
import HabitatEnvironment from './HabitatEnvironment';
import { formatTime, type Panel, type Scenario } from './panel';
import PersonalPanel from './PersonalPanel';
import RadiologicalStatus from './RadiologicalStatus';
import SuitModule from './SuitModule';
import { useLocalApi } from './useLocalApi';

const connectionIcons = { loading: 'sindatos', connected: 'ok', error: 'critico' } as const;

function DeviceIcon({ id }: { id: DeviceId }) {
  return id === 'tableta' ? <IconTablet /> : <IconHelmet />;
}

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
  // La barra superior muestra lo recibido de la API; mientras carga o si falla, lo dice.
  const pending = (status: string) => (status === 'loading' ? 'Cargando…' : 'Sin datos');
  const crew = panel.data ? `${panel.data.astronaut.id} · ${panel.data.astronaut.name}` : pending(panel.status);
  const clock = panel.data ? formatTime(panel.data.demo_time) : pending(panel.status);
  const scenarioName = scenarios.data?.find((scenario) => scenario.id === selectedId)?.name ?? pending(scenarios.status);

  const panelState = (
    <div aria-live="polite" aria-busy={panel.status === 'loading'}>
      {panel.status === 'loading' && <p className="loading-panel" role="status">Cargando escenario…</p>}
      {panel.status === 'error' && <p className="error-notice" role="alert">No se pudo cargar el escenario. La disponibilidad de sus mediciones no se puede evaluar. Vuelve a comprobar.</p>}
      {panel.status === 'success' && panel.data && (device === 'casco'
        ? <HelmetHealth panel={panel.data} /> : <PersonalPanel panel={panel.data} />)}
    </div>
  );

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <BrandMark />
            <div><p className="eyebrow"><span className="brand-event">NASA Space Apps 2026 · </span>Health Monitoring Software</p><h1>Consola de tripulación</h1></div>
          </div>
          <ul className="telemetry" aria-label="Estado de la demostración">
            <li><span className="t-label"><IconCrew /><span className="t-label-text">Tripulante</span></span><span className="t-value">{crew}</span></li>
            <li><span className="t-label"><IconClock /><span className="t-label-text">Reloj de misión · fijo</span></span><span className="t-value">{clock}</span></li>
            <li className="t-scenario"><span className="t-label"><IconLayers /><span className="t-label-text">Escenario</span></span><span className="t-value" title={scenarioName}>{scenarioName}</span></li>
            <li><span className="t-label"><IconLink /><span className="t-label-text">Conexión con la API</span></span>
              <span className={`t-value link-state ${connection}`} role="status" aria-live="polite"><StateIcon state={connectionIcons[connection]} />{connectionLabel}</span></li>
          </ul>
          <span className="simulation-label"><IconFlask />Datos simulados</span>
        </div>
      </header>
      <main>
        <div className="intro-row">
          <p className="intro">Salud de astronautas · Demostración local</p>
          <aside className="simulation-notice">SIM-001 y su misión son ficticios. Todas las mediciones e historias de esta demostración son sintéticas. Prototipo sin validación clínica.</aside>
        </div>
        <section className="mission-strip" aria-label="Dispositivo, escenario y conexión">
          <div className="strip-device">
            <p className="eyebrow">Dispositivo simulado</p>
            <div className="segmented" role="group" aria-label="Dispositivo">
              {(Object.keys(devices) as DeviceId[]).map((id) => (
                <button key={id} type="button" aria-pressed={device === id} onClick={() => setDevice(id)}>
                  <DeviceIcon id={id} />{devices[id].label}
                </button>
              ))}
            </div>
            <p className="caption">{devices[device].context}</p>
          </div>
          <div className="scenario-select"><label htmlFor="scenario">Escenario de demostración</label>
            <select id="scenario" value={selectedId} onChange={(event) => setSelectedId(event.target.value)} disabled={scenarios.status !== 'success'}>
              {scenarios.data?.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.name}</option>)}
            </select>
            {scenarios.status === 'error' && <p role="alert">No se pudo cargar la lista de escenarios.</p>}
          </div>
          <div className="strip-check">
            <button type="button" className="primary" disabled={busy} onClick={() => setAttempt((value) => value + 1)}>
              <IconRefresh />{busy ? 'Comprobando…' : 'Volver a comprobar'}
            </button>
            <p className="caption">Última comprobación; independiente de los sensores.</p>
          </div>
        </section>
        {connection === 'error' && <p role="alert" className="error-notice">No se pudo confirmar la conexión con la API. Comprueba que el backend esté en ejecución y vuelve a comprobar.</p>}
        <div className={`console device-${device}`}>
          {device === 'casco' && <VisorOverlay />}
          <nav aria-label={`Módulos de ${devices[device].label}`}>
            <ModuleTabs ids={deviceModules} active={activeId} onSelect={setModuleId}
              orientation={device === 'casco' ? 'horizontal' : 'vertical'} />
          </nav>
          <div className="module-panel" id="module-panel" role="tabpanel" aria-labelledby={`tab-${activeId}`}>
            <ModuleHeader module={active} index={deviceModules.indexOf(activeId) + 1} />
            <div className="module-body" key={`${device}-${activeId}`}>
              {/* Motor de misión ubicado por módulos: radiación en Salud y hábitat en Nave (solo tableta). */}
              {activeId === 'salud' && <>{panelState}<RadiologicalStatus compact={device === 'casco'} /></>}
              {activeId === 'traje' && <SuitModule scenarioId={selectedId} attempt={attempt} device={device} />}
              {activeId === 'nave' && <HabitatEnvironment />}
              {/* Preparación de EVA en la tableta; el casco lee el plan activo del motor. */}
              {activeId === 'preparacion' && <EvaPlanning />}
              {activeId === 'mision' && <HelmetMission />}
              {activeId === 'equipamiento' && <HelmetEquipment />}
              {activeId === 'hazards' && <HazardsModule scenarios={scenarios.data} selectedId={selectedId}
                onOpen={(id) => { setSelectedId(id); setModuleId('salud'); }} />}
              <PlannedFeatures module={active} />
            </div>
          </div>
        </div>
        <footer>Datos simulados · Sin diagnósticos ni alertas clínicas. La consulta de fuentes externas es opcional.</footer>
      </main>
    </>
  );
}
