import { describe, expect, test, jest, beforeEach, afterEach } from '@jest/globals';
import { FREDServerWrapper } from '../../src/index.wrapper.js';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

describe('FREDServerWrapper', () => {
  // Create mock functions
  const mockCreateServer = jest.fn();
  const mockStartServer = jest.fn();
  const mockServer = { connect: jest.fn() };
  const mockTransport = {};
  
  // Create a wrapper with mock functions
  let wrapper: FREDServerWrapper;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Configure mocks
    mockCreateServer.mockReturnValue(mockServer);
    mockStartServer.mockResolvedValue(true);
    
    // Create a new wrapper with mock functions
    wrapper = new FREDServerWrapper(
      mockCreateServer,
      mockStartServer
    );
  });
  
  test('initialize creates server instance', () => {
    const server = wrapper.initialize();
    
    // Verify createServer was called
    expect(mockCreateServer).toHaveBeenCalled();
    
    // Verify server instance is returned
    expect(server).toBe(mockServer);
    
    // Verify server instance is stored
    expect(wrapper.server).toBe(mockServer);
  });
  
  test('start initializes server if not already initialized', async () => {
    const success = await wrapper.start();
    
    // Verify createServer was called
    expect(mockCreateServer).toHaveBeenCalled();
    
    // Verify startServer was called with correct parameters
    expect(mockStartServer).toHaveBeenCalledWith(mockServer, expect.any(StdioServerTransport));
    
    // Verify success result
    expect(success).toBe(true);
  });
  
  test('start uses provided transport', async () => {
    const customTransport = {} as StdioServerTransport;
    const success = await wrapper.start(customTransport);
    
    // Verify startServer was called with the custom transport
    expect(mockStartServer).toHaveBeenCalledWith(mockServer, customTransport);
    
    // Verify success result
    expect(success).toBe(true);
  });
  
  test('start uses existing server if already initialized', async () => {
    // Initialize the server
    wrapper.initialize();
    
    // Clear mocks to verify they aren't called again
    mockCreateServer.mockClear();
    
    // Start the server
    await wrapper.start();
    
    // Verify createServer was NOT called again
    expect(mockCreateServer).not.toHaveBeenCalled();
    
    // Verify startServer was called
    expect(mockStartServer).toHaveBeenCalled();
  });
  
  test('createAndStart initializes and starts server', async () => {
    const success = await wrapper.createAndStart();
    
    // Verify createServer was called
    expect(mockCreateServer).toHaveBeenCalled();
    
    // Verify startServer was called
    expect(mockStartServer).toHaveBeenCalled();
    
    // Verify success result
    expect(success).toBe(true);
  });
  
  test('createAndStart handles failure correctly', async () => {
    // Configure mock to fail
    mockStartServer.mockResolvedValue(false);
    
    const success = await wrapper.createAndStart();
    
    // Verify failure result
    expect(success).toBe(false);
  });
});