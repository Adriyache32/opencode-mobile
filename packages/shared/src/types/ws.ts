// WebSocket types
export type WSClientMessage =
  | { type: 'auth'; token: string }
  | { type: 'ping' }
  | { type: 'session:create'; title?: string }
  | { type: 'session:join'; sessionId: string }
  | { type: 'session:leave' }
  | { type: 'prompt'; text: string; files?: FileAttachment[] }
  | { type: 'cancel'; sessionId: string }
  | { type: 'permission:reply'; requestId: string; allow: boolean }
  | { type: 'sync:request' };

export type WSServerMessage =
  | { type: 'auth:ok'; user: User; devices: Device[] }
  | { type: 'auth:error'; reason: string }
  | { type: 'pong' }
  | { type: 'session:created'; session: Session }
  | { type: 'session:joined'; session: Session; messages: Message[] }
  | { type: 'session:left' }
  | { type: 'session:update'; session: Partial<Session> }
  | { type: 'message:new'; message: Message }
  | { type: 'message:update'; messageId: string; patch: Partial<Message> }
  | { type: 'message:delete'; messageId: string }
  | { type: 'task:started'; sessionId: string; taskId: string }
  | { type: 'task:progress'; sessionId: string; taskId: string; progress: number; status: string }
  | { type: 'task:completed'; sessionId: string; taskId: string; result: unknown }
  | { type: 'task:failed'; sessionId: string; taskId: string; error: string }
  | { type: 'task:cancelled'; sessionId: string; taskId: string }
  | { type: 'permission:request'; requestId: string; permission: string; details: unknown }
  | { type: 'device:status'; deviceId: string; status: 'online' | 'offline' }
  | { type: 'error'; code: string; message: string }
  | { type: 'sync:response'; sessions: Session[]; devices: Device[] };

export interface FileAttachment {
  uri: string;
  name: string;
  type: string;
}

// Re-export from api
import { User, Device, Session, Message } from './api';