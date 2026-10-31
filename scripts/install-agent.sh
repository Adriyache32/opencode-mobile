#!/usr/bin/env bash
# Instalador del agente de OpenCode Mobile (Linux/macOS).
# Descarga el binario del PC, lo instala y abre la página de emparejamiento.
set -euo pipefail

PORT="${AGENT_PORT:-8787}"
REPO="Adriyache32/opencode-mobile"
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
case "$(uname -m)" in
  x86_64|amd64) ARCH="x64" ;;
  aarch64|arm64) ARCH="arm64" ;;
  *) ARCH="$(uname -m)" ;;
esac

BIN="ocm-agent-${OS}-${ARCH}"
URL="https://github.com/${REPO}/releases/latest/download/${BIN}"
DEST="${HOME}/.local/bin/ocm-agent"

echo "OpenCode Mobile · Instalador del agente"
echo "  Plataforma: ${OS}-${ARCH}"

if ! command -v curl >/dev/null 2>&1; then
  echo "ERROR: se necesita 'curl'. Instálalo y vuelve a intentarlo." >&2
  exit 1
fi

echo "  Descargando agente…"
mkdir -p "$(dirname "$DEST")"
if ! curl -fSL --progress-bar "$URL" -o "$DEST"; then
  echo "" >&2
  echo "ERROR: no hay binario para ${OS}-${ARCH} en la última versión." >&2
  echo "Descárgalo a mano desde https://github.com/${REPO}/releases" >&2
  exit 1
fi
chmod +x "$DEST"

echo "  Iniciando agente en el puerto ${PORT}…"
AGENT_PORT="$PORT" "$DEST" &
AGENT_PID=$!

sleep 1
PAGE="http://localhost:${PORT}"
echo "  Abriendo ${PAGE}"
if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$PAGE" >/dev/null 2>&1 || true
elif command -v open >/dev/null 2>&1; then
  open "$PAGE" >/dev/null 2>&1 || true
else
  echo "  Abre esta dirección en tu navegador: ${PAGE}"
fi

echo ""
echo "  Deja esta ventana abierta. Escanea el QR con la app."
echo "  Pulsa Ctrl+C para detener el agente."
echo ""

wait "$AGENT_PID"