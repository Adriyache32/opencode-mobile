import { describe, expect, it, vi } from 'vitest';
import { ChatHub } from '../chat';
import type { OpenCodeClient } from '../opencode';

class FakeSocket {
  readyState = 1;
  sent: string[] = [];
  send(payload: string) {
    this.sent.push(payload);
  }
  on() {
    return this;
  }
  messages() {
    return this.sent.map((s) => JSON.parse(s) as { type: string; [k: string]: unknown });
  }
  last(type: string) {
    return this.messages().filter((m) => m.type === type).pop();
  }
}

function fakeClient(overrides: Partial<OpenCodeClient> = {}) {
  return {
    createSession: vi.fn(async () => 'ses_test'),
    prompt: vi.fn(async () => undefined),
    messages: vi.fn(async () => []),
    pendingPermissions: vi.fn(async () => []),
    replyPermission: vi.fn(async () => undefined),
    interrupt: vi.fn(async () => undefined),
    subscribe: vi.fn(),
    ...overrides,
  } as unknown as OpenCodeClient;
}

function makeHub(client = fakeClient()) {
  return new ChatHub('PC de prueba', { client, sessionID: 'ses_test' });
}

describe('ChatHub', () => {
  it('saluda con el estado de OpenCode al conectar', () => {
    const hub = makeHub();
    const ws = new FakeSocket();
    hub.attach(ws as never);
    const hello = ws.last('hello');
    expect(hello?.opencode).toBe('ready');
    expect(hello?.name).toBe('PC de prueba');
  });

  it('envía el historial al conectar', async () => {
    const client = fakeClient({ messages: vi.fn(async () => [{ id: 'm1', role: 'user', text: 'hola' }]) });
    const hub = makeHub(client);
    const ws = new FakeSocket();
    hub.attach(ws as never);
    await new Promise((r) => setTimeout(r, 0));
    const history = ws.last('history') as { messages: unknown[] };
    expect(history.messages).toHaveLength(1);
  });

  it('reenvía la instrucción a OpenCode y avisa a la app', async () => {
    const client = fakeClient();
    const hub = makeHub(client);
    const ws = new FakeSocket();
    hub.attach(ws as never);

    await hub.handle(ws as never, JSON.stringify({ type: 'prompt', text: 'abre firefox' }));

    expect(client.prompt).toHaveBeenCalledWith('ses_test', 'abre firefox');
    expect(ws.last('user')).toMatchObject({ text: 'abre firefox' });
    expect(ws.last('status')).toMatchObject({ state: 'busy' });
  });

  it('no acepta dos tareas a la vez', async () => {
    const client = fakeClient();
    const hub = makeHub(client);
    const ws = new FakeSocket();
    hub.attach(ws as never);

    await hub.handle(ws as never, JSON.stringify({ type: 'prompt', text: 'uno' }));
    await hub.handle(ws as never, JSON.stringify({ type: 'prompt', text: 'dos' }));

    expect(client.prompt).toHaveBeenCalledTimes(1);
    expect(ws.last('error')).toMatchObject({ message: 'Ya hay una tarea en curso' });
  });

  it('cancela la tarea en curso', async () => {
    const client = fakeClient();
    const hub = makeHub(client);
    const ws = new FakeSocket();
    hub.attach(ws as never);

    await hub.handle(ws as never, JSON.stringify({ type: 'prompt', text: 'tarea larga' }));
    await hub.handle(ws as never, JSON.stringify({ type: 'cancel' }));

    expect(client.interrupt).toHaveBeenCalledWith('ses_test');
    expect(ws.last('status')).toMatchObject({ detail: 'Tarea cancelada' });
  });

  it('transmite los deltas de texto de OpenCode', () => {
    const hub = makeHub();
    const ws = new FakeSocket();
    hub.attach(ws as never);

    hub.handleEvent({
      type: 'session.text.started',
      data: { sessionID: 'ses_test', assistantMessageID: 'msg_1' },
    });
    hub.handleEvent({
      type: 'session.text.delta',
      data: { sessionID: 'ses_test', assistantMessageID: 'msg_1', delta: 'hola' },
    });

    expect(ws.last('assistant_start')).toMatchObject({ id: 'msg_1' });
    expect(ws.last('delta')).toMatchObject({ id: 'msg_1', text: 'hola' });
  });

  it('ignora eventos de otra sesión', () => {
    const hub = makeHub();
    const ws = new FakeSocket();
    hub.attach(ws as never);
    const before = ws.sent.length;

    hub.handleEvent({
      type: 'session.text.delta',
      data: { sessionID: 'ses_otra', assistantMessageID: 'msg_x', delta: 'no' },
    });

    expect(ws.sent.length).toBe(before);
  });

  it('reenvía las peticiones de permiso y las responde', async () => {
    const client = fakeClient();
    const hub = makeHub(client);
    const ws = new FakeSocket();
    hub.attach(ws as never);

    hub.handleEvent({
      type: 'permission.asked',
      data: { id: 'per_1', sessionID: 'ses_test', action: 'shell', resources: ['rm -rf /tmp/x'] },
    });
    const perm = ws.last('permission') as { request: { id: string; action: string } };
    expect(perm.request.id).toBe('per_1');

    await hub.handle(ws as never, JSON.stringify({ type: 'permission_reply', id: 'per_1', decision: 'reject' }));
    expect(client.replyPermission).toHaveBeenCalledWith('ses_test', 'per_1', 'reject');
    expect(ws.last('permission_closed')).toMatchObject({ id: 'per_1' });
  });

  it('marca idle cuando la ejecución termina', () => {
    const hub = makeHub();
    const ws = new FakeSocket();
    hub.attach(ws as never);

    hub.handleEvent({ type: 'session.execution.started', data: { sessionID: 'ses_test' } });
    expect(ws.last('status')).toMatchObject({ state: 'busy' });

    hub.handleEvent({ type: 'session.execution.succeeded', data: { sessionID: 'ses_test' } });
    expect(ws.last('status')).toMatchObject({ state: 'idle' });
  });
});
