// Punto de entrada del agente: arranca el servidor LAN y muestra el QR
import { networkInterfaces } from 'os';
import { buildPayload, renderTerminalQR } from './qr';
import { createAgentServer } from './server';
import { loadOrCreateState } from './store';
import { stopOpenCode } from './opencode';

const PORT = Number(process.env.AGENT_PORT) || 8787;

// Al cerrar, mata el `opencode serve` que hayamos arrancado.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    stopOpenCode();
    process.exit(0);
  });
}

function lanAddress(): string {
  const ifaces = networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name] ?? []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

async function main() {
  const state = loadOrCreateState();
  const host = lanAddress();
  const url = `http://${host}:${PORT}`;
  const payload = buildPayload(url, state.token, state.deviceName);

  createAgentServer({ payload, deviceName: state.deviceName, port: PORT });

  const qr = await renderTerminalQR(payload);

  console.log('\n  OpenCode Mobile · Agente');
  console.log('  -------------------------');
  console.log(`  Equipo:  ${state.deviceName}`);
  console.log(`  Dirección: ${url}`);
  console.log(`  Página de emparejamiento: ${url}\n`);
  console.log('  Escanea este QR con la app:\n');
  console.log(qr);
  console.log('  (También puedes abrir la dirección en el navegador del PC)\n');
  console.log('  Mantén esta ventana abierta mientras uses la app.\n');
}

main().catch((err) => {
  console.error('Error al arrancar el agente:', err);
  process.exit(1);
});