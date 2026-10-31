# OpenCode Mobile - Diseño Técnico Completo

> **Versión:** 1.0  
> **Fecha:** 2026-10-30  
> **Stack:** TypeScript full-stack (React PWA + Hono + Drizzle + WebSocket nativo)

---

## 1. Estructura del Monorepo

```
opencode-mobile/
├── .github/
│   └── workflows/
│       ├── ci.yml              # CI: lint, typecheck, test, build
│       └── release.yml         # Build + push Docker images
├── docker/
│   ├── Dockerfile.backend      # Backend (Node + dist)
│   ├── Dockerfile.frontend     # Frontend (nginx + static)
│   ├── Dockerfile.agent        # Agente PC (Node + dist)
│   └── docker-compose.yml      # Orquestación local
├── packages/
│   ├── shared/                 # Tipos, schemas, utilidades compartidas
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── api.ts      # Tipos API REST
│   │   │   │   ├── ws.ts       # Tipos WebSocket
│   │   │   │   ├── auth.ts     # Tipos autenticación
│   │   │   │   ├── opencode.ts # Tipos adaptador OpenCode
│   │   │   │   └── index.ts
│   │   │   ├── schemas/
│   │   │   │   ├── zod.ts      # Zod schemas para validación
│   │   │   │   └── index.ts
│   │   │   ├── crypto/
│   │   │   │   ├── pairing.ts  # Lógica código 6 dígitos
│   │   │   │   ├── tokens.ts   # JWT, refresh tokens
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── backend/
│   │   ├── src/
│   │   │   ├── index.ts        # Entry point
│   │   │   ├── config.ts       # Configuración (env)
│   │   │   ├── db/
│   │   │   │   ├── index.ts    # Drizzle client
│   │   │   │   ├── schema.ts   # Tablas Drizzle
│   │   │   │   └── migrations/
│   │   │   ├── auth/
│   │   │   │   ├── routes.ts   # POST /auth/register, /login, /pair/*
│   │   │   │   ├── service.ts  # Lógica auth
│   │   │   │   ├── middleware.ts # JWT verification
│   │   │   │   └── pairing.ts  # Flujo código 6 dígitos
│   │   │   ├── devices/
│   │   │   │   ├── routes.ts   # CRUD dispositivos
│   │   │   │   └── service.ts
│   │   │   ├── sessions/
│   │   │   │   ├── routes.ts   # Proxy a OpenCode API
│   │   │   │   └── service.ts
│   │   │   ├── ws/
│   │   │   │   ├── server.ts   # WebSocket server (ws library)
│   │   │   │   ├── handlers.ts # Handlers por tipo mensaje
│   │   │   │   ├── rooms.ts    # Gestión salas (device + sessions)
│   │   │   │   └── types.ts
│   │   │   ├── audit/
│   │   │   │   ├── logger.ts   # Structured logging
│   │   │   │   └── middleware.ts
│   │   │   └── openapi.ts      # OpenAPI spec generation
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── frontend/
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── App.tsx
│   │   │   ├── routes.tsx
│   │   │   ├── components/
│   │   │   │   ├── ui/         # Componentes base (Button, Input, Card, etc.)
│   │   │   │   ├── chat/       # ChatView, MessageBubble, InputBar
│   │   │   │   ├── devices/    # DeviceList, DeviceCard, PairingScreen
│   │   │   │   ├── sessions/   # SessionList, SessionCard
│   │   │   │   └── layout/     # Header, Sidebar, Footer
│   │   │   ├── hooks/
│   │   │   │   ├── useAuth.ts
│   │   │   │   ├── useWebSocket.ts
│   │   │   │   ├── useDevices.ts
│   │   │   │   └── useSessions.ts
│   │   │   ├── services/
│   │   │   │   ├── api.ts      # Fetch wrapper + types
│   │   │   │   ├── ws.ts       # WebSocket client
│   │   │   │   └── storage.ts  # IndexedDB (idb) para offline
│   │   │   ├── stores/
│   │   │   │   ├── auth.ts     # Zustand: user, tokens
│   │   │   │   ├── devices.ts  # Zustand: devices, pairing
│   │   │   │   ├── sessions.ts # Zustand: sessions, messages
│   │   │   │   └── ui.ts       # Zustand: theme, toasts, modals
│   │   │   ├── pages/
│   │   │   │   ├── Login.tsx
│   │   │   │   ├── Register.tsx
│   │   │   │   ├── Pairing.tsx
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── Chat.tsx
│   │   │   │   └── Settings.tsx
│   │   │   ├── styles/
│   │   │   │   ├── globals.css
│   │   │   │   └── variables.css
│   │   │   └── pwa.ts          # Service worker registration
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   └── tailwind.config.js
│   └── agent/
│       ├── src/
│       │   ├── index.ts        # Entry point (CLI)
│       │   ├── config.ts       # Config (env, args)
│       │   ├── opencode/
│       │   │   ├── adapter.ts  # Adaptador desacoplado OpenCode
│       │   │   ├── client.ts   # HTTP client a OpenCode API
│       │   │   ├── types.ts    # Tipos respuesta OpenCode
│       │   │   └── events.ts   # Event stream parsing
│       │   ├── ws/
│       │   │   ├── client.ts   # WebSocket client al backend
│       │   │   ├── handlers.ts # Handlers mensajes backend→agente
│       │   │   └── reconnect.ts # Reconexión exponencial
│       │   ├── pairing/
│       │   │   ├── flow.ts     # Flujo emparejamiento (muestra código)
│       │   │   └── storage.ts  # Guarda device token
│       │   ├── permissions/
│       │   │   ├── manager.ts  # Permisos por dispositivo
│       │   │   ├── prompts.ts  # Prompts confirmación peligrosas
│       │   │   └── policies.ts # Políticas default
│       │   ├── audit/
│       │   │   └── logger.ts   # Log local estructurado
│       │   └── installer/
│       │       ├── linux.sh    # Instalador systemd
│       │       ├── macos.sh    # Instalador launchd
│       │       └── windows.ps1 # Instalador servicio
│       ├── package.json
│       └── tsconfig.json
├── turbo.json                  # Turborepo config
├── package.json                # Root workspace
├── tsconfig.base.json
├── .eslintrc.json
├── .prettierrc
├── README.md
├── LICENSE
├── SECURITY.md
├── .env.example
└── docker-compose.yml
```

---

## 2. Flujo de Emparejamiento (Código 6 Dígitos)

### 2.1 Diagrama de Secuencia

```
┌─────────────┐                    ┌─────────────┐                    ┌─────────────┐
│   Móvil     │                    │   Backend   │                    │    PC       │
│  (Frontend) │                    │  (API/WS)   │                    │  (Agente)   │
└──────┬──────┘                    └──────┬──────┘                    └──────┬──────┘
       │                                  │                                  │
       │ POST /auth/pair/start            │                                  │
       │─────────────────────────────────>│                                  │
       │                                  │                                  │
       │           { pairingCode: "123456", expiresAt }                    │
       │<─────────────────────────────────│                                  │
       │                                  │                                  │
       │                                  │ WS: pair:challenge               │
       │                                  │ (code, expiresAt, challengeID)   │
       │                                  │─────────────────────────────────>│
       │                                  │                                  │
       │                                  │           [Usuario ve código]    │
       │                                  │                                  │
       │ POST /auth/pair/verify           │                                  │
       │ { code: "123456", deviceInfo }   │                                  │
       │─────────────────────────────────>│                                  │
       │                                  │                                  │
       │                                  │ WS: pair:verify                  │
       │                                  │ (challengeID, code, deviceInfo)  │
       │                                  │─────────────────────────────────>│
       │                                  │                                  │
       │                                  │           [Agente valida código] │
       │                                  │                                  │
       │                                  │ WS: pair:verified                │
       │                                  │ (deviceToken, deviceID)          │
       │                                  │<─────────────────────────────────│
       │                                  │                                  │
       │ { deviceToken, deviceID,         │                                  │
       │   refreshToken, user }           │                                  │
       │<─────────────────────────────────│                                  │
       │                                  │                                  │
       │ WS connect (deviceToken)         │                                  │
       │─────────────────────────────────>│                                  │
       │                                  │                                  │
```

### 2.2 Detalles de Implementación

**Generación del código:**
- 6 dígitos numéricos (000000-999999) → 1M combinaciones
- TTL: **120 segundos** (2 minutos)
- Máximo **3 intentos** por código
- Un solo uso: se invalida tras verificación (éxito o fallo)

**Almacenamiento en backend (SQLite/PostgreSQL):**
```sql
pairing_challenges:
  - id (PK)
  - code_hash (bcrypt)          -- Nunca guardar en plano
  - code_salt
  - user_id (FK)                -- Quién inició el emparejamiento
  - device_info (JSON)          -- Info del móvil (UA, platform)
  - expires_at (timestamp)
  - attempts (int, default 0)
  - consumed_at (timestamp, nullable)
  - device_token_hash (nullable) -- Hash del token generado
```

**Verificación:**
1. Móvil envía código + deviceInfo
2. Backend busca challenge por `code_hash` (bcrypt compare)
3. Valida: no expirado, attempts < 3, no consumido
4. Incrementa `attempts`
5. Si OK: genera `device_token` (JWT largo, 30 días) + `refresh_token`
6. Marca `consumed_at`, guarda `device_token_hash`
7. Notifica al agente vía WS (`pair:verified`)
8. Agente guarda token en `~/.config/opencode-mobile/device.token`

**Seguridad:**
- Rate limit: 5 req/min por IP en `/auth/pair/*`
- Código nunca viaja por WS en plano (solo challengeID)
- Device token = JWT firmado (RS256) con claims: `sub=deviceID`, `user_id`, `permissions[]`, `exp`
- Refresh token: opaque string guardado en BD (hash), rota en cada uso

---

## 3. Modelo de Datos

### 3.1 Esquema Drizzle (SQLite/PostgreSQL compatible)

```typescript
// packages/backend/src/db/schema.ts
import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { pgTable, uuid, varchar, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';

// ===== USERS =====
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 100 }),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  totpSecret: varchar('totp_secret', { length: 32 }), // 2FA opcional
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
}, (t) => ({
  emailIdx: index('users_email_idx').on(t.email),
}));

// ===== DEVICES (teléfonos vinculados) =====
export const devices = pgTable('devices', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(), // "iPhone de Adri"
  platform: varchar('platform', { length: 50 }),    // "iOS", "Android", "Web"
  userAgent: text('user_agent'),
  deviceTokenHash: varchar('device_token_hash', { length: 255 }).notNull().unique(),
  refreshTokenHash: varchar('refresh_token_hash', { length: 255 }).unique(),
  permissions: jsonb('permissions').$type<string[]>().default([]).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  pairedAt: timestamp('paired_at', { withTimezone: true }).defaultNow(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
}, (t) => ({
  userIdx: index('devices_user_idx').on(t.userId),
  tokenHashIdx: index('devices_token_hash_idx').on(t.deviceTokenHash),
}));

// ===== PAIRING CHALLENGES =====
export const pairingChallenges = pgTable('pairing_challenges', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  codeHash: varchar('code_hash', { length: 255 }).notNull(),
  codeSalt: varchar('code_salt', { length: 32 }).notNull(),
  deviceInfo: jsonb('device_info').$type<DeviceInfo>(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  attempts: integer('attempts').default(0).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
  deviceTokenHash: varchar('device_token_hash', { length: 255 }),
}, (t) => ({
  userIdx: index('pairing_user_idx').on(t.userId),
  expiresIdx: index('pairing_expires_idx').on(t.expiresAt),
}));

// ===== SESSIONS (proxy a OpenCode sessions) =====
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  deviceId: uuid('device_id').references(() => devices.id, { onDelete: 'set null' }),
  opencodeSessionId: varchar('opencode_session_id', { length: 100 }).notNull(),
  title: varchar('title', { length: 200 }),
  status: varchar('status', { length: 20 }).default('active').notNull(), // active, archived, error
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
}, (t) => ({
  userIdx: index('sessions_user_idx').on(t.userId),
  deviceIdx: index('sessions_device_idx').on(t.deviceId),
  opencodeIdx: index('sessions_opencode_idx').on(t.opencodeSessionId),
}));

// ===== MESSAGES (historial chat) =====
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => sessions.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 20 }).notNull(), // user, assistant, system, tool
  content: text('content').notNull(),
  metadata: jsonb('metadata').$type<MessageMetadata>(),
  opencodeMessageId: varchar('opencode_message_id', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
  sessionIdx: index('messages_session_idx').on(t.sessionId),
  createdIdx: index('messages_created_idx').on(t.createdAt),
}));

// ===== AUDIT LOG =====
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  deviceId: uuid('device_id').references(() => devices.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 50 }).notNull(), // pair, unpair, command, cancel, permission_grant, etc.
  resource: varchar('resource', { length: 50 }),      // session, device, permission
  resourceId: varchar('resource_id', { length: 100 }),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  success: boolean('success').notNull(),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
  userIdx: index('audit_user_idx').on(t.userId),
  deviceIdx: index('audit_device_idx').on(t.deviceId),
  actionIdx: index('audit_action_idx').on(t.action),
  createdIdx: index('audit_created_idx').on(t.createdAt),
}));

// ===== PERMISSIONS (políticas por device) =====
export const devicePermissions = pgTable('device_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  deviceId: uuid('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
  permission: varchar('permission', { length: 50 }).notNull(), // shell, fs_read, fs_write, opencode_prompt, etc.
  allowed: boolean('allowed').default(true).notNull(),
  requiresConfirmation: boolean('requires_confirmation').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
  deviceIdx: index('dev_perm_device_idx').on(t.deviceId),
  uniquePerm: index('dev_perm_unique_idx').on(t.deviceId, t.permission).unique(),
}));
```

### 3.2 Tipos TypeScript Compartidos (`packages/shared/src/types/`)

```typescript
// api.ts
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

// auth.ts
export interface PairingStartResponse {
  pairingCode: string;      // "123456"
  expiresAt: string;        // ISO timestamp
  challengeId: string;      // UUID
}

export interface PairingVerifyRequest {
  code: string;
  deviceInfo: DeviceInfo;
}

export interface PairingVerifyResponse {
  deviceToken: string;      // JWT
  refreshToken: string;     // opaque
  deviceId: string;
  user: User;
}

export interface DeviceInfo {
  platform: string;
  userAgent: string;
  appVersion: string;
}

// ws.ts
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
```

---

## 4. Protocolo WebSocket

### 4.1 Conexión y Autenticación

```
WS_URL = wss://api.midominio.com/ws?token=<deviceToken>
       ws://localhost:3001/ws?token=<deviceToken>  (local)
```

**Handshake:**
1. Cliente conecta con `?token=<deviceToken>`
2. Backend valida JWT (firma, exp, claims)
3. Si OK: responde `{ type: 'auth:ok', user, devices }` y une a salas:
   - Sala personal: `user:{userId}`
   - Sala por device: `device:{deviceId}`
   - Sala por sesión activa: `session:{sessionId}`
4. Si fallo: `{ type: 'auth:error', reason }` + close(4001)

**Heartbeat:**
- Cliente envía `{ type: 'ping' }` cada 30s
- Servidor responde `{ type: 'pong' }`
- 3 pings fallados → close(4002)

### 4.2 Tipos de Mensajes (Resumen)

| Dirección | Tipo | Propósito |
|---|---|---|
| C→S | `auth` | Autenticar conexión WS |
| C→S | `session:create` | Crear nueva sesión OpenCode |
| C→S | `session:join` | Unirse a sesión existente |
| C→S | `prompt` | Enviar prompt a OpenCode |
| C→S | `cancel` | Cancelar tarea en curso |
| C→S | `permission:reply` | Responder solicitud confirmación |
| C→S | `sync:request` | Solicitar estado completo |
| S→C | `auth:ok/error` | Resultado auth |
| S→C | `session:created/joined/update/left` | Ciclo de vida sesión |
| S→C | `message:new/update/delete` | Mensajes chat |
| S→C | `task:started/progress/completed/failed/cancelled` | Estado tarea |
| S→C | `permission:request` | Solicitar confirmación acción peligrosa |
| S→C | `device:status` | Device online/offline |
| S→C | `sync:response` | Estado inicial completo |

### 4.3 Backpressure y Límites

- Max mensaje entrante: **1 MB**
- Max mensajes/segundo por cliente: **30**
- Cola de salida por cliente: **100 mensajes** (drop oldest si lleno)
- Timeout respuesta `permission:request`: **60s** (auto-deny)

---

## 5. Comunicación con OpenCode (Adaptador Desacoplado)

### 5.1 Arquitectura del Adaptador

```
┌─────────────────────────────────────────────────────────────────┐
│                        AGENTE PC                                │
│  ┌─────────────┐    ┌──────────────────┐    ┌──────────────┐   │
│  │ WS Client   │◄───│  Message Router  │───►│ OpenCode     │   │
│  │ (Backend)   │    │  (Incoming/Out)  │    │ Adapter      │   │
│  └─────────────┘    └──────────────────┘    └──────┬───────┘   │
│                                                    │           │
│                                    ┌───────────────┴────────┐  │
│                                    │  OpenCode HTTP Client  │  │
│                                    │  (REST + Event Stream) │  │
│                                    └───────────┬────────────┘  │
│                                                │               │
│                                                ▼               │
│                                    ┌───────────────────────┐   │
│                                    │   OpenCode Server     │   │
│                                    │   (opencode serve)    │   │
│                                    └───────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Interfaz del Adaptador (`packages/shared/src/types/opencode.ts`)

```typescript
export interface OpenCodeAdapter {
  // Sesiones
  createSession(options?: CreateSessionOptions): Promise<SessionInfo>;
  getSession(sessionId: string): Promise<SessionInfo | null>;
  listSessions(cursor?: string, limit?: number): Promise<Paginated<SessionInfo>>;
  deleteSession(sessionId: string): Promise<void>;
  forkSession(sessionId: string, options: ForkOptions): Promise<SessionInfo>;

  // Prompts / Mensajes
  sendPrompt(sessionId: string, prompt: PromptInput): Promise<MessageId>;
  interruptSession(sessionId: string): Promise<void>;
  waitForSession(sessionId: string, timeoutMs?: number): Promise<SessionResult>;

  // Event Stream (Server-Sent Events)
  subscribeToSession(sessionId: string, handler: SessionEventHandler): Unsubscribe;

  // Sistema
  getServerInfo(): Promise<ServerInfo>;
  getModels(): Promise<Model[]>;
  getAgents(): Promise<Agent[]>;
}

export interface PromptInput {
  text: string;
  files?: FileAttachment[];
  agents?: string[];
  skills?: string[];
}

export interface SessionEventHandler {
  onMessage: (message: OpenCodeMessage) => void;
  onToolCall: (tool: ToolCall) => void;
  onToolResult: (result: ToolResult) => void;
  onError: (error: OpenCodeError) => void;
  onComplete: (result: SessionResult) => void;
}
```

### 5.3 Implementación (`packages/agent/src/opencode/adapter.ts`)

```typescript
// Puntos clave:
// 1. HTTP Client con fetch + AbortController para timeouts/cancelación
// 2. Event Stream parsing (SSE) para streaming de mensajes
// 3. Mapeo tipos OpenCode → Tipos compartidos
// 4. Reintentos con backoff exponencial
// 5. Cache de modelos/agents (TTL 5 min)
// 6. Health check periódico al servidor OpenCode
```

### 5.4 Endpoints OpenCode Usados (v2 API)

| Operación | Endpoint | Método |
|---|---|---|
| Crear sesión | `/api/session` | POST |
| Obtener sesión | `/api/session/{id}` | GET |
| Listar sesiones | `/api/session` | GET |
| Fork sesión | `/api/session/{id}/fork` | POST |
| Enviar prompt | `/api/session/{id}/prompt` | POST |
| Interrumpir | `/api/session/{id}/interrupt` | POST |
| Esperar fin | `/api/experimental/session/{id}/wait` | GET |
| Event stream | `/api/event?session={id}` | GET (SSE) |
| Modelos | `/api/model` | GET |
| Agentes | `/api/agent` | GET |
| Server info | `/api/server` | GET |

**Autenticación:** Basic Auth `opencode:<password>` (el password del `opencode serve`)

---

## 6. Sistema de Permisos y Confirmaciones

### 6.1 Modelo de Permisos

```typescript
// Permisos base (enum en shared)
export enum Permission {
  // OpenCode
  OPENCODE_PROMPT = 'opencode:prompt',        // Enviar prompts
  OPENCODE_INTERRUPT = 'opencode:interrupt',  // Interrumpir sesión
  OPENCODE_SESSION_READ = 'opencode:session:read',
  OPENCODE_SESSION_WRITE = 'opencode:session:write',
  
  // Shell / Sistema
  SHELL_EXEC = 'shell:exec',                  // Ejecutar comandos
  SHELL_READ = 'shell:read',                  // Leer salida
  
  // Filesystem
  FS_READ = 'fs:read',
  FS_WRITE = 'fs:write',
  FS_DELETE = 'fs:delete',
  
  // Admin
  DEVICE_MANAGE = 'device:manage',            // Revocar dispositivos
  PERMISSION_MANAGE = 'permission:manage',    // Cambiar permisos
}
```

### 6.2 Políticas por Defecto (configurables)

| Permiso | Default | Requiere Confirmación |
|---|---|---|
| `opencode:prompt` | ✅ allow | ❌ |
| `opencode:interrupt` | ✅ allow | ❌ |
| `opencode:session:read` | ✅ allow | ❌ |
| `opencode:session:write` | ✅ allow | ❌ |
| `shell:exec` | ❌ deny | ✅ siempre |
| `fs:read` | ❌ deny | ✅ |
| `fs:write` | ❌ deny | ✅ |
| `fs:delete` | ❌ deny | ✅ |
| `device:manage` | ❌ deny | ✅ |
| `permission:manage` | ❌ deny | ✅ |

### 6.3 Flujo de Confirmación

1. **Agente** recibe acción que requiere permiso (ej. `shell:exec`)
2. Verifica `devicePermissions[deviceId][permission]`
3. Si `allowed=false` → rechaza, notifica al móvil
4. Si `allowed=true` y `requiresConfirmation=false` → ejecuta
5. Si `requiresConfirmation=true`:
   - Genera `requestId` (UUID)
   - Envía WS `{ type: 'permission:request', requestId, permission, details }`
   - Espera respuesta `{ type: 'permission:reply', requestId, allow }` (timeout 60s)
   - Si `allow=true` → ejecuta, logea en auditoría
   - Si `allow=false` o timeout → rechaza, notifica

### 6.4 Acciones Peligrosas (requieren confirmación SIEMPRE)

- `shell:exec` con comandos: `rm -rf`, `dd`, `mkfs`, `shutdown`, `reboot`, `curl | sh`, `wget | bash`
- `fs:write`/`fs:delete` fuera de directorios permitidos (configurable)
- `opencode:prompt` que inyecta código en archivos sensibles (`.env`, `id_rsa`, etc.)
- Cambio de permisos (`permission:manage`)
- Revocación de dispositivos (`device:manage`)

---

## 7. Despliegue

### 7.1 Local (Docker Compose)

```yaml
# docker-compose.yml
version: '3.8'
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: opencode_mobile
      POSTGRES_USER: opencode
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    secrets:
      - db_password
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U opencode"]
      interval: 5s
      timeout: 3s
      retries: 10

  backend:
    build:
      context: ..
      dockerfile: docker/Dockerfile.backend
    environment:
      DATABASE_URL: postgresql://opencode:$$DB_PASSWORD@db:5432/opencode_mobile
      JWT_SECRET_FILE: /run/secrets/jwt_secret
      OPENCODE_URL: http://host.docker.internal:8080
      OPENCODE_PASSWORD_FILE: /run/secrets/opencode_password
      CORS_ORIGIN: http://localhost:5173
      NODE_ENV: development
    ports:
      - "3000:3000"
      - "3001:3001"  # WS
    depends_on:
      db:
        condition: service_healthy
    secrets:
      - db_password
      - jwt_secret
      - opencode_password
    volumes:
      - ../packages/backend:/app/packages/backend  # hot reload

  frontend:
    build:
      context: ..
      dockerfile: docker/Dockerfile.frontend
    ports:
      - "5173:80"
    depends_on:
      - backend

  agent:
    build:
      context: ..
      dockerfile: docker/Dockerfile.agent
    environment:
      BACKEND_URL: http://backend:3000
      BACKEND_WS_URL: ws://backend:3001
      DEVICE_TOKEN_FILE: /data/device.token
    volumes:
      - agent_data:/data
      - /var/run/docker.sock:/var/run/docker.sock  # opcional: para gestionar contenedores
    network_mode: host  # Necesario para acceder a opencode serve en host

secrets:
  db_password:
    file: ./secrets/db_password.txt
  jwt_secret:
    file: ./secrets/jwt_secret.txt
  opencode_password:
    file: ./secrets/opencode_password.txt

volumes:
  postgres_data:
  agent_data:
```

**Desarrollo local (sin Docker para frontend/backend):**
```bash
# Terminal 1: Backend
cd packages/backend && pnpm dev

# Terminal 2: Frontend
cd packages/frontend && pnpm dev

# Terminal 3: Agente (compilado)
cd packages/agent && pnpm build && node dist/index.js --pair
```

### 7.2 VPS (Producción)

**Arquitectura:**
```
┌─────────────────────────────────────────────────────────────┐
│                        VPS                                   │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌─────────┐   │
│  │  Nginx   │──►│ Frontend │   │ Backend  │   │Postgres │   │
│  │  (TLS)   │   │ (static) │   │  (API)   │   │  (DB)   │   │
│  └──────────┘   └──────────┘   └────┬─────┘   └─────────┘   │
│        │                             │                        │
│        │                    ┌────────┴────────┐              │
│        │                    │   WebSocket     │              │
│        │                    │   (same port)   │              │
│        │                    └─────────────────┘              │
└────────┼──────────────────────────────────────────────────────┘
         │
    ┌────┴────┐
    │  DNS    │  api.midominio.com, app.midominio.com
    └─────────┘
```

**Nginx config (fragmento):**
```nginx
# Frontend (PWA)
server {
    listen 443 ssl http2;
    server_name app.midominio.com;
    root /var/www/frontend;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    
    location /sw.js {
        add_header Cache-Control "no-cache";
        add_header Service-Worker-Allowed "/";
    }
}

# Backend API + WS
server {
    listen 443 ssl http2;
    server_name api.midominio.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
```

**Systemd services:**
- `opencode-mobile-backend.service`
- `opencode-mobile-agent.service` (en PC del usuario, no en VPS)

### 7.3 PC del Usuario (Agente)

**Instalación one-liner:**
```bash
curl -fsSL https://raw.githubusercontent.com/tu-usuario/opencode-mobile/main/scripts/install-agent.sh | bash
```

**Qué hace el instalador:**
1. Detecta OS (Linux/macOS/Windows)
2. Descarga binario/paquete Node + dist empaquetado (pkg o nexe)
3. Crea usuario `opencode-mobile` (Linux) o usa usuario actual
4. Instala servicio systemd/launchd/Windows Service
5. Configura auto-inicio
6. Inicia servicio → muestra código 6 dígitos en consola/logs

**Ejecutables empaquetados (sin Node en PATH):**
- Usar `@vercel/pkg` o `nexe` para compilar `packages/agent` a binario nativo
- Incluye Node runtime (~12 MB)
- Un solo archivo: `opencode-mobile-agent` (Linux/macOS), `opencode-mobile-agent.exe` (Windows)

---

## 8. Seguridad y Auditoría

### 8.1 Capas de Defensa

| Capa | Medida |
|---|---|
| **Transporte** | TLS 1.3 obligatorio (VPS), mTLS opcional; WSS para WS |
| **Autenticación** | JWT RS256 (rotación claves anual), refresh tokens rotativos, códigos 6 dígitos efímeros |
| **Autorización** | RBAC por dispositivo + permisos granulares + confirmaciones |
| **Validación** | Zod en todos los inputs (REST + WS), size limits, rate limiting |
| **Inyección** | Adaptador OpenCode valida/sanitiza prompts; no eval ni exec directo |
| **Auditoría** | Log estructurado (JSON) de todas las acciones críticas |
| **Secretos** | Solo en archivos `/run/secrets/` (Docker) o variables de entorno; nunca en código |
| **Dependencias** | `pnpm audit` en CI, `npm-check-updates` semanal, lockfile commitido |

### 8.2 Registro de Auditoría (Eventos Obligatorios)

```typescript
// Eventos que SIEMPRE se auditan (auditLogs table)
enum AuditAction {
  // Auth
  USER_REGISTER = 'user:register',
  USER_LOGIN = 'user:login',
  USER_LOGOUT = 'user:logout',
  PAIR_START = 'pair:start',
  PAIR_VERIFY_SUCCESS = 'pair:verify:success',
  PAIR_VERIFY_FAIL = 'pair:verify:fail',
  PAIR_EXPIRED = 'pair:expired',
  
  // Devices
  DEVICE_REVOKE = 'device:revoke',
  DEVICE_RENAME = 'device:rename',
  DEVICE_PERMISSION_CHANGE = 'device:permission:change',
  
  // Sessions
  SESSION_CREATE = 'session:create',
  SESSION_DELETE = 'session:delete',
  SESSION_FORK = 'session:fork',
  
  // Commands
  PROMPT_SENT = 'prompt:sent',
  PROMPT_CANCEL = 'prompt:cancel',
  SHELL_EXEC_REQUEST = 'shell:exec:request',
  SHELL_EXEC_ALLOW = 'shell:exec:allow',
  SHELL_EXEC_DENY = 'shell:exec:deny',
  FS_READ = 'fs:read',
  FS_WRITE = 'fs:write',
  FS_DELETE = 'fs:delete',
  
  // Security
  PERMISSION_GRANT = 'permission:grant',
  PERMISSION_DENY = 'permission:deny',
  RATE_LIMIT_HIT = 'rate_limit:hit',
  INVALID_TOKEN = 'auth:invalid_token',
  SUSPICIOUS_ACTIVITY = 'security:suspicious',
}
```

### 8.3 Protección Anti-Inyección (Adaptador OpenCode)

```typescript
// En adapter.ts - sanitización antes de enviar a OpenCode
function sanitizePrompt(input: string): string {
  // 1. Límite longitud
  if (input.length > 50000) throw new Error('Prompt too long');
  
  // 2. Detectar patrones de inyección
  const injectionPatterns = [
    /ignore\s+previous\s+instructions/i,
    /system\s*:\s*you\s+are/i,
    /<\|im_start\|>.*<\|im_end\|>/,
    /```\w*\n.*?\n```/gs,  // Code blocks que podrían ser instrucciones
  ];
  
  for (const pattern of injectionPatterns) {
    if (pattern.test(input)) {
      auditLog({ action: 'security:suspicious', metadata: { pattern, input: input.slice(0,200) } });
      // No bloquear, solo auditar y avisar al usuario
    }
  }
  
  return input;
}
```

### 8.4 Rate Limiting

| Endpoint | Límite |
|---|---|
| `POST /auth/*` | 10 req/min/IP |
| `POST /auth/pair/*` | 5 req/min/IP |
| WS messages | 30 msg/s/device |
| `prompt` | 10/min/device |
| `shell:exec` | 5/min/device (si permitido) |

---

## 9. Plan de Implementación por Fases

### Fase 0: Fundamentos (Semana 1)
- [ ] Monorepo + Turborepo + shared types
- [ ] Docker Compose local (PostgreSQL + Backend + Frontend)
- [ ] CI/CD GitHub Actions (lint, typecheck, test, build)
- [ ] README, LICENSE, SECURITY.md, .env.example

### Fase 1: Backend Core + Auth (Semana 2)
- [ ] Drizzle schema + migraciones
- [ ] Auth: register, login, JWT (access + refresh)
- [ ] Pairing: código 6 dígitos (start, verify, WS notify)
- [ ] Device CRUD + tokens
- [ ] Tests: auth, pairing, tokens

### Fase 2: WebSocket + Proxy OpenCode (Semana 3)
- [ ] WS server (ws library) + rooms + auth middleware
- [ ] Message router (tipos definidos en shared)
- [ ] Proxy REST a OpenCode API (sesiones, prompts, modelos)
- [ ] Event stream consumer (SSE → WS broadcast)
- [ ] Tests: WS auth, session flow, prompt roundtrip

### Fase 3: Agente PC (Semana 4)
- [ ] Adaptador OpenCode desacoplado (HTTP + SSE)
- [ ] WS client con reconexión exponencial
- [ ] Pairing flow: muestra código, valida, guarda token
- [ ] Permissions manager + confirmación prompts
- [ ] Instaladores (systemd, launchd, Windows)
- [ ] Tests: adapter, pairing, permissions, reconnection

### Fase 4: Frontend PWA (Semana 5)
- [ ] React + Vite + Tailwind + PWA (Workbox)
- [ ] Auth pages (login, register, pairing)
- [ ] Dashboard: dispositivos, sesiones
- [ ] Chat view: mensajes, streaming, cancel
- [ ] Offline support (IndexedDB + background sync)
- [ ] Tests: componentes críticos, E2E (Playwright)

### Fase 5: Seguridad + Pulido (Semana 6)
- [ ] Auditoría completa (todos los eventos)
- [ ] Rate limiting + validación exhaustiva
- [ ] Confirmaciones peligrosas + políticas default
- [ ] Hardening: headers, CSP, CORS, secrets
- [ ] Penetration testing básico (OWASP ZAP)
- [ ] Documentación despliegue VPS + local

### Fase 6: MVP Release (Semana 7)
- [ ] Beta testing interno
- [ ] Bug fixes + performance
- [ ] Release v1.0.0 + Docker Hub images
- [ ] Documentación usuario final
- [ ] Post-mortem + roadmap v1.1

---

## Apéndice: Decisiones Técnicas Clave

| Decisión | Justificación |
|---|---|
| **Hono vs Fastify** | Hono: más ligero, edge-ready, API similar a Express, excelente tipos TS |
| **Drizzle vs Prisma** | Drizzle: zero-runtime, SQL-like, mejor performance, types inferidos |
| **ws vs Socket.io** | ws: nativo, sin dependencias extra, control total, más ligero |
| **Zustand vs Redux** | Zustand: simple, TypeScript-first, sin boilerplate, devtools |
| **JWT RS256 vs HS256** | RS256: clave pública/privada, rotación sin invalidar tokens, estándar |
| **bcrypt vs Argon2** | bcrypt: maduro, disponible en edge, suficiente para códigos cortos |
| **PWA vs Tauri** | PWA: una codebase, instalable en iOS/Android, sin store, actualización instantánea |
| **SQLite dev / PG prod** | Paridad de dialecto con Drizzle; SQLite para tests rápidos |
| **Turborepo vs Nx** | Turborepo: más simple, configuración mínima, caching inteligente |
| **pkg/nexe para agente** | Binario único sin dependencias, instalación trivial, distribución fácil |