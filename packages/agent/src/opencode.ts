// Cliente del servidor de OpenCode (HTTP + SSE).
// Autenticación: Basic con usuario "opencode" y la contraseña que imprime `opencode serve`.
import { spawn, type ChildProcess } from 'child_process';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

let runningChild: ChildProcess | null = null;

export interface OpenCodeEvent {
  id?: string;
  type: string;
  data?: Record<string, unknown>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

export interface PermissionRequest {
  id: string;
  sessionID: string;
  action: string;
  resources?: string[];
  save?: string[];
}

interface RawMessage {
  id: string;
  type: string;
  text?: string;
  content?: Array<{ type: string; text?: string }>;
  time?: { created?: number };
}

export class OpenCodeClient {
  private auth: string;

  constructor(
    public readonly baseUrl: string,
    password: string
  ) {
    this.auth = 'Basic ' + Buffer.from(`opencode:${password}`).toString('base64');
  }

  private async request<T>(path: string, init: RequestInit = {}, timeoutMs = 30000): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          Authorization: this.auth,
          'Content-Type': 'application/json',
          ...(init.headers ?? {}),
        },
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`OpenCode ${init.method ?? 'GET'} ${path} -> ${res.status} ${body.slice(0, 200)}`);
      }
      return (await res.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }

  async ping(): Promise<boolean> {
    try {
      await this.request('/api/session', {}, 4000);
      return true;
    } catch {
      return false;
    }
  }

  async createSession(title?: string): Promise<string> {
    const body = title ? { title } : {};
    const res = await this.request<{ data: { id: string } }>('/api/session', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return res.data.id;
  }

  async prompt(sessionID: string, text: string): Promise<void> {
    await this.request(`/api/session/${sessionID}/prompt`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  async interrupt(sessionID: string): Promise<void> {
    await this.request(`/api/session/${sessionID}/interrupt`, { method: 'POST', body: '{}' });
  }

  async replyPermission(
    sessionID: string,
    requestID: string,
    decision: 'once' | 'always' | 'reject'
  ): Promise<void> {
    await this.request(`/api/session/${sessionID}/permission/${requestID}/reply`, {
      method: 'POST',
      body: JSON.stringify({ decision }),
    });
  }

  async pendingPermissions(sessionID: string): Promise<PermissionRequest[]> {
    const res = await this.request<{ data: PermissionRequest[] }>(
      `/api/session/${sessionID}/permission`
    );
    return res.data;
  }

  async messages(sessionID: string): Promise<ChatMessage[]> {
    const res = await this.request<{ data: RawMessage[] }>(`/api/session/${sessionID}/message`);
    const ordered = [...res.data].sort((a, b) => (a.time?.created ?? 0) - (b.time?.created ?? 0));
    const out: ChatMessage[] = [];
    for (const m of ordered) {
      if (m.type === 'user' && typeof m.text === 'string') {
        out.push({ id: m.id, role: 'user', text: m.text });
      } else if (m.type === 'assistant') {
        const text = (m.content ?? [])
          .filter((p) => p.type === 'text' && typeof p.text === 'string')
          .map((p) => p.text as string)
          .join('');
        if (text) out.push({ id: m.id, role: 'assistant', text });
      }
    }
    return out;
  }

  /** Se suscribe al flujo SSE de OpenCode. Reconecta solo si se cae. */
  subscribe(onEvent: (e: OpenCodeEvent) => void, onState: (ok: boolean) => void): void {
    const run = async () => {
      let backoff = 1000;
      for (;;) {
        try {
          const controller = new AbortController();
          const res = await fetch(`${this.baseUrl}/api/event`, {
            headers: { Authorization: this.auth, Accept: 'text/event-stream' },
            signal: controller.signal,
          });
          if (!res.ok || !res.body) throw new Error(`SSE ${res.status}`);
          onState(true);
          backoff = 1000;
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const blocks = buffer.split('\n\n');
            buffer = blocks.pop() ?? '';
            for (const block of blocks) {
              for (const line of block.split('\n')) {
                if (!line.startsWith('data:')) continue;
                const raw = line.slice(5).trim();
                if (!raw) continue;
                try {
                  onEvent(JSON.parse(raw) as OpenCodeEvent);
                } catch {
                  // evento no JSON: se ignora
                }
              }
            }
          }
        } catch {
          onState(false);
        }
        await new Promise((r) => setTimeout(r, backoff));
        backoff = Math.min(backoff * 2, 15000);
      }
    };
    void run();
  }
}

/** Localiza el ejecutable de OpenCode. */
function findOpenCodeBinary(): string | null {
  const candidates = [
    process.env.OPENCODE_BIN,
    join(homedir(), '.opencode', 'bin', 'opencode'),
    '/usr/local/bin/opencode',
    '/usr/bin/opencode',
  ].filter(Boolean) as string[];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

export interface OpenCodeConnection {
  client: OpenCodeClient | null;
  error: string | null;
  child: ChildProcess | null;
}

/**
 * Devuelve un cliente listo. Si no hay servidor, arranca `opencode serve`
 * y captura la contraseña que imprime. Cero configuración para el usuario.
 */
export async function connectOpenCode(): Promise<OpenCodeConnection> {
  const url = process.env.OPENCODE_URL ?? 'http://127.0.0.1:8080';
  const explicitPassword = process.env.OPENCODE_PASSWORD;

  if (explicitPassword) {
    const client = new OpenCodeClient(url, explicitPassword);
    const ok = await client.ping();
    return { client: ok ? client : null, error: ok ? null : `No responde ${url}`, child: null };
  }

  // ¿Ya hay un servidor escuchando? Solo sirve si conocemos la contraseña.
  const stored = process.env.OPENCODE_PASSWORD_FILE;
  if (stored && existsSync(stored)) {
    const { readFileSync } = await import('fs');
    const pw = readFileSync(stored, 'utf-8').trim();
    const client = new OpenCodeClient(url, pw);
    if (await client.ping()) return { client, error: null, child: null };
  }

  const bin = findOpenCodeBinary();
  if (!bin) {
    return {
      client: null,
      error: 'No encuentro OpenCode en el PC. Instálalo o define OPENCODE_BIN.',
      child: null,
    };
  }

  // Puerto libre: evita chocar con un `opencode serve` que ya estuviera corriendo.
  const port = Number(process.env.OPENCODE_PORT ?? (await freePort()));
  const cwd = process.env.OPENCODE_CWD ?? homedir();
  const child = spawn(bin, ['serve', '--port', String(port), '--hostname', '127.0.0.1'], {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  runningChild = child;

  const password = await new Promise<string | null>((resolve) => {
    let buf = '';
    const timer = setTimeout(() => resolve(null), 15000);
    const onData = (chunk: Buffer) => {
      buf += chunk.toString();
      const m = buf.match(/server password\s+(\S+)/);
      if (m) {
        clearTimeout(timer);
        resolve(m[1] ?? null);
      }
    };
    child.stdout?.on('data', onData);
    child.stderr?.on('data', onData);
    child.on('exit', () => {
      clearTimeout(timer);
      resolve(null);
    });
  });

  if (!password) {
    child.kill();
    return { client: null, error: 'No pude arrancar `opencode serve`.', child: null };
  }

  const client = new OpenCodeClient(`http://127.0.0.1:${port}`, password);
  const ok = await client.ping();
  return { client: ok ? client : null, error: ok ? null : 'OpenCode arrancó pero no responde', child };
}

/** Puerto TCP libre en loopback. */
async function freePort(): Promise<number> {
  const { createServer } = await import('net');
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      const port = typeof addr === 'object' && addr ? addr.port : 8080;
      srv.close(() => resolve(port));
    });
  });
}

/** Mata el `opencode serve` que hayamos arrancado nosotros. */
export function stopOpenCode(): void {
  if (runningChild) {
    runningChild.kill();
    runningChild = null;
  }
}
