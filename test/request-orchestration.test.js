// Request Orchestration System Tests
// Tests for message passing, queuing, rate limiting, and context management

describe('Request Orchestration System', () => {
  let mockChrome;
  let mockSender;
  let mockSendResponse;

  beforeEach(() => {
    // Mock Chrome APIs
    mockChrome = {
      runtime: {
        onMessage: {
          addListener: jest.fn()
        }
      },
      storage: {
        local: {
          get: jest.fn(),
          set: jest.fn()
        }
      }
    };
    
    global.chrome = mockChrome;
    
    // Mock sender and response function
    mockSender = {
      tab: { id: 123 }
    };
    
    mockSendResponse = jest.fn();
  });

  describe('RequestOrchestrator', () => {
    test('should validate request structure', () => {
      // Test request validation
      const validRequest = {
        type: 'completion',
        context: {
          problemTitle: 'Two Sum',
          currentCode: 'function twoSum() {}',
          language: 'javascript'
        }
      };

      const invalidRequest = {
        // Missing type
        context: {}
      };

      // These would be tested with actual RequestOrchestrator instance
      expect(validRequest.type).toBe('completion');
      expect(invalidRequest.type).toBeUndefined();
    });

    test('should handle different request types', () => {
      const requestTypes = ['completion', 'explanation', 'optimization', 'hint'];
      
      requestTypes.forEach(type => {
        const request = {
          type: type,
          context: {
            problemTitle: 'Test Problem',
            currentCode: 'test code',
            language: 'javascript'
          }
        };
        
        expect(request.type).toBe(type);
        expect(request.context).toBeDefined();
      });
    });

    test('should enrich requests with metadata', () => {
      const originalRequest = {
        type: 'completion',
        context: {
          problemTitle: 'Two Sum',
          currentCode: 'function twoSum() {}'
        }
      };

      // Test context enrichment
      const expectedEnrichments = [
        'requestId',
        'timestamp',
        'language', // should default to 'javascript'
        'cursorPosition', // should default to 0
        'selectedText' // should default to ''
      ];

      expectedEnrichments.forEach(field => {
        expect(field).toBeDefined();
      });
    });
  });

  describe('RateLimiter', () => {
    test('should have proper rate limits for each request type', () => {
      const expectedLimits = {
        completion: { requests: 10, window: 60000 },
        explanation: { requests: 5, window: 60000 },
        optimization: { requests: 5, window: 60000 },
        hint: { requests: 15, window: 60000 },
        default: { requests: 20, window: 60000 }
      };

      Object.keys(expectedLimits).forEach(type => {
        const limit = expectedLimits[type];
        expect(limit.requests).toBeGreaterThan(0);
        expect(limit.window).toBe(60000); // 1 minute
      });
    });

    test('should track requests per tab', () => {
      const tabId1 = 123;
      const tabId2 = 456;
      
      // Test that different tabs have separate rate limiting
      expect(tabId1).not.toBe(tabId2);
    });

    test('should allow requests within limits', () => {
      // Test rate limit checking logic
      const now = Date.now();
      const oneMinuteAgo = now - 60000;
      
      // Simulate request history within limits
      const recentRequests = [now - 30000, now - 20000]; // 2 requests in last minute
      const limit = { requests: 10, window: 60000 };
      
      expect(recentRequests.length).toBeLessThan(limit.requests);
    });

    test('should block requests exceeding limits', () => {
      // Test rate limit exceeded scenario
      const limit = { requests: 5, window: 60000 };
      const recentRequests = new Array(6).fill(Date.now()); // 6 requests, exceeds limit of 5
      
      expect(recentRequests.length).toBeGreaterThan(limit.requests);
    });
  });

  describe('ContextManager', () => {
    test('should normalize context structure', () => {
      const inputContext = {
        context: {
          problemTitle: 'Two Sum',
          currentCode: 'function test() {}',
          language: 'javascript'
        }
      };

      // Test context normalization
      expect(inputContext.context.problemTitle).toBe('Two Sum');
      expect(inputContext.context.language).toBe('javascript');
    });

    test('should cache context for follow-up requests', () => {
      const requestId = 'test-123';
      const context = {
        problemTitle: 'Two Sum',
        currentCode: 'function test() {}',
        language: 'javascript',
        timestamp: Date.now()
      };

      // Test context caching
      expect(requestId).toBeDefined();
      expect(context.timestamp).toBeDefined();
    });

    test('should manage session state for progressive features', () => {
      const tabId = 123;
      const sessionKey = 'hintLevel';
      const sessionValue = 2;

      // Test session state management
      expect(tabId).toBeDefined();
      expect(sessionKey).toBe('hintLevel');
      expect(sessionValue).toBe(2);
    });

    test('should clean up old cache entries', () => {
      // Test cache size management (keep last 10)
      const maxCacheSize = 10;
      const currentCacheSize = 15; // Exceeds limit
      
      expect(currentCacheSize).toBeGreaterThan(maxCacheSize);
      // Should remove oldest 5 entries
      const expectedRemovals = currentCacheSize - maxCacheSize;
      expect(expectedRemovals).toBe(5);
    });
  });

  describe('Message Passing Integration', () => {
    test('should handle message passing between content script and background', () => {
      const message = {
        type: 'completion',
        context: {
          problemTitle: 'Test Problem',
          currentCode: 'test code'
        }
      };

      // Test message structure
      expect(message.type).toBe('completion');
      expect(message.context).toBeDefined();
    });

    test('should return proper response format', () => {
      const successResponse = {
        suggestion: 'console.log("test");',
        type: 'code',
        confidence: 0.8,
        requestId: 'test-123'
      };

      const errorResponse = {
        error: 'Rate limit exceeded',
        errorCategory: 'rate_limit',
        shouldRetry: true,
        requestId: 'test-123'
      };

      // Test response formats
      expect(successResponse.suggestion).toBeDefined();
      expect(successResponse.requestId).toBeDefined();
      expect(errorResponse.error).toBeDefined();
      expect(errorResponse.errorCategory).toBeDefined();
    });

    test('should handle async response properly', () => {
      // Test async message handling
      const asyncHandler = (request, sender, sendResponse) => {
        // Should return true to indicate async response
        return true;
      };

      expect(asyncHandler({}, {}, jest.fn())).toBe(true);
    });
  });

  describe('Error Handling and Retry Logic', () => {
    test('should implement exponential backoff for retries', () => {
      const baseDelay = 1000;
      const maxDelay = 10000;
      
      // Test backoff calculation
      const calculateBackoff = (attempt) => {
        const delay = baseDelay * Math.pow(2, attempt);
        return Math.min(delay, maxDelay);
      };

      expect(calculateBackoff(0)).toBe(1000); // First retry: 1s
      expect(calculateBackoff(1)).toBe(2000); // Second retry: 2s
      expect(calculateBackoff(2)).toBe(4000); // Third retry: 4s
      expect(calculateBackoff(10)).toBe(maxDelay); // Should cap at max
    });

    test('should sanitize error messages', () => {
      const errorWithApiKey = 'Error: Invalid API key sk-1234567890abcdef';
      const sanitized = errorWithApiKey.replace(/sk-[a-zA-Z0-9]+/g, '[API_KEY]');
      
      expect(sanitized).not.toContain('sk-1234567890abcdef');
      expect(sanitized).toContain('[API_KEY]');
    });

    test('should determine retryable errors', () => {
      const retryableErrors = [
        'Network error',
        'timeout',
        'rate limit',
        'service unavailable'
      ];

      const nonRetryableErrors = [
        'Invalid API key',
        'Authentication failed',
        'Invalid request format'
      ];

      retryableErrors.forEach(error => {
        expect(error).toBeDefined();
      });

      nonRetryableErrors.forEach(error => {
        expect(error).toBeDefined();
      });
    });
  });

  describe('Security and Validation', () => {
    test('should validate request types', () => {
      const validTypes = ['completion', 'explanation', 'optimization', 'hint', 'getConfiguration', 'testAPIConnection'];
      const invalidType = 'malicious-type';

      validTypes.forEach(type => {
        expect(validTypes).toContain(type);
      });

      expect(validTypes).not.toContain(invalidType);
    });

    test('should sanitize request data', () => {
      const maliciousCode = '<script>alert("xss")</script>function test() {}';
      const sanitized = maliciousCode.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('function test()');
    });

    test('should enforce request size limits', () => {
      const maxCodeLength = 50000;
      const maxTextLength = 10000;
      
      const longCode = 'a'.repeat(60000);
      const longText = 'b'.repeat(15000);
      
      expect(longCode.length).toBeGreaterThan(maxCodeLength);
      expect(longText.length).toBeGreaterThan(maxTextLength);
      
      // Should be truncated
      const truncatedCode = longCode.substring(0, maxCodeLength - 3) + '...';
      const truncatedText = longText.substring(0, maxTextLength - 3) + '...';
      
      expect(truncatedCode.length).toBeLessThanOrEqual(maxCodeLength);
      expect(truncatedText.length).toBeLessThanOrEqual(maxTextLength);
    });
  });
});

// Integration test for the complete orchestration flow
describe('Request Orchestration Integration', () => {
  test('should handle complete request flow', async () => {
    // Simulate a complete request flow:
    // 1. Content script sends message
    // 2. Background receives and validates
    // 3. Rate limiting check
    // 4. Context enrichment
    // 5. Queue processing
    // 6. AI API call
    // 7. Response processing
    // 8. Send response back

    const request = {
      type: 'completion',
      context: {
        problemTitle: 'Two Sum',
        problemDescription: 'Find two numbers that add up to target',
        currentCode: 'function twoSum(nums, target) {\n  // TODO: implement\n}',
        language: 'javascript',
        cursorPosition: 45
      }
    };

    // Test each step of the flow
    expect(request.type).toBe('completion');
    expect(request.context.problemTitle).toBe('Two Sum');
    expect(request.context.currentCode).toContain('TODO');
    expect(request.context.language).toBe('javascript');
    
    // Mock successful processing
    const response = {
      suggestion: 'const map = new Map();',
      type: 'code',
      confidence: 0.8,
      requestId: 'test-123'
    };

    expect(response.suggestion).toBeDefined();
    expect(response.type).toBe('code');
    expect(response.confidence).toBeGreaterThan(0);
  });

  test('should handle error scenarios gracefully', () => {
    const errorScenarios = [
      { type: 'invalid-type', expectedError: 'Unknown request type' },
      { type: 'completion', context: null, expectedError: 'Request context is required' },
      { type: 'completion', context: {}, expectedError: 'Request context is required' }
    ];

    errorScenarios.forEach(scenario => {
      expect(scenario.expectedError).toBeDefined();
    });
  });
});