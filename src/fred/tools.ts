/**
 * MCP Tool Definitions for FRED API
 * 
 * Comprehensive tools for accessing any FRED data
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { searchSeries, FREDSearchOptions } from "./search.js";
import { getSeriesData, FREDSeriesOptions } from "./series.js";
import { browseCategories, getCategorySeries, browseReleases, getReleaseSeries, browseSources, getReleaseDates, getAllReleaseDates, getSeriesInfo, getSeriesTags } from "./browse.js";

/**
 * Schema for FRED search tool
 */
const SEARCH_SCHEMA = {
  search_text: z.string().optional().describe("Text to search for in series titles and descriptions"),
  search_type: z.enum(["full_text", "series_id"]).optional().describe("Type of search to perform"),
  tag_names: z.string().optional().describe("Comma-separated list of tag names to filter by"),
  exclude_tag_names: z.string().optional().describe("Comma-separated list of tag names to exclude"),
  limit: z.number().min(1).max(1000).optional().default(25).describe("Maximum number of results to return"),
  offset: z.number().min(0).optional().default(0).describe("Number of results to skip for pagination"),
  order_by: z.enum([
    "search_rank", "series_id", "title", "units", "frequency", 
    "seasonal_adjustment", "realtime_start", "realtime_end", 
    "last_updated", "observation_start", "observation_end", "popularity"
  ]).optional().describe("Field to order results by"),
  sort_order: z.enum(["asc", "desc"]).optional().describe("Sort order for results"),
  filter_variable: z.enum(["frequency", "units", "seasonal_adjustment"]).optional().describe("Variable to filter by"),
  filter_value: z.string().optional().describe("Value to filter the variable by")
};

/**
 * Schema for FRED series data tool
 */
const SERIES_DATA_SCHEMA = {
  series_id: z.string().describe("The FRED series ID to retrieve data for (e.g., 'GDP', 'UNRATE', 'CPIAUCSL')"),
  observation_start: z.string().optional().describe("Start date for observations in YYYY-MM-DD format"),
  observation_end: z.string().optional().describe("End date for observations in YYYY-MM-DD format"),
  limit: z.number().min(1).max(100000).optional().describe("Maximum number of observations to return"),
  offset: z.number().min(0).optional().describe("Number of observations to skip"),
  sort_order: z.enum(["asc", "desc"]).optional().describe("Sort order of observations by date"),
  units: z.enum([
    "lin", "chg", "ch1", "pch", "pc1", "pca", "cch", "cca", "log"
  ]).optional().describe("Data transformation: lin=levels, chg=change, pch=percent change, log=natural log"),
  frequency: z.enum([
    "d", "w", "bw", "m", "q", "sa", "a", 
    "wef", "weth", "wew", "wetu", "wem", "wesu", "wesa", "bwew", "bwem"
  ]).optional().describe("Frequency aggregation: d=daily, w=weekly, m=monthly, q=quarterly, a=annual"),
  aggregation_method: z.enum(["avg", "sum", "eop"]).optional().describe("Aggregation method: avg=average, sum=sum, eop=end of period"),
  output_type: z.number().min(1).max(4).optional().describe("Output format: 1=observations, 2=observations by vintage, 3=observations by release, 4=initial release only"),
  vintage_dates: z.string().optional().describe("Vintage date or dates in YYYY-MM-DD format")
};

/**
 * Schema for FRED browse tool
 */
const BROWSE_SCHEMA = {
  browse_type: z.enum(["categories", "releases", "sources", "category_series", "release_series"]).describe("Type of browsing to perform"),
  category_id: z.number().optional().describe("Category ID (for categories or category_series)"),
  release_id: z.number().optional().describe("Release ID (for release_series)"),
  limit: z.number().min(1).max(1000).optional().default(50).describe("Maximum number of results"),
  offset: z.number().min(0).optional().default(0).describe("Number of results to skip"),
  order_by: z.string().optional().describe("Field to order by"),
  sort_order: z.enum(["asc", "desc"]).optional().describe("Sort order")
};

/**
 * Registers the simplified FRED tools with the MCP server
 */
export function registerFREDTools(server: McpServer) {
  // Register browse tool for comprehensive navigation
  server.tool(
    "fred_browse",
    "Browse FRED's complete catalog through categories, releases, or sources. Use browse_type='categories' to explore the category tree, 'releases' for data releases, 'sources' for data sources, 'category_series' to get all series in a category, or 'release_series' to get all series in a release.",
    BROWSE_SCHEMA,
    async (input: any) => {
      console.error(`fred_browse called with params: ${JSON.stringify(input)}`);
      
      switch (input.browse_type) {
        case "categories":
          return await browseCategories(input.category_id);
        case "category_series":
          if (!input.category_id) {
            throw new Error("category_id is required for category_series");
          }
          return await getCategorySeries(input.category_id, {
            limit: input.limit,
            offset: input.offset,
            order_by: input.order_by,
            sort_order: input.sort_order
          });
        case "releases":
          return await browseReleases({
            limit: input.limit,
            offset: input.offset,
            order_by: input.order_by,
            sort_order: input.sort_order
          });
        case "release_series":
          if (!input.release_id) {
            throw new Error("release_id is required for release_series");
          }
          return await getReleaseSeries(input.release_id, {
            limit: input.limit,
            offset: input.offset,
            order_by: input.order_by,
            sort_order: input.sort_order
          });
        case "sources":
          return await browseSources({
            limit: input.limit,
            offset: input.offset,
            order_by: input.order_by,
            sort_order: input.sort_order
          });
        default:
          throw new Error(`Invalid browse_type: ${input.browse_type}`);
      }
    }
  );
  
  // Register search tool
  server.tool(
    "fred_search",
    "Search for FRED economic data series by keywords, tags, or filters. Returns matching series with their IDs, titles, and metadata. Use this to find specific series when you know what you're looking for.",
    SEARCH_SCHEMA,
    async (input) => {
      console.error(`fred_search called with params: ${JSON.stringify(input)}`);
      const result = await searchSeries(input as FREDSearchOptions);
      console.error("fred_search complete");
      return result;
    }
  );
  
  // Register series data tool
  server.tool(
    "fred_get_series",
    "Retrieve data for any FRED series by its ID. Supports data transformations, frequency changes, and date ranges.",
    SERIES_DATA_SCHEMA,
    async (input) => {
      console.error(`fred_get_series called with params: ${JSON.stringify(input)}`);
      const result = await getSeriesData(input as FREDSeriesOptions);
      console.error("fred_get_series complete");
      return result;
    }
  );

  // Register release dates tool
  server.tool(
    "fred_release_dates",
    "Get release dates for a specific FRED release (e.g., CPI, Employment Situation, GDP). Use release_id to get dates for a specific release, or omit it to get all upcoming release dates across all releases. Useful for finding when economic data will be published.",
    {
      release_id: z.number().optional().describe("Release ID to get dates for. Omit to get all upcoming release dates."),
      limit: z.number().min(1).max(1000).optional().default(50).describe("Maximum number of dates to return"),
      offset: z.number().min(0).optional().default(0).describe("Number of results to skip"),
      sort_order: z.enum(["asc", "desc"]).optional().default("desc").describe("Sort order by date"),
      include_release_dates_with_no_data: z.boolean().optional().describe("Include dates with no data (future scheduled releases)")
    },
    async (input: any) => {
      console.error(`fred_release_dates called with params: ${JSON.stringify(input)}`);
      if (input.release_id) {
        return await getReleaseDates(input.release_id, {
          limit: input.limit,
          offset: input.offset,
          sort_order: input.sort_order,
          include_release_dates_with_no_data: input.include_release_dates_with_no_data
        });
      } else {
        return await getAllReleaseDates({
          limit: input.limit,
          offset: input.offset,
          sort_order: input.sort_order,
          include_release_dates_with_no_data: input.include_release_dates_with_no_data
        });
      }
    }
  );

  // Register series info tool
  server.tool(
    "fred_series_info",
    "Get detailed metadata about a specific FRED series including title, units, frequency, seasonal adjustment, observation range, popularity, and notes.",
    {
      series_id: z.string().describe("The FRED series ID (e.g., 'GDP', 'UNRATE', 'CPIAUCSL')")
    },
    async (input: any) => {
      console.error(`fred_series_info called with params: ${JSON.stringify(input)}`);
      return await getSeriesInfo(input.series_id);
    }
  );

  // Register series tags tool
  server.tool(
    "fred_series_tags",
    "Get tags associated with a FRED series. Useful for understanding what categories and classifications a series belongs to.",
    {
      series_id: z.string().describe("The FRED series ID (e.g., 'GDP', 'UNRATE')")
    },
    async (input: any) => {
      console.error(`fred_series_tags called with params: ${JSON.stringify(input)}`);
      return await getSeriesTags(input.series_id);
    }
  );
}