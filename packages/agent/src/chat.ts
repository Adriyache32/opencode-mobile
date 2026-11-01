// Puente entre la app (WebSocket) y OpenCode (HTTP + SSE).
import { WebSocket } from 'ws';
import {
  connectOpenCode,
  type ChatMessage,
  type OpenCodeClient,
  type OpenCodeEvent,
  type PermissionRequest,
} from './opencode';
import { saveState } from './store';

export type ServerMessage =
  | { type: 'hello'; name: string; protocol: number; opencode: 'ready' | 'offline'; error?: string }
  | { type: 'status'; state: 'idle' | 'busy' | 'offline'; detail?: string }
  | { type: 'history'; messages: ChatMessage[] }
  | { type: 'user'; id: string; text: string }
  | { type: 'assistant_start'; id: string }
  | { type: 'delta'; id: string; text: string }
  | { type: 'done'; id: string }
  | { type: 'permission'; request: PermissionRequest }
  | { type: 'permission_closed'; id: string }
  | { type: 'error'; message: string }
  | { type: 'pong' };

interface ClientMessage {
  type: 'prompt' | 'cancel' | 'ping' | 'history' | 'new_session' | 'permission_reply';
  text?: string;
  id?: string;
  decision?: 'once' | 'always' | 'reject';
}

export class ChatHub {
  private clients = new Set<WebSocket>();
  private oc: OpenCodeClient | null;
  private sessionID: string | null;
  private busy = false;
  private buffers = new Map<string, string>();
  private opencodeError: string | null = null;
  private started: boolean;

  constructor(
    private deviceName: string,
    opts: { client?: OpenCodeClient | null; sessionID?: string | null } = {}
  ) {
    this.oc = opts.client ?? null;
    this.sessionID = opts.sessionID ?? null;
    this.started = opts.client !== undefined;
  }

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    const conn = await connectOpenCode();
    this.oc = conn.client;
    this.opencodeError = conn.error;
    if (!this.oc) {
      console.log(`OpenCode no disponible: ${conn.error ?? 'desconocido'}`);
      return;
    }
    console.log('OpenCode conectado');
    this.oc.subscribe(
      (e) => this.handleEvent(e),
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
        protocol: 3,
        opencode: this.oc ? 'ready' : 'offline',
        error: this.opencodeError ?? undefined,
      } satisfies ServerMessage)
    );
    if (this.oc) {
      ws.send(JSON.stringify({ type: 'status', state: this.busy ? 'busy' : 'idle' } satisfies ServerMessage));
      void this.sendHistory(ws);
      void this.sendPendingPermissions(ws);
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

    if (msg.type === 'permission_reply') {
      if (!msg.id || !msg.decision) return;
      const sid = this.sessionID;
      if (!sid) return;
      try {
        await this.oc.replyPermission(sid, msg.id, msg.decision);
        this.broadcast({ type: 'permission_closed', id: msg.id });
      } catch (e) {
        this.broadcast({ type: 'error', message: errorText(e) });
      }
      return;
    }

    if (msg.type === 'new_session') {
      if (this.busy) {
        ws.send(JSON.stringify({ type: 'error', message: 'Espera a que termine la tarea' } satisfies ServerMessage));
        return;
      }
      try {
        this.sessionID = await this.oc.createSession(`${this.deviceName} · móvil`);
        saveState({ sessionID: this.sessionID });
        this.broadcast({ type: 'history', messages: [] });
        this.broadcast({ type: 'status', state: 'idle' });
      } catch (e) {
        this.broadcast({ type: 'error', message: errorText(e) });
      }
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
    saveState({ sessionID: this.sessionID });
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

  private async sendPendingPermissions(ws: WebSocket): Promise<void> {
    if (!this.oc || !this.sessionID) return;
    try {
      const pending = await this.oc.pendingPermissions(this.sessionID);
      for (const request of pending) {
        ws.send(JSON.stringify({ type: 'permission', request } satisfies ServerMessage));
      }
    } catch {
      // sin permisos pendientes
    }
  }

  handleEvent(e: OpenCodeEvent): void {
    const data = (e.data ?? {}) as {
      sessionID?: string;
      assistantMessageID?: string;
      delta?: string;
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
      case 'permission.asked':
        this.broadcast({ type: 'permission', request: e.data as unknown as PermissionRequest });
        break;
      case 'permission.replied': {
        const id = (e.data as { id?: string })?.id;
        if (id) this.broadcast({ type: 'permission_closed', id });
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
