// LeetPilot Comprehensive Error Handler
// Provides retry logic, rate limit handling, and user-friendly error messages

/**
 * Comprehensive Error Handler
 * Centralizes all error handling logic with retry mechanisms and user-friendly messaging
 */
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

    // Retry configuration for different error types
    this.retryConfig = {
      [this.errorCategories.NETWORK]: { maxRetries: 3, baseDelay: 1000, maxDelay: 8000 },
      [this.errorCategories.API_ERROR]: { maxRetries: 2, baseDelay: 2000, maxDelay: 10000 },
      [this.errorCategories.RATE_LIMIT]: { maxRetries: 1, baseDelay: 5000, maxDelay: 30000 },
      [this.errorCategories.TIMEOUT]: { maxRetries: 2, baseDelay: 1500, maxDelay: 6000 },
      [this.errorCategories.QUOTA_EXCEEDED]: { maxRetries: 0, baseDelay: 0, maxDelay: 0 },
      [this.errorCategories.AUTHENTICATION]: { maxRetries: 0, baseDelay: 0, maxDelay: 0 },
      [this.errorCategories.VALIDATION]: { maxRetries: 0, baseDelay: 0, maxDelay: 0 },
      [this.errorCategories.CONFIGURATION]: { maxRetries: 0, baseDelay: 0, maxDelay: 0 }
    };

    // Track retry attempts per request with timestamps
    this.retryAttempts = new Map(); // requestId -> { count, timestamp }
    
    // Error statistics for monitoring
    this.errorStats = {
      totalErrors: 0,
      errorsByCategory: new Map(),
      retriesPerformed: 0,
      successfulRetries: 0
    };
    
    // Start automatic cleanup
    this.startCleanupTimer();
  }

  /**
   * Start automatic cleanup timer to prevent memory leaks
   */
  startCleanupTimer() {
    // Clean up every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldRetryAttempts();
    }, 5 * 60 * 1000);
  }

  /**
   * Clean up old retry attempts to prevent memory leaks
   */
  cleanupOldRetryAttempts() {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutes
    
    for (const [requestId, attemptData] of this.retryAttempts.entries()) {
      if (now - attemptData.timestamp > maxAge) {
        this.retryAttempts.delete(requestId);
      }
    }
  }

  /**
   * Record retry attempt with timestamp
   */
  recordRetryAttempt(requestId) {
    const current = this.getRetryAttempt(requestId);
    const newAttempt = current + 1;
    this.retryAttempts.set(requestId, {
      count: newAttempt,
      timestamp: Date.now()
    });
    this.errorStats.retriesPerformed++;
    return newAttempt;
  }

  /**
   * Get current retry attempt count
   */
  getRetryAttempt(requestId) {
    const attemptData = this.retryAttempts.get(requestId);
    return attemptData ? attemptData.count : 0;
  }

  /**
   * Clear retry attempts for a successful request
   */
  clearRetryAttempts(requestId) {
    if (this.retryAttempts.has(requestId)) {
      this.retryAttempts.delete(requestId);
      this.errorStats.successfulRetries++;
    }
  }

  /**
   * Destroy the error handler and clean up resources
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.retryAttempts.clear();
    this.errorStats.errorsByCategory.clear();
  }

  /**
   * Process error with comprehensive handling
   */
  async processError(error, context = {}, requestId = null) {
    this.errorStats.totalErrors++;
    
    const errorInfo = this.categorizeError(error, context);
    const userMessage = this.generateUserFriendlyMessage(errorInfo, context);
    const retryInfo = this.getRetryInfo(errorInfo.category, requestId);
    
    // Update error statistics
    const currentCount = this.errorStats.errorsByCategory.get(errorInfo.category) || 0;
    this.errorStats.errorsByCategory.set(errorInfo.category, currentCount + 1);
    
    // Log technical details (sanitized)
    console.error('Error processed:', {
      category: errorInfo.category,
      originalMessage: this.sanitizeForLogging(error.message || error.toString()),
      context: this.sanitizeContext(context),
      retryable: retryInfo.canRetry,
      attempt: retryInfo.currentAttempt,
      requestId: requestId
    });
    
    const processedError = {
      category: errorInfo.category,
      userMessage: userMessage,
      technicalMessage: this.sanitizeForLogging(error.message || error.toString()),
      canRetry: retryInfo.canRetry,
      shouldRetry: retryInfo.shouldRetry,
      retryDelay: retryInfo.retryDelay,
      currentAttempt: retryInfo.currentAttempt,
      maxRetries: retryInfo.maxRetries,
      timestamp: Date.now(),
      requestId: requestId,
      httpStatus: errorInfo.httpStatus,
      retryAfter: errorInfo.retryAfter
    };

    return processedError;
  }

  /**
   * Enhanced error categorization with detailed analysis
   */
  categorizeError(error, context = {}) {
    const message = (error.message || error.toString()).toLowerCase();
    const httpStatus = error.status || context.httpStatus || null;
    const retryAfter = error.retryAfter || context.retryAfter || null;
    
    // Network and connection errors
    if (this.isNetworkError(error, message)) {
      return {
        category: this.errorCategories.NETWORK,
        httpStatus: httpStatus,
        retryAfter: retryAfter
      };
    }
    
    // Authentication and authorization errors
    if (this.isAuthError(error, message, httpStatus)) {
      return {
        category: this.errorCategories.AUTHENTICATION,
        httpStatus: httpStatus,
        retryAfter: null
      };
    }
    
    // Rate limiting errors
    if (this.isRateLimitError(error, message, httpStatus)) {
      return {
        category: this.errorCategories.RATE_LIMIT,
        httpStatus: httpStatus,
        retryAfter: retryAfter || this.extractRetryAfter(message)
      };
    }
    
    // Quota exceeded errors
    if (this.isQuotaError(error, message, httpStatus)) {
      return {
        category: this.errorCategories.QUOTA_EXCEEDED,
        httpStatus: httpStatus,
        retryAfter: retryAfter
      };
    }
    
    // Timeout errors
    if (this.isTimeoutError(error, message)) {
      return {
        category: this.errorCategories.TIMEOUT,
        httpStatus: httpStatus,
        retryAfter: null
      };
    }
    
    // Validation errors
    if (this.isValidationError(error, message, httpStatus)) {
      return {
        category: this.errorCategories.VALIDATION,
        httpStatus: httpStatus,
        retryAfter: null
      };
    }
    
    // API server errors
    if (this.isAPIError(error, message, httpStatus)) {
      return {
        category: this.errorCategories.API_ERROR,
        httpStatus: httpStatus,
        retryAfter: retryAfter
      };
    }
    
    // Configuration errors
    if (this.isConfigError(error, message, context)) {
      return {
        category: this.errorCategories.CONFIGURATION,
        httpStatus: httpStatus,
        retryAfter: null
      };
    }
    
    // Unknown errors
    return {
      category: this.errorCategories.UNKNOWN,
      httpStatus: httpStatus,
      retryAfter: null
    };
  }

  /**
   * Check if error is network-related
   */
  isNetworkError(error, message) {
    const networkIndicators = [
      'network', 'fetch', 'connection', 'timeout', 'dns', 'socket',
      'enotfound', 'econnrefused', 'econnreset', 'etimedout',
      'failed to fetch', 'network request failed'
    ];
    
    return networkIndicators.some(indicator => message.includes(indicator)) ||
           error.name === 'TypeError' && message.includes('fetch') ||
           error.code && ['ENOTFOUND', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT'].includes(error.code);
  }

  /**
   * Check if error is authentication-related
   */
  isAuthError(error, message, httpStatus) {
    const authIndicators = [
      'unauthorized', 'invalid api key', 'authentication', 'invalid_api_key',
      'api key', 'token', 'credentials', 'permission denied'
    ];
    
    return [401, 403].includes(httpStatus) ||
           authIndicators.some(indicator => message.includes(indicator));
  }

  /**
   * Check if error is rate limiting
   */
  isRateLimitError(error, message, httpStatus) {
    const rateLimitIndicators = [
      'rate limit', 'too many requests', 'quota exceeded', 'throttled',
      'rate_limit_exceeded', 'requests per minute'
    ];
    
    return httpStatus === 429 ||
           rateLimitIndicators.some(indicator => message.includes(indicator));
  }

  /**
   * Check if error is quota exceeded
   */
  isQuotaError(error, message, httpStatus) {
    const quotaIndicators = [
      'quota exceeded', 'usage limit', 'billing', 'insufficient_quota',
      'monthly limit', 'credit limit', 'usage cap'
    ];
    
    return quotaIndicators.some(indicator => message.includes(indicator)) ||
           (httpStatus === 429 && message.includes('quota'));
  }

  /**
   * Check if error is timeout-related
   */
  isTimeoutError(error, message) {
    const timeoutIndicators = [
      'timeout', 'timed out', 'request timeout', 'gateway timeout'
    ];
    
    return timeoutIndicators.some(indicator => message.includes(indicator)) ||
           error.name === 'TimeoutError';
  }

  /**
   * Check if error is validation-related
   */
  isValidationError(error, message, httpStatus) {
    const validationIndicators = [
      'validation', 'invalid', 'required', 'bad request', 'malformed',
      'invalid_request_error', 'parameter'
    ];
    
    return httpStatus === 400 ||
           validationIndicators.some(indicator => message.includes(indicator));
  }

  /**
   * Check if error is API server error
   */
  isAPIError(error, message, httpStatus) {
    return [500, 502, 503, 504].includes(httpStatus) ||
           message.includes('internal server error') ||
           message.includes('service unavailable') ||
           message.includes('bad gateway');
  }

  /**
   * Check if error is configuration-related
   */
  isConfigError(error, message, context) {
    const configIndicators = [
      'configuration', 'not configured', 'missing config', 'setup required'
    ];
    
    return configIndicators.some(indicator => message.includes(indicator)) ||
           context.type === 'configuration' ||
           message.includes('api key') && message.includes('not found');
  }

  /**
   * Extract retry-after value from error message
   */
  extractRetryAfter(message) {
    const retryAfterMatch = message.match(/retry.*?(\d+)/i);
    if (retryAfterMatch) {
      return parseInt(retryAfterMatch[1]) * 1000; // Convert to milliseconds
    }
    return null;
  }

  /**
   * Get retry information for a specific error category and request
   */
  getRetryInfo(category, requestId) {
    const config = this.retryConfig[category] || this.retryConfig[this.errorCategories.UNKNOWN];
    const currentAttempt = this.getRetryAttempt(requestId);
    const canRetry = config && config.maxRetries > 0 && currentAttempt < config.maxRetries;
    const shouldRetry = canRetry;
    
    let retryDelay = 0;
    if (canRetry && config) {
      // Calculate exponential backoff with jitter
      retryDelay = Math.min(
        config.baseDelay * Math.pow(2, currentAttempt) + Math.random() * 1000,
        config.maxDelay
      );
    }
    
    return {
      canRetry,
      shouldRetry,
      retryDelay,
      currentAttempt,
      maxRetries: config ? config.maxRetries : 0
    };
  }

  /**
   * Get current retry attempt for a request
   */
  getRetryAttempt(requestId) {
    if (!requestId) return 0;
    return this.retryAttempts.get(requestId) || 0;
  }

  /**
   * Increment retry attempt for a request
   */
  incrementRetryAttempt(requestId) {
    if (!requestId) return 0;
    const current = this.getRetryAttempt(requestId);
    const newAttempt = current + 1;
    this.retryAttempts.set(requestId, newAttempt);
    this.errorStats.retriesPerformed++;
    return newAttempt;
  }

  /**
   * Clear retry attempts for a request (on success)
   */
  clearRetryAttempts(requestId) {
    if (requestId && this.retryAttempts.has(requestId)) {
      this.retryAttempts.delete(requestId);
      this.errorStats.successfulRetries++;
    }
  }

  /**
   * Generate user-friendly error messages
   */
  generateUserFriendlyMessage(errorInfo, context) {
    const { category, httpStatus, retryAfter } = errorInfo;
    
    switch (category) {
      case this.errorCategories.NETWORK:
        return "Unable to connect to the AI service. Please check your internet connection and try again.";
      
      case this.errorCategories.AUTHENTICATION:
        if (httpStatus === 401) {
          return "Your API key appears to be invalid. Please check your configuration in the extension popup and ensure your API key is correct.";
        } else if (httpStatus === 403) {
          return "Access denied. Please verify your API key has the necessary permissions for this service.";
        }
        return "There's an authentication issue with your API key. Please check your configuration.";
      
      case this.errorCategories.RATE_LIMIT:
        const waitTime = retryAfter ? Math.ceil(retryAfter / 1000) : 60;
        return `You've made too many requests recently. Please wait ${waitTime} seconds before trying again.`;
      
      case this.errorCategories.QUOTA_EXCEEDED:
        return "You've reached your usage limit for this AI service. Please check your account billing or upgrade your plan.";
      
      case this.errorCategories.TIMEOUT:
        return "The request timed out. The AI service might be experiencing high load. Please try again in a moment.";
      
      case this.errorCategories.VALIDATION:
        return "There's an issue with the request format. Please try again or check your code input.";
      
      case this.errorCategories.API_ERROR:
        if (httpStatus === 500) {
          return "The AI service is experiencing internal issues. Please try again in a few moments.";
        } else if (httpStatus === 502 || httpStatus === 503) {
          return "The AI service is temporarily unavailable. Please try again shortly.";
        } else if (httpStatus === 504) {
          return "The AI service is taking too long to respond. Please try again.";
        }
        return "The AI service is temporarily unavailable. Please try again in a few moments.";
      
      case this.errorCategories.CONFIGURATION:
        return "Please configure your AI provider settings in the extension popup before using LeetPilot.";
      
      default:
        return "An unexpected error occurred. Please try again, and if the problem persists, check your extension settings.";
    }
  }

  /**
   * Execute operation with automatic retry logic
   */
  async executeWithRetry(operation, context = {}, requestId = null) {
    let lastError = null;
    
    while (true) {
      try {
        const result = await operation();
        
        // Success - clear retry attempts
        this.clearRetryAttempts(requestId);
        return result;
        
      } catch (error) {
        lastError = error;
        
        // Process the error
        const processedError = await this.processError(error, context, requestId);
        
        // Check if we should retry
        if (processedError.shouldRetry) {
          // Increment retry attempt
          this.incrementRetryAttempt(requestId);
          
          console.log(`Retrying operation after ${processedError.retryDelay}ms (attempt ${processedError.currentAttempt + 1}/${processedError.maxRetries})`);
          
          // Wait before retry
          await this.sleep(processedError.retryDelay);
          
          // Continue to next iteration (retry)
          continue;
        } else {
          // No more retries - throw the processed error
          const enhancedError = new Error(processedError.userMessage);
          enhancedError.processedError = processedError;
          enhancedError.originalError = error;
          throw enhancedError;
        }
      }
    }
  }

  /**
   * Handle rate limiting with exponential backoff
   */
  async handleRateLimit(retryAfter = null, requestId = null) {
    const baseDelay = retryAfter || 5000; // Default 5 seconds
    const attempt = this.getRetryAttempt(requestId);
    const delay = Math.min(baseDelay * Math.pow(1.5, attempt), 30000); // Max 30 seconds
    
    console.log(`Rate limited, waiting ${delay}ms before retry`);
    
    await this.sleep(delay);
    this.incrementRetryAttempt(requestId);
  }

  /**
   * Sanitize error messages for logging (remove sensitive data)
   */
  sanitizeForLogging(message) {
    if (!message) return 'Unknown error';
    
    return message
      .replace(/sk-[a-zA-Z0-9]+/g, '[API_KEY_REDACTED]')
      .replace(/sk-ant-[a-zA-Z0-9-]+/g, '[API_KEY_REDACTED]')
      .replace(/AIza[a-zA-Z0-9]{35}/g, '[API_KEY_REDACTED]')
      .replace(/Bearer\s+[a-zA-Z0-9-_]+/g, '[AUTH_TOKEN_REDACTED]')
      .replace(/api[_-]?key[:\s=]+[a-zA-Z0-9-_]+/gi, 'api_key=[REDACTED]')
      .replace(/token[:\s=]+[a-zA-Z0-9-_]+/gi, 'token=[REDACTED]')
      .replace(/password[:\s=]+[^\s]+/gi, 'password=[REDACTED]')
      .replace(/authorization[:\s=]+[^\s]+/gi, 'authorization=[REDACTED]');
  }

  /**
   * Sanitize context for logging
   */
  sanitizeContext(context) {
    if (!context || typeof context !== 'object') return {};
    
    const sanitized = { ...context };
    
    // Remove sensitive fields
    delete sanitized.apiKey;
    delete sanitized.authorization;
    delete sanitized.password;
    delete sanitized.token;
    
    // Truncate long fields
    if (sanitized.currentCode && sanitized.currentCode.length > 200) {
      sanitized.currentCode = sanitized.currentCode.substring(0, 200) + '...';
    }
    
    if (sanitized.problemDescription && sanitized.problemDescription.length > 200) {
      sanitized.problemDescription = sanitized.problemDescription.substring(0, 200) + '...';
    }
    
    return sanitized;
  }

  /**
   * Create error response for content script
   */
  createErrorResponse(error, requestId, context = {}) {
    let processedError;
    
    if (error.processedError) {
      // Already processed error
      processedError = error.processedError;
    } else {
      // Process the error synchronously for response
      const errorInfo = this.categorizeError(error, context);
      const userMessage = this.generateUserFriendlyMessage(errorInfo, context);
      const retryInfo = this.getRetryInfo(errorInfo.category, requestId);
      
      processedError = {
        category: errorInfo.category,
        userMessage: userMessage,
        canRetry: retryInfo.canRetry,
        retryDelay: retryInfo.retryDelay,
        currentAttempt: retryInfo.currentAttempt,
        maxRetries: retryInfo.maxRetries,
        timestamp: Date.now(),
        httpStatus: errorInfo.httpStatus
      };
    }
    
    return {
      error: processedError.userMessage,
      errorCategory: processedError.category,
      shouldRetry: processedError.canRetry,
      retryDelay: processedError.retryDelay,
      retryAttempt: processedError.currentAttempt,
      maxRetries: processedError.maxRetries,
      requestId: requestId,
      timestamp: processedError.timestamp,
      httpStatus: processedError.httpStatus
    };
  }

  /**
   * Get error statistics for monitoring
   */
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

  /**
   * Reset error statistics
   */
  resetStats() {
    this.errorStats = {
      totalErrors: 0,
      errorsByCategory: new Map(),
      retriesPerformed: 0,
      successfulRetries: 0
    };
    this.retryAttempts.clear();
  }

  /**
   * Sleep utility for delays
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }


}

// Export for use in other modules
export { ComprehensiveErrorHandler };