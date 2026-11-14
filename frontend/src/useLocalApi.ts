import { useEffect, useState } from 'react';

type RequestState<T> = { url: string; status: 'loading' | 'success' | 'error'; data: T | null };

// Conectividad y carga de escenarios mantienen estados independientes.
export function useLocalApi<T>(url: string, attempt: number) {
  const [state, setState] = useState<RequestState<T>>({ url, status: 'loading', data: null });
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setState({ url, status: 'loading', data: null });
    const timeout = window.setTimeout(() => controller.abort(), 5000);
    async function load() {
      try {
        const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error('Respuesta HTTP no válida');
        const data = await response.json() as T;
        if (active) setState({ url, status: 'success', data });
      } catch {
        if (active) setState({ url, status: 'error', data: null });
      } finally {
        window.clearTimeout(timeout);
      }
    }
    void load();
    return () => { active = false; controller.abort(); window.clearTimeout(timeout); };
  }, [url, attempt]);
  // No mostrar el escenario anterior durante un cambio de selección.
  return state.url === url ? state : { url, status: 'loading' as const, data: null };
}
