# FRED MCP Server Integration Prompt

> **Purpose**: Instruct an LLM (Claude Sonnet 4.5) to integrate the FRED MCP Server into an existing fstap application as a **parallel background run** managed by the AI model itself.

---

## CONTEXT

You are integrating the **FRED MCP Server** — a Model Context Protocol server that provides access to 800,000+ Federal Reserve Economic Data (FRED) time series — into an existing fstap application. The FRED MCP will run as a **parallel subprocess** managed by Claude Sonnet 4.5, meaning:

1. The fstap app spawns the FRED MCP server as a child process communicating over **stdio** (stdin/stdout JSON-RPC).
2. Claude Sonnet 4.5 orchestrates when to call FRED tools based on user queries that require economic data.
3. FRED data retrieval happens **in parallel** with other app operations — it does not block the main application flow.
4. Results from FRED are streamed back and integrated into the AI's response context.

---

## FRED MCP SERVER SPECIFICATION

### Installation

The FRED MCP server is an NPM package. Install it in the fstap project:

```bash
npm install fred-mcp-server
# or
pnpm add fred-mcp-server
```

Alternatively, run it via npx without installing:

```bash
npx fred-mcp-server
```

### Runtime Requirements

- **Node.js** >= 18
- **Environment variable**: `FRED_API_KEY` (required) — obtain free from https://fred.stlouisfed.org/docs/api/api_key.html
- **Transport**: stdio (JSON-RPC 2.0 over stdin/stdout)
- **Dependencies**: `@modelcontextprotocol/sdk` ^1.11.2, `zod` ^3.24.4

### How the Server Starts

The server entry point is `build/index.js` (compiled from TypeScript). When executed:

```javascript
// Pseudocode of what happens internally:
const server = new McpServer({
  name: "fred",
  version: "1.0.2",
  description: "Federal Reserve Economic Data (FRED) MCP Server"
});

// Registers 3 tools: fred_browse, fred_search, fred_get_series
registerFREDTools(server);

// Connects to stdio transport (reads stdin, writes stdout)
await server.connect(new StdioServerTransport());
```

The server communicates exclusively over stdin/stdout using the MCP JSON-RPC protocol. It logs diagnostic messages to **stderr** (not stdout), so stderr can be captured for debugging without interfering with the protocol.

---

## THE 3 FRED TOOLS — COMPLETE API REFERENCE

### Tool 1: `fred_search`

**Purpose**: Search for FRED economic data series by keywords, tags, or filters. Use this to discover series IDs.

**When to use**: When the user mentions economic concepts (inflation, GDP, unemployment, interest rates, housing, etc.) and you need to find the correct FRED series ID.

**Parameters** (all optional except when searching):

| Parameter | Type | Description |
|-----------|------|-------------|
| `search_text` | string | Text to search in series titles/descriptions. Example: `"consumer price index"` |
| `search_type` | enum: `"full_text"` \| `"series_id"` | Type of search. Default: full_text |
| `tag_names` | string | Comma-separated tag filter. Example: `"inflation,cpi"` |
| `exclude_tag_names` | string | Comma-separated tags to exclude |
| `limit` | number (1-1000) | Max results. Default: 25 |
| `offset` | number (>=0) | Pagination offset. Default: 0 |
| `order_by` | enum | One of: `search_rank`, `series_id`, `title`, `units`, `frequency`, `seasonal_adjustment`, `realtime_start`, `realtime_end`, `last_updated`, `observation_start`, `observation_end`, `popularity` |
| `sort_order` | enum: `"asc"` \| `"desc"` | Sort direction |
| `filter_variable` | enum: `"frequency"` \| `"units"` \| `"seasonal_adjustment"` | Field to filter on |
| `filter_value` | string | Value to match for filter_variable |

**Response shape**:
```json
{
  "total_results": 1234,
  "showing": "1-25 of 1234",
  "results": [
    {
      "id": "CPIAUCSL",
      "title": "Consumer Price Index for All Urban Consumers: All Items in U.S. City Average",
      "units": "Index 1982-1984=100",
      "frequency": "Monthly",
      "seasonal_adjustment": "Seasonally Adjusted",
      "observation_range": "1947-01-01 to 2024-10-01",
      "last_updated": "2024-11-12 07:06:02-06",
      "popularity": 95,
      "notes": "The Consumer Price Index..."
    }
  ]
}
```

### Tool 2: `fred_get_series`

**Purpose**: Retrieve actual data points for a known FRED series. This is the primary data fetching tool.

**When to use**: After finding a series ID via `fred_search`, or when the user directly references a known series (GDP, UNRATE, CPIAUCSL, etc.).

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `series_id` | string | **YES** | FRED series ID. Examples: `"GDP"`, `"UNRATE"`, `"CPIAUCSL"`, `"DFF"` |
| `observation_start` | string | No | Start date `YYYY-MM-DD` |
| `observation_end` | string | No | End date `YYYY-MM-DD` |
| `limit` | number (1-100000) | No | Max observations to return |
| `offset` | number (>=0) | No | Skip N observations |
| `sort_order` | enum: `"asc"` \| `"desc"` | No | Date sort order |
| `units` | enum | No | Data transformation (see below) |
| `frequency` | enum | No | Frequency conversion (see below) |
| `aggregation_method` | enum: `"avg"` \| `"sum"` \| `"eop"` | No | How to aggregate when changing frequency |
| `output_type` | number (1-4) | No | 1=observations, 2=by vintage, 3=by release, 4=initial release only |
| `vintage_dates` | string | No | Vintage date(s) `YYYY-MM-DD` |

**`units` transformation values**:
- `lin` — Levels (no transformation, default)
- `chg` — Change from previous period
- `ch1` — Change from year ago
- `pch` — Percent change from previous period
- `pc1` — Percent change from year ago
- `pca` — Compounded annual rate of change
- `cch` — Continuously compounded rate of change
- `cca` — Continuously compounded annual rate of change
- `log` — Natural logarithm

**`frequency` conversion values**:
- `d` — Daily
- `w` — Weekly (ending Friday by default)
- `bw` — Biweekly
- `m` — Monthly
- `q` — Quarterly
- `sa` — Semiannual
- `a` — Annual
- `wef`/`weth`/`wew`/`wetu`/`wem`/`wesu`/`wesa` — Weekly ending on specific day
- `bwew`/`bwem` — Biweekly ending on specific day

**Response shape**:
```json
{
  "series_id": "GDP",
  "title": "Gross Domestic Product",
  "units": "Billions of Dollars",
  "frequency": "Quarterly",
  "seasonal_adjustment": "Seasonally Adjusted Annual Rate",
  "observation_range": "1947-01-01 to 2024-07-01",
  "total_observations": 312,
  "data_offset": 0,
  "data_limit": 100000,
  "source": "Federal Reserve Economic Data (FRED)",
  "notes": "BEA Account Code: A191RC...",
  "data": [
    {"date": "2023-01-01", "value": 26813.601},
    {"date": "2023-04-01", "value": 27063.012},
    {"date": "2023-07-01", "value": 27610.128}
  ]
}
```

**Important**: Data values of `"."` in the raw FRED API are converted to `null` (missing data).

### Tool 3: `fred_browse`

**Purpose**: Navigate FRED's hierarchical catalog of categories, releases, and data sources.

**When to use**: When the user wants to explore what data is available, find series within a topic area, or understand FRED's organizational structure.

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `browse_type` | enum | **YES** | One of: `"categories"`, `"releases"`, `"sources"`, `"category_series"`, `"release_series"` |
| `category_id` | number | For categories/category_series | FRED category ID |
| `release_id` | number | For release_series | FRED release ID |
| `limit` | number (1-1000) | No | Max results. Default: 50 |
| `offset` | number (>=0) | No | Pagination offset. Default: 0 |
| `order_by` | string | No | Field to order by |
| `sort_order` | enum: `"asc"` \| `"desc"` | No | Sort direction |

**Browse type behaviors**:
- `"categories"` — Without `category_id`: returns root categories. With `category_id`: returns child categories.
- `"category_series"` — Requires `category_id`. Returns all series in that category.
- `"releases"` — Lists all FRED data releases (publication schedules).
- `"release_series"` — Requires `release_id`. Returns all series in that release.
- `"sources"` — Lists all data sources (BLS, BEA, Census, etc.).

---

## COMMON FRED SERIES IDS (pre-known, no search needed)

| ID | Name | Frequency |
|----|------|-----------|
| `GDP` | Gross Domestic Product | Quarterly |
| `UNRATE` | Unemployment Rate | Monthly |
| `CPIAUCSL` | Consumer Price Index (All Urban Consumers) | Monthly |
| `DFF` | Federal Funds Effective Rate | Daily |
| `DEXUSEU` | US/Euro Exchange Rate | Daily |
| `HOUST` | Housing Starts | Monthly |
| `PAYEMS` | Nonfarm Payrolls | Monthly |
| `M2SL` | M2 Money Supply | Monthly |
| `DGS10` | 10-Year Treasury Constant Maturity Rate | Daily |
| `MORTGAGE30US` | 30-Year Fixed Rate Mortgage Average | Weekly |
| `FEDFUNDS` | Federal Funds Rate | Monthly |
| `SP500` | S&P 500 Index | Daily |
| `RRPONTSYD` | Overnight Reverse Repo (Treasury) | Daily |

---

## IMPLEMENTATION INSTRUCTIONS

### Step 1: Spawn the FRED MCP Server as a Child Process

In your fstap application, spawn the FRED MCP server as a stdio subprocess. The server reads JSON-RPC requests from its stdin and writes JSON-RPC responses to its stdout.

```typescript
import { spawn } from "child_process";

// Spawn the FRED MCP server as a child process
const fredProcess = spawn("npx", ["fred-mcp-server"], {
  env: {
    ...process.env,
    FRED_API_KEY: process.env.FRED_API_KEY // Must be set
  },
  stdio: ["pipe", "pipe", "pipe"] // stdin, stdout, stderr all piped
});

// stderr is for diagnostics only — log it, don't parse it as MCP
fredProcess.stderr.on("data", (data) => {
  console.log(`[FRED MCP debug]: ${data.toString()}`);
});
```

### Step 2: Use the MCP SDK Client to Connect

Rather than manually constructing JSON-RPC messages, use the `@modelcontextprotocol/sdk` client:

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// Create the transport connected to the child process
const transport = new StdioClientTransport({
  command: "npx",
  args: ["fred-mcp-server"],
  env: {
    FRED_API_KEY: process.env.FRED_API_KEY
  }
});

// Create MCP client
const mcpClient = new Client({
  name: "fstap-app",
  version: "1.0.0"
});

// Connect
await mcpClient.connect(transport);

// Now you can call tools:
const result = await mcpClient.callTool({
  name: "fred_get_series",
  arguments: {
    series_id: "GDP",
    observation_start: "2023-01-01"
  }
});

console.log(result.content); // [{type: "text", text: "...JSON..."}]
```

### Step 3: Wire Claude Sonnet 4.5 as the Orchestrator

Claude Sonnet 4.5 should be configured with the FRED tools in its tool definitions so it can decide when to call them. The fstap app acts as the bridge:

```
User Query
    ↓
fstap app receives query
    ↓
Sends query to Claude Sonnet 4.5 with FRED tools declared
    ↓
Claude decides: does this need economic data?
    ├── YES → Claude returns tool_use block for fred_search / fred_get_series / fred_browse
    │         ↓
    │         fstap app forwards tool call to FRED MCP subprocess (parallel, non-blocking)
    │         ↓
    │         FRED MCP returns data
    │         ↓
    │         fstap app sends tool_result back to Claude
    │         ↓
    │         Claude incorporates data into response
    │
    └── NO → Claude responds directly without FRED data
```

### Step 4: Declare FRED Tools for Claude Sonnet 4.5

When calling the Anthropic API with Claude Sonnet 4.5, declare the 3 FRED tools:

```typescript
const tools = [
  {
    name: "fred_search",
    description: "Search for FRED economic data series by keywords, tags, or filters. Returns matching series with their IDs, titles, and metadata. Use this to find the correct series ID when the user asks about economic indicators, rates, indices, or any Federal Reserve data.",
    input_schema: {
      type: "object",
      properties: {
        search_text: {
          type: "string",
          description: "Text to search for in series titles and descriptions"
        },
        search_type: {
          type: "string",
          enum: ["full_text", "series_id"],
          description: "Type of search to perform"
        },
        tag_names: {
          type: "string",
          description: "Comma-separated list of tag names to filter by"
        },
        exclude_tag_names: {
          type: "string",
          description: "Comma-separated list of tag names to exclude"
        },
        limit: {
          type: "number",
          description: "Maximum number of results (1-1000, default 25)"
        },
        offset: {
          type: "number",
          description: "Pagination offset (default 0)"
        },
        order_by: {
          type: "string",
          enum: ["search_rank", "series_id", "title", "units", "frequency", "seasonal_adjustment", "realtime_start", "realtime_end", "last_updated", "observation_start", "observation_end", "popularity"],
          description: "Field to order results by"
        },
        sort_order: {
          type: "string",
          enum: ["asc", "desc"],
          description: "Sort direction"
        },
        filter_variable: {
          type: "string",
          enum: ["frequency", "units", "seasonal_adjustment"],
          description: "Variable to filter by"
        },
        filter_value: {
          type: "string",
          description: "Value to filter the variable by"
        }
      },
      required: []
    }
  },
  {
    name: "fred_get_series",
    description: "Retrieve actual economic data for any FRED series by its ID. Returns time-series observations with dates and values. Supports date ranges, data transformations (percent change, log, etc.), and frequency conversions. Use after finding a series ID via fred_search, or directly for well-known series like GDP, UNRATE, CPIAUCSL, DFF, DGS10.",
    input_schema: {
      type: "object",
      properties: {
        series_id: {
          type: "string",
          description: "The FRED series ID (e.g., 'GDP', 'UNRATE', 'CPIAUCSL', 'DFF', 'DGS10')"
        },
        observation_start: {
          type: "string",
          description: "Start date in YYYY-MM-DD format"
        },
        observation_end: {
          type: "string",
          description: "End date in YYYY-MM-DD format"
        },
        limit: {
          type: "number",
          description: "Maximum observations to return (1-100000)"
        },
        offset: {
          type: "number",
          description: "Number of observations to skip"
        },
        sort_order: {
          type: "string",
          enum: ["asc", "desc"],
          description: "Sort order by date"
        },
        units: {
          type: "string",
          enum: ["lin", "chg", "ch1", "pch", "pc1", "pca", "cch", "cca", "log"],
          description: "Data transformation: lin=levels, chg=change, ch1=change from year ago, pch=percent change, pc1=percent change from year ago, pca=compounded annual rate, cch=continuously compounded, log=natural log"
        },
        frequency: {
          type: "string",
          enum: ["d", "w", "bw", "m", "q", "sa", "a", "wef", "weth", "wew", "wetu", "wem", "wesu", "wesa", "bwew", "bwem"],
          description: "Frequency aggregation: d=daily, w=weekly, bw=biweekly, m=monthly, q=quarterly, sa=semiannual, a=annual"
        },
        aggregation_method: {
          type: "string",
          enum: ["avg", "sum", "eop"],
          description: "Aggregation method when changing frequency: avg=average, sum=sum, eop=end of period"
        },
        output_type: {
          type: "number",
          enum: [1, 2, 3, 4],
          description: "Output format: 1=observations, 2=by vintage, 3=by release, 4=initial release only"
        },
        vintage_dates: {
          type: "string",
          description: "Vintage date(s) in YYYY-MM-DD format"
        }
      },
      required: ["series_id"]
    }
  },
  {
    name: "fred_browse",
    description: "Browse FRED's complete catalog of 800,000+ economic series organized by categories, releases, or data sources. Use 'categories' to explore the topic tree, 'releases' for publication schedules, 'sources' for data providers, 'category_series' to list all series in a category, 'release_series' to list all series in a release.",
    input_schema: {
      type: "object",
      properties: {
        browse_type: {
          type: "string",
          enum: ["categories", "releases", "sources", "category_series", "release_series"],
          description: "Type of browsing: categories (topic tree), releases (publication schedules), sources (data providers), category_series (series in a category), release_series (series in a release)"
        },
        category_id: {
          type: "number",
          description: "Category ID (required for 'categories' children lookup and 'category_series')"
        },
        release_id: {
          type: "number",
          description: "Release ID (required for 'release_series')"
        },
        limit: {
          type: "number",
          description: "Maximum results (1-1000, default 50)"
        },
        offset: {
          type: "number",
          description: "Pagination offset (default 0)"
        },
        order_by: {
          type: "string",
          description: "Field to order by"
        },
        sort_order: {
          type: "string",
          enum: ["asc", "desc"],
          description: "Sort direction"
        }
      },
      required: ["browse_type"]
    }
  }
];
```

### Step 5: Implement the Parallel Execution Loop

The key architectural pattern: Claude Sonnet 4.5 may issue FRED tool calls that should execute in parallel with other operations. Here is the recommended execution loop:

```typescript
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

async function handleUserQuery(userMessage: string, conversationHistory: any[]) {
  // Add user message to history
  conversationHistory.push({ role: "user", content: userMessage });

  // Call Claude Sonnet 4.5 with FRED tools available
  let response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20241022",
    max_tokens: 4096,
    system: `You are an AI assistant with access to Federal Reserve Economic Data (FRED)
through 3 tools: fred_search, fred_get_series, and fred_browse.

When users ask about economic data, indicators, rates, or trends:
1. If you know the series ID (e.g., GDP, UNRATE, CPIAUCSL), call fred_get_series directly.
2. If you need to discover the right series, call fred_search first.
3. Use fred_browse to explore categories when the user wants to see what's available.

Always specify reasonable date ranges to avoid returning excessive data.
For recent data, use observation_start with a date from the last 1-2 years.
Present data clearly with context about what it means economically.`,
    messages: conversationHistory,
    tools: tools // The 3 FRED tools defined above
  });

  // Process tool calls in a loop until Claude gives a final response
  while (response.stop_reason === "tool_use") {
    const toolUseBlocks = response.content.filter(
      (block) => block.type === "tool_use"
    );

    // Execute ALL tool calls in parallel (this is the key parallel pattern)
    const toolResults = await Promise.all(
      toolUseBlocks.map(async (toolUse) => {
        try {
          // Forward the tool call to the FRED MCP subprocess
          const mcpResult = await mcpClient.callTool({
            name: toolUse.name,
            arguments: toolUse.input
          });

          return {
            type: "tool_result" as const,
            tool_use_id: toolUse.id,
            content: mcpResult.content[0].text
          };
        } catch (error) {
          return {
            type: "tool_result" as const,
            tool_use_id: toolUse.id,
            content: `Error: ${error.message}`,
            is_error: true
          };
        }
      })
    );

    // Add Claude's response and tool results to conversation
    conversationHistory.push({ role: "assistant", content: response.content });
    conversationHistory.push({ role: "user", content: toolResults });

    // Get Claude's next response (may issue more tool calls or give final answer)
    response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20241022",
      max_tokens: 4096,
      system: `You are an AI assistant with access to Federal Reserve Economic Data (FRED).`,
      messages: conversationHistory,
      tools: tools
    });
  }

  // Final text response from Claude
  const textContent = response.content.find((block) => block.type === "text");
  conversationHistory.push({ role: "assistant", content: response.content });

  return textContent?.text || "";
}
```

### Step 6: Lifecycle Management

Ensure the FRED MCP subprocess is properly managed:

```typescript
// Start FRED MCP when the app starts
async function initFredMcp() {
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["fred-mcp-server"],
    env: { FRED_API_KEY: process.env.FRED_API_KEY }
  });

  const client = new Client({ name: "fstap-app", version: "1.0.0" });
  await client.connect(transport);

  // Verify tools are available
  const toolsList = await client.listTools();
  console.log(`FRED MCP connected with ${toolsList.tools.length} tools`);

  return client;
}

// Graceful shutdown
async function shutdownFredMcp(client: Client) {
  await client.close();
}

// Health check
async function checkFredHealth(client: Client) {
  try {
    // Quick search to verify the connection works
    const result = await client.callTool({
      name: "fred_search",
      arguments: { search_text: "GDP", limit: 1 }
    });
    return result.content.length > 0;
  } catch {
    return false;
  }
}
```

---

## PARALLEL RUN ARCHITECTURE

The FRED MCP server should be treated as one of potentially several MCP servers running in parallel. The recommended architecture:

```
┌─────────────────────────────────────────────────┐
│                  fstap Application               │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │         Claude Sonnet 4.5                 │   │
│  │         (Orchestrator)                    │   │
│  │                                           │   │
│  │  Receives user query                      │   │
│  │  Decides which tools to call              │   │
│  │  May call multiple tools in parallel      │   │
│  │  Synthesizes results into final answer    │   │
│  └──────┬──────────┬──────────┬─────────────┘   │
│         │          │          │                   │
│         ▼          ▼          ▼                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐     │
│  │ FRED MCP │ │ Other    │ │ App-native   │     │
│  │ Server   │ │ MCP      │ │ tools        │     │
│  │ (stdio)  │ │ Servers  │ │ (DB, API)    │     │
│  │          │ │ (stdio)  │ │              │     │
│  └──────────┘ └──────────┘ └──────────────┘     │
│       │                                          │
│       ▼                                          │
│  FRED API (api.stlouisfed.org)                   │
└─────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Parallel tool execution**: When Claude issues multiple tool_use blocks in a single response, execute them ALL concurrently with `Promise.all()`. This is especially important when Claude wants to fetch multiple series simultaneously (e.g., GDP + UNRATE + CPI for a macro overview).

2. **Subprocess isolation**: The FRED MCP runs in its own process. If it crashes, the main app continues. Implement reconnection logic:

```typescript
async function getOrReconnectFredClient() {
  if (!fredClient || !isConnected) {
    fredClient = await initFredMcp();
  }
  return fredClient;
}
```

3. **Timeout handling**: FRED API calls typically complete in 1-3 seconds. Set a reasonable timeout:

```typescript
const result = await Promise.race([
  mcpClient.callTool({ name: toolName, arguments: toolArgs }),
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error("FRED MCP timeout after 15s")), 15000)
  )
]);
```

4. **Caching layer** (optional but recommended): FRED data for many series updates infrequently (monthly, quarterly). Cache results keyed by `(tool_name, arguments_hash, date)`:

```typescript
const cacheKey = `${toolName}:${JSON.stringify(toolArgs)}:${new Date().toISOString().slice(0, 10)}`;
const cached = cache.get(cacheKey);
if (cached) return cached;
```

---

## ERROR HANDLING

The FRED MCP server throws descriptive errors. Handle them gracefully:

| Error | Cause | Action |
|-------|-------|--------|
| `FRED API error (403)` | Invalid or missing API key | Check `FRED_API_KEY` env var |
| `FRED API error (429)` | Rate limited (120 req/min) | Implement backoff, reduce parallel calls |
| `Series XXXXX not found` | Invalid series ID | Use `fred_search` to find correct ID |
| `category_id is required` | Missing param for category_series | Ensure category_id is provided |
| `release_id is required` | Missing param for release_series | Ensure release_id is provided |
| Connection refused | MCP process not running | Restart subprocess |

### FRED API Rate Limits

- **120 requests per minute** per API key
- If making many parallel calls, implement a semaphore or rate limiter
- Consider batching: fetch one series with a wide date range rather than many narrow fetches

---

## SYSTEM PROMPT GUIDANCE FOR CLAUDE SONNET 4.5

When configuring Claude Sonnet 4.5 as the orchestrator, use this system prompt pattern:

```
You have access to Federal Reserve Economic Data (FRED) through three tools:

1. **fred_search** — Find series by keyword, tag, or filter. Use when you need to discover
   which series ID corresponds to an economic concept.

2. **fred_get_series** — Fetch actual data points for a series. Use after identifying the
   series ID. Always constrain date ranges to avoid excessive data.

3. **fred_browse** — Explore FRED's catalog by category, release, or source. Use when the
   user wants to explore what data is available.

**Common series you can fetch directly without searching:**
- GDP (Gross Domestic Product, quarterly)
- UNRATE (Unemployment Rate, monthly)
- CPIAUCSL (Consumer Price Index, monthly)
- DFF (Fed Funds Rate, daily)
- DGS10 (10-Year Treasury, daily)
- MORTGAGE30US (30-Year Mortgage, weekly)
- PAYEMS (Nonfarm Payrolls, monthly)
- M2SL (M2 Money Supply, monthly)
- SP500 (S&P 500, daily)
- HOUST (Housing Starts, monthly)

**Best practices:**
- For recent trends, use observation_start with a date 1-2 years back
- Use `units: "pch"` for percent change analysis
- Use `units: "pc1"` for year-over-year comparisons
- Use `frequency` to convert daily data to monthly/quarterly for cleaner analysis
- When comparing series, fetch them in parallel (multiple tool calls in one response)
- Present data with economic context — explain what the numbers mean
- Note seasonal adjustments when relevant
```

---

## TESTING THE INTEGRATION

After implementation, verify with these test scenarios:

### Test 1: Direct series fetch
User: "What's the current GDP?"
Expected: Claude calls `fred_get_series` with `series_id: "GDP"`, recent date range.

### Test 2: Search then fetch
User: "Show me data on consumer confidence"
Expected: Claude calls `fred_search` with `search_text: "consumer confidence"`, then `fred_get_series` with the discovered series ID.

### Test 3: Parallel fetches
User: "Compare inflation and unemployment trends over the past year"
Expected: Claude calls `fred_get_series` for BOTH `CPIAUCSL` (with `units: "pc1"`) AND `UNRATE` in the same response (parallel tool calls).

### Test 4: Browse
User: "What economic categories does FRED have?"
Expected: Claude calls `fred_browse` with `browse_type: "categories"`.

### Test 5: Error recovery
User: "Get data for series NOTREAL123"
Expected: FRED returns error, Claude explains the series wasn't found and suggests searching.

---

## DEPENDENCIES TO ADD TO YOUR FSTAP PROJECT

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.39.0",
    "@modelcontextprotocol/sdk": "^1.11.2",
    "fred-mcp-server": "^1.0.2"
  }
}
```

Environment variables required:
```bash
ANTHROPIC_API_KEY=sk-ant-...     # For Claude Sonnet 4.5
FRED_API_KEY=your-fred-key-here  # For FRED API (free from fred.stlouisfed.org)
```
