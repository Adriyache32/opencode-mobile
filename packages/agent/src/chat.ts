// Puente entre la app (WebSocket) y OpenCode (HTTP + SSE).
import { WebSocket } from 'ws';
import { connectOpenCode, type ChatMessage, type OpenCodeClient, type OpenCodeEvent } from './opencode';

export type ServerMessage =
  | { type: 'hello'; name: string; protocol: number; opencode: 'ready' | 'offline'; error?: string }
  | { type: 'status'; state: 'idle' | 'busy' | 'offline'; detail?: string }
  | { type: 'history'; messages: ChatMessage[] }
  | { type: 'user'; id: string; text: string }
  | { type: 'assistant_start'; id: string }
  | { type: 'delta'; id: string; text: string }
  | { type: 'done'; id: string }
  | { type: 'error'; message: string }
  | { type: 'pong' };

interface ClientMessage {
  type: 'prompt' | 'cancel' | 'ping' | 'history';
  text?: string;
}

export class ChatHub {
  private clients = new Set<WebSocket>();
  private oc: OpenCodeClient | null = null;
  private sessionID: string | null = null;
  private busy = false;
  private buffers = new Map<string, string>();
  private opencodeError: string | null = null;

  constructor(private deviceName: string) {}

  async start(): Promise<void> {
    const conn = await connectOpenCode();
    this.oc = conn.client;
    this.opencodeError = conn.error;
    if (!this.oc) {
      console.log(`OpenCode no disponible: ${conn.error ?? 'desconocido'}`);
      return;
    }
    console.log('OpenCode conectado');
    this.oc.subscribe(
      (e) => this.onEvent(e),
      (ok) => {
        if (!ok) this.broadcast({ type: 'status', state: 'offline', detail: 'Sin conexión con OpenCode' });
      }
    );
  }

  attach(ws: WebSocket): void {
    this.clients.add(ws);
    ws.send(
      JSON.stringify({
        type: 'hello',
        name: this.deviceName,
        protocol: 2,
        opencode: this.oc ? 'ready' : 'offline',
        error: this.opencodeError ?? undefined,
      } satisfies ServerMessage)
    );
    if (this.oc) {
      ws.send(JSON.stringify({ type: 'status', state: this.busy ? 'busy' : 'idle' } satisfies ServerMessage));
      void this.sendHistory(ws);
    } else {
      ws.send(
        JSON.stringify({
          type: 'status',
          state: 'offline',
          detail: this.opencodeError ?? 'OpenCode no está disponible',
        } satisfies ServerMessage)
      );
    }
    ws.on('close', () => this.clients.delete(ws));
  }

  async handle(ws: WebSocket, raw: string): Promise<void> {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw) as ClientMessage;
    } catch {
      ws.send(JSON.stringify({ type: 'error', message: 'Mensaje inválido' } satisfies ServerMessage));
      return;
    }

    if (msg.type === 'ping') {
      ws.send(JSON.stringify({ type: 'pong' } satisfies ServerMessage));
      return;
    }

    if (msg.type === 'history') {
      await this.sendHistory(ws);
      return;
    }

    if (!this.oc) {
      ws.send(
        JSON.stringify({
          type: 'error',
          message: this.opencodeError ?? 'OpenCode no está disponible en el PC',
        } satisfies ServerMessage)
      );
      return;
    }

    if (msg.type === 'prompt') {
      const text = (msg.text ?? '').trim();
      if (!text) return;
      if (this.busy) {
        ws.send(JSON.stringify({ type: 'error', message: 'Ya hay una tarea en curso' } satisfies ServerMessage));
        return;
      }
      try {
        const sid = await this.ensureSession();
        const localID = `local_${Date.now()}`;
        this.broadcast({ type: 'user', id: localID, text });
        this.busy = true;
        this.broadcast({ type: 'status', state: 'busy' });
        await this.oc.prompt(sid, text);
      } catch (e) {
        this.busy = false;
        this.broadcast({ type: 'status', state: 'idle' });
        this.broadcast({ type: 'error', message: errorText(e) });
      }
      return;
    }

    if (msg.type === 'cancel') {
      if (!this.sessionID || !this.busy) return;
      try {
        await this.oc.interrupt(this.sessionID);
        this.broadcast({ type: 'status', state: 'idle', detail: 'Tarea cancelada' });
      } catch (e) {
        this.broadcast({ type: 'error', message: errorText(e) });
      }
    }
  }

  private async ensureSession(): Promise<string> {
    if (this.sessionID) return this.sessionID;
    this.sessionID = await this.oc!.createSession(`${this.deviceName} · móvil`);
    return this.sessionID;
  }

  private async sendHistory(ws: WebSocket): Promise<void> {
    if (!this.oc || !this.sessionID) {
      ws.send(JSON.stringify({ type: 'history', messages: [] } satisfies ServerMessage));
      return;
    }
    try {
      const messages = await this.oc.messages(this.sessionID);
      ws.send(JSON.stringify({ type: 'history', messages } satisfies ServerMessage));
    } catch {
      ws.send(JSON.stringify({ type: 'history', messages: [] } satisfies ServerMessage));
    }
  }

  private onEvent(e: OpenCodeEvent): void {
    const data = (e.data ?? {}) as {
      sessionID?: string;
      assistantMessageID?: string;
      delta?: string;
      outcome?: string;
    };
    if (data.sessionID && this.sessionID && data.sessionID !== this.sessionID) return;

    switch (e.type) {
      case 'session.text.started': {
        const id = data.assistantMessageID ?? 'assistant';
        this.buffers.set(id, '');
        this.broadcast({ type: 'assistant_start', id });
        break;
      }
      case 'session.text.delta': {
        const id = data.assistantMessageID ?? 'assistant';
        const prev = this.buffers.get(id) ?? '';
        this.buffers.set(id, prev + (data.delta ?? ''));
        this.broadcast({ type: 'delta', id, text: data.delta ?? '' });
        break;
      }
      case 'session.execution.started':
        this.busy = true;
        this.broadcast({ type: 'status', state: 'busy' });
        break;
      case 'session.execution.succeeded':
      case 'session.execution.failed':
      case 'session.execution.interrupted': {
        this.busy = false;
        for (const id of this.buffers.keys()) this.broadcast({ type: 'done', id });
        this.buffers.clear();
        this.broadcast({
          type: 'status',
          state: 'idle',
          detail: e.type === 'session.execution.failed' ? 'La tarea falló' : undefined,
        });
        break;
      }
      default:
        break;
    }
  }

  private broadcast(msg: ServerMessage): void {
    const payload = JSON.stringify(msg);
    for (const ws of this.clients) {
      if (ws.readyState === WebSocket.OPEN) ws.send(payload);
    }
  }
}

function errorText(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}
