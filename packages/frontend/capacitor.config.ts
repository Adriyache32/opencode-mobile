import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.adriyache32.opencodemobile',
  appName: 'OpenCode Mobile',
  webDir: 'dist',
  android: {
    allowMixedContent: true,
  },
  server: {
    // Permite cargar el backend por HTTP en desarrollo.
    // En producción el backend debe servirse por HTTPS.
    cleartext: true,
  },
  plugins: {
    // Las peticiones HTTP salen por el cliente nativo: evita el bloqueo
    // de contenido mixto (https://localhost -> http://192.168.x.x) y CORS.
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
