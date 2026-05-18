/**
 * FRED Browse API Client
 * 
 * Provides comprehensive browsing of FRED categories, releases, and sources
 */
import { makeRequest } from "../common/request.js";
import { z } from "zod";

/**
 * Category schema
 */
const CategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  parent_id: z.number(),
});

/**
 * Release schema
 */
const ReleaseSchema = z.object({
  id: z.number(),
  realtime_start: z.string(),
  realtime_end: z.string(),
  name: z.string(),
  press_release: z.boolean(),
  link: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * Source schema
 */
const SourceSchema = z.object({
  id: z.number(),
  realtime_start: z.string(),
  realtime_end: z.string(),
  name: z.string(),
  link: z.string().optional(),
  notes: z.string().optional(),
});

export type Category = z.infer<typeof CategorySchema>;
export type Release = z.infer<typeof ReleaseSchema>;
export type Source = z.infer<typeof SourceSchema>;

/**
 * Browse all FRED categories
 */
export async function browseCategories(categoryId?: number) {
  try {
    const endpoint = categoryId ? `category/children` : "category";
    const queryParams: Record<string, string | number> = {};
    
    if (categoryId) {
      queryParams.category_id = categoryId;
    }
    
    const response = await makeRequest<{
      categories: Category[];
    }>(endpoint, queryParams);
    
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          categories: response.categories.map(cat => ({
            id: cat.id,
            name: cat.name,
            parent_id: cat.parent_id
          }))
        }, null, 2)
      }]
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to browse categories: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Get series in a specific category
 */
export async function getCategorySeries(categoryId: number, options: {
  limit?: number;
  offset?: number;
  order_by?: string;
  sort_order?: "asc" | "desc";
  filter_variable?: string;
  filter_value?: string;
} = {}) {
  try {
    const queryParams: Record<string, string | number> = {
      category_id: categoryId
    };
    
    if (options.limit !== undefined) queryParams.limit = options.limit;
    if (options.offset !== undefined) queryParams.offset = options.offset;
    if (options.order_by) queryParams.order_by = options.order_by;
    if (options.sort_order) queryParams.sort_order = options.sort_order;
    if (options.filter_variable) queryParams.filter_variable = options.filter_variable;
    if (options.filter_value) queryParams.filter_value = options.filter_value;
    
    const response = await makeRequest<any>("category/series", queryParams);
    
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          category_id: categoryId,
          total_series: response.count,
          showing: `${response.offset + 1}-${Math.min(response.offset + response.limit, response.count)}`,
          series: response.seriess.map((s: any) => ({
            id: s.id,
            title: s.title,
            units: s.units,
            frequency: s.frequency,
            observation_range: `${s.observation_start} to ${s.observation_end}`,
            last_updated: s.last_updated
          }))
        }, null, 2)
      }]
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get category series: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Browse all FRED releases
 */
export async function browseReleases(options: {
  limit?: number;
  offset?: number;
  order_by?: string;
  sort_order?: "asc" | "desc";
} = {}) {
  try {
    const queryParams: Record<string, string | number> = {};
    
    if (options.limit !== undefined) queryParams.limit = options.limit;
    if (options.offset !== undefined) queryParams.offset = options.offset;
    if (options.order_by) queryParams.order_by = options.order_by;
    if (options.sort_order) queryParams.sort_order = options.sort_order;
    
    const response = await makeRequest<{
      realtime_start: string;
      realtime_end: string;
      order_by: string;
      sort_order: string;
      count: number;
      offset: number;
      limit: number;
      releases: Release[];
    }>("releases", queryParams);
    
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          total_releases: response.count,
          showing: `${response.offset + 1}-${Math.min(response.offset + response.limit, response.count)}`,
          releases: response.releases.map(rel => ({
            id: rel.id,
            name: rel.name,
            press_release: rel.press_release,
            link: rel.link
          }))
        }, null, 2)
      }]
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to browse releases: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Get series in a specific release
 */
export async function getReleaseSeries(releaseId: number, options: {
  limit?: number;
  offset?: number;
  order_by?: string;
  sort_order?: "asc" | "desc";
} = {}) {
  try {
    const queryParams: Record<string, string | number> = {
      release_id: releaseId
    };
    
    if (options.limit !== undefined) queryParams.limit = options.limit;
    if (options.offset !== undefined) queryParams.offset = options.offset;
    if (options.order_by) queryParams.order_by = options.order_by;
    if (options.sort_order) queryParams.sort_order = options.sort_order;
    
    const response = await makeRequest<any>("release/series", queryParams);
    
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          release_id: releaseId,
          total_series: response.count,
          showing: `${response.offset + 1}-${Math.min(response.offset + response.limit, response.count)}`,
          series: response.seriess.map((s: any) => ({
            id: s.id,
            title: s.title,
            units: s.units,
            frequency: s.frequency,
            observation_range: `${s.observation_start} to ${s.observation_end}`,
            last_updated: s.last_updated
          }))
        }, null, 2)
      }]
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get release series: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Get release dates for a specific release (upcoming and historical)
 */
export async function getReleaseDates(releaseId: number, options: {
  limit?: number;
  offset?: number;
  sort_order?: "asc" | "desc";
  include_release_dates_with_no_data?: boolean;
} = {}) {
  try {
    const queryParams: Record<string, string | number | boolean> = {
      release_id: releaseId
    };

    if (options.limit !== undefined) queryParams.limit = options.limit;
    if (options.offset !== undefined) queryParams.offset = options.offset;
    if (options.sort_order) queryParams.sort_order = options.sort_order;
    if (options.include_release_dates_with_no_data !== undefined) {
      queryParams.include_release_dates_with_no_data = options.include_release_dates_with_no_data;
    }

    const response = await makeRequest<{
      count: number;
      offset: number;
      limit: number;
      release_dates: Array<{ release_id: number; date: string }>;
    }>("release/dates", queryParams);

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          release_id: releaseId,
          total_dates: response.count,
          showing: `${response.offset + 1}-${Math.min(response.offset + response.limit, response.count)}`,
          release_dates: response.release_dates.map(d => d.date)
        }, null, 2)
      }]
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get release dates: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Get all upcoming release dates across all releases
 */
export async function getAllReleaseDates(options: {
  limit?: number;
  offset?: number;
  sort_order?: "asc" | "desc";
  include_release_dates_with_no_data?: boolean;
} = {}) {
  try {
    const queryParams: Record<string, string | number | boolean> = {};

    if (options.limit !== undefined) queryParams.limit = options.limit;
    if (options.offset !== undefined) queryParams.offset = options.offset;
    if (options.sort_order) queryParams.sort_order = options.sort_order;
    if (options.include_release_dates_with_no_data !== undefined) {
      queryParams.include_release_dates_with_no_data = options.include_release_dates_with_no_data;
    }

    const response = await makeRequest<{
      count: number;
      offset: number;
      limit: number;
      release_dates: Array<{ release_id: number; release_name: string; date: string }>;
    }>("releases/dates", queryParams);

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          total_dates: response.count,
          showing: `${response.offset + 1}-${Math.min(response.offset + response.limit, response.count)}`,
          release_dates: response.release_dates.map(d => ({
            release_id: d.release_id,
            release_name: d.release_name,
            date: d.date
          }))
        }, null, 2)
      }]
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get all release dates: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Get detailed info about a specific series
 */
export async function getSeriesInfo(seriesId: string) {
  try {
    const response = await makeRequest<{
      seriess: Array<{
        id: string;
        realtime_start: string;
        realtime_end: string;
        title: string;
        observation_start: string;
        observation_end: string;
        frequency: string;
        frequency_short: string;
        units: string;
        units_short: string;
        seasonal_adjustment: string;
        seasonal_adjustment_short: string;
        last_updated: string;
        popularity: number;
        notes: string;
      }>;
    }>("series", { series_id: seriesId });

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify(response.seriess[0] || {}, null, 2)
      }]
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get series info: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Get tags for a series
 */
export async function getSeriesTags(seriesId: string) {
  try {
    const response = await makeRequest<{
      tags: Array<{
        name: string;
        group_id: string;
        notes: string;
        created: string;
        popularity: number;
        series_count: number;
      }>;
    }>("series/tags", { series_id: seriesId });

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          series_id: seriesId,
          tags: response.tags.map(t => ({
            name: t.name,
            group: t.group_id,
            popularity: t.popularity
          }))
        }, null, 2)
      }]
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get series tags: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Browse all FRED sources
 */
export async function browseSources(options: {
  limit?: number;
  offset?: number;
  order_by?: string;
  sort_order?: "asc" | "desc";
} = {}) {
  try {
    const queryParams: Record<string, string | number> = {};
    
    if (options.limit !== undefined) queryParams.limit = options.limit;
    if (options.offset !== undefined) queryParams.offset = options.offset;
    if (options.order_by) queryParams.order_by = options.order_by;
    if (options.sort_order) queryParams.sort_order = options.sort_order;
    
    const response = await makeRequest<{
      realtime_start: string;
      realtime_end: string;
      order_by: string;
      sort_order: string;
      count: number;
      offset: number;
      limit: number;
      sources: Source[];
    }>("sources", queryParams);
    
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          total_sources: response.count,
          showing: `${response.offset + 1}-${Math.min(response.offset + response.limit, response.count)}`,
          sources: response.sources.map(src => ({
            id: src.id,
            name: src.name,
            link: src.link
          }))
        }, null, 2)
      }]
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to browse sources: ${error.message}`);
    }
    throw error;
  }
}