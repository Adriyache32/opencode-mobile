# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x.x   | ✅        |

## Reporting a Vulnerability

Email security@opencode-mobile.dev (or create a private GitHub Security Advisory).

We aim to:
- Acknowledge within 48 hours
- Provide initial assessment within 7 days
- Release patches within 30 days for critical issues

## Security Features

### Authentication & Authorization
- **JWT RS256** with separate private/public keys
- Access tokens: 15 min expiry
- Refresh tokens: 30 days, rotated on each use, stored as SHA-256 hashes
- Device tokens: 30 days, revocable per-device

### Pairing Security
- 6-digit numeric codes (1M combinations)
- 2-minute TTL, max 3 attempts
- Codes bcrypt-hashed (cost 12) in database
- Single-use: invalidated after verification (success or failure)
- Rate limited: 5 requests/minute per IP

### Transport Security
- **Local**: HTTP/WS (assumes trusted LAN)
- **Production**: HTTPS/WSS mandatory (TLS 1.3 via Let's Encrypt)
- CORS restricted to configured origin
- Secure headers (CSP, HSTS, X-Frame-Options, etc.)

### Input Validation
- All REST endpoints validated with Zod schemas
- WebSocket messages validated on receipt
- Size limits: 1 MB max WS message, 10 MB max HTTP body
- Rate limiting: 30 msg/s per WS connection, 10 req/min auth endpoints

### OpenCode Adapter Safety
- Prompt sanitization (injection pattern detection)
- No direct shell execution — all via OpenCode's tool system
- Confirmation required for dangerous permissions
- Audit log for every tool call

### Permissions Model
- Default-deny for shell, filesystem, admin actions
- Per-device granular permissions
- Configurable confirmation requirements
- 60-second timeout on confirmations (auto-deny)

### Audit Logging
Structured JSON logs for:
- All auth events (login, pairing, token refresh)
- Device management (pair, revoke, permission changes)
- Session lifecycle (create, fork, delete)
- Prompt sending, cancellation, tool calls
- Permission requests and decisions
- Rate limit hits, invalid tokens, suspicious patterns

### Secrets Management
- **Never in code**: All secrets via env files / Docker secrets
- JWT keys: `/run/secrets/jwt_private.pem`, `/run/secrets/jwt_public.pem`
- Database password: `/run/secrets/db_password`
- OpenCode password: `/run/secrets/opencode_password`
- `.env` files gitignored, `.env.example` committed

### Dependency Security
- `pnpm audit --prod` in CI pipeline
- Lockfile committed (`pnpm-lock.yaml`)
- Automated dependabot alerts
- Minimal dependency surface

## Threat Model

| Threat | Mitigation |
|--------|------------|
| Stolen device token | Short expiry (30d), revocable, audit log, rate limited |
| Pairing code brute force | 1M combos, 2min TTL, 3 attempts, bcrypt, rate limit |
| MITM on local network | TLS in prod; local assumes trusted LAN (use Tailscale/ZeroTier for remote) |
| Prompt injection | Sanitization + audit + user warning |
| Malicious agent | Runs as unprivileged user, no direct shell, all via OpenCode |
| Compromised backend | Read-only DB user for agent, secrets rotation, audit |

## Secure Deployment Checklist

- [ ] TLS certificates configured (Let's Encrypt)
- [ ] JWT keys rotated annually (generate new keypair)
- [ ] Strong database password (32+ chars random)
- [ ] OpenCode password changed from default
- [ ] Rate limits tuned for expected traffic
- [ ] Log aggregation configured (Loki, Datadog, etc.)
- [ ] Backup strategy for PostgreSQL
- [ ] Monitoring/alerts for auth failures, rate limits