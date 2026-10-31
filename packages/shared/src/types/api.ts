// Shared types
export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

export interface Device {
  id: string;
  name: string;
  platform: string | null;
  userAgent: string | null;
  permissions: string[];
  isActive: boolean;
  lastSeenAt: string | null;
  pairedAt: string;
  revokedAt: string | null;
}

export interface Session {
  id: string;
  opencodeSessionId: string;
  title: string | null;
  status: 'active' | 'archived' | 'error';
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  endedAt: string | null;
}

export interface Message {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  metadata: MessageMetadata | null;
  opencodeMessageId: string | null;
  createdAt: string;
}

export interface MessageMetadata {
  agent?: string;
  model?: string;
  tokens?: { input: number; output: number };
  tools?: ToolCall[];
  error?: string;
}

export interface ToolCall {
  name: string;
  input: unknown;
  output?: unknown;
  error?: string;
  durationMs?: number;
}