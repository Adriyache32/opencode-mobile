# Instalación de la APK de OpenCode Mobile

Esta guía explica cómo instalar la aplicación Android (APK) y dejarla conectada a tu PC.

## Requisitos

- Un teléfono Android 7.0 (API 24) o superior.
- El PC con OpenCode instalado y funcionando.
- Los dos dispositivos en la misma red local (o una red privada como Tailscale).
- El archivo `app-debug.apk` (lo descargas desde la sección **Releases** del repositorio).

## 1. Descargar la APK

1. Entra en la página de **Releases** del repositorio:
   `https://github.com/Adriyache32/opencode-mobile/releases`
2. Descarga el archivo `app-debug.apk` en tu teléfono.

## 2. Permitir la instalación desde el navegador

Android bloquea por defecto la instalación de apps que no vienen de la Play Store.

1. Abre el archivo `app-debug.apk` descargado.
2. Cuando aparezca el aviso, pulsa **Ajustes**.
3. Activa **Permitir desde esta fuente** (navegador o gestor de archivos).
4. Vuelve atrás y pulsa **Instalar**.
5. Abre **OpenCode Mobile** desde el cajón de aplicaciones.

> Al ser una APK de depuración (debug), puede aparecer el aviso de "fuente desconocida". Es normal.

## 3. Preparar el PC

### 3.1. Arrancar OpenCode

En la terminal de tu PC:

```bash
opencode serve --port 8080
```

Anota la **contraseña** que muestra la salida (la usarás en el backend).

### 3.2. Arrancar el backend

Desde el repositorio, en el PC:

```bash
cd opencode-mobile
docker compose -f docker/docker-compose.yml up -d
```

Si no usas Docker, puedes arrancarlo con Node:

```bash
pnpm install
pnpm --filter @opencode-mobile/backend dev
```

### 3.3. Arrancar el agente

```bash
pnpm --filter @opencode-mobile/agent dev --pair
```

El agente mostrará un **código de 6 dígitos** en la terminal.

## 4. Emparejar el teléfono

1. Abre la app en el teléfono.
2. Sigue el **tutorial integrado** que aparece la primera vez.
3. Cuando llegues al paso de emparejamiento, escribe el código de 6 dígitos que muestra el agente.
4. Pulsa **Vincular**. El código caduca en 2 minutos y solo sirve una vez.

## 5. Usar la app

- Escribe instrucciones como *"abre Firefox y reproduce mi serie favorita"*.
- Verás el estado de la tarea en tiempo real.
- Puedes **cancelar** una tarea en curso con el botón correspondiente.
- Las acciones peligrosas (comandos de shell, borrado de archivos) pedirán **confirmación**.

## 6. Compilar la APK tú mismo (opcional)

Si prefieres generar la APK desde el código:

### Requisitos de compilación

- Node.js 20+
- pnpm 9+
- JDK 21 (OpenJDK estándar, **no GraalVM**)
- Android SDK con `platforms/android-36` y `build-tools/36.0.0`

### Pasos

```bash
cd packages/frontend
pnpm install
pnpm build
npx cap sync android

cd android
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk
export ANDROID_HOME=/ruta/a/tu/AndroidSDK
./gradlew assembleDebug
```

La APK se genera en:

```
packages/frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

O usa el script incluido:

```bash
./scripts/build-apk.sh
```

## Solución de problemas

| Problema | Solución |
|----------|----------|
| `jlink ... Module jdk.internal.vm.ci not found` | Estás usando GraalVM. Cambia a OpenJDK 21 estándar (`jdk21-openjdk`). |
| La app no conecta con el backend | Comprueba que el teléfono y el PC están en la misma red y que el backend escucha en `0.0.0.0`. |
| El código de emparejamiento caduca | Vuelve a arrancar el agente con `--pair` para generar uno nuevo. |
| Error de instalación "app no instalada" | Desinstala una versión anterior y vuelve a intentarlo. |
