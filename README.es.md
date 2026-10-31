# OpenCode Mobile (Español)

Controla **OpenCode** que se ejecuta en tu PC desde tu teléfono. Una PWA segura con app Android (APK), emparejamiento por código, chat en tiempo real y gestión de permisos.

## Arquitectura

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Teléfono   │────►│   Backend    │◄───►│     PC      │
│ (PWA/APK)   │ WS  │  (Hono)      │     │  (Agente)   │
└─────────────┘     └──────────────┘     └──────┬──────┘
                                                 │
                                         ┌───────┴───────┐
                                         │   OpenCode    │
                                         │  (REST+SSE)   │
                                         └───────────────┘
```

- **Frontend**: React 18 + Vite + Tailwind + PWA (Workbox) + Capacitor (Android)
- **Backend**: Hono + Drizzle ORM + PostgreSQL + WebSocket (ws)
- **Agente**: Node.js + adaptador OpenCode (REST/SSE) + cliente WebSocket
- **Compartido**: tipos TypeScript, esquemas Zod, utilidades crypto

## Instalación de la APK

Consulta **[docs/INSTALACION-APK.md](docs/INSTALACION-APK.md)** para la guía paso a paso, o descarga la APK desde la sección **Releases**.

## Inicio rápido (desarrollo)

### Requisitos

- Node.js ≥ 20 LTS
- pnpm ≥ 9
- Docker ≥ 24 + Docker Compose ≥ 2
- OpenCode en el PC (`opencode serve --port 8080`)

```bash
# Clonar e instalar
git clone https://github.com/Adriyache32/opencode-mobile
cd opencode-mobile
pnpm install

# Generar claves JWT (una vez)
mkdir -p docker/secrets
openssl genrsa -out docker/secrets/jwt_private.pem 2048
openssl rsa -in docker/secrets/jwt_private.pem -pubout -out docker/secrets/jwt_public.pem
echo "changeme" > docker/secrets/opencode_password.txt
openssl rand -base64 32 > docker/secrets/db_password.txt

# Infraestructura
pnpm docker:up
pnpm db:migrate

# Servidores de desarrollo
pnpm --filter @opencode-mobile/backend dev
pnpm --filter @opencode-mobile/frontend dev
pnpm --filter @opencode-mobile/agent dev
```

## Compilar la APK

```bash
./scripts/build-apk.sh
```

Requiere JDK 21 estándar (no GraalVM) y Android SDK con `platforms/android-36`.

La APK se genera en `packages/frontend/android/app/build/outputs/apk/debug/app-debug.apk`.

## Tutorial integrado

La app incluye un **tutorial guiado en español** que aparece la primera vez y explica:

1. Arrancar OpenCode en el PC.
2. Arrancar el backend.
3. Arrancar el agente.
4. Emparejar el teléfono con un código de 6 dígitos.
5. Empezar a chatear.

Puedes volver a abrirlo desde la pantalla principal.

## Seguridad

- JWT RS256 con rotación de claves.
- Códigos de emparejamiento efímeros (2 min, 3 intentos).
- Tokens de dispositivo con refresh rotativo.
- Permisos granulares y confirmación para acciones peligrosas.
- Registro de auditoría completo.
- Límite de peticiones en endpoints de autenticación.

Ver [SECURITY.md](SECURITY.md).

## Licencia

MIT — ver [LICENSE](LICENSE).