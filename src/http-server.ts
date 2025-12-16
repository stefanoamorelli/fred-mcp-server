import express from 'express';
import { randomUUID } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer } from './index.js';

const DEFAULT_PORT = 3000;
const DEFAULT_HOST = '0.0.0.0';
const ENV_PORT = 'PORT';
const ENV_HOST = 'HOST';

export interface HttpServerOptions {
  port?: number;
  host?: string;
}

export async function startHttpServer(options: HttpServerOptions = {}) {
  const port = options.port ?? parseInt(process.env[ENV_PORT] ?? String(DEFAULT_PORT), 10);
  const host = options.host ?? process.env[ENV_HOST] ?? DEFAULT_HOST;

  const app = express();
  app.use(express.json());

  const transports = new Map<string, StreamableHTTPServerTransport>();

  app.all('/mcp', async (req, res) => {
    try {
      const sessionId = req.headers['mcp-session-id'] as string | undefined;

      if (sessionId && transports.has(sessionId)) {
        await transports.get(sessionId)!.handleRequest(req, res, req.body);
      } else if (!sessionId) {
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (id) => transports.set(id, transport)
        });

        transport.onclose = () => {
          if (transport.sessionId) transports.delete(transport.sessionId);
        };

        const server = createServer();
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
      } else {
        res.status(404).json({ error: 'Session not found' });
      }
    } catch (error) {
      console.error('Error in /mcp handler:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', sessions: transports.size });
  });

  app.listen(port, host, () => {
    console.error(`FRED MCP Server: http://${host}:${port}/mcp`);
  });

  return new Promise<void>(() => {});
}
