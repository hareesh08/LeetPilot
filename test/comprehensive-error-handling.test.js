// Comprehensive Error Handling Tests
// Tests for retry logic, rate limiting, and user-friendly error messages

// Mock Chrome APIs for testing
global.chrome = {
  runtime: {
    id: 'test-extension-id'
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn()
    }
  }
};

// Mock fetch for testing
global.fetch = jest.fn();

// Import the comprehensive error handler
const { ComprehensiveErrorHandler } = require('../src/error-handler.js');

describe('Comprehensive Error Handler', () => {
  let errorHandler;

  beforeEach(() => {
    errorHandler = new ComprehensiveErrorHandler();
    jest.clearAllMocks();
  });

  describe('Error Categorization', () => {
    test('should categorize network errors correctly', () => {
      const networkError = new Error('Network request failed');
      const errorInfo = errorHandler.categorizeError(networkError);
      
      expect(errorInfo.category).toBe('network');
    });

    test('should categorize authentication errors correctly', () => {
      const authError = new Error('Invalid API key');
      authError.status = 401;
      const errorInfo = errorHandler.categorizeError(authError);
      
      expect(errorInfo.category).toBe('auth');
    });

    test('should categorize rate limit errors correctly', () => {
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.status = 429;
      const errorInfo = errorHandler.categorizeError(rateLimitError);
      
      expect(errorInfo.category).toBe('rate_limit');
    });

    test('should categorize quota exceeded errors correctly', () => {
      const quotaError = new Error('Quota exceeded for this month');
      const errorInfo = errorHandler.categorizeError(quotaError);
      
      expect(errorInfo.category).toBe('quota');
    });

    test('should categorize timeout errors correctly', () => {
      const timeoutError = new Error('Request timeout');
      const errorInfo = errorHandler.categorizeError(timeoutError);
      
      expect(errorInfo.category).toBe('timeout');
    });

    test('should categorize validation errors correctly', () => {
      const validationError = new Error('Invalid request format');
      validationError.status = 400;
      const errorInfo = errorHandler.categorizeError(validationError);
      
      expect(errorInfo.category).toBe('validation');
    });

    test('should categorize API server errors correctly', () => {
      const serverError = new Error('Internal server error');
      serverError.status = 500;
      const errorInfo = errorHandler.categorizeError(serverError);
      
      expect(errorInfo.category).toBe('api_error');
    });

    test('should categorize configuration errors correctly', () => {
      const configError = new Error('API key not configured');
      const errorInfo = errorHandler.categorizeError(configError, { type: 'configuration' });
      
      expect(errorInfo.category).toBe('config');
    });

    test('should categorize unknown errors as unknown', () => {
      const unknownError = new Error('Something weird happened');
      const errorInfo = errorHandler.categorizeError(unknownError);
      
      expect(errorInfo.category).toBe('unknown');
    });
  });

  describe('User-Friendly Error Messages', () => {
    test('should generate user-friendly message for network errors', () => {
      const errorInfo = { category: 'network' };
      const message = errorHandler.generateUserFriendlyMessage(errorInfo, {});
      
      expect(message).toContain('Unable to connect');
      expect(message).toContain('internet connection');
    });

    test('should generate user-friendly message for authentication errors', () => {
      const errorInfo = { category: 'auth', httpStatus: 401 };
      const message = errorHandler.generateUserFriendlyMessage(errorInfo, {});
      
      expect(message).toContain('API key');
      expect(message).toContain('invalid');
    });

    test('should generate user-friendly message for rate limit errors', () => {
      const errorInfo = { category: 'rate_limit', retryAfter: 60000 };
      const message = errorHandler.generateUserFriendlyMessage(errorInfo, {});
      
      expect(message).toContain('too many requests');
      expect(message).toContain('60 seconds');
    });

    test('should generate user-friendly message for quota errors', () => {
      const errorInfo = { category: 'quota' };
      const message = errorHandler.generateUserFriendlyMessage(errorInfo, {});
      
      expect(message).toContain('usage limit');
      expect(message).toContain('billing');
    });

    test('should generate user-friendly message for configuration errors', () => {
      const errorInfo = { category: 'config' };
      const message = errorHandler.generateUserFriendlyMessage(errorInfo, {});
      
      expect(message).toContain('configure');
      expect(message).toContain('extension popup');
    });
  });

  describe('Retry Logic', () => {
    test('should determine retryable errors correctly', () => {
      const networkRetry = errorHandler.getRetryInfo('network', 'test-request-1');
      const authRetry = errorHandler.getRetryInfo('auth', 'test-request-2');
      
      expect(networkRetry.canRetry).toBe(true);
      expect(authRetry.canRetry).toBe(false);
    });

    test('should calculate exponential backoff correctly', () => {
      const requestId = 'test-request';
      
      // First retry
      errorHandler.incrementRetryAttempt(requestId);
      const firstRetry = errorHandler.getRetryInfo('network', requestId);
      
      // Second retry
      errorHandler.incrementRetryAttempt(requestId);
      const secondRetry = errorHandler.getRetryInfo('network', requestId);
      
      expect(secondRetry.retryDelay).toBeGreaterThan(firstRetry.retryDelay);
      expect(secondRetry.currentAttempt).toBe(2);
    });

    test('should respect maximum retry limits', () => {
      const requestId = 'test-request';
      
      // Exceed maximum retries for network errors (3)
      for (let i = 0; i < 5; i++) {
        errorHandler.incrementRetryAttempt(requestId);
      }
      
      const retryInfo = errorHandler.getRetryInfo('network', requestId);
      expect(retryInfo.canRetry).toBe(false);
    });

    test('should clear retry attempts on success', () => {
      const requestId = 'test-request';
      
      errorHandler.incrementRetryAttempt(requestId);
      expect(errorHandler.getRetryAttempt(requestId)).toBe(1);
      
      errorHandler.clearRetryAttempts(requestId);
      expect(errorHandler.getRetryAttempt(requestId)).toBe(0);
    });
  });

  describe('Execute with Retry', () => {
    test('should execute operation successfully on first try', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      
      const result = await errorHandler.executeWithRetry(mockOperation, {}, 'test-request');
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    test('should retry on network errors', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('Network request failed'))
        .mockResolvedValueOnce('success');
      
      const result = await errorHandler.executeWithRetry(
        mockOperation, 
        { type: 'api_request' }, 
        'test-request'
      );
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    test('should not retry on authentication errors', async () => {
      const authError = new Error('Invalid API key');
      authError.status = 401;
      const mockOperation = jest.fn().mockRejectedValue(authError);
      
      await expect(errorHandler.executeWithRetry(
        mockOperation, 
        { type: 'api_request' }, 
        'test-request'
      )).rejects.toThrow();
      
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    test('should handle rate limiting with retry-after', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.status = 429;
      rateLimitError.retryAfter = 1000; // 1 second
      
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce('success');
      
      // Mock sleep to avoid actual delays in tests
      const originalSleep = errorHandler.sleep;
      errorHandler.sleep = jest.fn().mockResolvedValue();
      
      const result = await errorHandler.executeWithRetry(
        mockOperation, 
        { type: 'api_request' }, 
        'test-request'
      );
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(2);
      expect(errorHandler.sleep).toHaveBeenCalledWith(expect.any(Number));
      
      // Restore original sleep
      errorHandler.sleep = originalSleep;
    });

    test('should fail after maximum retries', async () => {
      const networkError = new Error('Network request failed');
      const mockOperation = jest.fn().mockRejectedValue(networkError);
      
      // Mock sleep to avoid actual delays in tests
      const originalSleep = errorHandler.sleep;
      errorHandler.sleep = jest.fn().mockResolvedValue();
      
      await expect(errorHandler.executeWithRetry(
        mockOperation, 
        { type: 'api_request' }, 
        'test-request'
      )).rejects.toThrow();
      
      // Should try 1 initial + 3 retries = 4 times for network errors
      expect(mockOperation).toHaveBeenCalledTimes(4);
      
      // Restore original sleep
      errorHandler.sleep = originalSleep;
    });
  });

  describe('Error Response Creation', () => {
    test('should create proper error response for content script', () => {
      const error = new Error('Test error message');
      const requestId = 'test-123';
      const context = { type: 'completion' };
      
      const response = errorHandler.createErrorResponse(error, requestId, context);
      
      expect(response).toHaveProperty('error');
      expect(response).toHaveProperty('errorCategory');
      expect(response).toHaveProperty('shouldRetry');
      expect(response).toHaveProperty('requestId', requestId);
      expect(response).toHaveProperty('timestamp');
    });

    test('should handle already processed errors', () => {
      const processedError = {
        category: 'network',
        userMessage: 'Network error occurred',
        canRetry: true,
        retryDelay: 2000,
        currentAttempt: 1,
        maxRetries: 3,
        timestamp: Date.now()
      };
      
      const error = new Error('Original error');
      error.processedError = processedError;
      
      const response = errorHandler.createErrorResponse(error, 'test-123', {});
      
      expect(response.error).toBe(processedError.userMessage);
      expect(response.errorCategory).toBe(processedError.category);
      expect(response.shouldRetry).toBe(processedError.canRetry);
    });
  });

  describe('Data Sanitization', () => {
    test('should sanitize API keys from error messages', () => {
      const errorWithApiKey = 'Authentication failed with key sk-1234567890abcdef';
      const sanitized = errorHandler.sanitizeForLogging(errorWithApiKey);
      
      expect(sanitized).not.toContain('sk-1234567890abcdef');
      expect(sanitized).toContain('[API_KEY_REDACTED]');
    });

    test('should sanitize Anthropic API keys', () => {
      const errorWithApiKey = 'Error with sk-ant-1234567890abcdef';
      const sanitized = errorHandler.sanitizeForLogging(errorWithApiKey);
      
      expect(sanitized).not.toContain('sk-ant-1234567890abcdef');
      expect(sanitized).toContain('[API_KEY_REDACTED]');
    });

    test('should sanitize Gemini API keys', () => {
      const errorWithApiKey = 'Error with AIza1234567890abcdef1234567890abcdef12345';
      const sanitized = errorHandler.sanitizeForLogging(errorWithApiKey);
      
      expect(sanitized).not.toContain('AIza1234567890abcdef1234567890abcdef12345');
      expect(sanitized).toContain('[API_KEY_REDACTED]');
    });

    test('should sanitize bearer tokens', () => {
      const errorWithToken = 'Authorization failed: Bearer abc123def456';
      const sanitized = errorHandler.sanitizeForLogging(errorWithToken);
      
      expect(sanitized).not.toContain('Bearer abc123def456');
      expect(sanitized).toContain('[AUTH_TOKEN_REDACTED]');
    });

    test('should sanitize context data', () => {
      const context = {
        apiKey: 'sk-secret123',
        currentCode: 'a'.repeat(300), // Long code
        problemDescription: 'b'.repeat(300), // Long description
        normalField: 'normal value'
      };
      
      const sanitized = errorHandler.sanitizeContext(context);
      
      expect(sanitized).not.toHaveProperty('apiKey');
      expect(sanitized.currentCode.length).toBeLessThan(300);
      expect(sanitized.problemDescription.length).toBeLessThan(300);
      expect(sanitized.normalField).toBe('normal value');
    });
  });

  describe('Error Statistics', () => {
    test('should track error statistics', () => {
      const error1 = new Error('Network error');
      const error2 = new Error('Invalid API key');
      error2.status = 401;
      
      errorHandler.processError(error1, {}, 'req1');
      errorHandler.processError(error2, {}, 'req2');
      
      const stats = errorHandler.getErrorStats();
      
      expect(stats.totalErrors).toBe(2);
      expect(stats.errorsByCategory.network).toBe(1);
      expect(stats.errorsByCategory.auth).toBe(1);
    });

    test('should track retry statistics', () => {
      const requestId = 'test-request';
      
      errorHandler.incrementRetryAttempt(requestId);
      errorHandler.incrementRetryAttempt(requestId);
      errorHandler.clearRetryAttempts(requestId);
      
      const stats = errorHandler.getErrorStats();
      
      expect(stats.retriesPerformed).toBe(2);
      expect(stats.successfulRetries).toBe(1);
      expect(stats.retrySuccessRate).toBe('50.00%');
    });

    test('should reset statistics', () => {
      const error = new Error('Test error');
      errorHandler.processError(error, {}, 'req1');
      errorHandler.incrementRetryAttempt('req1');
      
      let stats = errorHandler.getErrorStats();
      expect(stats.totalErrors).toBe(1);
      expect(stats.retriesPerformed).toBe(1);
      
      errorHandler.resetStats();
      
      stats = errorHandler.getErrorStats();
      expect(stats.totalErrors).toBe(0);
      expect(stats.retriesPerformed).toBe(0);
    });
  });

  describe('Rate Limit Handling', () => {
    test('should handle rate limiting with custom retry-after', async () => {
      const retryAfter = 5000; // 5 seconds
      
      // Mock sleep to avoid actual delays
      const originalSleep = errorHandler.sleep;
      errorHandler.sleep = jest.fn().mockResolvedValue();
      
      await errorHandler.handleRateLimit(retryAfter, 'test-request');
      
      expect(errorHandler.sleep).toHaveBeenCalledWith(retryAfter);
      expect(errorHandler.getRetryAttempt('test-request')).toBe(1);
      
      // Restore original sleep
      errorHandler.sleep = originalSleep;
    });

    test('should use default delay when no retry-after provided', async () => {
      // Mock sleep to avoid actual delays
      const originalSleep = errorHandler.sleep;
      errorHandler.sleep = jest.fn().mockResolvedValue();
      
      await errorHandler.handleRateLimit(null, 'test-request');
      
      expect(errorHandler.sleep).toHaveBeenCalledWith(5000); // Default 5 seconds
      
      // Restore original sleep
      errorHandler.sleep = originalSleep;
    });
  });

  describe('Memory Management', () => {
    test('should clean up old retry attempts', () => {
      // Add many retry attempts
      for (let i = 0; i < 150; i++) {
        errorHandler.incrementRetryAttempt(`request-${i}`);
      }
      
      expect(errorHandler.retryAttempts.size).toBe(150);
      
      errorHandler.cleanupOldRetryAttempts();
      
      // Should remove some old entries
      expect(errorHandler.retryAttempts.size).toBeLessThan(150);
    });
  });
});

// Integration tests for error handling with other components
describe('Error Handling Integration', () => {
  let errorHandler;

  beforeEach(() => {
    errorHandler = new ComprehensiveErrorHandler();
  });

  test('should integrate with API client error handling', async () => {
    // Simulate API client using error handler
    const mockApiCall = jest.fn()
      .mockRejectedValueOnce(new Error('Network request failed'))
      .mockResolvedValueOnce({ data: 'success' });
    
    // Mock sleep to avoid delays
    const originalSleep = errorHandler.sleep;
    errorHandler.sleep = jest.fn().mockResolvedValue();
    
    const result = await errorHandler.executeWithRetry(
      mockApiCall,
      { type: 'api_request', provider: 'openai' },
      'api-request-123'
    );
    
    expect(result.data).toBe('success');
    expect(mockApiCall).toHaveBeenCalledTimes(2);
    
    // Restore original sleep
    errorHandler.sleep = originalSleep;
  });

  test('should handle complex error scenarios', async () => {
    // Simulate a sequence of different errors
    const errors = [
      Object.assign(new Error('Network timeout'), { name: 'TimeoutError' }),
      Object.assign(new Error('Rate limit exceeded'), { status: 429, retryAfter: 1000 }),
      Object.assign(new Error('Invalid API key'), { status: 401 })
    ];
    
    let callCount = 0;
    const mockOperation = jest.fn().mockImplementation(() => {
      if (callCount < errors.length) {
        const error = errors[callCount];
        callCount++;
        return Promise.reject(error);
      }
      return Promise.resolve('success');
    });
    
    // Mock sleep to avoid delays
    const originalSleep = errorHandler.sleep;
    errorHandler.sleep = jest.fn().mockResolvedValue();
    
    // Should fail on auth error (not retryable)
    await expect(errorHandler.executeWithRetry(
      mockOperation,
      { type: 'api_request' },
      'complex-request'
    )).rejects.toThrow('Your API key appears to be invalid');
    
    // Should have tried timeout and rate limit, then failed on auth
    expect(mockOperation).toHaveBeenCalledTimes(3);
    
    // Restore original sleep
    errorHandler.sleep = originalSleep;
  });
});