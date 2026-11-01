import { useEffect, useMemo, useRef, useState } from 'react';
import { ChatSocket, type AgentEvent, type ChatMessage, type ConnectionState } from '../services/chat';
import type { Connection } from '../services/connection';

interface ChatProps {
  connection: Connection;
  onDisconnect: () => void;
}

interface UiMessage extends ChatMessage {
  streaming?: boolean;
}

export function Chat({ connection, onDisconnect }: ChatProps) {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState('');
  const [state, setState] = useState<ConnectionState>('connecting');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opencode, setOpencode] = useState<'ready' | 'offline'>('offline');
  const [detail, setDetail] = useState<string | null>(null);

  const socketRef = useRef<ChatSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const socket = new ChatSocket(
      connection.url,
      connection.token,
      (event: AgentEvent) => handleEvent(event),
      (s) => setState(s)
    );
    socketRef.current = socket;
    socket.connect();
    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [connection.url, connection.token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleEvent(event: AgentEvent) {
    switch (event.type) {
      case 'hello':
        setOpencode(event.opencode);
        if (event.error) setError(event.error);
        break;
      case 'status':
        setBusy(event.state === 'busy');
        setDetail(event.detail ?? null);
        if (event.state === 'offline') setOpencode('offline');
        break;
      case 'history':
        setMessages(event.messages);
        break;
      case 'user':
        setMessages((prev) => [...prev, { id: event.id, role: 'user', text: event.text }]);
        break;
      case 'assistant_start':
        setMessages((prev) => [...prev, { id: event.id, role: 'assistant', text: '', streaming: true }]);
        break;
      case 'delta':
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.id === event.id);
          if (idx === -1) return [...prev, { id: event.id, role: 'assistant', text: event.text, streaming: true }];
          const copy = [...prev];
          copy[idx] = { ...copy[idx]!, text: copy[idx]!.text + event.text };
          return copy;
        });
        break;
      case 'done':
        setMessages((prev) => prev.map((m) => (m.id === event.id ? { ...m, streaming: false } : m)));
        break;
      case 'error':
        setError(event.message);
        break;
      default:
        break;
    }
  }

  function send() {
    const text = input.trim();
    if (!text || !socketRef.current) return;
    if (socketRef.current.send({ type: 'prompt', text })) {
      setInput('');
      setError(null);
    } else {
      setError('Sin conexión con el PC. Reintentando…');
    }
  }

  function cancel() {
    socketRef.current?.send({ type: 'cancel' });
  }

  const stateLabel = useMemo(() => {
    if (state === 'online' && opencode === 'ready') return 'Conectado';
    if (state === 'online') return 'PC conectado · OpenCode no disponible';
    if (state === 'connecting') return 'Conectando…';
    return 'Sin conexión';
  }, [state, opencode]);

  const dotColor =
    state === 'online' && opencode === 'ready'
      ? 'bg-green-400'
      : state === 'online'
        ? 'bg-amber-400'
        : state === 'connecting'
          ? 'bg-amber-400 animate-pulse'
          : 'bg-red-400';

  return (
    <div className="min-h-screen bg-dark-bg text-dark-text flex flex-col">
      <header className="border-b border-dark-border px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-base font-semibold truncate">{connection.name}</h1>
          <p className="text-xs text-dark-muted flex items-center gap-1.5">
            <span className={`inline-block w-2 h-2 rounded-full ${dotColor}`} aria-hidden />
            {stateLabel}
          </p>
        </div>
        <button onClick={onDisconnect} className="text-sm text-dark-muted hover:text-red-400 shrink-0">
          Desconectar
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto">
            <div className="text-5xl mb-4" aria-hidden>
              💬
            </div>
            <p className="text-dark-muted text-sm">
              Escribe una instrucción y OpenCode la ejecutará en tu PC. Verás la respuesta en tiempo real.
            </p>
          </div>
        )}

        <div className="max-w-2xl mx-auto flex flex-col gap-3">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`rounded-2xl px-4 py-2.5 max-w-[85%] whitespace-pre-wrap break-words text-sm ${
                  m.role === 'user'
                    ? 'bg-primary-600 text-white rounded-br-sm'
                    : 'bg-dark-surface border border-dark-border rounded-bl-sm'
                }`}
              >
                {m.text || (m.streaming ? '…' : '')}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <div className="rounded-2xl px-4 py-2.5 bg-dark-surface border border-dark-border text-sm text-dark-muted flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse" />
                Trabajando…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      {(error || detail) && (
        <div className="px-4">
          <p
            className={`max-w-2xl mx-auto text-xs ${error ? 'text-red-400' : 'text-dark-muted'}`}
            role="alert"
          >
            {error ?? detail}
          </p>
        </div>
      )}

      <footer className="border-t border-dark-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-end gap-2">
          {busy && (
            <button
              onClick={cancel}
              className="btn-secondary shrink-0 px-3 py-2 text-sm"
              aria-label="Cancelar tarea"
            >
              Cancelar
            </button>
          )}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder={busy ? 'Tarea en curso…' : 'Escribe una instrucción…'}
            className="input flex-1 resize-none max-h-32"
            disabled={state !== 'online'}
          />
          <button
            onClick={send}
            disabled={!input.trim() || state !== 'online'}
            className="btn-primary shrink-0 px-4 py-2"
            aria-label="Enviar"
          >
            ➤
          </button>
        </div>
      </footer>
    </div>
  );
}
