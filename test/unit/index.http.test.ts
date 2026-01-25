import { describe, expect, test, jest, beforeEach, afterEach } from '@jest/globals';
import { startHttpServer, getTransportConfig } from '../../src/index.js';

describe('HTTP Transport', () => {
  const originalEnv = process.env;
  const originalArgv = process.argv;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.argv = [...originalArgv];
  });

  afterEach(() => {
    process.env = originalEnv;
    process.argv = originalArgv;
  });

  describe('getTransportConfig', () => {
    test('defaults to stdio transport', () => {
      process.argv = ['node', 'index.js'];
      const config = getTransportConfig();
      expect(config.type).toBe('stdio');
      expect(config.port).toBe(3000);
    });

    test('uses http transport when --http flag is provided', () => {
      process.argv = ['node', 'index.js', '--http'];
      const config = getTransportConfig();
      expect(config.type).toBe('http');
    });

    test('uses http transport when TRANSPORT env is set', () => {
      process.env.TRANSPORT = 'http';
      process.argv = ['node', 'index.js'];
      const config = getTransportConfig();
      expect(config.type).toBe('http');
    });

    test('uses custom port from PORT env', () => {
      process.env.PORT = '8080';
      process.argv = ['node', 'index.js'];
      const config = getTransportConfig();
      expect(config.port).toBe(8080);
    });
  });

  describe('startHttpServer', () => {
    let serverResult: Awaited<ReturnType<typeof startHttpServer>> | null = null;

    afterEach(async () => {
      if (serverResult) {
        serverResult.httpServer.close();
        serverResult = null;
      }
    });

    test('starts server on specified port', async () => {
      const port = 3456;
      serverResult = await startHttpServer(port);

      expect(serverResult.httpServer).toBeDefined();
      expect(serverResult.server).toBeDefined();
      expect(serverResult.transport).toBeDefined();

      const address = serverResult.httpServer.address();
      expect(address).not.toBeNull();
      if (typeof address === 'object' && address !== null) {
        expect(address.port).toBe(port);
      }
    });

    test('responds to MCP initialize request', async () => {
      const port = 3457;
      serverResult = await startHttpServer(port);

      const response = await fetch(`http://localhost:${port}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: {
              name: 'test-client',
              version: '1.0.0'
            }
          }
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('result');
      expect(data.result).toHaveProperty('serverInfo');
      expect(data.result.serverInfo.name).toBe('fred');
    });

    test('responds to tools/list request with session', async () => {
      const port = 3458;
      serverResult = await startHttpServer(port);

      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      };

      // Initialize and get session ID
      const initResponse = await fetch(`http://localhost:${port}/mcp`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test-client', version: '1.0.0' }
          }
        })
      });

      const sessionId = initResponse.headers.get('mcp-session-id');
      expect(sessionId).toBeTruthy();

      // Send initialized notification
      await fetch(`http://localhost:${port}/mcp`, {
        method: 'POST',
        headers: { ...headers, 'mcp-session-id': sessionId! },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'notifications/initialized'
        })
      });

      // List tools
      const response = await fetch(`http://localhost:${port}/mcp`, {
        method: 'POST',
        headers: { ...headers, 'mcp-session-id': sessionId! },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/list'
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('result');
      expect(data.result).toHaveProperty('tools');
      expect(Array.isArray(data.result.tools)).toBe(true);

      const toolNames = data.result.tools.map((t: { name: string }) => t.name);
      expect(toolNames).toContain('fred_search');
      expect(toolNames).toContain('fred_get_series');
      expect(toolNames).toContain('fred_browse');
    });

    test('rejects request without session ID for non-init requests', async () => {
      const port = 3459;
      serverResult = await startHttpServer(port);

      const response = await fetch(`http://localhost:${port}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list'
        })
      });

      expect(response.status).toBe(400);
    });
  });
});
