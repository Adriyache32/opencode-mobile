// Backend entry point
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

const app = new Hono();

app.use('*', logger());
app.use('*', cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

app.get('/health', (c) => c.json({ ok: true, service: 'opencode-mobile-backend' }));

// Placeholder routes - will be implemented in Task 2
app.get('/api/placeholder', (c) => c.json({ message: 'Backend running' }));

const port = Number(process.env.PORT) || 3000;

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Backend listening on http://localhost:${info.port}`);
});

export default app;