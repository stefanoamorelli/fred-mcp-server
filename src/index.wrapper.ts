/**
 * This file is a testable wrapper around index.ts
 * This pattern helps overcome the ESM module limitations in Jest
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as fredServer from "./index.js";

/**
 * Wrapper class for the FRED MCP Server
 * Designed to be easily tested by providing mocking points
 */
export class FREDServerWrapper {
  // References to dependency functions
  private _createServer: () => McpServer;
  private _startServer: (server: McpServer, transport: StdioServerTransport) => Promise<boolean>;
  
  // Store server and transport as instance variables
  private _server: McpServer | null = null;
  private _transport: StdioServerTransport | null = null;
  
  /**
   * Create a new wrapper for the FRED server
   * Allows for dependency injection during tests
   */
  constructor(
    createServerFn = fredServer.createServer,
    startServerFn = fredServer.startServer
  ) {
    this._createServer = createServerFn;
    this._startServer = startServerFn;
  }
  
  /**
   * Get access to the server instance
   */
  get server(): McpServer | null {
    return this._server;
  }
  
  /**
   * Create the server instance
   */
  initialize(): McpServer {
    this._server = this._createServer();
    return this._server;
  }
  
  /**
   * Start the server with the given transport
   * If no transport is provided, a new StdioServerTransport is created
   */
  async start(transport?: StdioServerTransport): Promise<boolean> {
    if (!this._server) {
      this.initialize();
    }
    
    this._transport = transport || new StdioServerTransport();
    
    // Start the server
    return await this._startServer(this._server!, this._transport);
  }
  
  /**
   * Convenience method to create and start the server in one step
   */
  async createAndStart(): Promise<boolean> {
    this.initialize();
    return await this.start();
  }
}

/**
 * Main entry point when this file is executed directly
 */
async function main() {
  const wrapper = new FREDServerWrapper();
  const success = await wrapper.createAndStart();
  if (!success) {
    process.exit(1);
  }
}

// Only run the main function if this file is executed directly
if (fredServer.isMainModule(import.meta.url)) {
  main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
  });
}

export default new FREDServerWrapper();
