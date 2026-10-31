#!/usr/bin/env bash
# Compila la APK de OpenCode Mobile.
# Requiere: Node 20+, pnpm 9+, JDK 21 estándar (no GraalVM), Android SDK.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND="$ROOT/packages/frontend"

# Permite sobreescribir por variables de entorno.
export JAVA_HOME="${JAVA_HOME:-/usr/lib/jvm/java-21-openjdk}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/AndroidSDK}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"

if [ ! -x "$JAVA_HOME/bin/javac" ]; then
  echo "ERROR: JDK 21 no encontrado en $JAVA_HOME" >&2
  echo "Instala 'jdk21-openjdk' o exporta JAVA_HOME." >&2
  exit 1
fi

if [ ! -d "$ANDROID_HOME/platforms/android-36" ]; then
  echo "ERROR: Android SDK no encontrado en $ANDROID_HOME" >&2
  echo "Instala platform android-36 o exporta ANDROID_HOME." >&2
  exit 1
fi

echo "==> Compilando frontend..."
cd "$FRONTEND"
pnpm build

echo "==> Sincronizando con Android..."
npx cap sync android

echo "==> Generando APK (debug)..."
cd "$FRONTEND/android"
./gradlew assembleDebug --no-daemon

APK="$FRONTEND/android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "APK generada: $APK"
ls -lh "$APK"