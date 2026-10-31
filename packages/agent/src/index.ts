// Agent entry point
import { config } from './config';

console.log('OpenCode Mobile Agent starting...');
console.log('Config:', {
  backendUrl: config.BACKEND_URL,
  backendWsUrl: config.BACKEND_WS_URL,
  deviceTokenPath: config.DEVICE_TOKEN_PATH
});

// Placeholder - will be implemented in Task 4-5
console.log('Agent ready (placeholder)');