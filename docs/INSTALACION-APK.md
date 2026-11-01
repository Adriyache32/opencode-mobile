# Instalación y emparejamiento (fácil)

OpenCode Mobile funciona en tu **red local** (misma WiFi). No necesitas servidores en la nube ni escribir comandos complicados.

## Piezas

1. **App Android** (`app-debug.apk`) — en el teléfono.
2. **Agente** (`ocm-agent-...`) — un programa que instalas en el PC. Se encarga de todo y muestra un QR.

---

## 1. Instalar la app en el teléfono

1. Entra en **Releases**: `https://github.com/Adriyache32/opencode-mobile/releases`
2. Descarga `app-debug.apk` en el teléfono.
3. Ábrelo y permite **"instalar desde fuente desconocida"** cuando lo pida Android.
4. Abre **OpenCode Mobile**. Verás el tutorial la primera vez.

## 2. Instalar el agente en el PC

### Opción A — Instalador automático (Linux/macOS)

Abre una terminal **una sola vez** y ejecuta:

```bash
curl -fsSL https://raw.githubusercontent.com/Adriyache32/opencode-mobile/main/scripts/install-agent.sh | bash
```

Descarga el agente, lo arranca y **abre el navegador con el QR**.

### Opción B — Manual (cualquier sistema)

1. En **Releases**, descarga el agente para tu sistema:
   - Linux: `ocm-agent-linux-x64`
   - macOS: `ocm-agent-darwin-arm64` (o `-x64`)
   - Windows: `ocm-agent-windows-x64.exe`
2. Dale permisos de ejecución (Linux/macOS):

   ```bash
   chmod +x ocm-agent-*
   ./ocm-agent-linux-x64
   ```

3. Se abre una página en el navegador con el **código QR**.

> El agente se queda abierto mientras uses la app. Ciérralo (Ctrl+C) para desconectar.

## 3. Emparejar el teléfono

1. En la app pulsa **Escanear QR**.
2. Apunta al QR de la página del PC.
3. Listo: verás **"Conectado a <tu PC>"**.

Si la cámara falla, pulsa **Introducir dirección a mano** y copia la **dirección** y el **código** que muestra la página del PC.

## 4. Usar

Escribe instrucciones como *"abre Firefox y reproduce mi serie favorita"*. Verás el progreso y podrás cancelar tareas.

---

## Requisitos

- Teléfono y PC en la **misma red WiFi**.
- Android 7.0 o superior.
- El agente abierto en el PC mientras uses la app.

## Solución de problemas

| Problema | Solución |
|----------|----------|
| "No se pudo conectar a http://…" | El móvil no llega al PC. Misma WiFi (no datos móviles), agente abierto y router sin **aislamiento de clientes** (AP isolation). |
| "Código de emparejamiento incorrecto" | El QR es de otra sesión. Vuelve a escanear el QR de la página del PC. |
| "El PC no respondió en 8s" | Firewall del PC bloqueando el puerto 8787, o IP del PC cambiada. Vuelve a escanear el QR. |
| La cámara no abre | Da permiso de cámara a la app en Ajustes de Android, o usa la introducción manual. |
| El firewall bloquea | Permite al agente en el puerto 8787 (TCP) en el firewall del PC. |
| Cambio de red | Si cambia la IP del PC, vuelve a escanear el QR (el agente muestra la nueva dirección). |

## Compilar desde el código (desarrolladores)

### APK

```bash
cd packages/frontend
pnpm build && npx cap sync android
cd android
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk   # OpenJDK 21 estándar, NO GraalVM
export ANDROID_HOME=/ruta/a/tu/AndroidSDK
./gradlew assembleDebug
```

Salida: `packages/frontend/android/app/build/outputs/apk/debug/app-debug.apk`

### Agente (binario único)

```bash
cd packages/agent
bun build src/index.ts --compile --outfile ../../dist-bin/ocm-agent
```

Requiere [Bun](https://bun.sh). Genera un binario autocontenido (sin Node).
