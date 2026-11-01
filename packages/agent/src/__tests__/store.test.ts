import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { loadOrCreateState, saveState } from '../store';

let dir: string;
let statePath: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'ocm-store-'));
  statePath = join(dir, 'agent.json');
  process.env.AGENT_STATE_PATH = statePath;
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  delete process.env.AGENT_STATE_PATH;
});

describe('store', () => {
  it('crea un token la primera vez', () => {
    const state = loadOrCreateState();
    expect(state.token).toHaveLength(32);
    expect(JSON.parse(readFileSync(statePath, 'utf-8')).token).toBe(state.token);
  });

  it('reutiliza el token existente', () => {
    const first = loadOrCreateState();
    const second = loadOrCreateState();
    expect(second.token).toBe(first.token);
  });

  it('regenera el estado si el archivo está corrupto', () => {
    writeFileSync(statePath, '{no es json');
    const state = loadOrCreateState();
    expect(state.token).toHaveLength(32);
  });

  it('guarda la sesión sin perder el token', () => {
    const { token } = loadOrCreateState();
    saveState({ sessionID: 'ses_123' });
    const reloaded = loadOrCreateState();
    expect(reloaded.token).toBe(token);
    expect(reloaded.sessionID).toBe('ses_123');
  });
});
