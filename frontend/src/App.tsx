import { useEffect, useState } from 'react';

type ConnectionStatus = 'loading' | 'connected' | 'error';

const messages: Record<ConnectionStatus, { label: string; description: string }> = {
  loading: {
    label: 'Cargando',
    description: 'Comprobando la conexión con la API local…',
  },
  connected: {
    label: 'Conectado',
    description: 'La API local está disponible.',
  },
  error: {
    label: 'Error',
    description: 'No se pudo confirmar la conexión. Comprueba que el backend esté en ejecución y vuelve a intentarlo.',
  },
};

export default function App() {
  const [status, setStatus] = useState<ConnectionStatus>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => controller.abort(), 5000);

    async function checkHealth() {
      try {
        const response = await fetch('/api/health', {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!response.ok) throw new Error('Respuesta HTTP no válida');
        const result: unknown = await response.json();
        if (
          typeof result !== 'object' || result === null ||
          !('status' in result) || result.status !== 'ok'
        ) {
          throw new Error('Respuesta de salud no válida');
        }
        if (active) setStatus('connected');
      } catch {
        if (active) setStatus('error');
      } finally {
        window.clearTimeout(timeout);
      }
    }

    void checkHealth();
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [attempt]);

  return (
    <main>
      <p className="eyebrow">NASA Space Apps 2026 · Health Monitoring Software</p>
      <h1>Salud de astronautas</h1>
      <p className="intro">Base del prototipo para el registro y seguimiento de salud durante una misión.</p>

      <section className="connection" aria-labelledby="connection-title">
        <h2 id="connection-title">Conexión con la API</h2>
        <div role="status" aria-live="polite" aria-atomic="true">
          <p className={`badge ${status}`}>
            <span className="dot" aria-hidden="true" />
            {messages[status].label}
          </p>
          <p>{messages[status].description}</p>
        </div>
        <button
          type="button"
          disabled={status === 'loading'}
          onClick={() => {
            setStatus('loading');
            setAttempt((value) => value + 1);
          }}
        >
          {status === 'loading' ? 'Comprobando…' : 'Volver a comprobar'}
        </button>
      </section>

      <p className="note">OSD-575: metadatos disponibles; CSV CMP pendiente de incorporar.
        La importación de resultados y el dashboard corresponden a próximos hitos.</p>
      <footer>Prototipo sin validación clínica.</footer>
    </main>
  );
}
