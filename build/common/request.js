import { z } from "zod";
const BASE_URL = "https://api.stlouisfed.org/fred";
/**
 * Utility for making requests to the FRED API
 */
export const makeRequest = async (endpoint, queryParams = {}) => {
    // For development, use a demo API key if none is provided in environment
    const apiKey = process.env.FRED_API_KEY || "abcdefghijklmnopqrstuvwxyz123456";
    const url = new URL(`${BASE_URL}/${endpoint}`);
    // Add all query parameters
    Object.entries(queryParams).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
    });
    // Add the API key
    url.searchParams.append("api_key", apiKey);
    // Add common parameters
    url.searchParams.append("file_type", "json");
    console.error(`Fetching FRED API: ${url.toString().replace(/api_key=[^&]+/, "api_key=***")}`);
    const response = await fetch(url.toString(), {
        headers: {
            "Accept": "application/json",
        },
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`FRED API error (${response.status}): ${errorText}`);
    }
    return response.json();
};
// Observation schema for the series/observations endpoint
export const ObservationSchema = z.object({
    realtime_start: z.string(),
    realtime_end: z.string(),
    date: z.string(),
    value: z.string()
});
// Schema for the series/observations API response
export const SeriesObservationsResponseSchema = z.object({
    realtime_start: z.string(),
    realtime_end: z.string(),
    observation_start: z.string(),
    observation_end: z.string(),
    units: z.string(),
    output_type: z.number(),
    file_type: z.string(),
    order_by: z.string(),
    sort_order: z.string(),
    count: z.number(),
    offset: z.number(),
    limit: z.number(),
    observations: z.array(ObservationSchema)
});
/**
 * Registry of known FRED series with their metadata
 * Key: series ID as used in FRED API
 * Value: human-readable metadata about the series
 */
export const FRED_SERIES_REGISTRY = {
    "CPIAUCSL": {
        title: "Consumer Price Index for All Urban Consumers: All Items in U.S. City Average",
        description: "The Consumer Price Index for All Urban Consumers: All Items (CPIAUCSL) is a measure of the average monthly change in the price for goods and services paid by urban consumers between any two time periods.",
        units: "Index 1982-1984=100"
    },
    "RRPONTSYD": {
        title: "Overnight Reverse Repurchase Agreements: Treasury Securities Sold by the Federal Reserve",
        description: "Daily amount value of RRP transactions reported by the New York Fed as part of the Temporary Open Market Operations.",
        units: "Billions of Dollars"
    }
};
/**
 * Fetches economic data for a specific FRED series
 *
 * @param seriesId - FRED series identifier (e.g., "CPIAUCSL")
 * @param options - Query parameters for filtering the data
 * @returns Formatted series data with metadata
 */
export async function fetchFREDSeriesData(seriesId, options) {
    try {
        // Prepare query parameters
        const queryParams = {
            series_id: seriesId
        };
        // Add optional parameters if provided
        if (options.start_date)
            queryParams.observation_start = options.start_date;
        if (options.end_date)
            queryParams.observation_end = options.end_date;
        if (options.limit)
            queryParams.limit = options.limit;
        if (options.sort_order)
            queryParams.sort_order = options.sort_order;
        // Make the request to FRED API
        const response = await makeRequest("series/observations", queryParams);
        // Get metadata for this series
        const metadata = FRED_SERIES_REGISTRY[seriesId] || {
            title: `FRED Data Series: ${seriesId}`,
            description: `Economic data from FRED series ${seriesId}`,
            units: "Value"
        };
        // Transform the data for easier consumption
        const formattedData = response.observations.map(obs => ({
            date: obs.date,
            value: parseFloat(obs.value),
            units: metadata.units,
        }));
        const responseData = {
            title: metadata.title,
            description: metadata.description,
            source: "Federal Reserve Economic Data (FRED)",
            series_id: seriesId,
            total_observations: response.count,
            data: formattedData
        };
        return {
            content: [{
                    type: "text",
                    text: JSON.stringify(responseData, null, 2)
                }]
        };
    }
    catch (error) {
        // Handle all error types uniformly for better error messages
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to retrieve ${seriesId} data: ${errorMessage}`);
    }
}
