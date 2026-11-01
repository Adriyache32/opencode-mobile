// Cliente WebSocket del agente, con reconexión automática.
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

export type AgentEvent =
  | { type: 'hello'; name: string; protocol: number; opencode: 'ready' | 'offline'; error?: string }
  | { type: 'status'; state: 'idle' | 'busy' | 'offline'; detail?: string }
  | { type: 'history'; messages: ChatMessage[] }
  | { type: 'user'; id: string; text: string }
  | { type: 'assistant_start'; id: string }
  | { type: 'delta'; id: string; text: string }
  | { type: 'done'; id: string }
  | { type: 'error'; message: string }
  | { type: 'pong' };

export type ConnectionState = 'connecting' | 'online' | 'offline';

export class ChatSocket {
  private ws: WebSocket | null = null;
  private closed = false;
  private backoff = 800;

  constructor(
    private baseUrl: string,
    private token: string,
    private onEvent: (e: AgentEvent) => void,
    private onState: (s: ConnectionState) => void
  ) {}

  connect(): void {
    this.closed = false;
    this.onState('connecting');
    const wsUrl = this.baseUrl.replace(/^http/, 'ws') + `/ws?token=${encodeURIComponent(this.token)}`;
    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      this.backoff = 800;
      this.onState('online');
    };
    ws.onmessage = (ev) => {
      try {
        this.onEvent(JSON.parse(String(ev.data)) as AgentEvent);
      } catch {
        // mensaje no JSON: se ignora
      }
    };
    ws.onclose = () => {
      this.onState('offline');
      this.scheduleReconnect();
    };
    ws.onerror = () => {
      ws.close();
    };
  }

  private scheduleReconnect(): void {
    if (this.closed) return;
    const delay = this.backoff;
    this.backoff = Math.min(this.backoff * 2, 10000);
    setTimeout(() => {
      if (!this.closed) this.connect();
    }, delay);
  }

  send(msg: { type: string; text?: string }): boolean {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
      return true;
    }
    return false;
  }

  close(): void {
    this.closed = true;
    this.ws?.close();
    this.ws = null;
  }
}
