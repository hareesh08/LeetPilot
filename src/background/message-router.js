// LeetPilot Message Router
// Routes and validates messages between content scripts and background services

/**
 * Message Router
 * Routes and validates messages between content scripts and background services
 */
export class MessageRouter {
  constructor() {
    this.routes = new Map();
    this.middleware = [];
    this.isInitialized = false;
    
    this.setupDefaultRoutes();
  }

  /**
   * Initialize the message router
   */
  initialize(backgroundService) {
    if (this.isInitialized) return;
    
    this.backgroundService = backgroundService;
    
    // Setup message listener
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep the message channel open for async responses
    });
    
    this.isInitialized = true;
    console.log('Message router initialized');
  }

  /**
   * Setup default message routes
   */
  setupDefaultRoutes() {
    this.addRoute('completion', 'ai');
    this.addRoute('explanation', 'ai');
    this.addRoute('optimization', 'ai');
    this.addRoute('hint', 'ai');
    this.addRoute('chatMessage', 'ai');
    
    this.addRoute('getConfiguration', 'config');
    this.addRoute('saveConfiguration', 'config');
    this.addRoute('testAPIConnection', 'config');
    this.addRoute('updateSetting', 'config');
    
    this.addRoute('resetHints', 'hints');
    
    this.addRoute('securityStatus', 'security');
    
    this.addRoute('ping', 'system');
    this.addRoute('getStats', 'system');
  }

  /**
   * Handle incoming message
   */
  async handleMessage(request, sender, sendResponse) {
    try {
      console.log('Message router received:', request.type, 'from', sender.tab?.id || 'popup');
      
      // Validate message
      const validation = this.validateMessage(request, sender);
      if (!validation.valid) {
        sendResponse({
          error: validation.error,
          errorCategory: 'validation'
        });
        return;
      }
      
      // Apply middleware
      const middlewareResult = await this.applyMiddleware(request, sender);
      if (middlewareResult.blocked) {
        sendResponse({
          error: middlewareResult.reason,
          errorCategory: 'security'
        });
        return;
      }
      
      // Route the message
      const route = this.routes.get(request.type);
      if (!route) {
        sendResponse({
          error: `Unknown message type: ${request.type}`,
          errorCategory: 'validation'
        });
        return;
      }
      
      // Add routing metadata
      const enrichedRequest = {
        ...request,
        _routing: {
          service: route.service,
          timestamp: Date.now(),
          sender: {
            tabId: sender.tab?.id,
            url: sender.tab?.url,
            origin: sender.origin
          }
        }
      };
      
      // Dispatch to service
      this.dispatchToService(route.service, enrichedRequest, sendResponse);
      
    } catch (error) {
      console.error('Error in message router:', error);
      sendResponse({
        error: 'Internal routing error',
        errorCategory: 'unknown'
      });
    }
  }

  /**
   * Validate incoming message
   */
  validateMessage(request, sender) {
    // Basic structure validation
    if (!request || typeof request !== 'object') {
      return { valid: false, error: 'Invalid message format' };
    }
    
    if (!request.type || typeof request.type !== 'string') {
      return { valid: false, error: 'Message type is required' };
    }
    
    // Check sender origin for security
    if (sender.tab && !this.isValidOrigin(sender.tab.url)) {
      return { valid: false, error: 'Invalid origin' };
    }
    
    // Type-specific validation
    const typeValidation = this.validateMessageType(request);
    if (!typeValidation.valid) {
      return typeValidation;
    }
    
    return { valid: true };
  }

  /**
   * Validate message type and content
   */
  validateMessageType(request) {
    const { type } = request;
    
    switch (type) {
      case 'completion':
      case 'explanation':
      case 'optimization':
      case 'hint':
        break;
      
      case 'chatMessage':
        if (!request.message) {
          return { valid: false, error: 'Message is required for chat' };
        }
        break;
        
      case 'saveConfiguration':
        if (!request.config) {
          return { valid: false, error: 'Configuration is required for save request' };
        }
        break;
        
      case 'testAPIConnection':
        if (!request.config) {
          return { valid: false, error: 'Configuration is required for API testing' };
        }
        break;
        
      case 'resetHints':
        if (!request.problemTitle) {
          return { valid: false, error: 'Problem title is required for hint reset' };
        }
        break;
    }
    
    return { valid: true };
  }

  /**
   * Check if origin is valid
   */
  isValidOrigin(url) {
    if (!url) return false;
    
    const validOrigins = [
      'https://leetcode.com',
      'chrome-extension://'
    ];
    
    return validOrigins.some(origin => url.startsWith(origin));
  }

  /**
   * Apply middleware to the request
   */
  async applyMiddleware(request, sender) {
    for (const middleware of this.middleware) {
      try {
        const result = await middleware(request, sender);
        if (result && result.blocked) {
          return result;
        }
      } catch (error) {
        console.error('Middleware error:', error);
        return {
          blocked: true,
          reason: 'Middleware processing error'
        };
      }
    }
    
    return { blocked: false };
  }

  /**
   * Dispatch message to appropriate service
   */
  dispatchToService(serviceName, request, sendResponse) {
    if (!this.backgroundService) {
      sendResponse({
        error: `Service ${serviceName} not available`,
        errorCategory: 'config'
      });
      return;
    }

    switch (serviceName) {
      case 'ai':
        this.backgroundService.handleAIRequest(request, sendResponse);
        break;
      case 'config':
        this.backgroundService.handleConfigRequest(request, sendResponse);
        break;
      case 'security':
        this.backgroundService.handleSecurityRequest(request, sendResponse);
        break;
      case 'system':
        this.backgroundService.handleSystemRequest(request, sendResponse);
        break;
      default:
        sendResponse({
          error: `Service ${serviceName} not available`,
          errorCategory: 'config'
        });
    }
  }

  /**
   * Add a message route
   */
  addRoute(messageType, serviceName, options = {}) {
    const route = {
      type: messageType,
      service: serviceName,
      middleware: options.middleware || [],
      validation: options.validation || null,
      rateLimit: options.rateLimit || null
    };
    
    this.routes.set(messageType, route);
    console.log(`Route added: ${messageType} -> ${serviceName}`);
    
    return route;
  }

  /**
   * Remove a message route
   */
  removeRoute(messageType) {
    const removed = this.routes.delete(messageType);
    if (removed) {
      console.log(`Route removed: ${messageType}`);
    }
    return removed;
  }

  /**
   * Update a message route
   */
  updateRoute(messageType, updates) {
    const route = this.routes.get(messageType);
    if (route) {
      Object.assign(route, updates);
      console.log(`Route updated: ${messageType}`);
      return route;
    }
    return null;
  }

  /**
   * Add middleware
   */
  addMiddleware(middleware) {
    if (typeof middleware === 'function') {
      this.middleware.push(middleware);
      console.log('Middleware added');
    }
  }

  /**
   * Remove middleware
   */
  removeMiddleware(middleware) {
    const index = this.middleware.indexOf(middleware);
    if (index > -1) {
      this.middleware.splice(index, 1);
      console.log('Middleware removed');
      return true;
    }
    return false;
  }

  /**
   * Get all routes
   */
  getRoutes() {
    return Array.from(this.routes.entries()).map(([type, route]) => ({
      type,
      ...route
    }));
  }

  /**
   * Get route by message type
   */
  getRoute(messageType) {
    return this.routes.get(messageType);
  }

  /**
   * Check if route exists
   */
  hasRoute(messageType) {
    return this.routes.has(messageType);
  }

  /**
   * Get routing statistics
   */
  getStats() {
    return {
      totalRoutes: this.routes.size,
      middlewareCount: this.middleware.length,
      isInitialized: this.isInitialized,
      routes: this.getRoutes().map(route => ({
        type: route.type,
        service: route.service
      }))
    };
  }

  /**
   * Create rate limiting middleware
   */
  createRateLimitMiddleware(limits) {
    const requestHistory = new Map();
    
    return async (request, sender) => {
      const key = `${sender.tab?.id || 'popup'}_${request.type}`;
      const now = Date.now();
      const limit = limits[request.type] || limits.default || { requests: 10, window: 60000 };
      
      // Get request history for this key
      if (!requestHistory.has(key)) {
        requestHistory.set(key, []);
      }
      
      const history = requestHistory.get(key);
      
      // Clean old entries
      const cutoff = now - limit.window;
      const recentRequests = history.filter(timestamp => timestamp > cutoff);
      requestHistory.set(key, recentRequests);
      
      // Check limit
      if (recentRequests.length >= limit.requests) {
        return {
          blocked: true,
          reason: 'Rate limit exceeded'
        };
      }
      
      // Record this request
      recentRequests.push(now);
      
      return { blocked: false };
    };
  }

  /**
   * Create security middleware
   */
  createSecurityMiddleware() {
    return async (request, sender) => {
      // Check for suspicious patterns
      const suspiciousPatterns = [
        /eval\s*\(/i,
        /javascript:/i,
        /<script/i,
        /document\.write/i
      ];
      
      const requestStr = JSON.stringify(request);
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(requestStr)) {
          console.warn('Suspicious pattern detected in request:', pattern);
          return {
            blocked: true,
            reason: 'Security policy violation'
          };
        }
      }
      
      return { blocked: false };
    };
  }

  /**
   * Create logging middleware
   */
  createLoggingMiddleware() {
    return async (request, sender) => {
      console.log(`[${new Date().toISOString()}] ${request.type} from ${sender.tab?.id || 'popup'}`);
      return { blocked: false };
    };
  }

  /**
   * Setup default middleware
   */
  setupDefaultMiddleware() {
    // Add security middleware
    this.addMiddleware(this.createSecurityMiddleware());
    
    // Add rate limiting middleware
    const rateLimits = {
      completion: { requests: 10, window: 60000 },
      explanation: { requests: 5, window: 60000 },
      optimization: { requests: 5, window: 60000 },
      hint: { requests: 15, window: 60000 },
      default: { requests: 20, window: 60000 }
    };
    this.addMiddleware(this.createRateLimitMiddleware(rateLimits));
    
    // Add logging middleware (in development)
    if (process.env.NODE_ENV === 'development') {
      this.addMiddleware(this.createLoggingMiddleware());
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.routes.clear();
    this.middleware = [];
    this.isInitialized = false;
    console.log('Message router cleaned up');
  }
}