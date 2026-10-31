// Gestión de la conexión con el agente del PC (guardada en el dispositivo)
export interface Connection {
  url: string;
  token: string;
  name: string;
}

const KEY = 'ocm_connection';

export function loadConnection(): Connection | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Connection) : null;
  } catch {
    return null;
  }
}

export function saveConnection(c: Connection): void {
  localStorage.setItem(KEY, JSON.stringify(c));
}

export function clearConnection(): void {
  localStorage.removeItem(KEY);
}

export interface TestResult {
  ok: boolean;
  name?: string;
  error?: string;
}

/** Comprueba que el agente responde y que el token es válido. */
export async function testConnection(url: string, token: string): Promise<TestResult> {
  const base = url.replace(/\/$/, '');
  try {
    const health = await fetch(`${base}/health`, { signal: AbortSignal.timeout(5000) });
    if (!health.ok) return { ok: false, error: 'El PC no responde (health)' };
    const verify = await fetch(`${base}/pair/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      signal: AbortSignal.timeout(5000),
    });
    if (!verify.ok) return { ok: false, error: 'Código de emparejamiento incorrecto' };
    const data = (await verify.json()) as { name?: string };
    return { ok: true, name: data.name };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error de red';
    return { ok: false, error: `No se pudo conectar: ${msg}` };
  }
}