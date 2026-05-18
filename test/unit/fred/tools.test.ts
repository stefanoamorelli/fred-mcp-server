import { describe, expect, test, jest, beforeEach, afterAll } from '@jest/globals';
import { registerFREDTools } from '../../../src/fred/tools.js';

// Create a mock for console.error to avoid cluttering test output
const originalConsoleError = console.error;
console.error = jest.fn();

// Clean up after tests
afterAll(() => {
  console.error = originalConsoleError;
});

describe('FRED tools module', () => {
  // Create a mock server for testing
  const createMockServer = () => ({
    tool: jest.fn()
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('registerFREDTools', () => {
    test('function exists and has correct signature', () => {
      expect(typeof registerFREDTools).toBe('function');
    });
    
    test('registers all six tools with the server', () => {
      const mockServer = createMockServer();
      registerFREDTools(mockServer as any);

      // Verify server.tool was called six times
      expect(mockServer.tool).toHaveBeenCalledTimes(6);

      // Get the registered tools
      const toolCalls = mockServer.tool.mock.calls;
      const toolNames = toolCalls.map(call => call[0]);

      // Verify all six tools are registered
      expect(toolNames).toContain('fred_browse');
      expect(toolNames).toContain('fred_search');
      expect(toolNames).toContain('fred_get_series');
      expect(toolNames).toContain('fred_release_dates');
      expect(toolNames).toContain('fred_series_info');
      expect(toolNames).toContain('fred_series_tags');
    });
    
    test('fred_browse tool has correct schema', () => {
      const mockServer = createMockServer();
      registerFREDTools(mockServer as any);
      
      // Find the browse tool registration
      const browseToolCall = mockServer.tool.mock.calls.find(call => call[0] === 'fred_browse');
      expect(browseToolCall).toBeDefined();
      
      // Verify schema has expected fields
      const schema = browseToolCall![2];
      expect(schema).toHaveProperty('browse_type');
      expect(schema).toHaveProperty('category_id');
      expect(schema).toHaveProperty('release_id');
      expect(schema).toHaveProperty('limit');
      expect(schema).toHaveProperty('offset');
      expect(schema).toHaveProperty('order_by');
      expect(schema).toHaveProperty('sort_order');
    });
    
    test('fred_search tool has correct schema', () => {
      const mockServer = createMockServer();
      registerFREDTools(mockServer as any);
      
      // Find the search tool registration
      const searchToolCall = mockServer.tool.mock.calls.find(call => call[0] === 'fred_search');
      expect(searchToolCall).toBeDefined();
      
      // Verify schema has expected fields
      const schema = searchToolCall![2];
      expect(schema).toHaveProperty('search_text');
      expect(schema).toHaveProperty('search_type');
      expect(schema).toHaveProperty('tag_names');
      expect(schema).toHaveProperty('limit');
      expect(schema).toHaveProperty('offset');
    });
    
    test('fred_get_series tool has correct schema', () => {
      const mockServer = createMockServer();
      registerFREDTools(mockServer as any);
      
      // Find the get_series tool registration
      const getSeriesToolCall = mockServer.tool.mock.calls.find(call => call[0] === 'fred_get_series');
      expect(getSeriesToolCall).toBeDefined();
      
      // Verify schema has expected fields
      const schema = getSeriesToolCall![2];
      expect(schema).toHaveProperty('series_id');
      expect(schema).toHaveProperty('observation_start');
      expect(schema).toHaveProperty('observation_end');
      expect(schema).toHaveProperty('limit');
      expect(schema).toHaveProperty('units');
      expect(schema).toHaveProperty('frequency');
    });
    
    test('fred_release_dates tool has correct schema', () => {
      const mockServer = createMockServer();
      registerFREDTools(mockServer as any);

      const toolCall = mockServer.tool.mock.calls.find(call => call[0] === 'fred_release_dates');
      expect(toolCall).toBeDefined();

      const schema = toolCall![2];
      expect(schema).toHaveProperty('release_id');
      expect(schema).toHaveProperty('limit');
      expect(schema).toHaveProperty('offset');
      expect(schema).toHaveProperty('sort_order');
      expect(schema).toHaveProperty('include_release_dates_with_no_data');
    });

    test('fred_series_info tool has correct schema', () => {
      const mockServer = createMockServer();
      registerFREDTools(mockServer as any);

      const toolCall = mockServer.tool.mock.calls.find(call => call[0] === 'fred_series_info');
      expect(toolCall).toBeDefined();

      const schema = toolCall![2];
      expect(schema).toHaveProperty('series_id');
    });

    test('fred_series_tags tool has correct schema', () => {
      const mockServer = createMockServer();
      registerFREDTools(mockServer as any);

      const toolCall = mockServer.tool.mock.calls.find(call => call[0] === 'fred_series_tags');
      expect(toolCall).toBeDefined();

      const schema = toolCall![2];
      expect(schema).toHaveProperty('series_id');
    });

    test('all tool handlers are functions', () => {
      const mockServer = createMockServer();
      registerFREDTools(mockServer as any);
      
      // Verify all handlers are functions
      mockServer.tool.mock.calls.forEach(call => {
        const handler = call[3];
        expect(typeof handler).toBe('function');
      });
    });
  });
});