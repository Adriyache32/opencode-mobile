// Persistencia del estado del agente (token de emparejamiento)
import { randomBytes } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { dirname, join } from 'path';

export interface AgentState {
  token: string;
  deviceName: string;
}

function statePath(): string {
  const custom = process.env.AGENT_STATE_PATH;
  if (custom) return custom.replace(/^~/, homedir());
  return join(homedir(), '.config', 'opencode-mobile', 'agent.json');
}

export function loadOrCreateState(): AgentState {
  const path = statePath();
  if (existsSync(path)) {
    try {
      const raw = JSON.parse(readFileSync(path, 'utf-8')) as Partial<AgentState>;
      if (raw.token) {
        return { token: raw.token, deviceName: raw.deviceName ?? defaultName() };
      }
    } catch {
      // archivo corrupto: se regenera
    }
  }
  const state: AgentState = { token: randomBytes(24).toString('base64url'), deviceName: defaultName() };
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(state, null, 2), { mode: 0o600 });
  return state;
}

function defaultName(): string {
  return process.env.AGENT_NAME ?? `${process.env.USER ?? 'PC'} (${process.platform})`;
}