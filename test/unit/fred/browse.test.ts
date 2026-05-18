import { describe, expect, test, jest, beforeEach, afterEach, afterAll } from '@jest/globals';
import { getReleaseDates, getAllReleaseDates, getSeriesInfo, getSeriesTags, browseCategories, browseReleases, browseSources } from '../../../src/fred/browse.js';

// Suppress console.error output during tests
const originalConsoleError = console.error;
console.error = jest.fn();

afterAll(() => {
  console.error = originalConsoleError;
});

describe('FRED browse module', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('getReleaseDates', () => {
    test('returns formatted release dates for a specific release', async () => {
      const mockResponse = {
        count: 2,
        offset: 0,
        limit: 50,
        release_dates: [
          { release_id: 10, date: '2026-05-13' },
          { release_id: 10, date: '2026-04-10' }
        ]
      };

      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({ ok: true, json: () => Promise.resolve(mockResponse) })
      );

      const result = await getReleaseDates(10);
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.release_id).toBe(10);
      expect(parsed.total_dates).toBe(2);
      expect(parsed.release_dates).toHaveLength(2);
      expect(parsed.release_dates[0]).toBe('2026-05-13');
    });

    test('passes query parameters correctly', async () => {
      const mockResponse = { count: 0, offset: 0, limit: 10, release_dates: [] };

      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({ ok: true, json: () => Promise.resolve(mockResponse) })
      );

      await getReleaseDates(10, { limit: 10, sort_order: 'asc', include_release_dates_with_no_data: true });

      const url = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(url).toContain('release_id=10');
      expect(url).toContain('limit=10');
      expect(url).toContain('sort_order=asc');
      expect(url).toContain('include_release_dates_with_no_data=true');
    });

    test('throws on API error', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('Not Found') })
      );

      await expect(getReleaseDates(999)).rejects.toThrow('Failed to get release dates');
    });
  });

  describe('getAllReleaseDates', () => {
    test('returns formatted release dates across all releases', async () => {
      const mockResponse = {
        count: 2,
        offset: 0,
        limit: 50,
        release_dates: [
          { release_id: 10, release_name: 'Consumer Price Index', date: '2026-05-13' },
          { release_id: 53, release_name: 'Gross Domestic Product', date: '2026-05-29' }
        ]
      };

      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({ ok: true, json: () => Promise.resolve(mockResponse) })
      );

      const result = await getAllReleaseDates();
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.total_dates).toBe(2);
      expect(parsed.release_dates[0].release_name).toBe('Consumer Price Index');
      expect(parsed.release_dates[1].date).toBe('2026-05-29');
    });
  });

  describe('getSeriesInfo', () => {
    test('returns series metadata', async () => {
      const mockResponse = {
        seriess: [{
          id: 'GDP',
          title: 'Gross Domestic Product',
          frequency: 'Quarterly',
          units: 'Billions of Dollars',
          seasonal_adjustment: 'Seasonally Adjusted Annual Rate',
          last_updated: '2026-04-30',
          popularity: 95,
          notes: 'GDP notes'
        }]
      };

      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({ ok: true, json: () => Promise.resolve(mockResponse) })
      );

      const result = await getSeriesInfo('GDP');
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.id).toBe('GDP');
      expect(parsed.title).toBe('Gross Domestic Product');
      expect(parsed.frequency).toBe('Quarterly');
    });

    test('passes series_id as query parameter', async () => {
      const mockResponse = { seriess: [{ id: 'UNRATE' }] };

      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({ ok: true, json: () => Promise.resolve(mockResponse) })
      );

      await getSeriesInfo('UNRATE');

      const url = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(url).toContain('series_id=UNRATE');
    });

    test('throws on API error', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({ ok: false, status: 400, text: () => Promise.resolve('Bad Request') })
      );

      await expect(getSeriesInfo('INVALID')).rejects.toThrow('Failed to get series info');
    });
  });

  describe('getSeriesTags', () => {
    test('returns tags for a series', async () => {
      const mockResponse = {
        tags: [
          { name: 'gdp', group_id: 'gen', notes: '', created: '2012-02-27', popularity: 99, series_count: 100 },
          { name: 'quarterly', group_id: 'freq', notes: '', created: '2012-02-27', popularity: 80, series_count: 500 }
        ]
      };

      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({ ok: true, json: () => Promise.resolve(mockResponse) })
      );

      const result = await getSeriesTags('GDP');
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.series_id).toBe('GDP');
      expect(parsed.tags).toHaveLength(2);
      expect(parsed.tags[0].name).toBe('gdp');
      expect(parsed.tags[1].group).toBe('freq');
    });

    test('throws on API error', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({ ok: false, status: 400, text: () => Promise.resolve('Bad Request') })
      );

      await expect(getSeriesTags('INVALID')).rejects.toThrow('Failed to get series tags');
    });
  });

  describe('browseCategories', () => {
    test('returns root categories when no id provided', async () => {
      const mockResponse = {
        categories: [{ id: 0, name: 'Root', parent_id: 0 }]
      };

      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({ ok: true, json: () => Promise.resolve(mockResponse) })
      );

      const result = await browseCategories();
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.categories).toHaveLength(1);
      expect(parsed.categories[0].name).toBe('Root');
    });
  });

  describe('browseReleases', () => {
    test('returns releases list', async () => {
      const mockResponse = {
        count: 1, offset: 0, limit: 50,
        releases: [{ id: 10, realtime_start: '2026-01-01', realtime_end: '2026-12-31', name: 'CPI', press_release: true, link: 'https://bls.gov' }]
      };

      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({ ok: true, json: () => Promise.resolve(mockResponse) })
      );

      const result = await browseReleases();
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.total_releases).toBe(1);
      expect(parsed.releases[0].name).toBe('CPI');
    });
  });

  describe('browseSources', () => {
    test('returns sources list', async () => {
      const mockResponse = {
        count: 1, offset: 0, limit: 50,
        sources: [{ id: 1, realtime_start: '2026-01-01', realtime_end: '2026-12-31', name: 'BLS', link: 'https://bls.gov' }]
      };

      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({ ok: true, json: () => Promise.resolve(mockResponse) })
      );

      const result = await browseSources();
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.total_sources).toBe(1);
      expect(parsed.sources[0].name).toBe('BLS');
    });
  });
});
