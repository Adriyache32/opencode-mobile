// Agent configuration
import { z } from 'zod';

const EnvSchema = z.object({
  BACKEND_URL: z.string().url().default('http://localhost:3000'),
  BACKEND_WS_URL: z.string().url().default('ws://localhost:3001'),
  DEVICE_TOKEN_PATH: z.string().default('~/.config/opencode-mobile/device.token')
});

export const config = EnvSchema.parse(process.env);
export type AgentConfig = z.infer<typeof EnvSchema>;