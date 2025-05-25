# Federal Reserve Economic Data MCP Server

[![smithery badge](https://smithery.ai/badge/@stefanoamorelli/fred-mcp-server)](https://smithery.ai/server/@stefanoamorelli/fred-mcp-server)

> [!IMPORTANT]
> *Disclaimer*: This open-source project is not affiliated with, sponsored by, or endorsed by the *Federal Reserve* or the *Federal Reserve Bank of St. Louis*. "FRED" is a registered trademark of the *Federal Reserve Bank of St. Louis*, used here for descriptive purposes only.

A Model Context Protocol (`MCP`) server for accessing Federal Reserve Economic Data ([FRED®](https://fred.stlouisfed.org/)) financial datasets.

https://github.com/user-attachments/assets/66c7f3ad-7b0e-4930-b1c5-a675a7eb1e09

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

All tools support the same optional parameters:

* `start_date` (`YYYY-MM-DD`)
* `end_date` (`YYYY-MM-DD`)
* `limit` – maximum number of observations
* `sort_order` – either `asc` or `desc`

Use the toggles below to view a description of each tool.

<details>
<summary>`RRPONTSYD` – Overnight Reverse Repurchase Agreements</summary>

Retrieve data for *Overnight Reverse Repurchase Agreements* (`RRPONTSYD`)

</details>

<details>
<summary>`CPIAUCSL` – Consumer Price Index for All Urban Consumers</summary>

Retrieve data for *Consumer Price Index for All Urban Consumers* (`CPIAUCSL`)

</details>

<details>
<summary>`MORTGAGE30US` – 30-Year Fixed Rate Mortgage Average in the United States</summary>

Retrieve data for *30-Year Fixed Rate Mortgage Average in the United States* (`MORTGAGE30US`)

</details>

<details>
<summary>`T10Y2Y` – 10-Year Treasury Constant Maturity Minus 2-Year Treasury Constant Maturity</summary>

Retrieve data for *10-Year Treasury Constant Maturity Minus 2-Year Treasury Constant Maturity* (`T10Y2Y`)

</details>

<details>
<summary>`UNRATE` – Unemployment Rate</summary>

Retrieve data for *Unemployment Rate* (`UNRATE`)

</details>

<details>
<summary>`WALCL` – Federal Reserve Total Assets</summary>

Retrieve data for *Federal Reserve Total Assets* (`WALCL`)

</details>

<details>
<summary>`GDP` – Gross Domestic Product</summary>

Retrieve data for *Gross Domestic Product* (`GDP`)

</details>

<details>
<summary>`GDPC1` – Real Gross Domestic Product</summary>

Retrieve data for *Real Gross Domestic Product* (`GDPC1`)

</details>

<details>
<summary>`DGS10` – 10-Year Treasury Constant Maturity Rate</summary>

Retrieve data for *10-Year Treasury Constant Maturity Rate* (`DGS10`)

</details>

<details>
<summary>`CSUSHPINSA` – S&P/Case-Shiller U.S. National Home Price Index</summary>

Retrieve data for *S&P/Case-Shiller U.S. National Home Price Index* (`CSUSHPINSA`)

</details>

<details>
<summary>`BAMLH0A0HYM2` – ICE BofA US High Yield Index Option-Adjusted Spread</summary>

Retrieve data for *ICE BofA US High Yield Index Option-Adjusted Spread* (`BAMLH0A0HYM2`)

</details>

<details>
<summary>`T10YIE` – 10-Year Breakeven Inflation Rate</summary>

Retrieve data for *10-Year Breakeven Inflation Rate* (`T10YIE`)

</details>

<details>
<summary>`FPCPITOTLZGUSA` – Inflation, consumer prices for the United States</summary>

Retrieve data for *Inflation, consumer prices for the United States* (`FPCPITOTLZGUSA`)

</details>

<details>
<summary>`MSPUS` – Median Sales Price of Houses Sold for the United States</summary>

Retrieve data for *Median Sales Price of Houses Sold for the United States* (`MSPUS`)

</details>

<details>
<summary>`M1SL` – M1 Money Stock</summary>

Retrieve data for *M1 Money Stock* (`M1SL`)

</details>

<details>
<summary>`DRCCLACBS` – Delinquency Rate on Credit Card Loans, All Commercial Banks</summary>

Retrieve data for *Delinquency Rate on Credit Card Loans, All Commercial Banks* (`DRCCLACBS`)

</details>

<details>
<summary>`DFII10` – Market Yield on U.S. Treasury Securities at 10-Year Constant Maturity, Inflation-Indexed (Daily)</summary>

Retrieve data for *Market Yield on U.S. Treasury Securities at 10-Year Constant Maturity, Inflation-Indexed (Daily)* (`DFII10`)

</details>

<details>
<summary>`FII10` – Market Yield on U.S. Treasury Securities at 10-Year Constant Maturity, Inflation-Indexed (Monthly)</summary>

Retrieve data for *Market Yield on U.S. Treasury Securities at 10-Year Constant Maturity, Inflation-Indexed (Monthly)* (`FII10`)

</details>

<details>
<summary>`WFII10` – Market Yield on U.S. Treasury Securities at 10-Year Constant Maturity, Inflation-Indexed (Weekly)</summary>

Retrieve data for *Market Yield on U.S. Treasury Securities at 10-Year Constant Maturity, Inflation-Indexed (Weekly)* (`WFII10`)

</details>

<details>
<summary>`RIFLGFCY10XIINA` – Market Yield on U.S. Treasury Securities at 10-Year Constant Maturity, Inflation-Indexed (Annual)</summary>

Retrieve data for *Market Yield on U.S. Treasury Securities at 10-Year Constant Maturity, Inflation-Indexed (Annual)* (`RIFLGFCY10XIINA`)

</details>

## Testing

See [TESTING.md](./TESTING.md) for more details.

```bash
# Run all tests
pnpm test

# Run specific tests
pnpm test:registry
```

## 📄 License

[Apache 2.0 License](LICENSE) © 2025 [Stefano Amorelli](https://amorelli.tech)
