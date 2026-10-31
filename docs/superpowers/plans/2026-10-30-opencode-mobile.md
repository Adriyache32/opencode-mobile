# OpenCode Mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready mobile PWA to control OpenCode running on a PC, with secure pairing, real-time chat, permissions, and audit logging.

**Architecture:** TypeScript monorepo (Turborepo) with shared types. Three packages: `backend` (Hono + Drizzle + WS), `frontend` (React + Vite + PWA), `agent` (Node + OpenCode adapter + WS client). Docker Compose for local dev and VPS deploy.

**Tech Stack:** TypeScript, Hono, Drizzle ORM, PostgreSQL/SQLite, React 18, Vite, Tailwind, Workbox, ws (WebSocket), Zod, Zustand, JWT (RS256), bcrypt.

**Spec:** `/home/adriyache32/opencode-mobile/docs/DESIGN.md`

## Global Constraints

- Node.js ≥ 20 LTS (backend, agent, frontend build)
- pnpm ≥ 9 (workspace manager)
- Docker ≥ 24, Docker Compose ≥ 2
- PostgreSQL 16 (prod), SQLite (dev/tests)
- All secrets via env files / Docker secrets — never in code
- TypeScript `strict: true`, `noUncheckedIndexedAccess: true`
- ESLint + Prettier + `tsc --noEmit` in CI
- Conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`)
- Test coverage ≥ 80% on critical paths (auth, pairing, WS, adapter)

## Review Focus

| Input / Condition | Expected Behavior |
|---|---|
| Expired/used pairing code | Reject with clear error; code invalidated after 3 attempts or 2 min |
| Invalid/expired device token on WS connect | Close with code 4001; client re-auth flows |
| OpenCode server unreachable | Agent retries with exponential backoff; surfaces error to mobile |
| Malicious prompt injection attempt | Sanitized, audited, user warned; not executed blindly |
| Shell command requiring confirmation | Mobile receives request; 60s timeout → auto-deny; audit logged |
| Network loss during active task | WS reconnects; task continues on agent; progress synced on reconnect |
| Revoked device tries to connect | Auth fails; device marked inactive; audit logged |
| Concurrent prompts on same session | Queued sequentially; progress streamed per message |

---

### Task 0: Monorepo Scaffold & Tooling

**Files:**
- Create: `package.json` (root)
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `tsconfig.base.json`
- Create: `.eslintrc.json`
- Create: `.prettierrc`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `README.md`
- Create: `LICENSE` (MIT)
- Create: `SECURITY.md`
- Create: `docker/docker-compose.yml`
- Create: `docker/Dockerfile.backend`
- Create: `docker/Dockerfile.frontend`
- Create: `docker/Dockerfile.agent`
- Create: `docker/init.sql`
- Create: `docker/secrets/` (gitignored, for local secrets)
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/backend/package.json`
- Create: `packages/backend/tsconfig.json`
- Create: `packages/frontend/package.json`
- Create: `packages/frontend/tsconfig.json`
- Create: `packages/frontend/vite.config.ts`
- Create: `packages/frontend/tailwind.config.js`
- Create: `packages/frontend/index.html`
- Create: `packages/agent/package.json`
- Create: `packages/agent/tsconfig.json`

**Interfaces:**
- Produces: Working monorepo with `pnpm install`, `pnpm build`, `pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm test` scripts. Docker Compose spins up PostgreSQL + backend + frontend.

- [ ] **Step 1: Write root package.json with workspaces and scripts**

```json
{
  "name": "opencode-mobile",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "db:generate": "turbo run db:generate",
    "db:migrate": "turbo run db:migrate",
    "db:studio": "turbo run db:studio",
    "docker:up": "docker compose -f docker/docker-compose.yml up -d",
    "docker:down": "docker compose -f docker/docker-compose.yml down"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.5.0",
    "eslint": "^9.0.0",
    "prettier": "^3.3.0",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0"
  },
  "packageManager": "pnpm@9.6.0"
}
```

- [ ] **Step 2: Create pnpm-workspace.yaml**

```yaml
packages:
  - packages/*
```

- [ ] **Step 3: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "dev": { "cache": false, "persistent": true },
    "lint": { "outputs": [] },
    "typecheck": { "outputs": [] },
    "test": { "outputs": ["coverage/**"], "dependsOn": [] },
    "db:generate": { "outputs": ["**/migrations/**"] },
    "db:migrate": { "dependsOn": ["db:generate"] }
  }
}
```

- [ ] **Step 4: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "baseUrl": ".",
    "paths": {
      "@opencode-mobile/shared/*": ["packages/shared/src/*"],
      "@opencode-mobile/backend/*": ["packages/backend/src/*"],
      "@opencode-mobile/frontend/*": ["packages/frontend/src/*"],
      "@opencode-mobile/agent/*": ["packages/agent/src/*"]
    }
  }
}
```

- [ ] **Step 5: Create .eslintrc.json**

```json
{
  "root": true,
  "env": { "es2022": true, "node": true },
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended-type-checked",
    "plugin:@typescript-eslint/stylistic-type-checked",
    "prettier"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module",
    "project": ["./tsconfig.base.json", "./packages/*/tsconfig.json"],
    "tsconfigRootDir": "."
  },
  "plugins": ["@typescript-eslint"],
  "rules": {
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/consistent-type-imports": "error",
    "@typescript-eslint/no-floating-promises": "warn"
  }
}
```

- [ ] **Step 6: Create .prettierrc**

```json
{ "semi": true, "singleQuote": true, "tabWidth": 2, "trailingComma": "es5", "printWidth": 100 }
```

- [ ] **Step 7: Create .env.example**

```env
# Backend
DATABASE_URL=postgresql://opencode:password@localhost:5432/opencode_mobile
JWT_PRIVATE_KEY_PATH=./secrets/jwt_private.pem
JWT_PUBLIC_KEY_PATH=./secrets/jwt_public.pem
OPENCODE_URL=http://localhost:8080
OPENCODE_PASSWORD=changeme
CORS_ORIGIN=http://localhost:5173
PORT=3000
WS_PORT=3001
NODE_ENV=development

# Frontend
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3001

# Agent
BACKEND_URL=http://localhost:3000
BACKEND_WS_URL=ws://localhost:3001
DEVICE_TOKEN_PATH=~/.config/opencode-mobile/device.token
```

- [ ] **Step 8: Create Docker Compose and Dockerfiles**

Backend Dockerfile: Node 20 alpine, copy package.json, install deps, copy source, build, run `node dist/index.js`.
Frontend Dockerfile: Multi-stage — build with Node, serve with nginx alpine.
Agent Dockerfile: Same as backend but entrypoint `node dist/index.js --pair`.
docker-compose.yml: Services `db` (postgres:16), `backend`, `frontend`, `agent` (network_mode: host). Secrets via files.

- [ ] **Step 9: Verify monorepo works**

Run: `pnpm install && pnpm typecheck && pnpm lint`
Expected: All pass, no errors.

- [ ] **Step 10: Commit**

```bash
git add .
git commit -m "chore: scaffold monorepo with Turborepo, TypeScript, ESLint, Prettier, Docker"
```

---

### Task 1: Shared Package — Types, Schemas, Crypto

**Files:**
- Create: `packages/shared/src/types/api.ts`
- Create: `packages/shared/src/types/ws.ts`
- Create: `packages/shared/src/types/auth.ts`
- Create: `packages/shared/src/types/opencode.ts`
- Create: `packages/shared/src/types/index.ts`
- Create: `packages/shared/src/schemas/zod.ts`
- Create: `packages/shared/src/schemas/index.ts`
- Create: `packages/shared/src/crypto/pairing.ts`
- Create: `packages/shared/src/crypto/tokens.ts`
- Create: `packages/shared/src/crypto/index.ts`
- Create: `packages/shared/src/index.ts`
- Test: `packages/shared/src/crypto/pairing.test.ts`
- Test: `packages/shared/src/crypto/tokens.test.ts`

**Interfaces:**
- Consumes: None (foundation)
- Produces: All type definitions, Zod schemas, crypto utilities used by backend, frontend, agent.

- [ ] **Step 1: Write failing tests for pairing crypto**

```typescript
// pairing.test.ts
import { generatePairingCode, hashPairingCode, verifyPairingCode } from './pairing';

test('generatePairingCode returns 6-digit string', () => {
  const code = generatePairingCode();
  expect(code).toMatch(/^\d{6}$/);
});

test('hashPairingCode produces bcrypt hash', () => {
  const { hash, salt } = hashPairingCode('123456');
  expect(hash).toMatch(/^\$2[ab]\$\d{2}\$/);
  expect(salt).toBeDefined();
});

test('verifyPairingCode validates correct code', () => {
  const { hash, salt } = hashPairingCode('123456');
  expect(verifyPairingCode('123456', hash)).toBe(true);
});

test('verifyPairingCode rejects wrong code', () => {
  const { hash } = hashPairingCode('123456');
  expect(verifyPairingCode('654321', hash)).toBe(false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @opencode-mobile/shared test -- pairing.test.ts`
Expected: FAIL (functions not defined)

- [ ] **Step 3: Implement pairing.ts**

```typescript
// pairing.ts
import bcrypt from 'bcrypt';

export function generatePairingCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function hashPairingCode(code: string): { hash: string; salt: string } {
  const salt = bcrypt.genSaltSync(12);
  const hash = bcrypt.hashSync(code, salt);
  return { hash, salt };
}

export function verifyPairingCode(code: string, hash: string): boolean {
  return bcrypt.compareSync(code, hash);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @opencode-mobile/shared test -- pairing.test.ts`
Expected: PASS

- [ ] **Step 5: Write failing tests for tokens (JWT RS256)**

```typescript
// tokens.test.ts
import { generateKeyPair, signToken, verifyToken, createRefreshToken, hashRefreshToken } from './tokens';

test('generateKeyPair produces valid PEM keys', () => {
  const { privateKey, publicKey } = generateKeyPair();
  expect(privateKey).toContain('PRIVATE KEY');
  expect(publicKey).toContain('PUBLIC KEY');
});

test('signToken and verifyToken roundtrip', () => {
  const { privateKey, publicKey } = generateKeyPair();
  const payload = { sub: 'device-1', userId: 'user-1', permissions: ['opencode:prompt'] };
  const token = signToken(payload, privateKey, '15m');
  const decoded = verifyToken(token, publicKey);
  expect(decoded.sub).toBe('device-1');
  expect(decoded.permissions).toEqual(['opencode:prompt']);
});

test('verifyToken rejects expired token', () => {
  const { privateKey, publicKey } = generateKeyPair();
  const token = signToken({ sub: 'x' }, privateKey, '-1s'); // expired
  expect(() => verifyToken(token, publicKey)).toThrow('jwt expired');
});

test('createRefreshToken generates opaque token', () => {
  const token = createRefreshToken();
  expect(token).toMatch(/^[A-Za-z0-9-_]{32,}$/);
});

test('hashRefreshToken is deterministic', () => {
  const token = 'test-token';
  const h1 = hashRefreshToken(token);
  const h2 = hashRefreshToken(token);
  expect(h1).toBe(h2);
});
```

- [ ] **Step 6: Implement tokens.ts**

```typescript
// tokens.ts
import { createSign, createVerify, randomBytes } from 'crypto';
import { readFileSync } from 'fs';

export interface KeyPair { privateKey: string; publicKey: string; }

export function generateKeyPair(): KeyPair {
  const { publicKey, privateKey } = require('crypto').generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return { privateKey, publicKey };
}

export function signToken(payload: object, privateKey: string, expiresIn: string): string {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const exp = parseDuration(expiresIn);
  const body = { ...payload, iat: now, exp: now + exp };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedBody = base64url(JSON.stringify(body));
  const sign = createSign('RSA-SHA256');
  sign.update(`${encodedHeader}.${encodedBody}`);
  sign.end();
  const signature = sign.sign(privateKey, 'base64').replace(/[+/=]/g, m => ({ '+': '-', '/': '_', '=': '' })[m]);
  return `${encodedHeader}.${encodedBody}.${signature}`;
}

export function verifyToken(token: string, publicKey: string): object {
  const [headerB64, payloadB64, signatureB64] = token.split('.');
  const verify = createVerify('RSA-SHA256');
  verify.update(`${headerB64}.${payloadB64}`);
  verify.end();
  const signature = Buffer.from(signatureB64.replace(/[-_]/g, m => ({ '-': '+', '_': '/' })[m]), 'base64');
  if (!verify.verify(publicKey, signature)) throw new Error('Invalid signature');
  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) throw new Error('jwt expired');
  return payload;
}

export function createRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashRefreshToken(token: string): string {
  return require('crypto').createHash('sha256').update(token).digest('hex');
}

function parseDuration(s: string): number {
  const m = s.match(/^(-?)(\d+)([smhd])$/);
  if (!m) throw new Error('Invalid duration');
  const [, neg, num, unit] = m;
  const mult = { s: 1, m: 60, h: 3600, d: 86400 }[unit]!;
  return (neg === '-' ? -1 : 1) * parseInt(num) * mult;
}

function base64url(input: string): string {
  return Buffer.from(input).toString('base64').replace(/[+/=]/g, m => ({ '+': '-', '/': '_', '=': '' })[m]);
}
```

- [ ] **Step 7: Define all shared types (api.ts, ws.ts, auth.ts, opencode.ts) and Zod schemas**

Copy types from DESIGN.md sections 3.2 and 4.2 into respective files. Create Zod schemas mirroring each type.

- [ ] **Step 8: Export everything from shared/index.ts**

```typescript
export * from './types';
export * from './schemas';
export * from './crypto';
```

- [ ] **Step 9: Run typecheck and tests**

Run: `pnpm --filter @opencode-mobile/shared typecheck && pnpm --filter @opencode-mobile/shared test`
Expected: All pass.

- [ ] **Step 10: Commit**

```bash
git add packages/shared
git commit -m "feat(shared): types, schemas, pairing crypto, JWT tokens"
```

---

### Task 2: Backend — Database, Config, Auth Core

**Files:**
- Create: `packages/backend/src/config.ts`
- Create: `packages/backend/src/db/index.ts`
- Create: `packages/backend/src/db/schema.ts`
- Create: `packages/backend/src/db/migrations/` (generated)
- Create: `packages/backend/src/auth/service.ts`
- Create: `packages/backend/src/auth/middleware.ts`
- Create: `packages/backend/src/auth/routes.ts`
- Create: `packages/backend/src/auth/pairing.ts`
- Create: `packages/backend/src/index.ts`
- Test: `packages/backend/src/auth/service.test.ts`
- Test: `packages/backend/src/auth/pairing.test.ts`

**Interfaces:**
- Consumes: `@opencode-mobile/shared` (types, schemas, crypto)
- Produces: REST API (`/auth/*`, `/devices/*`), Drizzle DB client, JWT middleware.

- [ ] **Step 1: Implement config.ts (Zod-validated env)**

```typescript
// config.ts
import { z } from 'zod';

const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_PRIVATE_KEY_PATH: z.string(),
  JWT_PUBLIC_KEY_PATH: z.string(),
  OPENCODE_URL: z.string().url(),
  OPENCODE_PASSWORD: z.string().min(1),
  CORS_ORIGIN: z.string().url(),
  PORT: z.coerce.number().default(3000),
  WS_PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export const config = EnvSchema.parse(process.env);
export type Config = z.infer<typeof EnvSchema>;
```

- [ ] **Step 2: Implement db/schema.ts (from DESIGN.md section 3.1)**

Use `pgTable` for PostgreSQL. Export all tables.

- [ ] **Step 3: Implement db/index.ts (Drizzle client)**

```typescript
// db/index.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { config } from '../config';

export const pool = new Pool({ connectionString: config.DATABASE_URL });
export const db = drizzle(pool, { schema });
```

- [ ] **Step 4: Generate and run migrations**

Run: `pnpm --filter @opencode-mobile/backend db:generate` (outputs to `db/migrations/`)
Run: `pnpm --filter @opencode-mobile/backend db:migrate`
Expected: Tables created in PostgreSQL.

- [ ] **Step 5: Write failing tests for auth service**

```typescript
// service.test.ts
import { registerUser, loginUser, refreshAccessToken } from './service';

test('registerUser creates user with hashed password', async () => {
  const user = await registerUser('test@example.com', 'password123', 'Test User');
  expect(user.id).toBeDefined();
  expect(user.email).toBe('test@example.com');
  expect(user.passwordHash).not.toBe('password123');
});

test('loginUser returns tokens for valid credentials', async () => {
  await registerUser('test2@example.com', 'password123');
  const tokens = await loginUser('test2@example.com', 'password123');
  expect(tokens.accessToken).toBeDefined();
  expect(tokens.refreshToken).toBeDefined();
});

test('refreshAccessToken rotates refresh token', async () => {
  const { refreshToken } = await loginUser('test2@example.com', 'password123');
  const newTokens = await refreshAccessToken(refreshToken);
  expect(newTokens.accessToken).toBeDefined();
  expect(newTokens.refreshToken).not.toBe(refreshToken);
});
```

- [ ] **Step 6: Implement auth/service.ts**

- `registerUser`: bcrypt hash password, insert user, return user (no password)
- `loginUser`: verify password, sign access JWT (15m), create refresh token (30d), store refresh hash, return both
- `refreshAccessToken`: verify refresh hash, rotate (new refresh token, invalidate old), sign new access token
- `revokeRefreshToken`: delete refresh token hash

- [ ] **Step 7: Implement auth/middleware.ts (JWT verification)**

```typescript
// middleware.ts
import { verifyToken } from '@opencode-mobile/shared/crypto';
import { readFileSync } from 'fs';
import { config } from '../config';

const publicKey = readFileSync(config.JWT_PUBLIC_KEY_PATH, 'utf-8');

export function authMiddleware(c: any, next: any) {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Missing token' }, 401);
  try {
    const payload = verifyToken(auth.slice(7), publicKey);
    c.set('user', payload);
    return next();
  } catch (e) {
    return c.json({ error: 'Invalid token' }, 401);
  }
}
```

- [ ] **Step 8: Implement pairing flow (auth/pairing.ts + routes.ts)**

**POST /auth/pair/start** — authenticated user:
- Generate code + hash
- Create `pairing_challenges` row (expires 2min, attempts 0)
- Return `{ pairingCode, expiresAt, challengeId }`

**POST /auth/pair/verify** — public:
- Find challenge by code hash (bcrypt compare all unexpired)
- Validate attempts < 3, not consumed
- Increment attempts
- If match: create device, generate deviceToken (JWT 30d) + refreshToken, store hashes, mark challenge consumed
- Notify agent via WS (see Task 3) — for now return success
- Return `{ deviceToken, refreshToken, deviceId, user }`

**WS pair:challenge** — agent receives challenge, displays code
**WS pair:verify** — agent validates code, responds pair:verified with deviceToken

- [ ] **Step 9: Implement device routes (CRUD + revoke)**

GET `/devices` — list user's devices
PATCH `/devices/:id` — rename, update permissions
DELETE `/devices/:id` — revoke (set revokedAt, invalidate tokens)

- [ ] **Step 10: Wire up Hono app in index.ts**

```typescript
// index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { authRoutes } from './auth/routes';
import { deviceRoutes } from './devices/routes';
import { sessionRoutes } from './sessions/routes';
import { config } from './config';

const app = new Hono();
app.use('*', logger());
app.use('*', cors({ origin: config.CORS_ORIGIN, credentials: true }));

app.route('/auth', authRoutes);
app.route('/devices', deviceRoutes);
app.route('/sessions', sessionRoutes);

app.get('/health', c => c.json({ ok: true }));

export default { fetch: app.fetch, port: config.PORT };
```

- [ ] **Step 11: Run tests and typecheck**

Run: `pnpm --filter @opencode-mobile/backend test && pnpm --filter @opencode-mobile/backend typecheck`
Expected: All pass.

- [ ] **Step 12: Commit**

```bash
git add packages/backend
git commit -m "feat(backend): database, config, auth, pairing, devices"
```

---

### Task 3: Backend — WebSocket Server & OpenCode Proxy

**Files:**
- Create: `packages/backend/src/ws/server.ts`
- Create: `packages/backend/src/ws/handlers.ts`
- Create: `packages/backend/src/ws/rooms.ts`
- Create: `packages/backend/src/ws/types.ts`
- Create: `packages/backend/src/sessions/routes.ts`
- Create: `packages/backend/src/sessions/service.ts`
- Create: `packages/backend/src/openapi.ts`
- Test: `packages/backend/src/ws/handlers.test.ts`
- Test: `packages/backend/src/sessions/service.test.ts`

**Interfaces:**
- Consumes: Backend auth, DB, shared WS types
- Produces: WebSocket server on port 3001, session proxy to OpenCode, real-time message broadcasting.

- [ ] **Step 1: Implement WS server (ws library)**

```typescript
// server.ts
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { config } from '../config';
import { verifyToken } from '@opencode-mobile/shared/crypto';
import { readFileSync } from 'fs';
import { handleMessage } from './handlers';
import { rooms } from './rooms';

const publicKey = readFileSync(config.JWT_PUBLIC_KEY_PATH, 'utf-8');
const server = createServer();
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  const url = new URL(req.url!, `http://${req.headers.host}`);
  const token = url.searchParams.get('token');
  if (!token) return ws.close(4001, 'Missing token');

  let payload: any;
  try { payload = verifyToken(token, publicKey); }
  catch { return ws.close(4001, 'Invalid token'); }

  const deviceId = payload.sub as string;
  rooms.join(deviceId, ws);

  ws.on('message', (data) => handleMessage(ws, deviceId, data.toString()));
  ws.on('close', () => rooms.leave(deviceId, ws));
});

server.listen(config.WS_PORT, () => console.log(`WS server on ${config.WS_PORT}`));
```

- [ ] **Step 2: Implement rooms.ts (room management)**

```typescript
// rooms.ts
import { WebSocket } from 'ws';

const roomMembers = new Map<string, Set<WebSocket>>();

export const rooms = {
  join(room: string, ws: WebSocket) {
    if (!roomMembers.has(room)) roomMembers.set(room, new Set());
    roomMembers.get(room)!.add(ws);
  },
  leave(room: string, ws: WebSocket) {
    roomMembers.get(room)?.delete(ws);
  },
  broadcast(room: string, message: object, exclude?: WebSocket) {
    const payload = JSON.stringify(message);
    roomMembers.get(room)?.forEach(ws => {
      if (ws !== exclude && ws.readyState === WebSocket.OPEN) ws.send(payload);
    });
  },
  broadcastToUser(userId: string, message: object) {
    this.broadcast(`user:${userId}`, message);
  },
  broadcastToDevice(deviceId: string, message: object) {
    this.broadcast(`device:${deviceId}`, message);
  },
  broadcastToSession(sessionId: string, message: object) {
    this.broadcast(`session:${sessionId}`, message);
  },
};
```

- [ ] **Step 3: Implement handlers.ts (message routing)**

Handle: `session:create`, `session:join`, `prompt`, `cancel`, `permission:reply`, `sync:request`.
Each handler validates input (Zod), calls service, broadcasts response.

- [ ] **Step 4: Implement sessions/service.ts (OpenCode proxy)**

```typescript
// service.ts
import { config } from '../config';

const OPENCODE_AUTH = `Basic ${Buffer.from(`opencode:${config.OPENCODE_PASSWORD}`).toString('base64')}`;
const BASE = config.OPENCODE_URL;

async function opencodeFetch(path: string, options: RequestInit = {}) {
  return fetch(`${BASE}${path}`, {
    ...options,
    headers: { 'Authorization': OPENCODE_AUTH, 'Content-Type': 'application/json', ...options.headers },
  });
}

export async function createSession(userId: string, title?: string) {
  const res = await opencodeFetch('/api/session', { method: 'POST', body: JSON.stringify({ title }) });
  return res.json();
}

export async function sendPrompt(sessionId: string, prompt: any) {
  const res = await opencodeFetch(`/api/session/${sessionId}/prompt`, { method: 'POST', body: JSON.stringify(prompt) });
  return res.json();
}

export async function interruptSession(sessionId: string) {
  return opencodeFetch(`/api/session/${sessionId}/interrupt`, { method: 'POST' });
}

export function subscribeToSession(sessionId: string, handler: any) {
  // SSE connection to /api/event?session={id}
  // Parse events, call handler.onMessage, onToolCall, onComplete, onError
  // Return unsubscribe function
}
```

- [ ] **Step 5: Implement sessions/routes.ts (REST proxy)**

GET `/sessions` — list
POST `/sessions` — create
GET `/sessions/:id` — get
DELETE `/sessions/:id` — delete
POST `/sessions/:id/prompt` — send prompt
POST `/sessions/:id/interrupt` — interrupt

- [ ] **Step 6: Write tests for WS handlers and session proxy**

Mock OpenCode server, test message routing, session creation, prompt flow.

- [ ] **Step 7: Run tests and typecheck**

Run: `pnpm --filter @opencode-mobile/backend test && pnpm --filter @opencode-mobile/backend typecheck`
Expected: All pass.

- [ ] **Step 8: Commit**

```bash
git add packages/backend
git commit -m "feat(backend): WebSocket server, OpenCode proxy, session management"
```

---

### Task 4: Agent — OpenCode Adapter

**Files:**
- Create: `packages/agent/src/opencode/client.ts`
- Create: `packages/agent/src/opencode/adapter.ts`
- Create: `packages/agent/src/opencode/types.ts`
- Create: `packages/agent/src/opencode/events.ts`
- Test: `packages/agent/src/opencode/adapter.test.ts`

**Interfaces:**
- Consumes: Shared OpenCode types, config
- Produces: `OpenCodeAdapter` interface implementation.

- [ ] **Step 1: Implement HTTP client with retry/timeout**

```typescript
// client.ts
export class OpenCodeClient {
  constructor(private baseUrl: string, private password: string) {}

  private async request(path: string, options: RequestInit = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        headers: {
          'Authorization': `Basic ${Buffer.from(`opencode:${this.password}`).toString('base64')}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return res.json();
    } finally { clearTimeout(timeout); }
  }

  // Implement all methods from OpenCodeAdapter interface
}
```

- [ ] **Step 2: Implement SSE event stream parser**

```typescript
// events.ts
export function parseEventStream(response: Response, handler: EventHandler) {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  async function read() {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';
      for (const line of lines) parseEvent(line, handler);
    }
  }

  function parseEvent(raw: string, h: EventHandler) {
    // Parse SSE: event: type\ndata: {...}\n\n
  }

  return { cancel: () => reader.cancel() };
}
```

- [ ] **Step 3: Implement adapter.ts (full OpenCodeAdapter)**

Map all methods from DESIGN.md section 5.2. Use client for REST, SSE for streaming.

- [ ] **Step 4: Write tests with mocked OpenCode server**

Use `msw` or simple HTTP mock to test adapter methods.

- [ ] **Step 5: Run tests and typecheck**

Run: `pnpm --filter @opencode-mobile/agent test && pnpm --filter @opencode-mobile/agent typecheck`
Expected: All pass.

- [ ] **Step 6: Commit**

```bash
git add packages/agent/src/opencode
git commit -m "feat(agent): OpenCode adapter with HTTP + SSE"
```

---

### Task 5: Agent — WebSocket Client, Pairing, Permissions

**Files:**
- Create: `packages/agent/src/ws/client.ts`
- Create: `packages/agent/src/ws/handlers.ts`
- Create: `packages/agent/src/ws/reconnect.ts`
- Create: `packages/agent/src/pairing/flow.ts`
- Create: `packages/agent/src/pairing/storage.ts`
- Create: `packages/agent/src/permissions/manager.ts`
- Create: `packages/agent/src/permissions/prompts.ts`
- Create: `packages/agent/src/permissions/policies.ts`
- Create: `packages/agent/src/audit/logger.ts`
- Create: `packages/agent/src/index.ts` (CLI entry)
- Create: `packages/agent/src/config.ts`
- Test: `packages/agent/src/ws/reconnect.test.ts`
- Test: `packages/agent/src/pairing/flow.test.ts`
- Test: `packages/agent/src/permissions/manager.test.ts`

**Interfaces:**
- Consumes: OpenCodeAdapter, shared WS types, pairing crypto
- Produces: Long-running agent process that pairs, connects to backend, executes commands.

- [ ] **Step 1: Implement WS client with exponential backoff reconnect**

```typescript
// reconnect.ts
export function createReconnectingWS(url: string, onOpen: (ws: WebSocket) => void) {
  let ws: WebSocket | null = null;
  let attempt = 0;
  const maxAttempts = 10;

  function connect() {
    ws = new WebSocket(url);
    ws.onopen = () => { attempt = 0; onOpen(ws!); };
    ws.onclose = () => scheduleReconnect();
    ws.onerror = () => ws?.close();
  }

  function scheduleReconnect() {
    if (attempt >= maxAttempts) return;
    const delay = Math.min(1000 * 2 ** attempt, 30000) + Math.random() * 1000;
    attempt++;
    setTimeout(connect, delay);
  }

  connect();
  return { close: () => { ws?.close(); ws = null; } };
}
```

- [ ] **Step 2: Implement pairing flow (CLI `--pair`)**

- Start backend pairing challenge via REST
- Receive code, display prominently in console (ASCII box)
- Subscribe to WS `pair:verify` for that challenge
- When verified, save deviceToken to `~/.config/opencode-mobile/device.token`
- Exit pairing mode, start normal operation

- [ ] **Step 3: Implement permissions manager**

Load policies from `devicePermissions` table (synced via WS on connect).
Check permission before executing dangerous actions.
If `requiresConfirmation`: send `permission:request` WS, wait for `permission:reply` (60s timeout).

- [ ] **Step 4: Implement confirmation prompts (CLI)**

For `shell:exec`: show command, ask user (if interactive) or auto-deny (if headless).
Log all decisions to audit.

- [ ] **Step 5: Implement main entry point (index.ts)**

CLI args: `--pair`, `--daemon`, `--config`.
Read config, init OpenCodeAdapter, init WS client, start.

- [ ] **Step 6: Run tests and typecheck**

Run: `pnpm --filter @opencode-mobile/agent test && pnpm --filter @opencode-mobile/agent typecheck`
Expected: All pass.

- [ ] **Step 7: Commit**

```bash
git add packages/agent
git commit -m "feat(agent): WS client, pairing flow, permissions, CLI"
```

---

### Task 6: Frontend — PWA Core, Auth, Pairing

**Files:**
- Create: `packages/frontend/src/main.tsx`
- Create: `packages/frontend/src/App.tsx`
- Create: `packages/frontend/src/routes.tsx`
- Create: `packages/frontend/src/services/api.ts`
- Create: `packages/frontend/src/services/ws.ts`
- Create: `packages/frontend/src/services/storage.ts`
- Create: `packages/frontend/src/stores/auth.ts`
- Create: `packages/frontend/src/stores/devices.ts`
- Create: `packages/frontend/src/stores/sessions.ts`
- Create: `packages/frontend/src/stores/ui.ts`
- Create: `packages/frontend/src/hooks/useAuth.ts`
- Create: `packages/frontend/src/hooks/useWebSocket.ts`
- Create: `packages/frontend/src/hooks/useDevices.ts`
- Create: `packages/frontend/src/hooks/useSessions.ts`
- Create: `packages/frontend/src/components/ui/*` (Button, Input, Card, Modal, Toast, Spinner)
- Create: `packages/frontend/src/components/chat/*` (ChatView, MessageBubble, InputBar)
- Create: `packages/frontend/src/components/devices/*` (DeviceList, DeviceCard, PairingScreen)
- Create: `packages/frontend/src/components/layout/*` (Header, Sidebar)
- Create: `packages/frontend/src/pages/Login.tsx`
- Create: `packages/frontend/src/pages/Register.tsx`
- Create: `packages/frontend/src/pages/Pairing.tsx`
- Create: `packages/frontend/src/pages/Dashboard.tsx`
- Create: `packages/frontend/src/pages/Chat.tsx`
- Create: `packages/frontend/src/pages/Settings.tsx`
- Create: `packages/frontend/src/styles/globals.css`
- Create: `packages/frontend/src/styles/variables.css`
- Create: `packages/frontend/src/pwa.ts`
- Test: `packages/frontend/src/stores/auth.test.ts`
- Test: `packages/frontend/src/hooks/useWebSocket.test.ts`
- Test: `packages/frontend/components/**/*.test.tsx`

**Interfaces:**
- Consumes: Shared types, backend REST + WS APIs
- Produces: Installable PWA with chat UI, device management, offline support.

- [ ] **Step 1: Configure Vite + React + Tailwind + PWA plugin**

`vite.config.ts`: React plugin, Tailwind, `vite-plugin-pwa` with Workbox (GenerateSW), manifest.

- [ ] **Step 2: Implement API service (fetch wrapper with auth)**

Auto-attach access token, handle 401 → refresh token → retry.

- [ ] **Step 3: Implement WebSocket hook (useWebSocket)**

Auto-reconnect, message queue, typed handlers per message type.

- [ ] **Step 4: Implement Zustand stores**

- `auth`: user, accessToken, refreshToken, login/logout/register
- `devices`: devices[], pairingState, pair/verify/unpair
- `sessions`: sessions[], activeSessionId, messages[], sendPrompt, cancel
- `ui`: theme, toasts, modals

- [ ] **Step 5: Build UI components (mobile-first, Tailwind)**

ChatView: virtualized list, streaming bubbles, thinking indicator.
PairingScreen: large 6-digit code display, countdown timer, "enter code on phone" instruction.
Dashboard: device cards (online/offline), session list, quick actions.

- [ ] **Step 6: Implement pages and routing**

React Router v6: `/login`, `/register`, `/pair`, `/` (dashboard), `/chat/:sessionId`, `/settings`.

- [ ] **Step 7: PWA registration + offline support**

Register SW, cache shell, IndexedDB for messages (idb), background sync for pending prompts.

- [ ] **Step 8: Write component and E2E tests**

Vitest + React Testing Library for stores/hooks/components.
Playwright for critical flows: login → pair → send prompt → receive response.

- [ ] **Step 9: Run tests, typecheck, build**

Run: `pnpm --filter @opencode-mobile/frontend test && pnpm --filter @opencode-mobile/frontend typecheck && pnpm --filter @opencode-mobile/frontend build`
Expected: All pass, `dist/` generated.

- [ ] **Step 10: Commit**

```bash
git add packages/frontend
git commit -m "feat(frontend): PWA with chat, pairing, dashboard, offline support"
```

---

### Task 7: Installers, Audit, Hardening, CI/CD

**Files:**
- Create: `packages/agent/src/installer/linux.sh`
- Create: `packages/agent/src/installer/macos.sh`
- Create: `packages/agent/src/installer/windows.ps1`
- Create: `packages/agent/scripts/install-agent.sh` (curl | bash wrapper)
- Create: `packages/backend/src/audit/logger.ts`
- Create: `packages/backend/src/audit/middleware.ts`
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/release.yml`
- Create: `docs/DEPLOYMENT.md`
- Create: `docs/DEVELOPMENT.md`

**Interfaces:**
- Consumes: All previous tasks
- Produces: Production-ready installers, audit logging, CI/CD pipeline, deployment docs.

- [ ] **Step 1: Implement audit logger (structured JSON)**

```typescript
// logger.ts
export function auditLog(entry: AuditEntry) {
  const log = { timestamp: new Date().toISOString(), ...entry };
  console.log(JSON.stringify(log)); // stdout → journald / log aggregation
}
```

Middleware logs all requests (IP, user, action, success/failure).

- [ ] **Step 2: Add audit calls to all critical paths**

Auth, pairing, device management, prompt send, shell exec, permission changes.

- [ ] **Step 3: Create Linux installer (systemd)**

```bash
# linux.sh
# 1. Download latest release binary (GitHub Releases API)
# 2. Install to /usr/local/bin/opencode-mobile-agent
# 3. Create user/group opencode-mobile
# 4. Write /etc/systemd/system/opencode-mobile-agent.service
# 5. systemctl daemon-reload && systemctl enable --now opencode-mobile-agent
```

- [ ] **Step 4: Create macOS installer (launchd)**

Similar, writes `~/Library/LaunchAgents/com.opencode.mobile.agent.plist`.

- [ ] **Step 5: Create Windows installer (PowerShell)**

Creates service via `New-Service`, installs to `C:\Program Files\opencode-mobile-agent`.

- [ ] **Step 6: Create GitHub Actions CI**

```yaml
# ci.yml
on: [push, pull_request]
jobs:
  lint-typecheck-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test --coverage
      - uses: codecov/codecov-action@v4
  build-docker:
    needs: lint-typecheck-test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker build -f docker/Dockerfile.backend -t opencode-mobile-backend .
      - run: docker build -f docker/Dockerfile.frontend -t opencode-mobile-frontend .
      - run: docker build -f docker/Dockerfile.agent -t opencode-mobile-agent .
```

- [ ] **Step 7: Create release workflow (on tag)**

Build Docker images, push to GHCR, create GitHub Release with changelog.

- [ ] **Step 8: Write deployment docs**

`DEPLOYMENT.md`: VPS setup (nginx, TLS via Let's Encrypt, systemd, postgres), local Docker, agent install.
`DEVELOPMENT.md`: Local dev workflow, testing, adding features.

- [ ] **Step 9: Security hardening**

- Helmet/CSP headers in backend
- Rate limiting (express-rate-limit or hono-rate-limiter)
- Input validation on all routes (Zod)
- Dependency audit in CI (`pnpm audit --prod`)

- [ ] **Step 10: End-to-end integration test**

Start full stack (docker-compose), run Playwright test: register → pair → send prompt → verify response → revoke device.

- [ ] **Step 11: Commit**

```bash
git add packages/agent/src/installer .github/workflows docs/DEPLOYMENT.md docs/DEVELOPMENT.md
git commit -m "feat: installers, audit logging, CI/CD, deployment docs"
```

---

### Task 8: Polish, Beta, Release v1.0.0

**Files:**
- Modify: Multiple (bug fixes, UX improvements)
- Create: `CHANGELOG.md`

**Interfaces:**
- Consumes: Complete codebase
- Produces: Tagged release v1.0.0, Docker images on GHCR.

- [ ] **Step 1: Internal beta testing**

Team tests: multiple devices, network conditions, long-running sessions, error scenarios.

- [ ] **Step 2: Fix critical bugs**

Prioritize: pairing failures, WS reconnection, prompt timeouts, permission prompts.

- [ ] **Step 3: Performance optimization**

Bundle size (frontend), WS message throughput, DB query optimization (indexes).

- [ ] **Step 4: Accessibility audit**

WCAG AA: color contrast, keyboard nav, ARIA labels, screen reader testing.

- [ ] **Step 5: Update documentation**

README with quick start, screenshots, architecture diagram.

- [ ] **Step 6: Tag release**

```bash
git tag v1.0.0
git push origin v1.0.0
```

- [ ] **Step 7: Verify Docker images published**

Check GHCR for `opencode-mobile-backend`, `frontend`, `agent`.

- [ ] **Step 8: Commit**

```bash
git add CHANGELOG.md README.md
git commit -m "release: v1.0.0"
```

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-10-30-opencode-mobile.md`. Please review the plan. Does it capture what you want?**

**Recommended execution approach: Subagent-driven** — because the plan has 8 major tasks with clear interfaces between them, each task can be implemented and reviewed independently. A fresh subagent per task ensures clean boundaries, and a final whole-branch review catches integration issues. The shared types package (Task 1) must be done first; Tasks 2-4 can run in parallel after Task 1; Task 5 depends on Task 4; Task 6 depends on Task 2; Tasks 7-8 depend on all prior tasks.