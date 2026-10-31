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
};

export default config;