import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerSeriesTool, registerDynamicSeriesTool } from "./fred/tools.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
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
    // Register individual series tools
    registerSeriesTool(server, "RRPONTSYD"); // Overnight Reverse Repurchase Agreements
    registerSeriesTool(server, "CPIAUCSL"); // Consumer Price Index
    registerSeriesTool(server, "MORTGAGE30US"); // 30-Year Fixed Rate Mortgage Average
    registerSeriesTool(server, "T10Y2Y"); // 10-Year/2-Year Treasury Yield Spread
    registerSeriesTool(server, "UNRATE"); // Unemployment Rate
    registerSeriesTool(server, "WALCL"); // Federal Reserve Total Assets
    registerSeriesTool(server, "GDP"); // Gross Domestic Product (nominal)
    registerSeriesTool(server, "GDPC1"); // Real Gross Domestic Product (inflation-adjusted)
    registerSeriesTool(server, "DGS10"); // 10-Year Treasury Constant Maturity Rate
    registerSeriesTool(server, "CSUSHPINSA"); // Case-Shiller Home Price Index
    registerSeriesTool(server, "BAMLH0A0HYM2"); // ICE BofA US High Yield Index OAS
    registerSeriesTool(server, "T10YIE"); // 10-Year Breakeven Inflation Rate
    registerSeriesTool(server, "FPCPITOTLZGUSA"); // US Inflation Rate
    registerSeriesTool(server, "M1SL"); // M1 Money Stock
    registerSeriesTool(server, "DRCCLACBS"); // Delinquency Rate on Credit Card Loans
    registerSeriesTool(server, "DFII10"); // 10-Year TIPS Yield (Daily)
    registerSeriesTool(server, "FII10"); // 10-Year TIPS Yield (Monthly)
    registerSeriesTool(server, "WFII10"); // 10-Year TIPS Yield (Weekly)
    registerSeriesTool(server, "RIFLGFCY10XIINA"); // 10-Year TIPS Yield (Annual)
    // To add more series, simply add them here:
    // registerSeriesTool(server, "FEDFUNDS"); // Federal Funds Rate
    // registerSeriesTool(server, "M2SL");     // M2 Money Supply
    // Register the dynamic series lookup tool
    registerDynamicSeriesTool(server);
    return server;
}
/**
 * Connect and start the MCP server
 */
export async function startServer(server, transport) {
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
    }
    catch (error) {
        console.error("Failed to start server:", error);
        return false;
    }
}
/**
 * Main entry point
 */
async function main() {
    const server = createServer();
    const transport = new StdioServerTransport();
    const success = await startServer(server, transport);
    if (!success) {
        process.exit(1);
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
