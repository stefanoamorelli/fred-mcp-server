#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { registerFREDTools } from "./fred/tools.js";
import { getHttpConfig } from "./common/config.js";
import { logger } from "./common/logger.js";
import { getRequestStats } from "./common/request.js";
import { SessionManager } from "./http/session-manager.js";
import { readFileSync, realpathSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";
import { randomUUID } from "crypto";
import express, { Request, Response } from "express";
import { Server } from "http";

export type TransportType = "stdio" | "http";

export interface HttpServerResult {
  server: McpServer;
  httpServer: Server;
  transport: StreamableHTTPServerTransport;
  sessions: SessionManager;
  /** Gracefully close all sessions and the HTTP listener. */
  close: () => Promise<void>;
}

/**
 * Create and configure a new FRED MCP server
 */
export function createServer() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const packageJsonPath = join(__dirname, "..", "package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

  const server = new McpServer({
    name: "fred",
    version: packageJson.version,
    description: "Federal Reserve Economic Data (FRED) MCP Server for retrieving economic data series"
  });

  registerFREDTools(server);

  return server;
}

/**
 * Connect and start the MCP server with stdio transport
 */
export async function startServer(server: McpServer, transport: StdioServerTransport) {
  logger.info("FRED MCP Server starting...");

  try {
    await server.connect(transport);
    logger.info("FRED MCP Server running on stdio");

    const shutdown = () => {
      logger.info("Server shutting down...");
      process.exit(0);
    };
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);

    return true;
  } catch (error) {
    logger.error("Failed to start server:", error);
    return false;
  }
}

/**
 * Start the MCP server with Streamable HTTP transport.
 *
 * Sessions are bounded (MCP_MAX_SESSIONS) and idle sessions are reaped
 * (MCP_SESSION_TTL_MS) so long-running deployments don't leak memory.
 */
export async function startHttpServer(port?: number): Promise<HttpServerResult> {
  const config = getHttpConfig();
  const listenPort = port ?? config.port;

  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: config.bodyLimit }));

  const sessions = new SessionManager(config.maxSessions, config.sessionTtlMs);
  sessions.startSweeper(config.sessionSweepIntervalMs);

  app.get("/healthz", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      sessions: sessions.size,
      fred: getRequestStats(),
      uptime_seconds: Math.round(process.uptime()),
    });
  });

  app.post("/mcp", async (req: Request, res: Response) => {
    try {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;

      if (sessionId) {
        const transport = sessions.get(sessionId);
        if (!transport) {
          res.status(404).json({
            jsonrpc: "2.0",
            error: { code: -32001, message: "Session not found or expired" },
            id: null
          });
          return;
        }
        await transport.handleRequest(req, res, req.body);
        return;
      }

      if (!isInitializeRequest(req.body)) {
        res.status(400).json({
          jsonrpc: "2.0",
          error: { code: -32000, message: "Bad Request: No valid session ID provided" },
          id: null
        });
        return;
      }

      if (!sessions.hasCapacity) {
        res.status(503).json({
          jsonrpc: "2.0",
          error: { code: -32000, message: "Server at capacity: too many active sessions" },
          id: null
        });
        return;
      }

      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        enableJsonResponse: true,
        onsessioninitialized: (id) => {
          sessions.add(id, transport);
          logger.debug(`Session initialized: ${id} (${sessions.size} active)`);
        }
      });

      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid) sessions.delete(sid);
      };

      const server = createServer();
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      logger.error("Error handling MCP request:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null
        });
      }
    }
  });

  const handleSessionRequest = async (req: Request, res: Response) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    const transport = sessionId ? sessions.get(sessionId) : undefined;
    if (!transport) {
      res.status(400).send("Invalid or missing session ID");
      return;
    }
    try {
      await transport.handleRequest(req, res);
    } catch (error) {
      logger.error("Error handling session request:", error);
      if (!res.headersSent) {
        res.status(500).send("Error processing request");
      }
    }
  };

  app.get("/mcp", handleSessionRequest);
  app.delete("/mcp", handleSessionRequest);

  const httpServer = await new Promise<Server>((resolve, reject) => {
    // Without HOST, listen on all interfaces (dual-stack) so IPv6 loopback
    // clients can connect; Node 18's fetch resolves localhost to ::1
    const onListen = () => {
      logger.info(`FRED MCP Server running on http://${config.host || "localhost"}:${listenPort}/mcp`);
      resolve(s);
    };
    const s = config.host
      ? app.listen(listenPort, config.host, onListen)
      : app.listen(listenPort, onListen);
    s.once("error", reject);
  });

  const close = async () => {
    await sessions.closeAll();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  };

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    try {
      await close();
    } catch (error) {
      logger.error("Error during shutdown:", error);
    }
    process.exit(0);
  };
  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));

  // Kept for interface compatibility: callers inspect a transport instance
  const placeholderTransport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID()
  });

  return { server: createServer(), httpServer, transport: placeholderTransport, sessions, close };
}

/**
 * Determine transport type from environment or CLI args
 */
export function getTransportConfig(): { type: TransportType; port: number } {
  const args = process.argv.slice(2);
  const httpFlag = args.includes("--http");
  const envTransport = process.env.TRANSPORT?.toLowerCase();

  const type: TransportType = httpFlag || envTransport === "http" ? "http" : "stdio";
  const port = getHttpConfig().port;

  return { type, port };
}

/**
 * Main entry point
 */
async function main() {
  const config = getTransportConfig();

  if (config.type === "http") {
    await startHttpServer(config.port);
  } else {
    const server = createServer();
    const transport = new StdioServerTransport();
    const success = await startServer(server, transport);
    if (!success) {
      process.exit(1);
    }
  }
}

export const TESTING_DISABLED_AUTO_START = false;

/**
 * Resolve symlinks so a path can be compared to another. npm installs the bin
 * entry as a symlink (node_modules/.bin/fred-mcp-server), and Node reports the
 * real path in import.meta.url while process.argv[1] keeps the symlink, so the
 * two only match once both sides are resolved. Falls back to the original path
 * when it does not exist on disk.
 */
function toRealPath(path: string): string {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
}

export function isMainModule(moduleUrl: string, argvPath = process.argv[1]): boolean {
  return argvPath ? toRealPath(fileURLToPath(moduleUrl)) === toRealPath(resolve(argvPath)) : false;
}

if (isMainModule(import.meta.url) && !TESTING_DISABLED_AUTO_START) {
  main().catch((error) => {
    logger.error("Fatal error in main():", error);
    process.exit(1);
  });
}

export { main };
