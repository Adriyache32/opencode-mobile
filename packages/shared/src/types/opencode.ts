// OpenCode adapter types
export interface OpenCodeAdapter {
  createSession(options?: CreateSessionOptions): Promise<SessionInfo>;
  getSession(sessionId: string): Promise<SessionInfo | null>;
  listSessions(cursor?: string, limit?: number): Promise<Paginated<SessionInfo>>;
  deleteSession(sessionId: string): Promise<void>;
  forkSession(sessionId: string, options: ForkOptions): Promise<SessionInfo>;
  sendPrompt(sessionId: string, prompt: PromptInput): Promise<MessageId>;
  interruptSession(sessionId: string): Promise<void>;
  waitForSession(sessionId: string, timeoutMs?: number): Promise<SessionResult>;
  subscribeToSession(sessionId: string, handler: SessionEventHandler): Unsubscribe;
  getServerInfo(): Promise<ServerInfo>;
  getModels(): Promise<Model[]>;
  getAgents(): Promise<Agent[]>;
}

export interface CreateSessionOptions {
  title?: string;
  model?: string;
  agent?: string;
}

export interface ForkOptions {
  sessionId: string;
  boundary: { type: 'before' | 'through'; messageId: string };
}

export interface Paginated<T> {
  data: T[];
  cursor: { previous: string | null; next: string | null };
}

export interface SessionInfo {
  id: string;
  projectId: string;
  cost: number;
  tokens: TokenUsage;
  time: { created: number; updated: number; busy: number; idle: number; viewed: number; archived: number };
  title: string | null;
  metadata: Record<string, unknown> | null;
  location: { directory: string; project: { id: string; directory: string; canonical: string } };
}

export interface TokenUsage {
  input: number;
  output: number;
  reasoning: number;
  cache: { read: number; write: number };
}

export interface PromptInput {
  text: string;
  files?: OpenCodeFileAttachment[];
  agents?: string[];
  skills?: string[];
}

export interface OpenCodeFileAttachment {
  uri: string;
  source: 'local' | 'remote';
  name: string;
  description?: string;
}

export type MessageId = string;

export interface SessionResult {
  success: boolean;
  messages: OpenCodeMessage[];
  error?: string;
}

export interface OpenCodeMessage {
  id: string;
  sessionId: string;
  time: { created: number };
  type: 'user' | 'assistant' | 'system';
  content: unknown;
}

export interface SessionEventHandler {
  onMessage: (message: OpenCodeMessage) => void;
  onToolCall: (tool: OpenCodeToolCall) => void;
  onToolResult: (result: ToolResult) => void;
  onError: (error: OpenCodeError) => void;
  onComplete: (result: SessionResult) => void;
}

export interface OpenCodeToolCall {
  name: string;
  input: unknown;
  id: string;
}

export interface ToolResult {
  toolCallId: string;
  output?: unknown;
  error?: string;
}

export interface OpenCodeError {
  code: string;
  message: string;
}

export type Unsubscribe = () => void;

export interface ServerInfo {
  version: string;
  pid: number;
  hostname: string | null;
  urls: string[];
  paths: { tmp: string };
  capabilities: { persistentPty: boolean | null };
}

export interface Model {
  id: string;
  modelId: string;
  providerId: string;
  name: string;
  package: string;
  settings: Record<string, unknown>;
  capabilities: { tools: boolean; input: string[]; output: string[] };
  variants: string[];
  time: { released: number };
  cost: unknown[];
  status: 'alpha' | 'beta' | 'deprecated' | 'active';
  enabled: boolean;
  limit: { context: number; output: number };
}

export interface Agent {
  id: string;
  name: string;
  model: { id: string; providerId: string; name: string };
  request: { settings: Record<string, unknown>; headers: Record<string, string>; body: Record<string, unknown> };
  system: string;
  description: string;
  mode: 'subagent' | 'primary' | 'all';
  hidden: boolean;
  color: string;
  steps: number;
  permissions: Record<string, unknown>;
}