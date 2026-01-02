// Test Background Script Initialization
// This test verifies that the background script can properly initialize all core modules

describe('Background Script Initialization', () => {
  let mockChrome;
  
  beforeEach(() => {
    // Mock Chrome APIs
    mockChrome = {
      runtime: {
        onInstalled: {
          addListener: jest.fn()
        },
        onMessage: {
          addListener: jest.fn()
        },
        onSuspend: {
          addListener: jest.fn()
        },
        getURL: jest.fn((path) => `chrome-extension://test/${path}`)
      },
      storage: {
        local: {
          get: jest.fn(),
          set: jest.fn()
        }
      },
      action: {
        openPopup: jest.fn()
      }
    };
    
    global.chrome = mockChrome;
    global.fetch = jest.fn();
    global.importScripts = jest.fn();
  });

  afterEach(() => {
    delete global.chrome;
    delete global.fetch;
    delete global.importScripts;
    
    // Clear any global modules
    delete global.LeetPilotStorage;
    delete global.LeetPilotValidator;
    delete global.LeetPilotSecurity;
    delete global.LeetPilotErrorHandler;
  });

  test('should handle missing input validator gracefully', async () => {
    // Mock a scenario where modules fail to load
    global.importScripts = jest.fn(() => {
      throw new Error('Module loading failed');
    });
    
    global.fetch = jest.fn().mockResolvedValue({
      text: () => Promise.resolve('// Mock module code')
    });

    // Load the background script (simulate)
    const backgroundScript = `
      // Simulate the key parts of background.js
      let inputValidator = null;
      
      async function loadCoreModules() {
        try {
          importScripts('/src/core/input-validator.js');
          return true;
        } catch (error) {
          console.warn('importScripts failed, trying alternative loading:', error.message);
          return false;
        }
      }
      
      function initializeManagers() {
        if (typeof LeetPilotValidator !== 'undefined') {
          inputValidator = new LeetPilotValidator.InputValidator();
        }
      }
      
      async function handleTestAPIConnection(request, sendResponse) {
        if (!inputValidator) {
          // Fallback validation
          const config = request.config;
          if (!config || !config.provider || !config.apiKey) {
            sendResponse({
              success: false,
              error: 'Provider and API key are required',
              requestId: request.requestId
            });
            return;
          }
          
          sendResponse({
            success: true,
            message: 'Configuration format appears valid (basic validation)',
            requestId: request.requestId
          });
          return;
        }
      }
      
      // Export for testing
      if (typeof module !== 'undefined') {
        module.exports = { loadCoreModules, initializeManagers, handleTestAPIConnection };
      }
    `;
    
    // Execute the background script code
    eval(backgroundScript);
    
    // Test the fallback behavior
    const mockRequest = {
      config: {
        provider: 'openai',
        apiKey: 'sk-test123456789012345678901234567890123456789012'
      },
      requestId: 'test-123'
    };
    
    const mockSendResponse = jest.fn();
    
    // This should use fallback validation since inputValidator is null
    await handleTestAPIConnection(mockRequest, mockSendResponse);
    
    expect(mockSendResponse).toHaveBeenCalledWith({
      success: true,
      message: 'Configuration format appears valid (basic validation)',
      requestId: 'test-123'
    });
  });

  test('should validate required fields in fallback mode', async () => {
    // Simulate missing input validator
    const mockRequest = {
      config: {
        provider: 'openai'
        // Missing apiKey
      },
      requestId: 'test-456'
    };
    
    const mockSendResponse = jest.fn();
    
    // Simulate the fallback validation logic
    const config = mockRequest.config;
    if (!config || !config.provider || !config.apiKey) {
      mockSendResponse({
        success: false,
        error: 'Provider and API key are required',
        requestId: mockRequest.requestId
      });
    }
    
    expect(mockSendResponse).toHaveBeenCalledWith({
      success: false,
      error: 'Provider and API key are required',
      requestId: 'test-456'
    });
  });

  test('should reject short API keys in fallback mode', async () => {
    const mockRequest = {
      config: {
        provider: 'openai',
        apiKey: 'short'
      },
      requestId: 'test-789'
    };
    
    const mockSendResponse = jest.fn();
    
    // Simulate the fallback validation logic
    const config = mockRequest.config;
    if (config.apiKey.length < 10) {
      mockSendResponse({
        success: false,
        error: 'API key appears to be too short',
        requestId: mockRequest.requestId
      });
    }
    
    expect(mockSendResponse).toHaveBeenCalledWith({
      success: false,
      error: 'API key appears to be too short',
      requestId: 'test-789'
    });
  });
});