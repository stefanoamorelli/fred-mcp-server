#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerFREDTools } from "./fred/tools.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { startHttpServer } from "./http-server.js";

/**
 * Create and configure a new FRED MCP server
 */
export function createServer() {
  // Get package.json version
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const packageJsonPath = join(__dirname, "..", "package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

  /**
   * Main FRED MCP Server
   *
   * Provides access to Federal Reserve Economic Data through the
   * Model Context Protocol
   */
  const server = new McpServer({
    name: "fred",
    version: packageJson.version,
    description: "Federal Reserve Economic Data (FRED) MCP Server for retrieving economic data series"
  });

  // Register FRED tools
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

    // Keep the process running
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

const TRANSPORT_STDIO = 'stdio' as const;
const TRANSPORT_STREAMABLE_HTTP = 'streamable-http' as const;

const CLI_FLAG_STREAMABLE_HTTP = '--streamable-http';
const CLI_FLAG_PORT = '--port=';
const CLI_FLAG_HOST = '--host=';

const ENV_TRANSPORT = 'FRED_MCP_TRANSPORT';
const ENV_PORT = 'PORT';
const ENV_HOST = 'HOST';

const DEFAULT_PORT = 3000;
const DEFAULT_HOST = '0.0.0.0';

type TransportType = typeof TRANSPORT_STDIO | typeof TRANSPORT_STREAMABLE_HTTP;

interface ServerConfig {
  transport: TransportType;
  port?: number;
  host?: string;
}

function parseConfig(): ServerConfig {
  const args = process.argv.slice(2);

  const getArgValue = (prefix: string) =>
    args.find(arg => arg.startsWith(prefix))?.split('=')[1];

  const useStreamableHttp =
    args.includes(CLI_FLAG_STREAMABLE_HTTP) ||
    process.env[ENV_TRANSPORT] === TRANSPORT_STREAMABLE_HTTP;

  return {
    transport: useStreamableHttp ? TRANSPORT_STREAMABLE_HTTP : TRANSPORT_STDIO,
    port: getArgValue(CLI_FLAG_PORT) ? parseInt(getArgValue(CLI_FLAG_PORT)!, 10) : undefined,
    host: getArgValue(CLI_FLAG_HOST)
  };
}

async function main() {
  const config = parseConfig();

  if (config.transport === TRANSPORT_STREAMABLE_HTTP) {
    await startHttpServer({ port: config.port, host: config.host });
  } else {
    const server = createServer();
    const transport = new StdioServerTransport();
    const success = await startServer(server, transport);
    if (!success) process.exit(1);
  }
}

// Flag to control execution for testing
export const TESTING_DISABLED_AUTO_START = false;

// Only run the main function if this file is executed directly
// and the testing flag is not set
if (import.meta.url === `file://${process.argv[1]}` && !TESTING_DISABLED_AUTO_START) {
  main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
  });
}

// Export main for testing
export { main };
