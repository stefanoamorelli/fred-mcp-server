# Federal Reserve Economic Data MCP Server

[![smithery badge](https://smithery.ai/badge/@stefanoamorelli/fred-mcp-server)](https://smithery.ai/server/@stefanoamorelli/fred-mcp-server)

> [!IMPORTANT]
> *Disclaimer*: This open-source project is not affiliated with, sponsored by, or endorsed by the *Federal Reserve* or the *Federal Reserve Bank of St. Louis*. "FRED" is a registered trademark of the *Federal Reserve Bank of St. Louis*, used here for descriptive purposes only.

A Model Context Protocol (`MCP`) server for accessing Federal Reserve Economic Data ([FRED®](https://fred.stlouisfed.org/)) financial datasets.

--- 

<div align="center">
  <a href="https://www.loom.com/share/33e4f01c3e224fdfa446a0f583ac47a4">
    <p>FRED® MCP Server - Federal Reserve Liquidity Management</p>
  </a>
  <a href="https://www.loom.com/share/33e4f01c3e224fdfa446a0f583ac47a4">
    <img style="max-width:300px;" src="https://cdn.loom.com/sessions/thumbnails/33e4f01c3e224fdfa446a0f583ac47a4-8af8403067354f6a-full-play.gif">
  </a>
</div>

---


> [!TIP]
> If you use this project in your research or work, please cite it using the [CITATION.cff](CITATION.cff) file, or the APA format below:

`Amorelli, S. (2025). Federal Reserve Economic Data MCP (Model Context Protocol) Server [Computer software]. GitHub. https://github.com/stefanoamorelli/fred-mcp-server`


## Installation

### Installing via Smithery

To install Federal Reserve Economic Data Server for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@stefanoamorelli/fred-mcp-server):

```bash
npx -y @smithery/cli install @stefanoamorelli/fred-mcp-server --client claude
```

### Manual Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/stefanoamorelli/fred-mcp-server.git
    cd fred-mcp-server
    ```
2.  Install dependencies:
    ```bash
    pnpm install
    ```
3.  Build the project:
    ```bash
    pnpm build
    ```

## Configuration

This server requires a FRED® API key. You can obtain one from the [FRED® website](https://fred.stlouisfed.org/docs/api/api_key.html).

Install the server, for example, on [Claude Desktop](https://claude.ai/download), modify the `claude_desktop_config.json` file and add the following configuration:

```json
{
  "mcpServers": {
    "FRED MCP Server": {
      "command": "/usr/bin/node",
      "args": [
        "<PATH_TO_YOUR_CLONED_REPO>/fred-mcp-server/build/index.js"
      ],
      "env": {
        "FRED_API_KEY": "<YOUR_API_KEY>"
      }
    }
  }
}
```

## Available Tools

### `RRPONTSYD`

*   **Description**: Retrieve data for *Overnight Reverse Repurchase Agreements* (`RRPONTSYD`) from FRED®.
*   **Parameters**:
    *   `start_date` _(string, optional)_: Start date in `YYYY-MM-DD` format.
    *   `end_date` _(string, optional)_: End date in `YYYY-MM-DD` format.
    *   `limit` _(number, optional)_: Maximum number of observations to return.
    *   `sort_order` _(enum["asc", "desc"], optional)_: Sort order of observations.

### `CPIAUCSL`

*   **Description**: Retrieve data for *Consumer Price Index for All Urban Consumers* (`CPIAUCSL`) from FRED®.
*   **Parameters**:
    *   `start_date` _(string, optional)_: Start date in `YYYY-MM-DD` format.
    *   `end_date` _(string, optional)_: End date in `YYYY-MM-DD` format.
    *   `limit` _(number, optional)_: Maximum number of observations to return.
    *   `sort_order` _(enum["asc", "desc"], optional)_: Sort order of observations.

## 📄 License

[Apache 2.0 License](LICENSE) © 2025 [Stefano Amorelli](https://amorelli.tech)
