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

/** fetch con timeout compatible con WebViews antiguos (AbortSignal.timeout no existe en Chrome < 103). */
async function fetchWithTimeout(url: string, init: RequestInit = {}, ms = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Comprueba que el agente responde y que el token es válido. */
export async function testConnection(url: string, token: string): Promise<TestResult> {
  const base = url.replace(/\/$/, '');
  try {
    const health = await fetchWithTimeout(`${base}/health`);
    if (!health.ok) return { ok: false, error: `El PC no responde (health ${health.status})` };
    const verify = await fetchWithTimeout(`${base}/pair/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (verify.status === 401) return { ok: false, error: 'Código de emparejamiento incorrecto' };
    if (!verify.ok) return { ok: false, error: `El PC respondió con error ${verify.status}` };
    const data = (await verify.json()) as { name?: string };
    return { ok: true, name: data.name };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('abort') || msg.includes('Abort')) {
      return { ok: false, error: `El PC no respondió en 8s (${base}). ¿Está en la misma WiFi?` };
    }
    return {
      ok: false,
      error: `No se pudo conectar a ${base} (${msg}). Comprueba que el móvil y el PC están en la misma WiFi.`,
    };
  }
}