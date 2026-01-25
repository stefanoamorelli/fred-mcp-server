#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { registerFREDTools } from "./fred/tools.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { randomUUID } from "crypto";
import express, { Request, Response } from "express";
import { Server } from "http";

export type TransportType = "stdio" | "http";

export interface HttpServerResult {
  server: McpServer;
  httpServer: Server;
  transport: StreamableHTTPServerTransport;
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
  console.error("FRED MCP Server starting...");

  try {
    await server.connect(transport);
    console.error("FRED MCP Server running on stdio");

    process.on('SIGINT', () => {
      console.error("Server shutting down...");
      process.exit(0);
    });

    return true;
  } catch (error) {
    console.error("Failed to start server:", error);
    return false;
  }
}

/**
 * Start the MCP server with Streamable HTTP transport
 */
export async function startHttpServer(port: number = 3000): Promise<HttpServerResult> {
  const app = express();
  app.use(express.json());

  const transports: Record<string, StreamableHTTPServerTransport> = {};

  app.post("/mcp", async (req: Request, res: Response) => {
    try {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      let transport: StreamableHTTPServerTransport;

      if (sessionId && transports[sessionId]) {
        transport = transports[sessionId];
      } else if (!sessionId && isInitializeRequest(req.body)) {
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          enableJsonResponse: true,
          onsessioninitialized: (id) => {
            transports[id] = transport;
          }
        });

        transport.onclose = () => {
          const sid = transport.sessionId;
          if (sid && transports[sid]) {
            delete transports[sid];
          }
        };

        const server = createServer();
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        return;
      } else {
        res.status(400).json({
          jsonrpc: "2.0",
          error: { code: -32000, message: "Bad Request: No valid session ID provided" },
          id: null
        });
        return;
      }

      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("Error handling MCP request:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null
        });
      }
    }
  });

  app.get("/mcp", async (req: Request, res: Response) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
      res.status(400).send("Invalid or missing session ID");
      return;
    }
    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
  });

  app.delete("/mcp", async (req: Request, res: Response) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
      res.status(400).send("Invalid or missing session ID");
      return;
    }
    try {
      const transport = transports[sessionId];
      await transport.handleRequest(req, res);
    } catch (error) {
      console.error("Error handling session termination:", error);
      if (!res.headersSent) {
        res.status(500).send("Error processing session termination");
      }
    }
  });

  const httpServer = app.listen(port, () => {
    console.error(`FRED MCP Server running on http://localhost:${port}/mcp`);
  });

  process.on('SIGINT', async () => {
    console.error("Server shutting down...");
    for (const sessionId in transports) {
      try {
        await transports[sessionId].close();
        delete transports[sessionId];
      } catch (error) {
        console.error(`Error closing transport for session ${sessionId}:`, error);
      }
    }
    httpServer.close();
    process.exit(0);
  });

  const placeholderTransport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID()
  });

  return { server: createServer(), httpServer, transport: placeholderTransport };
}

/**
 * Determine transport type from environment or CLI args
 */
export function getTransportConfig(): { type: TransportType; port: number } {
  const args = process.argv.slice(2);
  const httpFlag = args.includes("--http");
  const envTransport = process.env.TRANSPORT?.toLowerCase();

  const type: TransportType = httpFlag || envTransport === "http" ? "http" : "stdio";
  const port = parseInt(process.env.PORT || "3000", 10);

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

if (import.meta.url === `file://${process.argv[1]}` && !TESTING_DISABLED_AUTO_START) {
  main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
  });
}

export { main };
