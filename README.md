# OpenCode Mobile

Control OpenCode running on your PC from your phone. A secure, real-time mobile PWA with device pairing, chat interface, and permission management.

> 🇪🇸 **En español:** lee [README.es.md](README.es.md) y la [guía de instalación de la APK](docs/INSTALACION-APK.md).
>
> 📱 **APK Android:** descárgala desde [Releases](../../releases) o compílala con `./scripts/build-apk.sh`.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Phone     │────►│   Backend    │◄───►│    PC       │
│  (PWA)      │ WS  │  (Hono)      │     │  (Agent)    │
└─────────────┘     └──────────────┘     └──────┬──────┘
                                                 │
                                         ┌───────┴───────┐
                                         │  OpenCode     │
                                         │  (REST+SSE)   │
                                         └───────────────┘
```

- **Frontend**: React 18 + Vite + Tailwind + PWA (Workbox)
- **Backend**: Hono + Drizzle ORM + PostgreSQL + WebSocket (ws)
- **Agent**: Node.js + OpenCode REST/SSE adapter + WebSocket client
- **Shared**: TypeScript types, Zod schemas, crypto utilities

## Quick Start

### Prerequisites

- Node.js ≥ 20 LTS
- pnpm ≥ 9
- Docker ≥ 24 + Docker Compose ≥ 2
- OpenCode running on PC (`opencode serve --port 8080`)

### Local Development

```bash
# Clone and install
git clone <repo>
cd opencode-mobile
pnpm install

# Generate JWT keys (one-time)
mkdir -p docker/secrets
openssl genrsa -out docker/secrets/jwt_private.pem 2048
openssl rsa -in docker/secrets/jwt_private.pem -pubout -out docker/secrets/jwt_public.pem
echo "changeme" > docker/secrets/opencode_password.txt
openssl rand -base64 32 > docker/secrets/db_password.txt

# Start infrastructure
pnpm docker:up

# Run migrations
pnpm db:migrate

# Start dev servers (3 terminals)
pnpm --filter @opencode-mobile/backend dev
pnpm --filter @opencode-mobile/frontend dev
pnpm --filter @opencode-mobile/agent dev
```

### Pairing Flow

1. Open frontend at `http://localhost:5173`
2. Register/login
3. Click "Add Device" → shows 6-digit code
4. Run agent with `pnpm --filter @opencode-mobile/agent dev --pair`
5. Enter code on phone → devices paired
6. Start chatting!

### Production Deploy

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for VPS setup with nginx, TLS, and systemd.

## Project Structure

```
opencode-mobile/
├── docker/                 # Docker Compose, Dockerfiles, nginx
├── packages/
│   ├── shared/             # Types, schemas, crypto (published internally)
│   ├── backend/            # Hono API + WebSocket server
│   ├── frontend/           # React PWA
│   └── agent/              # PC agent (Node.js)
├── .github/workflows/      # CI/CD
├── docs/                   # Design, deployment, development docs
└── turbo.json              # Turborepo config
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all dev servers |
| `pnpm build` | Build all packages |
| `pnpm lint` | Lint all packages |
| `pnpm typecheck` | Type-check all packages |
| `pnpm test` | Run all tests |
| `pnpm docker:up` | Start PostgreSQL + services |
| `pnpm docker:down` | Stop Docker services |

## Security

- JWT RS256 with rotating keys
- Ephemeral 6-digit pairing codes (2 min TTL, 3 attempts)
- Device tokens with refresh rotation
- Granular permissions + confirmations for dangerous actions
- Full audit logging
- Rate limiting on auth endpoints

See [SECURITY.md](SECURITY.md) for details.

## License

MIT — see [LICENSE](LICENSE)