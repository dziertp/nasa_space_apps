import { useCallback, useEffect, useRef, useState } from 'react';
import type { EnvironmentalMission } from './mission';

type ReadState = {
  status: 'loading' | 'success' | 'error';
  data: EnvironmentalMission | null;
};

async function readMission(signal: AbortSignal): Promise<EnvironmentalMission> {
  const response = await fetch('/api/mission', { signal, cache: 'no-store' });
  if (!response.ok) throw new Error('Error de consulta');
  return response.json();
}

// Cada sección de misión mantiene su consulta y bloqueo de escrituras. El panel personal conserva su hook.
export function useHabitatMission() {
  const [request, setRequest] = useState<ReadState>({ status: 'loading', data: null });
  const [progress, setProgress] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [requiresRefresh, setRequiresRefresh] = useState(false);
  const busy = useRef(false);
  const sequence = useRef(0);
  const controller = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    const token = ++sequence.current;
    const abort = new AbortController();
    controller.current = abort;
    const timeout = window.setTimeout(() => abort.abort(), 5000);
    setRequest({ status: 'loading', data: null });
    try {
      const data = await readMission(abort.signal);
      if (token === sequence.current) {
        setRequest({ status: 'success', data });
        setRequiresRefresh(false);
        setActionError(null);
      }
    } catch {
      if (token === sequence.current) setRequest({ status: 'error', data: null });
    } finally {
      window.clearTimeout(timeout);
      if (token === sequence.current) busy.current = false;
    }
  }, []);

  useEffect(() => {
    void refresh();
    return () => {
      sequence.current += 1;
      controller.current?.abort();
      busy.current = false;
    };
  }, [refresh]);

  // extra: campos adicionales del contrato (confirm del reinicio, activity, minutes); instancia y revisión siempre vienen del último estado.
  async function perform(path: string, label: string, extra?: Record<string, unknown>) {
    const current = request.data;
    if (busy.current || requiresRefresh || request.status !== 'success' || !current) return;
    // El bloqueo síncrono también evita dos clics antes del siguiente render.
    busy.current = true;
    const token = ++sequence.current;
    const abort = new AbortController();
    controller.current = abort;
    const timeout = window.setTimeout(() => abort.abort(), 5000);
    setProgress(label);
    setActionError(null);
    try {
      const response = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...extra, instance_id: current.instance_id, revision: current.revision }),
        signal: abort.signal,
      });
      if (token !== sequence.current) return;
      if (response.status === 409) {
        setActionError('Conflicto de estado: la acción no se confirmó. Se consultará la misión actual; vuelve a actuar explícitamente si corresponde.');
        setProgress('Actualizando estado tras el conflicto…');
        setRequest({ status: 'loading', data: null });
        try {
          const data = await readMission(abort.signal);
          if (token === sequence.current) {
            setRequest({ status: 'success', data });
            setRequiresRefresh(false);
          }
        } catch {
          if (token === sequence.current) {
            setRequest({ status: 'error', data: null });
            setRequiresRefresh(true);
            setActionError('Conflicto de estado. No se pudo consultar la misión actual; pulsa Actualizar estado antes de volver a actuar.');
          }
        }
        return;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data: EnvironmentalMission = await response.json();
      if (token === sequence.current) {
        // El resultado visible viene de FastAPI; no se anticipan cambios locales.
        setRequest({ status: 'success', data });
        setRequiresRefresh(false);
      }
    } catch {
      if (token === sequence.current) {
        setRequiresRefresh(true);
        setActionError('Error de escritura: no se pudo confirmar la acción. Puede haberse registrado en el servidor; actualiza el estado antes de volver a actuar.');
      }
    } finally {
      window.clearTimeout(timeout);
      if (token === sequence.current) {
        busy.current = false;
        setProgress(null);
      }
    }
  }

  return { request, refresh, perform, progress, actionError, requiresRefresh };
}
