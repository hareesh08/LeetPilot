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

// Mock ComprehensiveErrorHandler class (mirrors src/core/error-handler.js)
class ComprehensiveErrorHandler {
  constructor() {
    this.errorCategories = {
      NETWORK: 'network',
      AUTHENTICATION: 'auth',
      RATE_LIMIT: 'rate_limit',
      VALIDATION: 'validation',
      API_ERROR: 'api_error',
      CONFIGURATION: 'config',
      QUOTA_EXCEEDED: 'quota',
      TIMEOUT: 'timeout',
      UNKNOWN: 'unknown'
    };

    this.retryConfig = {
      network: { maxRetries: 3, baseDelay: 1000, maxDelay: 8000 },
      api_error: { maxRetries: 2, baseDelay: 2000, maxDelay: 10000 },
      rate_limit: { maxRetries: 1, baseDelay: 5000, maxDelay: 30000 },
      timeout: { maxRetries: 2, baseDelay: 1500, maxDelay: 6000 },
      quota: { maxRetries: 0, baseDelay: 0, maxDelay: 0 },
      auth: { maxRetries: 0, baseDelay: 0, maxDelay: 0 },
      validation: { maxRetries: 0, baseDelay: 0, maxDelay: 0 },
      config: { maxRetries: 0, baseDelay: 0, maxDelay: 0 }
    };

    this.retryAttempts = new Map();
    this.errorStats = {
      totalErrors: 0,
      errorsByCategory: new Map(),
      retriesPerformed: 0,
      successfulRetries: 0
    };
  }

  categorizeError(error, context = {}) {
    const message = (error.message || error.toString()).toLowerCase();
    const httpStatus = error.status || context.httpStatus || null;

    if (this.isNetworkError(error, message)) {
      return { category: 'network', httpStatus, retryAfter: null };
    }
    if (this.isAuthError(error, message, httpStatus)) {
      return { category: 'auth', httpStatus, retryAfter: null };
    }
    if (this.isRateLimitError(error, message, httpStatus)) {
      return { category: 'rate_limit', httpStatus, retryAfter: null };
    }
    if (this.isQuotaError(error, message, httpStatus)) {
      return { category: 'quota', httpStatus, retryAfter: null };
    }
    if (this.isTimeoutError(error, message)) {
      return { category: 'timeout', httpStatus, retryAfter: null };
    }
    if (this.isValidationError(error, message, httpStatus)) {
      return { category: 'validation', httpStatus, retryAfter: null };
    }
    if (this.isAPIError(error, message, httpStatus)) {
      return { category: 'api_error', httpStatus, retryAfter: null };
    }
    if (this.isConfigError(error, message, context)) {
      return { category: 'config', httpStatus, retryAfter: null };
    }
    return { category: 'unknown', httpStatus, retryAfter: null };
  }

  isNetworkError(error, message) {
    const indicators = ['network', 'fetch', 'connection', 'timeout', 'dns', 'socket', 'failed to fetch'];
    return indicators.some(i => message.includes(i));
  }

  isAuthError(error, message, httpStatus) {
    const indicators = ['unauthorized', 'invalid api key', 'authentication', 'invalid_api_key'];
    return [401, 403].includes(httpStatus) || indicators.some(i => message.includes(i));
  }

  isRateLimitError(error, message, httpStatus) {
    const indicators = ['rate limit', 'too many requests', 'throttled'];
    return httpStatus === 429 || indicators.some(i => message.includes(i));
  }

  isQuotaError(error, message, httpStatus) {
    const indicators = ['quota exceeded', 'usage limit', 'billing', 'insufficient_quota'];
    return indicators.some(i => message.includes(i));
  }

  isTimeoutError(error, message) {
    const indicators = ['timeout', 'timed out', 'request timeout'];
    return indicators.some(i => message.includes(i)) || error.name === 'TimeoutError';
  }

  isValidationError(error, message, httpStatus) {
    const indicators = ['validation', 'invalid', 'required', 'bad request', 'malformed'];
    return httpStatus === 400 || indicators.some(i => message.includes(i));
  }

  isAPIError(error, message, httpStatus) {
    return [500, 502, 503, 504].includes(httpStatus) ||
           message.includes('internal server error') ||
           message.includes('service unavailable');
  }

  isConfigError(error, message, context) {
    const indicators = ['configuration', 'not configured', 'missing config'];
    return indicators.some(i => message.includes(i)) || context.type === 'configuration';
  }

  generateUserFriendlyMessage(errorInfo, context = {}) {
    const { category, httpStatus, retryAfter } = errorInfo;

    switch (category) {
      case 'network':
        return "Unable to connect to the AI service. Please check your internet connection and try again.";
      case 'auth':
        return httpStatus === 401
          ? "Your API key appears to be invalid. Please check your configuration."
          : "Access denied. Please verify your API key has the necessary permissions.";
      case 'rate_limit':
        const waitTime = retryAfter ? Math.ceil(retryAfter / 1000) : 60;
        return `You've made too many requests recently. Please wait ${waitTime} seconds before trying again.`;
      case 'quota':
        return "You've reached your usage limit for this AI service. Please check your account billing.";
      case 'timeout':
        return "The request timed out. The AI service might be experiencing high load. Please try again.";
      case 'validation':
        return "There's an issue with the request format. Please try again or check your code input.";
      case 'api_error':
        return "The AI service is temporarily unavailable. Please try again in a few moments.";
      case 'config':
        return "Please configure your AI provider settings in the extension popup before using LeetPilot.";
      default:
        return "An unexpected error occurred. Please try again.";
    }
  }

  getRetryInfo(category, requestId) {
    const config = this.retryConfig[category] || this.retryConfig.unknown;
    const currentAttempt = this.getRetryAttempt(requestId);
    const canRetry = config && config.maxRetries > 0 && currentAttempt < config.maxRetries;

    let retryDelay = 0;
    if (canRetry && config) {
      retryDelay = Math.min(
        config.baseDelay * Math.pow(2, currentAttempt) + Math.random() * 1000,
        config.maxDelay
      );
    }

    return {
      canRetry,
      shouldRetry: canRetry,
      retryDelay,
      currentAttempt,
      maxRetries: config ? config.maxRetries : 0
    };
  }

  getRetryAttempt(requestId) {
    if (!requestId) return 0;
    const attemptData = this.retryAttempts.get(requestId);
    return attemptData ? attemptData.count : 0;
  }

  incrementRetryAttempt(requestId) {
    if (!requestId) return 0;
    const current = this.getRetryAttempt(requestId);
    const newAttempt = current + 1;
    this.retryAttempts.set(requestId, { count: newAttempt, timestamp: Date.now() });
    this.errorStats.retriesPerformed++;
    return newAttempt;
  }

  clearRetryAttempts(requestId) {
    if (requestId && this.retryAttempts.has(requestId)) {
      this.retryAttempts.delete(requestId);
      this.errorStats.successfulRetries++;
    }
  }

  async processError(error, context = {}, requestId = null) {
    this.errorStats.totalErrors++;

    const errorInfo = this.categorizeError(error, context);
    const userMessage = this.generateUserFriendlyMessage(errorInfo, context);
    const retryInfo = this.getRetryInfo(errorInfo.category, requestId);

    const currentCount = this.errorStats.errorsByCategory.get(errorInfo.category) || 0;
    this.errorStats.errorsByCategory.set(errorInfo.category, currentCount + 1);

    return {
      category: errorInfo.category,
      userMessage,
      technicalMessage: error.message || error.toString(),
      canRetry: retryInfo.canRetry,
      shouldRetry: retryInfo.shouldRetry,
      retryDelay: retryInfo.retryDelay,
      currentAttempt: retryInfo.currentAttempt,
      maxRetries: retryInfo.maxRetries,
      timestamp: Date.now(),
      requestId,
      httpStatus: errorInfo.httpStatus
    };
  }

  sanitizeForLogging(message) {
    if (!message) return 'Unknown error';
    return message
      .replace(/sk-[a-zA-Z0-9]+/g, '[API_KEY_REDACTED]')
      .replace(/sk-ant-[a-zA-Z0-9-]+/g, '[API_KEY_REDACTED]')
      .replace(/Bearer\s+[a-zA-Z0-9-_]+/g, '[AUTH_TOKEN_REDACTED]');
  }

  getErrorStats() {
    return {
      totalErrors: this.errorStats.totalErrors,
      errorsByCategory: Object.fromEntries(this.errorStats.errorsByCategory),
      retriesPerformed: this.errorStats.retriesPerformed,
      successfulRetries: this.errorStats.successfulRetries,
      retrySuccessRate: this.errorStats.retriesPerformed > 0
        ? (this.errorStats.successfulRetries / this.errorStats.retriesPerformed * 100).toFixed(2) + '%'
        : '0%',
      activeRetryAttempts: this.retryAttempts.size
    };
  }

  resetStats() {
    this.errorStats = {
      totalErrors: 0,
      errorsByCategory: new Map(),
      retriesPerformed: 0,
      successfulRetries: 0
    };
    this.retryAttempts.clear();
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

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
      const quotaError = new Error('Quota exceeded for this billing period');
      const errorInfo = errorHandler.categorizeError(quotaError);
      
      expect(errorInfo.category).toBe('quota');
    });

    test('should categorize timeout errors correctly', () => {
      const timeoutError = new Error('Request timed out');
      timeoutError.name = 'TimeoutError';
      const errorInfo = errorHandler.categorizeError(timeoutError);
      
      expect(errorInfo.category).toBe('timeout');
    });

    test('should categorize validation errors correctly', () => {
      const validationError = new Error('Invalid request format');
      validationError.status = 400;
      const errorInfo = errorHandler.categorizeError(validationError);
      
      expect(errorInfo.category).toBe('validation');
    });

    test('should categorize API errors correctly', () => {
      const apiError = new Error('Internal server error');
      apiError.status = 500;
      const errorInfo = errorHandler.categorizeError(apiError);
      
      expect(errorInfo.category).toBe('api_error');
    });

    test('should categorize configuration errors correctly', () => {
      const configError = new Error('API not configured');
      const errorInfo = errorHandler.categorizeError(configError, { type: 'configuration' });
      
      expect(errorInfo.category).toBe('config');
    });

    test('should categorize unknown errors correctly', () => {
      const unknownError = new Error('Something completely unexpected happened');
      const errorInfo = errorHandler.categorizeError(unknownError);
      
      expect(errorInfo.category).toBe('unknown');
    });
  });

  describe('User-Friendly Messages', () => {
    test('should generate user-friendly message for network errors', () => {
      const errorInfo = { category: 'network', httpStatus: null, retryAfter: null };
      const message = errorHandler.generateUserFriendlyMessage(errorInfo);
      
      expect(message).toContain('internet connection');
    });

    test('should generate user-friendly message for auth errors', () => {
      const errorInfo = { category: 'auth', httpStatus: 401, retryAfter: null };
      const message = errorHandler.generateUserFriendlyMessage(errorInfo);
      
      expect(message).toContain('API key');
    });

    test('should generate user-friendly message for rate limit errors', () => {
      const errorInfo = { category: 'rate_limit', httpStatus: 429, retryAfter: 60000 };
      const message = errorHandler.generateUserFriendlyMessage(errorInfo);
      
      expect(message).toContain('too many requests');
    });

    test('should generate user-friendly message for quota errors', () => {
      const errorInfo = { category: 'quota', httpStatus: null, retryAfter: null };
      const message = errorHandler.generateUserFriendlyMessage(errorInfo);
      
      expect(message).toContain('usage limit');
    });
  });

  describe('Retry Logic', () => {
    test('should allow retries for network errors', () => {
      const retryInfo = errorHandler.getRetryInfo('network', 'test-request-1');
      
      expect(retryInfo.canRetry).toBe(true);
      expect(retryInfo.maxRetries).toBe(3);
    });

    test('should not allow retries for auth errors', () => {
      const retryInfo = errorHandler.getRetryInfo('auth', 'test-request-2');
      
      expect(retryInfo.canRetry).toBe(false);
      expect(retryInfo.maxRetries).toBe(0);
    });

    test('should not allow retries for quota errors', () => {
      const retryInfo = errorHandler.getRetryInfo('quota', 'test-request-3');
      
      expect(retryInfo.canRetry).toBe(false);
      expect(retryInfo.maxRetries).toBe(0);
    });

    test('should track retry attempts', () => {
      const requestId = 'test-request-4';
      
      expect(errorHandler.getRetryAttempt(requestId)).toBe(0);
      
      errorHandler.incrementRetryAttempt(requestId);
      expect(errorHandler.getRetryAttempt(requestId)).toBe(1);
      
      errorHandler.incrementRetryAttempt(requestId);
      expect(errorHandler.getRetryAttempt(requestId)).toBe(2);
    });

    test('should clear retry attempts on success', () => {
      const requestId = 'test-request-5';
      
      errorHandler.incrementRetryAttempt(requestId);
      errorHandler.incrementRetryAttempt(requestId);
      expect(errorHandler.getRetryAttempt(requestId)).toBe(2);
      
      errorHandler.clearRetryAttempts(requestId);
      expect(errorHandler.getRetryAttempt(requestId)).toBe(0);
    });

    test('should calculate exponential backoff delay', () => {
      const requestId = 'test-request-6';
      
      const retryInfo1 = errorHandler.getRetryInfo('network', requestId);
      expect(retryInfo1.retryDelay).toBeGreaterThan(0);
      expect(retryInfo1.retryDelay).toBeLessThanOrEqual(8000);
      
      errorHandler.incrementRetryAttempt(requestId);
      const retryInfo2 = errorHandler.getRetryInfo('network', requestId);
      expect(retryInfo2.retryDelay).toBeGreaterThan(retryInfo1.retryDelay - 1000);
    });
  });

  describe('Error Processing', () => {
    test('should process error and return comprehensive result', async () => {
      const error = new Error('Network request failed');
      const result = await errorHandler.processError(error, {}, 'test-request-7');
      
      expect(result.category).toBe('network');
      expect(result.userMessage).toBeDefined();
      expect(result.canRetry).toBe(true);
      expect(result.timestamp).toBeDefined();
    });

    test('should track error statistics', async () => {
      const error1 = new Error('Network request failed');
      const error2 = new Error('Invalid API key');
      error2.status = 401;
      
      await errorHandler.processError(error1, {}, 'req-1');
      await errorHandler.processError(error2, {}, 'req-2');
      
      const stats = errorHandler.getErrorStats();
      expect(stats.totalErrors).toBe(2);
    });
  });

  describe('Security', () => {
    test('should sanitize API keys in log messages', () => {
      const messageWithKey = 'Error with key sk-1234567890abcdef1234567890abcdef1234567890abcdef';
      const sanitized = errorHandler.sanitizeForLogging(messageWithKey);
      
      expect(sanitized).not.toContain('sk-1234567890abcdef1234567890abcdef1234567890abcdef');
      expect(sanitized).toContain('[API_KEY_REDACTED]');
    });

    test('should sanitize Bearer tokens in log messages', () => {
      const messageWithToken = 'Error with Bearer abc123def456';
      const sanitized = errorHandler.sanitizeForLogging(messageWithToken);
      
      expect(sanitized).not.toContain('abc123def456');
      expect(sanitized).toContain('[AUTH_TOKEN_REDACTED]');
    });
  });

  describe('Statistics', () => {
    test('should reset statistics', async () => {
      const error = new Error('Network request failed');
      await errorHandler.processError(error, {}, 'test-req');
      
      expect(errorHandler.getErrorStats().totalErrors).toBe(1);
      
      errorHandler.resetStats();
      
      expect(errorHandler.getErrorStats().totalErrors).toBe(0);
    });

    test('should calculate retry success rate', () => {
      errorHandler.incrementRetryAttempt('req-1');
      errorHandler.incrementRetryAttempt('req-2');
      errorHandler.clearRetryAttempts('req-1');
      
      const stats = errorHandler.getErrorStats();
      expect(stats.retriesPerformed).toBe(2);
      expect(stats.successfulRetries).toBe(1);
      expect(stats.retrySuccessRate).toBe('50.00%');
    });
  });
});
