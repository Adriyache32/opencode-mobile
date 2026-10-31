// Types barrel export - explicit to avoid name collisions across modules
export type {
  User,
  Device,
  Session,
  Message,
  MessageMetadata,
  ToolCall,
} from './api';

export type { WSClientMessage, WSServerMessage, FileAttachment } from './ws';

export type {
  PairingStartResponse,
  PairingVerifyRequest,
  PairingVerifyResponse,
  DeviceInfo,
} from './auth';

export type {
  OpenCodeAdapter,
  CreateSessionOptions,
  ForkOptions,
  Paginated,
  SessionInfo,
  TokenUsage,
  PromptInput,
  OpenCodeFileAttachment,
  MessageId,
  SessionResult,
  OpenCodeMessage,
  SessionEventHandler,
  OpenCodeToolCall,
  ToolResult,
  OpenCodeError,
  Unsubscribe,
  ServerInfo,
  Model,
  Agent,
} from './opencode';