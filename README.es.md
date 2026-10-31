# OpenCode Mobile (Español)

Controla **OpenCode** que se ejecuta en tu PC desde tu teléfono, en tu **red local**, sin configurar servidores ni escribir comandos complicados.

## Cómo funciona

1. Instalas la **app** en el móvil.
2. Instalas el **agente** en el PC (un programa que muestra un QR).
3. Escaneas el QR con la app. Listo.

```
┌─────────────┐         WiFi          ┌──────────────────────┐
│  Teléfono   │◄─────────────────────►│  PC (Agente)         │
│  (App/APK)  │   HTTP + WebSocket    │  └─ OpenCode (serve) │
└─────────────┘                       └──────────────────────┘
```

No hay backend en la nube: el agente del PC **es** el servidor. Todo queda en tu red.

## Instalación rápida

- **App Android:** descarga `app-debug.apk` desde [Releases](../../releases).
- **Agente en el PC (Linux/macOS):**

  ```bash
  curl -fsSL https://raw.githubusercontent.com/Adriyache32/opencode-mobile/main/scripts/install-agent.sh | bash
  ```

  Se abre el navegador con el QR. Escanéalo desde la app.

Guía detallada: **[docs/INSTALACION-APK.md](docs/INSTALACION-APK.md)**.

## Qué incluye la app

- Emparejamiento por **QR** (o manual si falla la cámara).
- Tutorial integrado en español.
- Chat en tiempo real (en desarrollo: Fase 2).
- Cancelación de tareas y confirmación de acciones peligrosas (en desarrollo).

## Estado del proyecto

| Parte | Estado |
|-------|--------|
| Monorepo, tipos compartidos, CI | ✅ Hecho |
| App Android (APK) + tutorial + QR | ✅ Hecho |
| Agente LAN con QR | ✅ Hecho |
| Backend en la nube (opcional) | 🔜 Futuro |
| Chat con OpenCode (adaptador) | 🚧 En curso |
| Permisos y auditoría | 🚧 En curso |

## Desarrollo

```bash
pnpm install
pnpm build          # compila los 4 paquetes
pnpm typecheck
pnpm lint

# Agente en local
pnpm --filter @opencode-mobile/agent dev

# Frontend en local
pnpm --filter @opencode-mobile/frontend dev
```

## Seguridad

- El QR contiene un **token secreto** de emparejamiento (solo visible en tu pantalla).
- Todo el tráfico va por tu red local.
- Para uso fuera de casa, usa una VPN de malla (Tailscale/ZeroTier) — nunca expongas el agente a Internet.

## Licencia

MIT — ver [LICENSE](LICENSE).