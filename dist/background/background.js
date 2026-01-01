// LeetPilot Background Service Worker
// Handles AI API communications and prompt processing

// Import storage manager, security monitor, input validator, and error handler
importScripts('/src/storage-manager.js');
importScripts('/src/security-monitor.js');
importScripts('/src/input-validator.js');
importScripts('/src/error-handler.js');

console.log('LeetPilot background service worker loaded');

// Initialize storage manager, security monitor, input validator, and error handler
let storageManager;
let securityMonitor;
let inputValidator;
let comprehensiveErrorHandler;

// Initialize extension
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('LeetPilot extension installed');
    // Open configuration popup on first install
    chrome.action.openPopup();
  }
  
  // Initialize storage manager, security monitor, input validator, and error handler
  initializeStorageManager();
  initializeSecurityMonitor();
  initializeInputValidator();
  initializeErrorHandler();
});

// Handle extension uninstall - secure cleanup
chrome.runtime.onSuspend.addListener(() => {
  console.log('Extension suspending - performing secure cleanup');
  performSecureCleanup();
});

// Initialize storage manager
async function initializeStorageManager() {
  try {
    if (typeof LeetPilotStorage !== 'undefined') {
      storageManager = new LeetPilotStorage.StorageManager();
      console.log('Storage manager initialized');
    } else {
      console.error('Storage manager not available');
    }
  } catch (error) {
    console.error('Failed to initialize storage manager:', error);
  }
}

// Initialize security monitor
async function initializeSecurityMonitor() {
  try {
    if (typeof LeetPilotSecurity !== 'undefined') {
      securityMonitor = new LeetPilotSecurity.SecurityMonitor();
      console.log('Security monitor initialized');
    } else {
      console.error('Security monitor not available');
    }
  } catch (error) {
    console.error('Failed to initialize security monitor:', error);
  }
}

// Initialize input validator
async function initializeInputValidator() {
  try {
    if (typeof LeetPilotValidator !== 'undefined') {
      inputValidator = new LeetPilotValidator.InputValidator();
      console.log('Input validator initialized');
    } else {
      console.error('Input validator not available');
    }
  } catch (error) {
    console.error('Failed to initialize input validator:', error);
  }
}

// Initialize error handler
async function initializeErrorHandler() {
  try {
    if (typeof LeetPilotErrorHandler !== 'undefined') {
      comprehensiveErrorHandler = new LeetPilotErrorHandler.ComprehensiveErrorHandler();
      console.log('Comprehensive error handler initialized');
    } else {
      console.error('Comprehensive error handler not available');
    }
  } catch (error) {
    console.error('Failed to initialize comprehensive error handler:', error);
  }
}

// Perform secure cleanup on extension uninstall/suspend
async function performSecureCleanup() {
  try {
    console.log('Starting secure cleanup process...');
    
    // Stop security monitoring
    if (securityMonitor) {
      securityMonitor.stopMonitoring();
    }
    
    // Clear sensitive data from storage manager
    if (storageManager) {
      await storageManager.clearUserData();
      console.log('User data cleared from storage');
    }
    
    // Clear any cached data in memory
    clearMemoryCache();
    
    console.log('Secure cleanup completed');
  } catch (error) {
    console.error('Error during secure cleanup:', error);
  }
}

// Clear sensitive data from memory
function clearMemoryCache() {
  try {
    // Clear request orchestrator caches
    if (requestOrchestrator) {
      requestOrchestrator.requestQueue = [];
      requestOrchestrator.activeRequests.clear();
      
      if (requestOrchestrator.contextManager) {
        requestOrchestrator.contextManager.contextCache.clear();
        requestOrchestrator.contextManager.sessionState.clear();
      }
    }
    
    // Clear progressive hint system
    if (progressiveHintSystem) {
      progressiveHintSystem.hintSessions.clear();
    }
    
    // Clear any other sensitive caches
    console.log('Memory cache cleared');
  } catch (error) {
    console.error('Error clearing memory cache:', error);
  }
}

/**
 * Request Orchestration System
 * Handles message passing, queuing, rate limiting, and context management
 */
class RequestOrchestrator {
  constructor() {
    this.requestQueue = [];
    this.activeRequests = new Map();
    this.rateLimiter = new RateLimiter();
    this.contextManager = new ContextManager();
    this.requestId = 0;
  }

  /**
   * Process incoming request with orchestration
   */
  async processRequest(request, sender, sendResponse) {
    const requestId = ++this.requestId;
    const timestamp = Date.now();
    
    console.log(`Processing request ${requestId}:`, request.type);

    try {
      // Validate request
      const validation = this.validateRequest(request);
      if (!validation.valid) {
        sendResponse({ 
          error: validation.error,
          requestId: requestId 
        });
        return;
      }

      // Check rate limits
      const rateLimitCheck = await this.rateLimiter.checkLimit(request.type, sender.tab?.id);
      if (!rateLimitCheck.allowed) {
        sendResponse({ 
          error: 'Rate limit exceeded. Please wait before making another request.',
          retryAfter: rateLimitCheck.retryAfter,
          requestId: requestId 
        });
        return;
      }

      // Add context management
      const enrichedRequest = await this.contextManager.enrichRequest(request, requestId);

      // Queue the request
      const queuedRequest = {
        id: requestId,
        type: request.type,
        data: enrichedRequest,
        sender: sender,
        sendResponse: sendResponse,
        timestamp: timestamp,
        retryCount: 0
      };

      this.requestQueue.push(queuedRequest);
      this.activeRequests.set(requestId, queuedRequest);

      // Process the queue
      await this.processQueue();

    } catch (error) {
      console.error(`Error processing request ${requestId}:`, error);
      sendResponse({ 
        error: 'Internal error processing request',
        requestId: requestId 
      });
    }
  }

  /**
   * Validate incoming request structure
   */
  validateRequest(request) {
    if (!inputValidator) {
      console.warn('Input validator not available, using basic validation');
      return this.basicValidateRequest(request);
    }

    // Use comprehensive input validation
    if (!request || typeof request !== 'object') {
      return { valid: false, error: 'Invalid request format' };
    }

    if (!request.type || typeof request.type !== 'string') {
      return { valid: false, error: 'Request type is required' };
    }

    const validTypes = ['completion', 'explanation', 'optimization', 'hint', 'getConfiguration', 'testAPIConnection', 'resetHints', 'securityStatus'];
    if (!validTypes.includes(request.type)) {
      return { valid: false, error: 'Unknown request type' };
    }

    // Type-specific validation with input validator
    if (['completion', 'explanation', 'optimization', 'hint'].includes(request.type)) {
      if (request.context) {
        const contextValidation = inputValidator.validateCodeContext(request.context);
        if (!contextValidation.valid) {
          return { 
            valid: false, 
            error: 'Invalid request context: ' + contextValidation.errors.join(', ') 
          };
        }
        // Replace with sanitized context
        request.context = contextValidation.sanitized;
      } else if (!request.problemTitle && !request.currentCode) {
        return { valid: false, error: 'Request context is required for AI operations' };
      }
    }

    // Validate configuration requests
    if (request.type === 'testAPIConnection' && request.config) {
      const configValidation = inputValidator.validateConfiguration(request.config);
      if (!configValidation.valid) {
        return { 
          valid: false, 
          error: 'Invalid configuration: ' + configValidation.errors.join(', ') 
        };
      }
      // Replace with sanitized config
      request.config = configValidation.sanitized;
    }

    return { valid: true };
  }

  /**
   * Basic validation fallback when input validator is not available
   */
  basicValidateRequest(request) {
    if (!request || typeof request !== 'object') {
      return { valid: false, error: 'Invalid request format' };
    }

    if (!request.type || typeof request.type !== 'string') {
      return { valid: false, error: 'Request type is required' };
    }

    const validTypes = ['completion', 'explanation', 'optimization', 'hint', 'getConfiguration', 'testAPIConnection', 'resetHints', 'securityStatus'];
    if (!validTypes.includes(request.type)) {
      return { valid: false, error: 'Unknown request type' };
    }

    // Type-specific validation
    if (['completion', 'explanation', 'optimization', 'hint'].includes(request.type)) {
      if (!request.context && !request.problemTitle && !request.currentCode) {
        return { valid: false, error: 'Request context is required for AI operations' };
      }
    }

    return { valid: true };
  }

  /**
   * Process the request queue
   */
  async processQueue() {
    if (this.requestQueue.length === 0) {
      return;
    }

    // Process requests in order, but allow concurrent processing for different types
    const request = this.requestQueue.shift();
    
    try {
      await this.executeRequest(request);
    } catch (error) {
      console.error(`Error executing request ${request.id}:`, error);
      
      // Handle retry logic
      if (request.retryCount < 2 && this.shouldRetry(error)) {
        request.retryCount++;
        console.log(`Retrying request ${request.id}, attempt ${request.retryCount + 1}`);
        
        // Add back to queue with delay
        setTimeout(() => {
          this.requestQueue.unshift(request);
          this.processQueue();
        }, this.calculateRetryDelay(request.retryCount));
      } else {
        // Send error response
        request.sendResponse({ 
          error: this.sanitizeError(error.message),
          requestId: request.id 
        });
        this.activeRequests.delete(request.id);
      }
    }

    // Continue processing queue
    if (this.requestQueue.length > 0) {
      // Small delay to prevent overwhelming
      setTimeout(() => this.processQueue(), 100);
    }
  }

  /**
   * Execute individual request
   */
  async executeRequest(request) {
    const { type, data, sendResponse, id } = request;

    let result;
    switch (type) {
      case 'completion':
        result = await handleCompletionRequest(data, sendResponse);
        break;
      case 'explanation':
        result = await handleExplanationRequest(data, sendResponse);
        break;
      case 'optimization':
        result = await handleOptimizationRequest(data, sendResponse);
        break;
      case 'hint':
        result = await handleHintRequest(data, sendResponse);
        break;
      case 'getConfiguration':
        result = await handleGetConfiguration(sendResponse);
        break;
      case 'testAPIConnection':
        result = await handleTestAPIConnection(data, sendResponse);
        break;
      case 'resetHints':
        result = await handleResetHints(data, sendResponse);
        break;
      case 'securityStatus':
        result = await handleSecurityStatus(data, sendResponse);
        break;
      default:
        throw new Error('Unknown request type');
    }

    // Clean up
    this.activeRequests.delete(id);
    
    return result;
  }

  /**
   * Determine if error should trigger retry
   */
  shouldRetry(error) {
    const retryableErrors = [
      'Network error',
      'timeout',
      'rate limit',
      'temporary',
      'service unavailable'
    ];
    
    const errorMessage = error.message.toLowerCase();
    return retryableErrors.some(retryError => errorMessage.includes(retryError));
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  calculateRetryDelay(retryCount) {
    return Math.min(1000 * Math.pow(2, retryCount), 10000); // Max 10 seconds
  }

  /**
   * Sanitize error messages to avoid exposing sensitive information
   */
  sanitizeError(errorMessage) {
    if (!errorMessage) return 'An unknown error occurred';
    
    // Remove potential API keys or sensitive data
    let sanitized = errorMessage
      .replace(/sk-[a-zA-Z0-9]+/g, '[API_KEY]')
      .replace(/Bearer\s+[a-zA-Z0-9-_]+/g, '[AUTH_TOKEN]')
      .replace(/api[_-]?key[:\s=]+[a-zA-Z0-9-_]+/gi, 'api_key=[REDACTED]');
    
    // Limit length
    if (sanitized.length > 200) {
      sanitized = sanitized.substring(0, 197) + '...';
    }
    
    return sanitized;
  }
}

/**
 * Rate Limiter for API requests
 */
class RateLimiter {
  constructor() {
    this.limits = {
      completion: { requests: 10, window: 60000 }, // 10 requests per minute
      explanation: { requests: 5, window: 60000 },  // 5 requests per minute
      optimization: { requests: 5, window: 60000 }, // 5 requests per minute
      hint: { requests: 15, window: 60000 },        // 15 requests per minute
      default: { requests: 20, window: 60000 }      // 20 requests per minute total
    };
    
    this.requestHistory = new Map(); // tabId -> { type -> timestamps[] }
  }

  /**
   * Check if request is within rate limits
   */
  async checkLimit(requestType, tabId = 'global') {
    const now = Date.now();
    const limit = this.limits[requestType] || this.limits.default;
    
    // Initialize history for this tab if needed
    if (!this.requestHistory.has(tabId)) {
      this.requestHistory.set(tabId, new Map());
    }
    
    const tabHistory = this.requestHistory.get(tabId);
    
    // Initialize history for this request type if needed
    if (!tabHistory.has(requestType)) {
      tabHistory.set(requestType, []);
    }
    
    const typeHistory = tabHistory.get(requestType);
    
    // Clean old entries
    const cutoff = now - limit.window;
    const recentRequests = typeHistory.filter(timestamp => timestamp > cutoff);
    tabHistory.set(requestType, recentRequests);
    
    // Check limit
    if (recentRequests.length >= limit.requests) {
      const oldestRequest = Math.min(...recentRequests);
      const retryAfter = Math.ceil((oldestRequest + limit.window - now) / 1000);
      
      return {
        allowed: false,
        retryAfter: retryAfter
      };
    }
    
    // Add current request
    recentRequests.push(now);
    
    return { allowed: true };
  }

  /**
   * Clear rate limit history for a tab
   */
  clearTabHistory(tabId) {
    this.requestHistory.delete(tabId);
  }
}

/**
 * Context Manager for request enrichment and state management
 */
class ContextManager {
  constructor() {
    this.contextCache = new Map(); // requestId -> context
    this.sessionState = new Map();  // tabId -> session data
  }

  /**
   * Enrich request with additional context
   */
  async enrichRequest(request, requestId) {
    const enriched = { ...request };
    
    // Add request metadata
    enriched.requestId = requestId;
    enriched.timestamp = Date.now();
    
    // Normalize context structure
    if (request.context) {
      enriched.problemTitle = request.context.problemTitle || enriched.problemTitle;
      enriched.problemDescription = request.context.problemDescription || enriched.problemDescription;
      enriched.currentCode = request.context.currentCode || enriched.currentCode;
      enriched.language = request.context.language || enriched.language || 'javascript';
      enriched.cursorPosition = request.context.cursorPosition || enriched.cursorPosition || 0;
      enriched.selectedText = request.context.selectedText || enriched.selectedText || '';
    }
    
    // Cache context for potential follow-up requests
    this.contextCache.set(requestId, {
      problemTitle: enriched.problemTitle,
      problemDescription: enriched.problemDescription,
      currentCode: enriched.currentCode,
      language: enriched.language,
      timestamp: enriched.timestamp
    });
    
    // Clean old cache entries (keep last 10)
    if (this.contextCache.size > 10) {
      const entries = Array.from(this.contextCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // Remove oldest entries
      for (let i = 0; i < entries.length - 10; i++) {
        this.contextCache.delete(entries[i][0]);
      }
    }
    
    return enriched;
  }

  /**
   * Get cached context for a request
   */
  getCachedContext(requestId) {
    return this.contextCache.get(requestId);
  }

  /**
   * Update session state for progressive features (like hints)
   */
  updateSessionState(tabId, key, value) {
    if (!this.sessionState.has(tabId)) {
      this.sessionState.set(tabId, new Map());
    }
    
    this.sessionState.get(tabId).set(key, value);
  }

  /**
   * Get session state
   */
  getSessionState(tabId, key) {
    const tabState = this.sessionState.get(tabId);
    return tabState ? tabState.get(key) : undefined;
  }

  /**
   * Clear session state for a tab
   */
  clearSessionState(tabId) {
    this.sessionState.delete(tabId);
  }
}

/**
 * Comprehensive Error Handler
 * Provides user-friendly error messages and secure error handling
 */
class ErrorHandler {
  constructor() {
    this.errorCategories = {
      NETWORK: 'network',
      AUTHENTICATION: 'auth',
      RATE_LIMIT: 'rate_limit',
      VALIDATION: 'validation',
      API_ERROR: 'api_error',
      CONFIGURATION: 'config',
      UNKNOWN: 'unknown'
    };
  }

  /**
   * Process and categorize errors
   */
  processError(error, context = {}) {
    const errorInfo = this.categorizeError(error);
    const userMessage = this.generateUserFriendlyMessage(errorInfo, context);
    const shouldRetry = this.shouldRetryError(errorInfo);
    
    // Log technical details (but not sensitive info)
    console.error('Error processed:', {
      category: errorInfo.category,
      originalMessage: this.sanitizeForLogging(error.message),
      context: context,
      shouldRetry: shouldRetry
    });
    
    return {
      category: errorInfo.category,
      userMessage: userMessage,
      technicalMessage: this.sanitizeForLogging(error.message),
      shouldRetry: shouldRetry,
      retryDelay: errorInfo.retryDelay,
      timestamp: Date.now()
    };
  }

  /**
   * Categorize error based on message and type
   */
  categorizeError(error) {
    const message = error.message.toLowerCase();
    
    // Network errors
    if (message.includes('network') || message.includes('fetch') || 
        message.includes('connection') || message.includes('timeout')) {
      return {
        category: this.errorCategories.NETWORK,
        retryDelay: 2000
      };
    }
    
    // Authentication errors
    if (message.includes('unauthorized') || message.includes('invalid api key') ||
        message.includes('authentication') || message.includes('401')) {
      return {
        category: this.errorCategories.AUTHENTICATION,
        retryDelay: null
      };
    }
    
    // Rate limiting
    if (message.includes('rate limit') || message.includes('429') ||
        message.includes('quota') || message.includes('too many requests')) {
      return {
        category: this.errorCategories.RATE_LIMIT,
        retryDelay: 5000
      };
    }
    
    // Validation errors
    if (message.includes('validation') || message.includes('invalid') ||
        message.includes('required') || message.includes('400')) {
      return {
        category: this.errorCategories.VALIDATION,
        retryDelay: null
      };
    }
    
    // API errors
    if (message.includes('500') || message.includes('502') || 
        message.includes('503') || message.includes('504')) {
      return {
        category: this.errorCategories.API_ERROR,
        retryDelay: 3000
      };
    }
    
    // Configuration errors
    if (message.includes('configuration') || message.includes('api key') ||
        message.includes('provider')) {
      return {
        category: this.errorCategories.CONFIGURATION,
        retryDelay: null
      };
    }
    
    // Unknown errors
    return {
      category: this.errorCategories.UNKNOWN,
      retryDelay: 1000
    };
  }

  /**
   * Generate user-friendly error messages
   */
  generateUserFriendlyMessage(errorInfo, context) {
    switch (errorInfo.category) {
      case this.errorCategories.NETWORK:
        return "Unable to connect to the AI service. Please check your internet connection and try again.";
      
      case this.errorCategories.AUTHENTICATION:
        return "There's an issue with your API key. Please check your configuration in the extension popup and ensure your API key is valid.";
      
      case this.errorCategories.RATE_LIMIT:
        return "You've made too many requests recently. Please wait a moment before trying again.";
      
      case this.errorCategories.VALIDATION:
        return "There's an issue with the request format. Please try again or check your code input.";
      
      case this.errorCategories.API_ERROR:
        return "The AI service is temporarily unavailable. Please try again in a few moments.";
      
      case this.errorCategories.CONFIGURATION:
        return "Please configure your AI provider settings in the extension popup before using LeetPilot.";
      
      default:
        return "An unexpected error occurred. Please try again, and if the problem persists, check your extension settings.";
    }
  }

  /**
   * Determine if error should trigger retry
   */
  shouldRetryError(errorInfo) {
    const retryableCategories = [
      this.errorCategories.NETWORK,
      this.errorCategories.RATE_LIMIT,
      this.errorCategories.API_ERROR
    ];
    
    return retryableCategories.includes(errorInfo.category);
  }

  /**
   * Sanitize error messages for logging (remove sensitive data)
   */
  sanitizeForLogging(message) {
    if (!message) return 'Unknown error';
    
    return message
      .replace(/sk-[a-zA-Z0-9]+/g, '[API_KEY_REDACTED]')
      .replace(/Bearer\s+[a-zA-Z0-9-_]+/g, '[AUTH_TOKEN_REDACTED]')
      .replace(/api[_-]?key[:\s=]+[a-zA-Z0-9-_]+/gi, 'api_key=[REDACTED]')
      .replace(/password[:\s=]+[^\s]+/gi, 'password=[REDACTED]')
      .replace(/token[:\s=]+[a-zA-Z0-9-_]+/gi, 'token=[REDACTED]');
  }

  /**
   * Create error response for content script
   */
  createErrorResponse(error, requestId, context = {}) {
    const processedError = this.processError(error, context);
    
    return {
      error: processedError.userMessage,
      errorCategory: processedError.category,
      shouldRetry: processedError.shouldRetry,
      retryDelay: processedError.retryDelay,
      requestId: requestId,
      timestamp: processedError.timestamp
    };
  }
}

/**
 * Progressive Hint System
 * Manages multi-step hint requests with state preservation and educational progression
 */
class ProgressiveHintSystem {
  constructor() {
    this.hintSessions = new Map(); // tabId -> session data
    this.maxHintLevel = 4;
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutes session timeout
    this.maxSessionsPerTab = 5; // Reduced to prevent memory bloat
    
    // Educational progression framework
    this.hintProgression = {
      1: {
        type: 'conceptual',
        description: 'High-level approach and problem understanding',
        maxLength: 200,
        keywords: ['approach', 'strategy', 'think about', 'consider', 'pattern']
      },
      2: {
        type: 'structural',
        description: 'Algorithm structure and data organization',
        maxLength: 300,
        keywords: ['structure', 'organize', 'steps', 'breakdown', 'components']
      },
      3: {
        type: 'implementation',
        description: 'Specific implementation guidance',
        maxLength: 400,
        keywords: ['implement', 'code', 'function', 'method', 'technique']
      },
      4: {
        type: 'optimization',
        description: 'Edge cases and optimization hints',
        maxLength: 500,
        keywords: ['edge case', 'optimize', 'improve', 'efficiency', 'corner case']
      }
    };
  }

  /**
   * Get next hint level for a problem with enhanced logic
   */
  getNextHintLevel(tabId, problemTitle) {
    const sessionKey = `${tabId}_${this.normalizeTitle(problemTitle)}`;
    const session = this.hintSessions.get(sessionKey);
    
    if (!session) {
      // First hint request for this problem
      return 1;
    }
    
    // Check if session has expired
    if (this.isSessionExpired(session)) {
      console.log('Hint session expired, starting fresh');
      this.resetHintSession(tabId, problemTitle);
      return 1;
    }
    
    // Increment hint level, but cap at maximum
    const nextLevel = Math.min(session.currentLevel + 1, this.maxHintLevel);
    
    // Validate progression - ensure we don't skip levels
    if (nextLevel > session.hints.length + 1) {
      console.warn('Hint level progression error, resetting to expected level');
      return session.hints.length + 1;
    }
    
    return nextLevel;
  }

  /**
   * Update hint session state with enhanced context preservation
   */
  updateHintSession(tabId, problemTitle, hintLevel, hintContent, context) {
    const sessionKey = `${tabId}_${this.normalizeTitle(problemTitle)}`;
    
    // Get existing session or create new one
    let session = this.hintSessions.get(sessionKey);
    
    if (!session) {
      session = {
        problemTitle: problemTitle,
        currentLevel: 0,
        hints: [],
        context: {
          initialCode: context.currentCode || '',
          language: context.language || 'javascript',
          problemDescription: context.problemDescription || ''
        },
        progression: {
          conceptsIntroduced: new Set(),
          codeEvolution: [],
          userProgress: []
        },
        createdAt: Date.now(),
        lastUpdated: Date.now()
      };
    }
    
    // Update session with new hint
    session.currentLevel = hintLevel;
    session.lastUpdated = Date.now();
    
    // Track code evolution
    if (context.currentCode && context.currentCode !== session.context.initialCode) {
      session.progression.codeEvolution.push({
        code: context.currentCode,
        timestamp: Date.now(),
        hintLevel: hintLevel
      });
    }
    
    // Add new hint with enhanced metadata
    const hintEntry = {
      level: hintLevel,
      content: hintContent,
      timestamp: Date.now(),
      type: this.hintProgression[hintLevel]?.type || 'general',
      contextSnapshot: {
        codeLength: context.currentCode?.length || 0,
        hasFunction: (context.currentCode || '').includes('function') || (context.currentCode || '').includes('def'),
        hasLoop: (context.currentCode || '').includes('for') || (context.currentCode || '').includes('while'),
        hasConditional: (context.currentCode || '').includes('if')
      }
    };
    
    session.hints.push(hintEntry);
    
    // Extract and track concepts introduced in this hint
    this.extractAndTrackConcepts(hintContent, session.progression.conceptsIntroduced);
    
    // Track user progress
    session.progression.userProgress.push({
      hintLevel: hintLevel,
      timestamp: Date.now(),
      codeComplexity: this.calculateCodeComplexity(context.currentCode || ''),
      progressScore: this.calculateProgressScore(session)
    });
    
    this.hintSessions.set(sessionKey, session);
    
    // Clean up old sessions
    this.cleanupOldSessions(tabId);
    
    return session;
  }

  /**
   * Get enhanced hint context for prompt engineering
   */
  getHintContext(tabId, problemTitle) {
    const session = this.getHintSession(tabId, problemTitle);
    
    if (!session || session.hints.length === 0) {
      return null;
    }
    
    // Check if session is expired
    if (this.isSessionExpired(session)) {
      console.log('Session expired, returning null context');
      return null;
    }
    
    return {
      previousHints: session.hints.map(hint => ({
        level: hint.level,
        content: hint.content,
        type: hint.type,
        timestamp: hint.timestamp
      })),
      currentLevel: session.currentLevel,
      context: session.context,
      progression: {
        conceptsIntroduced: Array.from(session.progression.conceptsIntroduced),
        codeEvolution: session.progression.codeEvolution.slice(-3), // Last 3 code changes
        progressScore: this.calculateProgressScore(session),
        sessionDuration: Date.now() - session.createdAt
      },
      nextHintGuidance: this.hintProgression[session.currentLevel + 1] || null
    };
  }

  /**
   * Enhanced hint session retrieval with validation
   */
  getHintSession(tabId, problemTitle) {
    const sessionKey = `${tabId}_${this.normalizeTitle(problemTitle)}`;
    const session = this.hintSessions.get(sessionKey);
    
    if (!session) {
      return null;
    }
    
    // Validate session integrity
    if (this.isSessionExpired(session) || !this.validateSessionIntegrity(session)) {
      console.log('Invalid or expired session detected, removing');
      this.hintSessions.delete(sessionKey);
      return null;
    }
    
    return session;
  }

  /**
   * Reset hint session with cleanup
   */
  resetHintSession(tabId, problemTitle) {
    const sessionKey = `${tabId}_${this.normalizeTitle(problemTitle)}`;
    const session = this.hintSessions.get(sessionKey);
    
    if (session) {
      console.log(`Resetting hint session for ${problemTitle}, had ${session.hints.length} hints`);
    }
    
    this.hintSessions.delete(sessionKey);
  }

  /**
   * Check if session has expired
   */
  isSessionExpired(session) {
    if (!session || !session.lastUpdated) {
      return true;
    }
    
    return (Date.now() - session.lastUpdated) > this.sessionTimeout;
  }

  /**
   * Validate session data integrity
   */
  validateSessionIntegrity(session) {
    if (!session || typeof session !== 'object') {
      return false;
    }
    
    // Check required fields
    const requiredFields = ['problemTitle', 'currentLevel', 'hints', 'context', 'createdAt'];
    for (const field of requiredFields) {
      if (!(field in session)) {
        console.warn(`Session missing required field: ${field}`);
        return false;
      }
    }
    
    // Validate hints array
    if (!Array.isArray(session.hints)) {
      return false;
    }
    
    // Validate hint progression (levels should be sequential)
    for (let i = 0; i < session.hints.length; i++) {
      const expectedLevel = i + 1;
      if (session.hints[i].level !== expectedLevel) {
        console.warn(`Hint level mismatch at index ${i}: expected ${expectedLevel}, got ${session.hints[i].level}`);
        return false;
      }
    }
    
    return true;
  }

  /**
   * Extract and track concepts from hint content
   */
  extractAndTrackConcepts(hintContent, conceptsSet) {
    if (!hintContent || typeof hintContent !== 'string') {
      return;
    }
    
    const conceptKeywords = [
      'recursion', 'iteration', 'dynamic programming', 'greedy', 'backtracking',
      'binary search', 'two pointers', 'sliding window', 'hash map', 'hash table',
      'stack', 'queue', 'heap', 'tree', 'graph', 'dfs', 'bfs',
      'sorting', 'searching', 'divide and conquer', 'memoization',
      'time complexity', 'space complexity', 'optimization'
    ];
    
    const lowerContent = hintContent.toLowerCase();
    conceptKeywords.forEach(concept => {
      if (lowerContent.includes(concept)) {
        conceptsSet.add(concept);
      }
    });
  }

  /**
   * Calculate code complexity score
   */
  calculateCodeComplexity(code) {
    if (!code || typeof code !== 'string') {
      return 0;
    }
    
    let complexity = 0;
    
    // Basic complexity indicators
    complexity += (code.match(/function|def|class/g) || []).length * 2;
    complexity += (code.match(/if|else|elif/g) || []).length;
    complexity += (code.match(/for|while/g) || []).length * 2;
    complexity += (code.match(/try|catch|except/g) || []).length;
    complexity += Math.floor(code.length / 100); // Length factor
    
    return Math.min(complexity, 20); // Cap at 20
  }

  /**
   * Calculate user progress score
   */
  calculateProgressScore(session) {
    if (!session || !session.progression) {
      return 0;
    }
    
    let score = 0;
    
    // Progress through hint levels
    score += session.currentLevel * 2;
    
    // Code evolution (user is making changes)
    score += Math.min(session.progression.codeEvolution.length, 5);
    
    // Concepts learned
    score += session.progression.conceptsIntroduced.size;
    
    // Time factor (longer engagement = higher score)
    const sessionMinutes = (Date.now() - session.createdAt) / (1000 * 60);
    score += Math.min(sessionMinutes / 5, 3); // Up to 3 points for time
    
    return Math.round(score * 10) / 10; // Round to 1 decimal
  }

  /**
   * Get hint progression guidance for next level
   */
  getProgressionGuidance(currentLevel) {
    const nextLevel = Math.min(currentLevel + 1, this.maxHintLevel);
    return this.hintProgression[nextLevel] || null;
  }

  /**
   * Normalize problem title for consistent session keys
   */
  normalizeTitle(title) {
    if (!title) return 'unknown';
    
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 50); // Limit length
  }

  /**
   * Enhanced cleanup with better memory management
   */
  cleanupOldSessions(tabId) {
    const now = Date.now();
    
    // Remove expired sessions first
    for (const [key, session] of this.hintSessions.entries()) {
      if (this.isSessionExpired(session)) {
        console.log(`Removing expired session: ${key}`);
        this.hintSessions.delete(key);
      }
    }
    
    // Then limit sessions per tab
    const tabSessions = Array.from(this.hintSessions.entries())
      .filter(([key]) => key.startsWith(`${tabId}_`))
      .sort(([, a], [, b]) => b.lastUpdated - a.lastUpdated);
    
    if (tabSessions.length > this.maxSessionsPerTab) {
      const sessionsToRemove = tabSessions.slice(this.maxSessionsPerTab);
      sessionsToRemove.forEach(([key]) => {
        console.log(`Removing old session to maintain limit: ${key}`);
        this.hintSessions.delete(key);
      });
    }
  }

  /**
   * Clear all sessions for a tab
   */
  clearTabSessions(tabId) {
    const keysToRemove = Array.from(this.hintSessions.keys())
      .filter(key => key.startsWith(`${tabId}_`));
    
    keysToRemove.forEach(key => {
      this.hintSessions.delete(key);
    });
    
    console.log(`Cleared ${keysToRemove.length} sessions for tab ${tabId}`);
  }

  /**
   * Get comprehensive hint statistics for debugging and monitoring
   */
  getHintStats() {
    const stats = {
      totalSessions: this.hintSessions.size,
      sessionsByTab: new Map(),
      averageHintLevel: 0,
      averageProgressScore: 0,
      conceptsTracked: new Set(),
      sessionAges: [],
      memoryUsage: this.estimateMemoryUsage()
    };
    
    let totalLevels = 0;
    let totalProgress = 0;
    let sessionCount = 0;
    
    for (const [key, session] of this.hintSessions.entries()) {
      const tabId = key.split('_')[0];
      
      // Count sessions by tab
      if (!stats.sessionsByTab.has(tabId)) {
        stats.sessionsByTab.set(tabId, 0);
      }
      stats.sessionsByTab.set(tabId, stats.sessionsByTab.get(tabId) + 1);
      
      // Aggregate statistics
      totalLevels += session.currentLevel;
      totalProgress += this.calculateProgressScore(session);
      sessionCount++;
      
      // Track concepts
      if (session.progression && session.progression.conceptsIntroduced) {
        session.progression.conceptsIntroduced.forEach(concept => {
          stats.conceptsTracked.add(concept);
        });
      }
      
      // Track session age
      stats.sessionAges.push(Date.now() - session.createdAt);
    }
    
    if (sessionCount > 0) {
      stats.averageHintLevel = Math.round((totalLevels / sessionCount) * 10) / 10;
      stats.averageProgressScore = Math.round((totalProgress / sessionCount) * 10) / 10;
    }
    
    // Convert Set to Array for JSON serialization
    stats.conceptsTracked = Array.from(stats.conceptsTracked);
    
    return stats;
  }

  /**
   * Estimate memory usage of hint sessions
   */
  estimateMemoryUsage() {
    let totalSize = 0;
    
    for (const [key, session] of this.hintSessions.entries()) {
      // Rough estimation of memory usage
      totalSize += key.length * 2; // Key string
      totalSize += JSON.stringify(session).length * 2; // Session data
    }
    
    return {
      estimatedBytes: totalSize,
      estimatedKB: Math.round(totalSize / 1024 * 10) / 10,
      sessionCount: this.hintSessions.size
    };
  }
}

// Handle hint session reset
async function handleResetHints(request, sendResponse) {
  try {
    const tabId = request.tabId || 'default';
    const problemTitle = request.problemTitle || 'Unknown Problem';
    
    progressiveHintSystem.resetHintSession(tabId, problemTitle);
    
    sendResponse({
      success: true,
      message: 'Hint session reset successfully',
      requestId: request.requestId
    });
    
  } catch (error) {
    console.error('Reset hints failed:', error);
    const errorResponse = errorHandler.createErrorResponse(error, request.requestId, { type: 'resetHints' });
    sendResponse(errorResponse);
  }
}

// Handle security monitoring status request
async function handleSecurityStatus(request, sendResponse) {
  try {
    if (!securityMonitor) {
      sendResponse({
        success: false,
        error: 'Security monitor not initialized',
        requestId: request.requestId
      });
      return;
    }
    
    const stats = securityMonitor.getSecurityStats();
    
    sendResponse({
      success: true,
      securityStats: stats,
      requestId: request.requestId
    });
    
  } catch (error) {
    console.error('Security status request failed:', error);
    const errorResponse = errorHandler.createErrorResponse(error, request.requestId, { type: 'securityStatus' });
    sendResponse(errorResponse);
  }
}

// Initialize progressive hint system
const progressiveHintSystem = new ProgressiveHintSystem();

// Initialize error handler
const errorHandler = new ErrorHandler();

// Initialize request orchestrator
const requestOrchestrator = new RequestOrchestrator();

// Message handler for content script communication
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  
  // Ensure orchestrator is initialized
  if (!requestOrchestrator) {
    console.error('Request orchestrator not initialized');
    sendResponse({ 
      error: 'Service not available. Please try again.',
      requestId: request.requestId || 'unknown'
    });
    return;
  }
  
  // Use orchestrator to handle all requests
  requestOrchestrator.processRequest(request, sender, sendResponse);
  
  // Return true to indicate we will send a response asynchronously
  return true;
});

// Handle configuration retrieval
async function handleGetConfiguration(sendResponse) {
  try {
    if (!storageManager) {
      await initializeStorageManager();
    }
    
    const config = await storageManager.retrieveConfiguration();
    sendResponse({ 
      success: true, 
      config: config ? config.getSanitized() : null 
    });
  } catch (error) {
    console.error('Failed to get configuration:', error);
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

// Handle API connection testing
async function handleTestAPIConnection(request, sendResponse) {
  try {
    if (!storageManager) {
      await initializeStorageManager();
    }
    
    const config = request.config;
    if (!config) {
      sendResponse({ 
        success: false, 
        error: 'No configuration provided' 
      });
      return;
    }

    // Validate the configuration format
    const configObj = new LeetPilotStorage.AIProviderConfig(
      config.provider,
      config.apiKey,
      config.model,
      config.maxTokens,
      config.temperature
    );
    
    const validationErrors = configObj.validate();
    if (validationErrors.length > 0) {
      sendResponse({ 
        success: false, 
        error: 'Configuration validation failed: ' + validationErrors.join(', ')
      });
      return;
    }

    // Test actual API connection
    const aiClient = new AIProviderClient(configObj);
    const testResult = await aiClient.testConnection();
    
    sendResponse(testResult);

  } catch (error) {
    console.error('Failed to test API connection:', error);
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

// Placeholder functions for AI request handling
async function handleCompletionRequest(request, sendResponse) {
  try {
    if (!storageManager) {
      await initializeStorageManager();
    }

    const config = await storageManager.retrieveConfiguration();
    if (!config) {
      const error = new Error('No AI provider configuration found. Please configure your API key first.');
      error.category = 'configuration';
      throw error;
    }

    const aiClient = new AIProviderClient(config);
    const promptEngineer = new PromptEngineer();
    
    // Create educational prompt
    const prompt = promptEngineer.createCompletionPrompt({
      problemTitle: request.problemTitle || 'Coding Problem',
      problemDescription: request.problemDescription,
      currentCode: request.currentCode || '',
      language: request.language || 'javascript'
    });
    
    const response = await aiClient.makeRequest(prompt, 'completion');
    
    // Filter and validate response
    const filteredResponse = promptEngineer.filterResponse(response.content, 'completion');
    
    if (filteredResponse.filtered) {
      sendResponse({ 
        suggestion: filteredResponse.content,
        type: 'code',
        confidence: 0.3,
        provider: response.provider,
        filtered: true,
        filterReason: filteredResponse.reason,
        requestId: request.requestId
      });
    } else {
      const sanitizedContent = promptEngineer.sanitizeContent(filteredResponse.content);
      sendResponse({ 
        suggestion: sanitizedContent,
        type: 'code',
        confidence: 0.8,
        provider: response.provider,
        filtered: false,
        requestId: request.requestId
      });
    }
    
  } catch (error) {
    console.error('Completion request failed:', error);
    
    // Use comprehensive error handler if available
    if (comprehensiveErrorHandler) {
      const errorResponse = comprehensiveErrorHandler.createErrorResponse(
        error, 
        request.requestId, 
        { type: 'completion', provider: request.provider }
      );
      sendResponse(errorResponse);
    } else {
      // Fallback to basic error handler
      const errorResponse = errorHandler.createErrorResponse(error, request.requestId, { type: 'completion' });
      sendResponse(errorResponse);
    }
  }
}

async function handleExplanationRequest(request, sendResponse) {
  try {
    if (!storageManager) {
      await initializeStorageManager();
    }

    const config = await storageManager.retrieveConfiguration();
    if (!config) {
      const error = new Error('No AI provider configuration found. Please configure your API key first.');
      error.category = 'configuration';
      throw error;
    }

    const aiClient = new AIProviderClient(config);
    const promptEngineer = new PromptEngineer();
    
    // Create educational prompt
    const prompt = promptEngineer.createExplanationPrompt({
      problemTitle: request.problemTitle || 'Coding Problem',
      currentCode: request.currentCode || '',
      language: request.language || 'javascript'
    });
    
    const response = await aiClient.makeRequest(prompt, 'explanation');
    
    // Filter and validate response
    const filteredResponse = promptEngineer.filterResponse(response.content, 'explanation');
    const sanitizedContent = promptEngineer.sanitizeContent(filteredResponse.content);
    
    sendResponse({
      explanation: sanitizedContent,
      type: 'explanation',
      provider: response.provider,
      filtered: filteredResponse.filtered,
      filterReason: filteredResponse.reason,
      requestId: request.requestId
    });
    
  } catch (error) {
    console.error('Explanation request failed:', error);
    
    // Use comprehensive error handler if available
    if (comprehensiveErrorHandler) {
      const errorResponse = comprehensiveErrorHandler.createErrorResponse(
        error, 
        request.requestId, 
        { type: 'explanation', provider: request.provider }
      );
      sendResponse(errorResponse);
    } else {
      // Fallback to basic error handler
      const errorResponse = errorHandler.createErrorResponse(error, request.requestId, { type: 'explanation' });
      sendResponse(errorResponse);
    }
  }
}

async function handleOptimizationRequest(request, sendResponse) {
  try {
    if (!storageManager) {
      await initializeStorageManager();
    }

    const config = await storageManager.retrieveConfiguration();
    if (!config) {
      const error = new Error('No AI provider configuration found. Please configure your API key first.');
      error.category = 'configuration';
      throw error;
    }

    const aiClient = new AIProviderClient(config);
    const promptEngineer = new PromptEngineer();
    
    // Create educational prompt
    const prompt = promptEngineer.createOptimizationPrompt({
      problemTitle: request.problemTitle || 'Coding Problem',
      currentCode: request.currentCode || '',
      language: request.language || 'javascript'
    });
    
    const response = await aiClient.makeRequest(prompt, 'optimization');
    
    // Filter and validate response
    const filteredResponse = promptEngineer.filterResponse(response.content, 'optimization');
    const sanitizedContent = promptEngineer.sanitizeContent(filteredResponse.content);
    
    sendResponse({
      optimization: sanitizedContent,
      type: 'optimization',
      provider: response.provider,
      filtered: filteredResponse.filtered,
      filterReason: filteredResponse.reason,
      requestId: request.requestId
    });
    
  } catch (error) {
    console.error('Optimization request failed:', error);
    
    // Use comprehensive error handler if available
    if (comprehensiveErrorHandler) {
      const errorResponse = comprehensiveErrorHandler.createErrorResponse(
        error, 
        request.requestId, 
        { type: 'optimization', provider: request.provider }
      );
      sendResponse(errorResponse);
    } else {
      // Fallback to basic error handler
      const errorResponse = errorHandler.createErrorResponse(error, request.requestId, { type: 'optimization' });
      sendResponse(errorResponse);
    }
  }
}

async function handleHintRequest(request, sendResponse) {
  try {
    if (!storageManager) {
      await initializeStorageManager();
    }

    const config = await storageManager.retrieveConfiguration();
    if (!config) {
      const error = new Error('No AI provider configuration found. Please configure your API key first.');
      error.category = 'configuration';
      throw error;
    }

    const aiClient = new AIProviderClient(config);
    const promptEngineer = new PromptEngineer();
    
    // Get tab ID for session management
    const tabId = request.tabId || 'default';
    const problemTitle = request.problemTitle || 'Unknown Problem';
    
    // Enhanced context extraction
    const enhancedContext = {
      ...request,
      problemTitle: problemTitle,
      problemDescription: request.problemDescription || request.context?.problemDescription || '',
      currentCode: request.currentCode || request.context?.currentCode || '',
      language: request.language || request.context?.language || 'javascript'
    };
    
    // Get next hint level from progressive system
    const hintLevel = progressiveHintSystem.getNextHintLevel(tabId, problemTitle);
    
    // Validate hint level progression
    if (hintLevel > progressiveHintSystem.maxHintLevel) {
      console.log('Maximum hint level reached for this problem');
      sendResponse({
        hint: "You've reached the maximum number of hints for this problem. Try implementing what you've learned so far, and feel free to start a new hint session if you get stuck on a different aspect!",
        type: 'hint',
        hintLevel: progressiveHintSystem.maxHintLevel,
        totalHints: progressiveHintSystem.maxHintLevel,
        maxHintLevel: progressiveHintSystem.maxHintLevel,
        maxReached: true,
        provider: config.provider,
        requestId: request.requestId
      });
      return;
    }
    
    // Get previous hint context with enhanced information
    const hintContext = progressiveHintSystem.getHintContext(tabId, problemTitle);
    
    // Log hint progression for debugging
    console.log(`Generating hint level ${hintLevel} for "${problemTitle}"`, {
      hasContext: !!hintContext,
      previousHints: hintContext?.previousHints?.length || 0,
      progressScore: hintContext?.progression?.progressScore || 0
    });
    
    // Create educational prompt with progressive context
    const prompt = promptEngineer.createProgressiveHintPrompt(
      enhancedContext, 
      hintLevel, 
      hintContext
    );
    
    // Make AI request
    const response = await aiClient.makeRequest(prompt, 'hint');
    
    // Filter and validate response with enhanced educational focus
    const filteredResponse = promptEngineer.filterResponse(response.content, 'hint');
    let sanitizedContent = promptEngineer.sanitizeContent(filteredResponse.content);
    
    // Additional validation for progressive hints
    const hintValidation = validateHintProgression(sanitizedContent, hintLevel, hintContext);
    if (!hintValidation.valid) {
      console.warn('Hint validation failed:', hintValidation.reason);
      // Provide fallback hint
      sanitizedContent = generateFallbackHint(hintLevel, enhancedContext);
    }
    
    // Update hint session with enhanced context preservation
    const session = progressiveHintSystem.updateHintSession(
      tabId, 
      problemTitle, 
      hintLevel, 
      sanitizedContent,
      {
        currentCode: enhancedContext.currentCode,
        language: enhancedContext.language,
        problemDescription: enhancedContext.problemDescription
      }
    );
    
    // Prepare comprehensive response
    const hintResponse = {
      hint: sanitizedContent,
      type: 'hint',
      hintLevel: hintLevel,
      totalHints: session.hints.length,
      maxHintLevel: progressiveHintSystem.maxHintLevel,
      provider: response.provider,
      filtered: filteredResponse.filtered,
      filterReason: filteredResponse.reason,
      requestId: request.requestId,
      
      // Enhanced progressive information
      progression: {
        conceptsIntroduced: hintContext?.progression?.conceptsIntroduced || [],
        progressScore: hintContext?.progression?.progressScore || 0,
        sessionDuration: hintContext?.progression?.sessionDuration || 0,
        codeEvolution: (hintContext?.progression?.codeEvolution || []).length
      },
      
      // Guidance for next steps
      nextHintAvailable: hintLevel < progressiveHintSystem.maxHintLevel,
      nextHintType: progressiveHintSystem.getProgressionGuidance(hintLevel)?.type || null,
      
      // Session metadata
      sessionInfo: {
        createdAt: session.createdAt || Date.now(),
        lastUpdated: session.lastUpdated || Date.now(),
        hintsRemaining: Math.max(0, progressiveHintSystem.maxHintLevel - hintLevel)
      }
    };
    
    sendResponse(hintResponse);
    
  } catch (error) {
    console.error('Hint request failed:', error);
    
    // Use comprehensive error handler if available
    if (comprehensiveErrorHandler) {
      const errorResponse = comprehensiveErrorHandler.createErrorResponse(
        error, 
        request.requestId, 
        { type: 'hint', provider: request.provider }
      );
      sendResponse(errorResponse);
    } else {
      // Fallback to basic error handler
      const errorResponse = errorHandler.createErrorResponse(error, request.requestId, { type: 'hint' });
      sendResponse(errorResponse);
    }
  }
}

/**
 * Validate hint progression to ensure educational quality
 */
function validateHintProgression(hintContent, hintLevel, hintContext) {
  if (!hintContent || typeof hintContent !== 'string') {
    return { valid: false, reason: 'Invalid hint content' };
  }
  
  // Check minimum length based on hint level
  const minLengths = { 1: 50, 2: 75, 3: 100, 4: 125 };
  if (hintContent.length < minLengths[hintLevel]) {
    return { valid: false, reason: `Hint too short for level ${hintLevel}` };
  }
  
  // Check for solution patterns (should not contain complete solutions)
  const solutionPatterns = [
    /function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*return[\s\S]*\}/i,
    /def\s+\w+\s*\([^)]*\):[\s\S]*return/i,
    /complete\s+solution/i,
    /final\s+answer/i,
    /here\s+is\s+the\s+code/i
  ];
  
  const hasSolution = solutionPatterns.some(pattern => pattern.test(hintContent));
  if (hasSolution) {
    return { valid: false, reason: 'Hint contains solution patterns' };
  }
  
  // Check for repetition of previous hints
  if (hintContext && hintContext.previousHints) {
    const previousContent = hintContext.previousHints.map(h => h.content.toLowerCase()).join(' ');
    const currentContent = hintContent.toLowerCase();
    
    // Simple similarity check - if more than 50% of words are repeated
    const currentWords = currentContent.split(/\s+/);
    const repeatedWords = currentWords.filter(word => 
      word.length > 3 && previousContent.includes(word)
    );
    
    if (repeatedWords.length > currentWords.length * 0.5) {
      return { valid: false, reason: 'Hint repeats too much previous content' };
    }
  }
  
  return { valid: true };
}

/**
 * Generate fallback hint when AI response is inadequate
 */
function generateFallbackHint(hintLevel, context) {
  const fallbackHints = {
    1: `Let's start by understanding this problem step by step. What is the main goal here? Think about what input you're given and what output is expected. Consider if you've seen similar problems before and what general approach might work.`,
    
    2: `Now that you understand the problem, think about the algorithm or approach you'll use. What data structure might be helpful here? Should you iterate through the data, use recursion, or apply a specific algorithmic pattern? Consider the time and space complexity requirements.`,
    
    3: `Let's think about the implementation structure. How would you organize your code? What would be the main steps in your algorithm? Think about the order of operations and how you'll handle the core logic. What helper functions or variables might you need?`,
    
    4: `Consider the edge cases and optimizations. What happens with empty inputs, single elements, or boundary conditions? Are there any optimizations you can make to improve efficiency? Double-check that your approach handles all the requirements mentioned in the problem.`
  };
  
  return fallbackHints[hintLevel] || fallbackHints[1];
}

/**
 * AI Provider Communication Layer
 * Handles secure API communication with OpenAI, Anthropic, and Gemini
 */
class AIProviderClient {
  constructor(config) {
    this.config = config;
    this.providerInfo = LeetPilotStorage.SUPPORTED_PROVIDERS[config.provider];
    
    if (!this.providerInfo) {
      throw new Error(`Unsupported AI provider: ${config.provider}`);
    }
  }

  /**
   * Test API connection with a simple request
   */
  async testConnection() {
    try {
      const testPrompt = "Hello, this is a connection test.";
      const response = await this.makeRequest(testPrompt, 'test');
      
      return {
        success: true,
        message: `Successfully connected to ${this.providerInfo.name}`,
        provider: this.config.provider
      };
    } catch (error) {
      return {
        success: false,
        error: `Connection failed: ${error.message}`,
        provider: this.config.provider
      };
    }
  }

  /**
   * Make API request to the configured provider
   */
  async makeRequest(prompt, requestType = 'completion') {
    // Enforce HTTPS
    if (!this.providerInfo.apiUrl.startsWith('https://')) {
      throw new Error('HTTPS is required for API communications');
    }

    switch (this.config.provider) {
      case 'openai':
        return await this.callOpenAI(prompt, requestType);
      case 'anthropic':
        return await this.callAnthropic(prompt, requestType);
      case 'gemini':
        return await this.callGemini(prompt, requestType);
      default:
        throw new Error(`Unsupported provider: ${this.config.provider}`);
    }
  }

  /**
   * OpenAI API client
   */
  async callOpenAI(prompt, requestType) {
    const url = this.providerInfo.apiUrl;
    
    const requestBody = {
      model: this.config.model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature
    };

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`
    };

    return await this.fetchWithValidation(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody)
    });
  }

  /**
   * Anthropic API client
   */
  async callAnthropic(prompt, requestType) {
    const url = this.providerInfo.apiUrl;
    
    const requestBody = {
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    };

    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': this.config.apiKey,
      'anthropic-version': '2023-06-01'
    };

    return await this.fetchWithValidation(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody)
    });
  }

  /**
   * Google Gemini API client
   */
  async callGemini(prompt, requestType) {
    // Gemini uses a different URL structure with the API key as a query parameter
    const baseUrl = this.providerInfo.apiUrl;
    const url = `${baseUrl}/${this.config.model}:generateContent?key=${this.config.apiKey}`;
    
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: this.config.temperature,
        maxOutputTokens: this.config.maxTokens
      }
    };

    const headers = {
      'Content-Type': 'application/json'
    };

    return await this.fetchWithValidation(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody)
    });
  }

  /**
   * Fetch with HTTPS validation and comprehensive error handling
   */
  async fetchWithValidation(url, options) {
    // Validate HTTPS
    if (!url.startsWith('https://')) {
      throw new Error('Only HTTPS connections are allowed');
    }

    // Additional security check - ensure API keys don't leak to unintended domains
    if (securityMonitor) {
      const leakageCheck = securityMonitor.checkRequestForLeakage(url, options);
      if (leakageCheck.hasLeakage && !securityMonitor.isDomainAllowed(url)) {
        console.error('Data leakage detected - blocking request to unauthorized domain');
        throw new Error('Request blocked: Potential API key leakage to unauthorized domain');
      }
    }

    // Use comprehensive error handler if available
    if (comprehensiveErrorHandler) {
      const requestId = `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return await comprehensiveErrorHandler.executeWithRetry(
        async () => {
          const response = await fetch(url, options);
          
          // Handle rate limiting with retry-after header
          if (response.status === 429) {
            const retryAfter = response.headers.get('retry-after');
            const delay = retryAfter ? parseInt(retryAfter) * 1000 : 5000;
            
            const error = new Error(`Rate limit exceeded. Please wait ${Math.ceil(delay / 1000)} seconds before trying again.`);
            error.status = 429;
            error.retryAfter = delay;
            throw error;
          }
          
          // Handle other HTTP errors
          if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            
            try {
              const errorJson = JSON.parse(errorText);
              if (errorJson.error) {
                errorMessage = errorJson.error.message || errorJson.error;
              }
            } catch (parseError) {
              // Use the raw error text if JSON parsing fails
              if (errorText) {
                errorMessage += ` - ${errorText}`;
              }
            }
            
            const error = new Error(errorMessage);
            error.status = response.status;
            throw error;
          }

          const responseData = await response.json();
          return this.validateAndSanitizeResponse(responseData);
        },
        {
          type: 'api_request',
          provider: this.config.provider,
          url: url
        },
        requestId
      );
    } else {
      // Fallback to original retry logic if comprehensive error handler not available
      return await this.fallbackFetchWithRetry(url, options);
    }
  }

  /**
   * Fallback fetch with basic retry logic (when comprehensive error handler not available)
   */
  async fallbackFetchWithRetry(url, options) {
    const maxRetries = 3;
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(url, options);
        
        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after');
          const delay = retryAfter ? parseInt(retryAfter) * 1000 : this.calculateBackoffDelay(attempt);
          
          if (attempt < maxRetries - 1) {
            console.log(`Rate limited, waiting ${delay}ms before retry (attempt ${attempt + 1})`);
            await this.sleep(delay);
            continue;
          } else {
            throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(delay / 1000)} seconds before trying again.`);
          }
        }
        
        // Handle other HTTP errors
        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          
          try {
            const errorJson = JSON.parse(errorText);
            if (errorJson.error) {
              errorMessage = errorJson.error.message || errorJson.error;
            }
          } catch (parseError) {
            // Use the raw error text if JSON parsing fails
            if (errorText) {
              errorMessage += ` - ${errorText}`;
            }
          }
          
          // Sanitize error message to prevent API key exposure
          errorMessage = this.sanitizeErrorMessage(errorMessage);
          
          // Check if this is a retryable error
          if (this.isRetryableError(response.status) && attempt < maxRetries - 1) {
            const delay = this.calculateBackoffDelay(attempt);
            console.log(`Retryable error ${response.status}, waiting ${delay}ms before retry (attempt ${attempt + 1})`);
            await this.sleep(delay);
            continue;
          }
          
          throw new Error(errorMessage);
        }

        const responseData = await response.json();
        return this.validateAndSanitizeResponse(responseData);
        
      } catch (error) {
        lastError = error;
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          // Network error - retry if not last attempt
          if (attempt < maxRetries - 1) {
            const delay = this.calculateBackoffDelay(attempt);
            console.log(`Network error, waiting ${delay}ms before retry (attempt ${attempt + 1})`);
            await this.sleep(delay);
            continue;
          } else {
            throw new Error('Network error: Unable to connect to AI provider');
          }
        }
        
        // If it's not a network error, don't retry
        throw error;
      }
    }
    
    // If we get here, all retries failed
    throw lastError || new Error('All retry attempts failed');
  }

  /**
   * Sanitize error messages to prevent API key exposure
   */
  sanitizeErrorMessage(errorMessage) {
    if (!errorMessage) return 'Unknown error';
    
    return errorMessage
      .replace(/sk-[a-zA-Z0-9]+/g, '[API_KEY_REDACTED]')
      .replace(/sk-ant-[a-zA-Z0-9]+/g, '[API_KEY_REDACTED]')
      .replace(/AIza[a-zA-Z0-9]{35}/g, '[API_KEY_REDACTED]')
      .replace(/Bearer\s+[a-zA-Z0-9-_]+/g, '[AUTH_TOKEN_REDACTED]')
      .replace(/api[_-]?key[:\s=]+[a-zA-Z0-9-_]+/gi, 'api_key=[REDACTED]')
      .replace(/token[:\s=]+[a-zA-Z0-9-_]+/gi, 'token=[REDACTED]')
      .replace(/password[:\s=]+[^\s]+/gi, 'password=[REDACTED]');
  }

  /**
   * Check if HTTP status code indicates a retryable error
   */
  isRetryableError(status) {
    return [500, 502, 503, 504].includes(status);
  }

  /**
   * Calculate exponential backoff delay
   */
  calculateBackoffDelay(attempt) {
    const baseDelay = 1000; // 1 second
    const maxDelay = 10000; // 10 seconds
    const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000; // Add jitter
    return Math.min(delay, maxDelay);
  }

  /**
   * Sleep utility for delays
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate and sanitize API responses
   */
  validateAndSanitizeResponse(response) {
    if (!response || typeof response !== 'object') {
      throw new Error('Invalid response format from AI provider');
    }

    // Extract content based on provider
    let content = '';
    
    switch (this.config.provider) {
      case 'openai':
        if (response.choices && response.choices[0] && response.choices[0].message) {
          content = response.choices[0].message.content;
        }
        break;
        
      case 'anthropic':
        if (response.content && response.content[0] && response.content[0].text) {
          content = response.content[0].text;
        }
        break;
        
      case 'gemini':
        if (response.candidates && response.candidates[0] && 
            response.candidates[0].content && response.candidates[0].content.parts &&
            response.candidates[0].content.parts[0]) {
          content = response.candidates[0].content.parts[0].text;
        }
        break;
        
      default:
        throw new Error('Unknown provider response format');
    }

    if (!content || typeof content !== 'string') {
      throw new Error('No valid content received from AI provider');
    }

    // Use input validator for comprehensive sanitization if available
    let sanitizedContent = content;
    if (inputValidator) {
      const validation = inputValidator.validateAIResponse(content);
      if (validation.valid || validation.sanitized) {
        sanitizedContent = validation.sanitized || content;
      } else {
        console.warn('AI response validation failed:', validation.errors);
        // Still proceed with basic sanitization
        sanitizedContent = this.basicSanitizeContent(content);
      }
    } else {
      // Fallback to basic sanitization
      sanitizedContent = this.basicSanitizeContent(content);
    }

    return {
      content: sanitizedContent.trim(),
      provider: this.config.provider,
      model: this.config.model,
      timestamp: Date.now()
    };
  }

  /**
   * Basic content sanitization fallback
   */
  basicSanitizeContent(content) {
    if (!content || typeof content !== 'string') {
      return '';
    }

    // Basic sanitization - remove potential script tags and other dangerous content
    let sanitized = content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/\x00/g, ''); // Remove null bytes

    return sanitized;
  }

  /**
   * Handle rate limiting with exponential backoff
   */
  async handleRateLimit(retryAfter = null) {
    const delay = retryAfter ? parseInt(retryAfter) * 1000 : Math.random() * 2000 + 1000;
    console.log(`Rate limited, waiting ${delay}ms before retry`);
    
    return new Promise(resolve => {
      setTimeout(resolve, delay);
    });
  }
}

/**
 * Prompt Engineering and Content Filtering
 * Creates educational prompts and filters inappropriate responses
 */
class PromptEngineer {
  constructor() {
    // Patterns that indicate complete solutions (to be filtered out)
    this.solutionPatterns = [
      /function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*return[\s\S]*\}/i,
      /class\s+\w+[\s\S]*\{[\s\S]*\}/i,
      /def\s+\w+\s*\([^)]*\):[\s\S]*return/i,
      /public\s+\w+\s+\w+\s*\([^)]*\)\s*\{[\s\S]*return[\s\S]*\}/i,
      /complete\s+solution/i,
      /final\s+answer/i,
      /here\s+is\s+the\s+solution/i,
      /copy\s+and\s+paste/i
    ];

    // Educational keywords that should be encouraged
    this.educationalKeywords = [
      'approach', 'strategy', 'concept', 'principle', 'pattern',
      'think about', 'consider', 'analyze', 'break down',
      'step by step', 'hint', 'direction', 'guidance'
    ];
  }

  /**
   * Create educational prompt for code completion
   */
  createCompletionPrompt(context) {
    const { problemTitle, problemDescription, currentCode, language } = context;
    
    return `You are an educational coding assistant helping a student learn programming concepts.

IMPORTANT GUIDELINES:
- Provide only the NEXT logical code snippet (1-3 lines maximum)
- Focus on educational guidance, not complete solutions
- Explain the reasoning behind your suggestion
- Do not provide complete function implementations
- Encourage learning and understanding

Problem: ${problemTitle}
${problemDescription ? `Description: ${problemDescription}` : ''}

Current code in ${language}:
\`\`\`${language}
${currentCode}
\`\`\`

Provide the next logical code snippet with a brief explanation of why this is the next step. Keep it educational and avoid giving away the complete solution.`;
  }

  /**
   * Create educational prompt for error explanation
   */
  createExplanationPrompt(context) {
    const { problemTitle, currentCode, language } = context;
    
    return `You are an educational coding assistant helping a student understand and fix errors in their code.

IMPORTANT GUIDELINES:
- Explain what the error means in educational terms
- Suggest the approach to fix it, not the exact fix
- Help the student understand the underlying concept
- Do not provide complete corrected code
- Focus on learning and understanding

Problem: ${problemTitle}
Code with potential errors in ${language}:
\`\`\`${language}
${currentCode}
\`\`\`

Analyze this code for errors and explain:
1. What type of error(s) you see
2. Why this error occurs (educational explanation)
3. The general approach to fix it (without giving the exact solution)
4. What concept the student should review to understand this better`;
  }

  /**
   * Create educational prompt for optimization suggestions
   */
  createOptimizationPrompt(context) {
    const { problemTitle, currentCode, language } = context;
    
    return `You are an educational coding assistant helping a student learn about code optimization and best practices.

IMPORTANT GUIDELINES:
- Explain optimization concepts, not specific implementations
- Focus on teaching performance principles
- Suggest approaches and patterns, not complete optimized code
- Help the student understand trade-offs
- Encourage learning about algorithmic complexity

Problem: ${problemTitle}
Current code in ${language}:
\`\`\`${language}
${currentCode}
\`\`\`

Analyze this code and provide educational guidance on:
1. What optimization opportunities exist
2. Why these optimizations would help (performance concepts)
3. What algorithmic patterns or data structures to consider
4. Trade-offs to think about
5. General approach to implement improvements (without giving exact code)`;
  }

  /**
   * Create educational prompt for progressive step hints with enhanced context awareness
   */
  createProgressiveHintPrompt(context, hintLevel = 1, hintContext = null) {
    const { problemTitle, problemDescription, currentCode, language } = context;
    
    const hintLevelGuidance = {
      1: "Provide a high-level approach or strategy hint that helps understand the problem",
      2: "Give a more specific direction about the algorithmic approach or data structure to consider",
      3: "Offer concrete implementation guidance while avoiding complete code solutions",
      4: "Provide the most specific guidance about edge cases and optimizations without giving the solution"
    };

    let prompt = `You are an educational coding assistant providing progressive hints to help a student solve a programming problem step by step.

IMPORTANT GUIDELINES:
- This is hint level ${hintLevel} of 4 (${hintLevelGuidance[hintLevel]})
- Focus on guiding thinking and understanding, not providing solutions
- Ask leading questions to help the student think critically
- Suggest concepts, patterns, or approaches to consider
- Do not provide complete code implementations or direct answers
- Build upon previous hints without repeating information
- Encourage active learning and problem-solving skills

Problem: ${problemTitle}
${problemDescription ? `Description: ${problemDescription}` : ''}

Current code in ${language}:
\`\`\`${language}
${currentCode || '// No code written yet'}
\`\`\``;

    // Add enhanced context from previous hints if available
    if (hintContext && hintContext.previousHints && hintContext.previousHints.length > 0) {
      prompt += `\n\nPrevious hints given to this student:`;
      
      hintContext.previousHints.forEach((hint, index) => {
        const hintAge = hintContext.progression ? 
          Math.round((Date.now() - hint.timestamp) / (1000 * 60)) : 'unknown';
        prompt += `\n\nHint ${hint.level} (${hint.type || 'general'}, ${hintAge} min ago): ${hint.content}`;
      });
      
      // Add progression context
      if (hintContext.progression) {
        prompt += `\n\nStudent Progress Context:`;
        
        if (hintContext.progression.conceptsIntroduced.length > 0) {
          prompt += `\n- Concepts already introduced: ${hintContext.progression.conceptsIntroduced.join(', ')}`;
        }
        
        if (hintContext.progression.codeEvolution.length > 0) {
          prompt += `\n- Code changes made: ${hintContext.progression.codeEvolution.length} iterations`;
          const latestChange = hintContext.progression.codeEvolution[hintContext.progression.codeEvolution.length - 1];
          if (latestChange) {
            prompt += ` (latest: ${Math.round((Date.now() - latestChange.timestamp) / (1000 * 60))} min ago)`;
          }
        }
        
        if (hintContext.progression.progressScore !== undefined) {
          prompt += `\n- Learning progress score: ${hintContext.progression.progressScore}/20`;
        }
        
        const sessionMinutes = Math.round(hintContext.progression.sessionDuration / (1000 * 60));
        prompt += `\n- Time spent on this problem: ${sessionMinutes} minutes`;
      }
      
      // Add guidance for next hint level
      if (hintContext.nextHintGuidance) {
        prompt += `\n\nNext Hint Level Guidance (Level ${hintLevel}):`;
        prompt += `\n- Type: ${hintContext.nextHintGuidance.type}`;
        prompt += `\n- Focus: ${hintContext.nextHintGuidance.description}`;
        prompt += `\n- Max length: ${hintContext.nextHintGuidance.maxLength} characters`;
        prompt += `\n- Suggested keywords: ${hintContext.nextHintGuidance.keywords.join(', ')}`;
      }
      
      prompt += `\n\nNow provide hint level ${hintLevel} that builds upon the previous hints without repeating information. The student has already received the above guidance, so focus on the next logical step in their learning journey. Avoid concepts already introduced unless building upon them.`;
    } else {
      // First hint - establish foundation
      prompt += `\n\nThis is the student's first hint for this problem. Focus on helping them understand the problem and think about potential approaches.`;
    }

    // Add level-specific guidance
    switch (hintLevel) {
      case 1:
        prompt += `\n\nFor this first hint, help the student:
- Understand what the problem is really asking
- Identify the key constraints and requirements
- Think about similar problems they might have seen
- Consider what approach or strategy might work
Keep it conceptual and avoid implementation details.`;
        break;
        
      case 2:
        prompt += `\n\nFor this second hint, help the student:
- Think about the algorithmic approach or pattern to use
- Consider what data structures might be helpful
- Break down the problem into smaller steps
- Understand the time/space complexity considerations
Provide more structure while avoiding specific code.`;
        break;
        
      case 3:
        prompt += `\n\nFor this third hint, help the student:
- Think about the specific implementation approach
- Consider the order of operations or algorithm steps
- Understand how to handle the main logic flow
- Think about function signatures or class structure
Be more specific but still avoid giving complete code solutions.`;
        break;
        
      case 4:
        prompt += `\n\nFor this final hint, help the student:
- Consider edge cases and boundary conditions
- Think about optimization opportunities
- Understand potential pitfalls or common mistakes
- Review their approach for completeness
Provide the most specific guidance while still encouraging independent implementation.`;
        break;
    }

    prompt += `\n\nProvide an educational hint that helps the student think about the next step in solving this problem. Focus on guiding their thought process and building their problem-solving skills.`;

    return prompt;
  }

  /**
   * Filter response content to ensure educational focus
   */
  filterResponse(content, requestType) {
    if (!content || typeof content !== 'string') {
      return {
        filtered: true,
        content: "I apologize, but I couldn't generate an appropriate educational response. Please try rephrasing your request.",
        reason: "Invalid content format"
      };
    }

    // Check for complete solution patterns
    const hasSolutionPattern = this.solutionPatterns.some(pattern => pattern.test(content));
    
    if (hasSolutionPattern) {
      return {
        filtered: true,
        content: "I notice my response might contain too much of the solution. Let me provide more educational guidance instead. Could you ask for a specific concept or approach you'd like help understanding?",
        reason: "Contains complete solution pattern"
      };
    }

    // Check content length - if too long, it might be giving away too much
    if (content.length > 1000 && (requestType === 'completion' || requestType === 'hint')) {
      return {
        filtered: true,
        content: "Let me provide a more focused hint. What specific part of the problem would you like guidance on?",
        reason: "Response too detailed for educational purpose"
      };
    }

    // Check for inappropriate content (basic filtering)
    const inappropriatePatterns = [
      /hack/i,
      /cheat/i,
      /copy.*paste/i,
      /plagiarism/i,
      /academic.*dishonesty/i
    ];

    const hasInappropriateContent = inappropriatePatterns.some(pattern => pattern.test(content));
    
    if (hasInappropriateContent) {
      return {
        filtered: true,
        content: "I'm here to help you learn through educational guidance. Let's focus on understanding the concepts and approaches to solve this problem.",
        reason: "Contains inappropriate content"
      };
    }

    // Content passes all filters
    return {
      filtered: false,
      content: content,
      reason: null
    };
  }

  /**
   * Validate that response maintains educational focus
   */
  validateEducationalContent(content) {
    const educationalScore = this.calculateEducationalScore(content);
    return educationalScore >= 0.3; // Threshold for educational content
  }

  /**
   * Calculate educational score based on keywords and patterns
   */
  calculateEducationalScore(content) {
    if (!content) return 0;

    const words = content.toLowerCase().split(/\s+/);
    const totalWords = words.length;
    
    if (totalWords === 0) return 0;

    // Count educational keywords
    const educationalCount = this.educationalKeywords.reduce((count, keyword) => {
      const keywordWords = keyword.split(/\s+/);
      if (keywordWords.length === 1) {
        return count + (words.includes(keyword) ? 1 : 0);
      } else {
        // Multi-word keyword
        return count + (content.toLowerCase().includes(keyword) ? 1 : 0);
      }
    }, 0);

    // Bonus for question marks (encouraging thinking)
    const questionCount = (content.match(/\?/g) || []).length;
    
    // Penalty for code blocks that look like complete solutions
    const codeBlockPenalty = (content.match(/```[\s\S]*?```/g) || []).length * 0.1;
    
    return Math.min(1.0, (educationalCount / totalWords * 10) + (questionCount * 0.1) - codeBlockPenalty);
  }

  /**
   * Sanitize response content
   */
  sanitizeContent(content) {
    if (!content) return '';

    // Remove potentially harmful content
    let sanitized = content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/data:text\/html/gi, '');

    // Limit length to prevent overwhelming responses
    if (sanitized.length > 2000) {
      sanitized = sanitized.substring(0, 1997) + '...';
    }

    return sanitized.trim();
  }
}

/**
 * Extension Update Handler
 * Manages extension updates, version compatibility, and user notifications
 */
class ExtensionUpdateHandler {
  constructor() {
    this.currentVersion = chrome.runtime.getManifest().version;
    this.updateCheckInterval = 24 * 60 * 60 * 1000; // 24 hours
    this.lastUpdateCheck = null;
    
    // Initialize update handling
    this.initializeUpdateHandling();
  }

  /**
   * Initialize update event listeners and periodic checks
   */
  initializeUpdateHandling() {
    // Handle extension installation and updates
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstallOrUpdate(details);
    });

    // Handle extension startup
    chrome.runtime.onStartup.addListener(() => {
      this.handleExtensionStartup();
    });

    // Periodic update checks
    this.scheduleUpdateCheck();
  }

  /**
   * Handle extension installation or update events
   */
  async handleInstallOrUpdate(details) {
    console.log('Extension install/update event:', details);

    switch (details.reason) {
      case 'install':
        await this.handleFirstInstall();
        break;
      case 'update':
        await this.handleUpdate(details.previousVersion);
        break;
      case 'chrome_update':
        await this.handleChromeUpdate();
        break;
      case 'shared_module_update':
        console.log('Shared module updated');
        break;
    }
  }

  /**
   * Handle first-time installation
   */
  async handleFirstInstall() {
    console.log('LeetPilot first installation detected');

    try {
      // Set installation metadata
      await chrome.storage.local.set({
        'leetpilot_install_date': Date.now(),
        'leetpilot_version': this.currentVersion,
        'leetpilot_first_run': true
      });

      // Initialize default settings if needed
      if (storageManager) {
        await storageManager.initializeDefaultSettings();
      }

      // Show welcome notification
      this.showWelcomeNotification();

      console.log('First installation setup completed');
    } catch (error) {
      console.error('Error during first installation setup:', error);
    }
  }

  /**
   * Handle extension updates
   */
  async handleUpdate(previousVersion) {
    console.log(`LeetPilot updated from ${previousVersion} to ${this.currentVersion}`);

    try {
      // Update version in storage
      await chrome.storage.local.set({
        'leetpilot_version': this.currentVersion,
        'leetpilot_last_update': Date.now(),
        'leetpilot_previous_version': previousVersion
      });

      // Perform version-specific migrations
      await this.performVersionMigration(previousVersion, this.currentVersion);

      // Clear any cached data that might be incompatible
      await this.clearIncompatibleCache(previousVersion);

      // Show update notification
      this.showUpdateNotification(previousVersion, this.currentVersion);

      console.log('Extension update completed successfully');
    } catch (error) {
      console.error('Error during extension update:', error);
    }
  }

  /**
   * Handle Chrome browser updates
   */
  async handleChromeUpdate() {
    console.log('Chrome browser update detected');

    try {
      // Check compatibility with new Chrome version
      const chromeVersion = await this.getChromeVersion();
      const isCompatible = this.checkChromeCompatibility(chromeVersion);

      if (!isCompatible) {
        console.warn(`Potential compatibility issue with Chrome ${chromeVersion}`);
        this.showCompatibilityWarning(chromeVersion);
      }

      // Update Chrome version in storage
      await chrome.storage.local.set({
        'leetpilot_chrome_version': chromeVersion,
        'leetpilot_chrome_update_date': Date.now()
      });

    } catch (error) {
      console.error('Error handling Chrome update:', error);
    }
  }

  /**
   * Handle extension startup
   */
  async handleExtensionStartup() {
    console.log('LeetPilot extension startup');

    try {
      // Check if this is the first run after update
      const storage = await chrome.storage.local.get([
        'leetpilot_first_run',
        'leetpilot_version',
        'leetpilot_last_startup'
      ]);

      if (storage.leetpilot_first_run) {
        // First run after installation
        await chrome.storage.local.set({
          'leetpilot_first_run': false,
          'leetpilot_first_startup': Date.now()
        });
        
        // Open configuration popup
        setTimeout(() => {
          chrome.action.openPopup();
        }, 1000);
      }

      // Update last startup time
      await chrome.storage.local.set({
        'leetpilot_last_startup': Date.now()
      });

      // Perform startup checks
      await this.performStartupChecks();

    } catch (error) {
      console.error('Error during extension startup:', error);
    }
  }

  /**
   * Perform version-specific data migrations
   */
  async performVersionMigration(fromVersion, toVersion) {
    console.log(`Performing migration from ${fromVersion} to ${toVersion}`);

    try {
      // Parse version numbers for comparison
      const fromParts = fromVersion.split('.').map(Number);
      const toParts = toVersion.split('.').map(Number);

      // Example migration logic (add specific migrations as needed)
      if (this.isVersionLess(fromParts, [1, 1, 0])) {
        // Migration for versions before 1.1.0
        await this.migrateToV110();
      }

      if (this.isVersionLess(fromParts, [1, 2, 0])) {
        // Migration for versions before 1.2.0
        await this.migrateToV120();
      }

      console.log('Version migration completed');
    } catch (error) {
      console.error('Error during version migration:', error);
    }
  }

  /**
   * Migration to version 1.1.0
   */
  async migrateToV110() {
    console.log('Migrating to version 1.1.0');
    
    // Example: Update storage format for API keys
    try {
      const oldConfig = await chrome.storage.local.get(['api_key', 'provider']);
      
      if (oldConfig.api_key && oldConfig.provider) {
        // Convert old format to new format
        const newConfig = {
          provider: oldConfig.provider,
          apiKey: oldConfig.api_key,
          model: this.getDefaultModel(oldConfig.provider),
          maxTokens: 150,
          temperature: 0.7
        };

        if (storageManager) {
          const configObj = new LeetPilotStorage.AIProviderConfig(
            newConfig.provider,
            newConfig.apiKey,
            newConfig.model,
            newConfig.maxTokens,
            newConfig.temperature
          );
          
          await storageManager.storeConfiguration(configObj);
        }

        // Remove old keys
        await chrome.storage.local.remove(['api_key', 'provider']);
        
        console.log('API configuration migrated to new format');
      }
    } catch (error) {
      console.error('Error in v1.1.0 migration:', error);
    }
  }

  /**
   * Migration to version 1.2.0
   */
  async migrateToV120() {
    console.log('Migrating to version 1.2.0');
    
    // Example: Clear old hint sessions that might be incompatible
    try {
      if (progressiveHintSystem) {
        // Clear all existing hint sessions
        progressiveHintSystem.hintSessions.clear();
        console.log('Cleared old hint sessions for compatibility');
      }
    } catch (error) {
      console.error('Error in v1.2.0 migration:', error);
    }
  }

  /**
   * Clear cached data that might be incompatible with new version
   */
  async clearIncompatibleCache(previousVersion) {
    console.log('Clearing incompatible cache data');

    try {
      // Clear specific cache keys that might cause issues
      const cacheKeysToRemove = [
        'leetpilot_temp_cache',
        'leetpilot_api_cache',
        'leetpilot_response_cache'
      ];

      await chrome.storage.local.remove(cacheKeysToRemove);

      // Clear in-memory caches
      if (requestOrchestrator && requestOrchestrator.contextManager) {
        requestOrchestrator.contextManager.contextCache.clear();
      }

      console.log('Cache cleanup completed');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Schedule periodic update checks
   */
  scheduleUpdateCheck() {
    // Check for updates every 24 hours
    setInterval(() => {
      this.checkForUpdates();
    }, this.updateCheckInterval);

    // Initial check after 5 minutes
    setTimeout(() => {
      this.checkForUpdates();
    }, 5 * 60 * 1000);
  }

  /**
   * Check for available updates
   */
  async checkForUpdates() {
    try {
      this.lastUpdateCheck = Date.now();
      
      // Chrome handles automatic updates, but we can check if restart is needed
      const updateInfo = await this.getUpdateInfo();
      
      if (updateInfo.needsRestart) {
        this.showRestartNotification();
      }

      // Store last check time
      await chrome.storage.local.set({
        'leetpilot_last_update_check': this.lastUpdateCheck
      });

    } catch (error) {
      console.error('Error checking for updates:', error);
    }
  }

  /**
   * Get Chrome version
   */
  async getChromeVersion() {
    return new Promise((resolve) => {
      chrome.runtime.getPlatformInfo((info) => {
        // This is a simplified version detection
        // In practice, you might need more sophisticated detection
        resolve(navigator.userAgent.match(/Chrome\/(\d+)/)?.[1] || 'unknown');
      });
    });
  }

  /**
   * Check Chrome compatibility
   */
  checkChromeCompatibility(chromeVersion) {
    const minChromeVersion = 88; // Minimum required Chrome version
    const version = parseInt(chromeVersion);
    
    return !isNaN(version) && version >= minChromeVersion;
  }

  /**
   * Get update information
   */
  async getUpdateInfo() {
    // Chrome doesn't provide direct API for update status
    // This is a placeholder for future Chrome API updates
    return {
      needsRestart: false,
      updateAvailable: false
    };
  }

  /**
   * Show welcome notification for new installations
   */
  showWelcomeNotification() {
    console.log('Showing welcome notification');
    
    // Create a simple notification or badge
    chrome.action.setBadgeText({ text: 'NEW' });
    chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
    
    // Clear badge after 24 hours
    setTimeout(() => {
      chrome.action.setBadgeText({ text: '' });
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Show update notification
   */
  showUpdateNotification(fromVersion, toVersion) {
    console.log(`Showing update notification: ${fromVersion} → ${toVersion}`);
    
    // Create update badge
    chrome.action.setBadgeText({ text: 'UPD' });
    chrome.action.setBadgeBackgroundColor({ color: '#2196F3' });
    
    // Clear badge after 48 hours
    setTimeout(() => {
      chrome.action.setBadgeText({ text: '' });
    }, 48 * 60 * 60 * 1000);
  }

  /**
   * Show compatibility warning
   */
  showCompatibilityWarning(chromeVersion) {
    console.warn(`Showing compatibility warning for Chrome ${chromeVersion}`);
    
    // Create warning badge
    chrome.action.setBadgeText({ text: '⚠' });
    chrome.action.setBadgeBackgroundColor({ color: '#FF9800' });
  }

  /**
   * Show restart notification
   */
  showRestartNotification() {
    console.log('Showing restart notification');
    
    // Create restart badge
    chrome.action.setBadgeText({ text: '↻' });
    chrome.action.setBadgeBackgroundColor({ color: '#9C27B0' });
  }

  /**
   * Perform startup checks
   */
  async performStartupChecks() {
    try {
      // Check storage integrity
      if (storageManager) {
        const isHealthy = await storageManager.checkStorageHealth();
        if (!isHealthy) {
          console.warn('Storage health check failed');
        }
      }

      // Check security monitor status
      if (securityMonitor) {
        securityMonitor.performStartupSecurityCheck();
      }

      // Validate configuration
      await this.validateConfiguration();

      console.log('Startup checks completed');
    } catch (error) {
      console.error('Error during startup checks:', error);
    }
  }

  /**
   * Validate current configuration
   */
  async validateConfiguration() {
    try {
      if (!storageManager) {
        return;
      }

      const config = await storageManager.retrieveConfiguration();
      
      if (config) {
        const validationErrors = config.validate();
        if (validationErrors.length > 0) {
          console.warn('Configuration validation issues:', validationErrors);
          
          // Show configuration warning
          chrome.action.setBadgeText({ text: '!' });
          chrome.action.setBadgeBackgroundColor({ color: '#F44336' });
        }
      }
    } catch (error) {
      console.error('Error validating configuration:', error);
    }
  }

  /**
   * Get default model for provider
   */
  getDefaultModel(provider) {
    const defaults = {
      'openai': 'gpt-3.5-turbo',
      'anthropic': 'claude-3-haiku-20240307',
      'gemini': 'gemini-pro'
    };
    
    return defaults[provider] || 'gpt-3.5-turbo';
  }

  /**
   * Compare version numbers
   */
  isVersionLess(version1, version2) {
    for (let i = 0; i < Math.max(version1.length, version2.length); i++) {
      const v1 = version1[i] || 0;
      const v2 = version2[i] || 0;
      
      if (v1 < v2) return true;
      if (v1 > v2) return false;
    }
    
    return false;
  }

  /**
   * Get extension statistics for debugging
   */
  async getExtensionStats() {
    try {
      const storage = await chrome.storage.local.get([
        'leetpilot_install_date',
        'leetpilot_version',
        'leetpilot_last_update',
        'leetpilot_last_startup',
        'leetpilot_chrome_version'
      ]);

      return {
        currentVersion: this.currentVersion,
        installDate: storage.leetpilot_install_date,
        lastUpdate: storage.leetpilot_last_update,
        lastStartup: storage.leetpilot_last_startup,
        chromeVersion: storage.leetpilot_chrome_version,
        lastUpdateCheck: this.lastUpdateCheck,
        uptime: Date.now() - (storage.leetpilot_last_startup || Date.now())
      };
    } catch (error) {
      console.error('Error getting extension stats:', error);
      return null;
    }
  }
}

// Initialize update handler
const extensionUpdateHandler = new ExtensionUpdateHandler();

// Export for testing and debugging
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ExtensionUpdateHandler,
    extensionUpdateHandler
  };
}