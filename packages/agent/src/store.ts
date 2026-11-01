// Persistencia del estado del agente (token de emparejamiento y sesión de OpenCode)
import { randomBytes } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { dirname, join } from 'path';

export interface AgentState {
  token: string;
  deviceName: string;
  /** Sesión de OpenCode en curso, para conservar el historial entre reinicios. */
  sessionID?: string;
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
        return {
          token: raw.token,
          deviceName: raw.deviceName ?? defaultName(),
          sessionID: raw.sessionID,
        };
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

/** Guarda el estado conservando los campos que ya hubiera. */
export function saveState(partial: Partial<AgentState>): void {
  const path = statePath();
  let current: AgentState;
  try {
    current = JSON.parse(readFileSync(path, 'utf-8')) as AgentState;
  } catch {
    current = { token: '', deviceName: defaultName() };
  }
  const next: AgentState = { ...current, ...partial };
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(next, null, 2), { mode: 0o600 });
}

function defaultName(): string {
  return process.env.AGENT_NAME ?? `${process.env.USER ?? 'PC'} (${process.platform})`;
}
