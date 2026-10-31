// Servidor del agente: HTTP (Hono) + WebSocket (ws) para la LAN
import { createServer, type Server } from 'http';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getRequestListener } from '@hono/node-server';
import { WebSocketServer, WebSocket } from 'ws';
import { renderDataURL, type PairPayload } from './qr';

export interface ServerOptions {
  payload: PairPayload;
  deviceName: string;
  port: number;
}

export function createAgentServer(opts: ServerOptions): Server {
  const app = new Hono();

  app.use('*', cors({ origin: '*', credentials: false }));

  app.get('/health', (c) => c.json({ ok: true, name: opts.deviceName, service: 'opencode-mobile-agent' }));

  app.get('/api/info', (c) =>
    c.json({ name: opts.deviceName, version: '0.1.0', protocol: 1 })
  );

  // Verifica el token del QR (el móvil puede comprobarlo antes de guardar).
  app.post('/pair/verify', async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as { token?: string };
    if (body.token !== opts.payload.token) {
      return c.json({ ok: false, error: 'Token inválido' }, 401);
    }
    return c.json({ ok: true, name: opts.deviceName });
  });

  // Página de emparejamiento con el QR (la abre el instalador de un clic).
  app.get('/', async (c) => {
    const dataUrl = await renderDataURL(opts.payload);
    const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>OpenCode Mobile · Emparejar</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: system-ui, sans-serif; background:#0f0f1a; color:#e8e8f0;
         min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; }
  .card { background:#1a1a2e; border:1px solid #2a2a4a; border-radius:16px; padding:32px;
          max-width:420px; width:100%; text-align:center; }
  h1 { font-size:20px; margin:0 0 6px; }
  p { color:#8a8ab8; font-size:14px; line-height:1.5; }
  img { width:280px; height:280px; image-rendering:pixelated; background:#fff;
        border-radius:12px; padding:12px; margin:16px 0; }
  code { background:#0f0f1a; border:1px solid #2a2a4a; border-radius:8px; padding:8px 12px;
         display:block; word-break:break-all; font-size:12px; color:#a0bfff; }
  .ok { color:#4ade80; font-weight:600; }
</style>
</head>
<body>
  <div class="card">
    <h1>Conecta tu teléfono</h1>
    <p>1. Abre <strong>OpenCode Mobile</strong> en el móvil.<br/>
       2. Pulsa <strong>Escanear QR</strong> y apunta al código.<br/>
       3. Listo, ya está vinculado.</p>
    <img src="${dataUrl}" alt="Código QR de emparejamiento"/>
    <p>¿No puedes escanear? Introduce estos datos a mano en la app:</p>
    <code>Dirección: ${opts.payload.url}</code>
    <code style="margin-top:8px">Código: ${opts.payload.token}</code>
    <p style="margin-top:16px" class="ok">Servidor activo en el puerto ${opts.port}</p>
  </div>
</body>
</html>`;
    return c.html(html);
  });

  const httpServer = createServer(getRequestListener(app.fetch));

  // WebSocket: canal de tiempo real con el móvil (chat con OpenCode).
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  wss.on('connection', (ws: WebSocket) => {
    ws.send(JSON.stringify({ type: 'hello', name: opts.deviceName, protocol: 1 }));
    ws.on('message', (data) => {
      // Placeholder hasta conectar el adaptador de OpenCode (Tarea 4).
      try {
        const msg = JSON.parse(data.toString()) as { type?: string };
        if (msg.type === 'ping') ws.send(JSON.stringify({ type: 'pong' }));
      } catch {
        ws.send(JSON.stringify({ type: 'error', message: 'Mensaje inválido' }));
      }
    });
  });

  httpServer.listen(opts.port, '0.0.0.0');
  return httpServer;
}