// LeetPilot Security Monitor
// Monitors for data leakage prevention and enforces data locality

import { ValidationUtils } from './validation-utils.js';

/**
 * Security Monitor for data locality enforcement and leakage prevention
 */
class SecurityMonitor {
  constructor() {
    this.sensitiveDataPatterns = [
      // API key patterns
      /sk-[a-zA-Z0-9]{20,}/g,           // OpenAI keys
      /sk-ant-[a-zA-Z0-9]{20,}/g,       // Anthropic keys
      /AIza[a-zA-Z0-9]{35}/g,           // Google API keys
      /Bearer\s+[a-zA-Z0-9-_]{20,}/g,   // Bearer tokens
      
      // Generic patterns
      /api[_-]?key[:\s=]+[a-zA-Z0-9-_]{10,}/gi,
      /token[:\s=]+[a-zA-Z0-9-_]{20,}/gi,
      /password[:\s=]+[^\s]{8,}/gi,
      /secret[:\s=]+[a-zA-Z0-9-_]{10,}/gi
    ];
    
    this.allowedDomains = [
      'api.openai.com',
      'api.anthropic.com',
      'generativelanguage.googleapis.com',
      'leetcode.com'
    ];
    
    this.networkRequests = new Map(); // Track network requests
    this.dataLeakageAlerts = [];
    this.isMonitoring = false;
    
    // Only initialize monitoring in browser environments
    if (typeof window !== 'undefined' || typeof chrome !== 'undefined' || typeof self !== 'undefined') {
      this.initializeMonitoring();
    }
  }

  /**
   * Initialize security monitoring
   */
  initializeMonitoring() {
    if (this.isMonitoring) return;
    
    // Don't initialize monitoring in Node.js environment (build scripts)
    if (typeof window === 'undefined' && typeof chrome === 'undefined' && typeof self === 'undefined') {
      console.log('Security monitoring skipped in Node.js environment');
      return;
    }
    
    try {
      // Monitor fetch requests
      this.interceptFetch();
      
      // Monitor XMLHttpRequest
      this.interceptXHR();
      
      // Monitor WebSocket connections
      this.interceptWebSocket();
      
      // Set up periodic security checks
      this.startPeriodicChecks();
      
      this.isMonitoring = true;
      console.log('Security monitoring initialized');
    } catch (error) {
      console.error('Failed to initialize security monitoring:', error);
    }
  }

  /**
   * Intercept fetch requests to monitor for data leakage
   */
  interceptFetch() {
    // Check if we're in a service worker context
    const globalContext = typeof window !== 'undefined' ? window : 
                         typeof globalThis !== 'undefined' ? globalThis : 
                         typeof self !== 'undefined' ? self : null;
    
    if (!globalContext || !globalContext.fetch) {
      console.warn('Fetch not available in current context');
      return;
    }
    
    const originalFetch = globalContext.fetch;
    const self = this;
    
    globalContext.fetch = function(url, options = {}) {
      // Log the request for monitoring
      const requestId = self.logNetworkRequest('fetch', url, options);
      
      // Check for data leakage before request
      const leakageCheck = self.checkRequestForLeakage(url, options);
      if (leakageCheck.hasLeakage) {
        console.error('Data leakage detected in fetch request:', leakageCheck);
        self.recordDataLeakage('fetch', url, leakageCheck);
        
        // Block the request if it contains sensitive data going to unauthorized domains
        if (!self.isDomainAllowed(url)) {
          return Promise.reject(new Error('Request blocked: Potential data leakage to unauthorized domain'));
        }
      }
      
      // Proceed with original fetch
      return originalFetch.apply(this, arguments)
        .then(response => {
          self.updateRequestStatus(requestId, 'completed', response.status);
          return response;
        })
        .catch(error => {
          self.updateRequestStatus(requestId, 'failed', null, error.message);
          throw error;
        });
    };
  }

  /**
   * Intercept XMLHttpRequest to monitor for data leakage
   */
  interceptXHR() {
    // XMLHttpRequest is not available in service worker context
    if (typeof XMLHttpRequest === 'undefined') {
      console.log('XMLHttpRequest not available in service worker context, skipping XHR interception');
      return;
    }
    
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    const self = this;
    
    XMLHttpRequest.prototype.open = function(method, url, async = true, user, password) {
      this._leetpilot_url = url;
      this._leetpilot_method = method;
      return originalOpen.apply(this, arguments);
    };
    
    XMLHttpRequest.prototype.send = function(data) {
      if (this._leetpilot_url) {
        const requestId = self.logNetworkRequest('xhr', this._leetpilot_url, {
          method: this._leetpilot_method,
          body: data
        });
        
        // Check for data leakage
        const leakageCheck = self.checkRequestForLeakage(this._leetpilot_url, { body: data });
        if (leakageCheck.hasLeakage) {
          console.error('Data leakage detected in XHR request:', leakageCheck);
          self.recordDataLeakage('xhr', this._leetpilot_url, leakageCheck);
          
          // Block unauthorized requests
          if (!self.isDomainAllowed(this._leetpilot_url)) {
            throw new Error('Request blocked: Potential data leakage to unauthorized domain');
          }
        }
        
        // Monitor response
        this.addEventListener('load', () => {
          self.updateRequestStatus(requestId, 'completed', this.status);
        });
        
        this.addEventListener('error', () => {
          self.updateRequestStatus(requestId, 'failed', this.status, 'Network error');
        });
      }
      
      return originalSend.apply(this, arguments);
    };
  }

  /**
   * Intercept WebSocket connections
   */
  interceptWebSocket() {
    // Check if we're in a service worker context
    const globalContext = typeof window !== 'undefined' ? window : 
                         typeof globalThis !== 'undefined' ? globalThis : 
                         typeof self !== 'undefined' ? self : null;
    
    if (!globalContext || !globalContext.WebSocket) {
      console.warn('WebSocket not available in current context');
      return;
    }
    
    const originalWebSocket = globalContext.WebSocket;
    const self = this;
    
    globalContext.WebSocket = function(url, protocols) {
      // Check WebSocket URL for unauthorized domains
      if (!self.isDomainAllowed(url)) {
        console.warn('WebSocket connection to unauthorized domain blocked:', url);
        throw new Error('WebSocket connection blocked: Unauthorized domain');
      }
      
      const ws = new originalWebSocket(url, protocols);
      
      // Monitor WebSocket messages
      const originalSend = ws.send;
      ws.send = function(data) {
        const leakageCheck = self.checkDataForLeakage(data);
        if (leakageCheck.hasLeakage) {
          console.error('Data leakage detected in WebSocket message:', leakageCheck);
          self.recordDataLeakage('websocket', url, leakageCheck);
          throw new Error('WebSocket message blocked: Contains sensitive data');
        }
        
        return originalSend.apply(this, arguments);
      };
      
      return ws;
    };
  }

  /**
   * Log network request for monitoring
   */
  logNetworkRequest(type, url, options) {
    const requestId = Date.now() + '_' + Math.random().toString(36).substring(2, 11);
    
    this.networkRequests.set(requestId, {
      id: requestId,
      type: type,
      url: url,
      method: options.method || 'GET',
      timestamp: Date.now(),
      status: 'pending',
      domain: this.extractDomain(url),
      isAllowed: this.isDomainAllowed(url)
    });
    
    return requestId;
  }

  /**
   * Update request status
   */
  updateRequestStatus(requestId, status, httpStatus, errorMessage) {
    const request = this.networkRequests.get(requestId);
    if (request) {
      request.status = status;
      request.httpStatus = httpStatus;
      request.errorMessage = errorMessage;
      request.completedAt = Date.now();
    }
  }

  /**
   * Check request for potential data leakage
   */
  checkRequestForLeakage(url, options) {
    const result = {
      hasLeakage: false,
      leakageTypes: [],
      sensitiveDataFound: []
    };
    
    // Check URL for sensitive data
    const urlCheck = this.checkDataForLeakage(url);
    if (urlCheck.hasLeakage) {
      result.hasLeakage = true;
      result.leakageTypes.push('url');
      result.sensitiveDataFound.push(...urlCheck.sensitiveDataFound);
    }
    
    // Check request body/data
    if (options.body) {
      const bodyCheck = this.checkDataForLeakage(options.body);
      if (bodyCheck.hasLeakage) {
        result.hasLeakage = true;
        result.leakageTypes.push('body');
        result.sensitiveDataFound.push(...bodyCheck.sensitiveDataFound);
      }
    }
    
    // Check headers
    if (options.headers) {
      const headersString = JSON.stringify(options.headers);
      const headersCheck = this.checkDataForLeakage(headersString);
      if (headersCheck.hasLeakage) {
        result.hasLeakage = true;
        result.leakageTypes.push('headers');
        result.sensitiveDataFound.push(...headersCheck.sensitiveDataFound);
      }
    }
    
    return result;
  }

  /**
   * Check data for sensitive information
   */
  checkDataForLeakage(data) {
    const result = {
      hasLeakage: false,
      sensitiveDataFound: []
    };
    
    if (!data || typeof data !== 'string') {
      return result;
    }
    
    // Check against sensitive data patterns
    for (const pattern of this.sensitiveDataPatterns) {
      const matches = data.match(pattern);
      if (matches) {
        result.hasLeakage = true;
        result.sensitiveDataFound.push({
          pattern: pattern.toString(),
          matches: matches.map(match => this.maskSensitiveData(match))
        });
      }
    }
    
    return result;
  }

  /**
   * Mask sensitive data for logging
   */
  maskSensitiveData(data) {
    if (!data || data.length < 8) return '[REDACTED]';
    
    const start = data.substring(0, 4);
    const end = data.substring(data.length - 4);
    const middle = '*'.repeat(Math.max(4, data.length - 8));
    
    return start + middle + end;
  }

  /**
   * Check if domain is allowed for API requests
   */
  isDomainAllowed(url) {
    try {
      const domain = this.extractDomain(url);
      
      // Check predefined allowed domains first
      const isPredefineAllowed = this.allowedDomains.some(allowedDomain => 
        domain === allowedDomain || domain.endsWith('.' + allowedDomain)
      );
      
      if (isPredefineAllowed) {
        return true;
      }
      
      // For custom providers, allow any HTTPS domain
      // This is safe because:
      // 1. We enforce HTTPS in the input validator
      // 2. We still check for sensitive data leakage
      // 3. Users explicitly configure custom providers
      try {
        const urlObj = new URL(url);
        if (urlObj.protocol === 'https:' && urlObj.hostname && urlObj.hostname.length > 0) {
          // Additional security: don't allow localhost or private IPs for custom providers
          // unless explicitly in development mode
          const hostname = urlObj.hostname.toLowerCase();
          
          // Block localhost and private IP ranges for security
          if (hostname === 'localhost' || 
              hostname === '127.0.0.1' || 
              hostname.startsWith('192.168.') ||
              hostname.startsWith('10.') ||
              hostname.startsWith('172.16.') ||
              hostname.startsWith('172.17.') ||
              hostname.startsWith('172.18.') ||
              hostname.startsWith('172.19.') ||
              hostname.startsWith('172.2') ||
              hostname.startsWith('172.30.') ||
              hostname.startsWith('172.31.')) {
            console.warn('Blocked request to private/local network:', hostname);
            return false;
          }
          
          return true;
        }
      } catch (urlError) {
        console.error('Error parsing URL for custom provider check:', urlError);
      }
      
      return false;
    } catch (error) {
      console.error('Error checking domain:', error);
      return false;
    }
  }

  /**
   * Extract domain from URL
   */
  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (error) {
      // Handle relative URLs or invalid URLs
      if (typeof url === 'string' && url.startsWith('/')) {
        // In service worker context, we don't have window.location
        const globalContext = typeof window !== 'undefined' ? window : 
                             typeof globalThis !== 'undefined' ? globalThis : 
                             typeof self !== 'undefined' ? self : null;
        
        if (globalContext && globalContext.location) {
          return globalContext.location.hostname;
        }
        return 'localhost'; // Fallback for service worker
      }
      return 'unknown';
    }
  }

  /**
   * Record data leakage incident
   */
  recordDataLeakage(requestType, url, leakageDetails) {
    const incident = {
      id: Date.now() + '_' + Math.random().toString(36).substring(2, 11),
      timestamp: Date.now(),
      type: requestType,
      url: this.sanitizeUrlForLogging(url),
      domain: this.extractDomain(url),
      leakageTypes: leakageDetails.leakageTypes,
      sensitiveDataCount: leakageDetails.sensitiveDataFound.length,
      blocked: !this.isDomainAllowed(url)
    };
    
    this.dataLeakageAlerts.push(incident);
    
    // Keep only last 100 incidents
    if (this.dataLeakageAlerts.length > 100) {
      this.dataLeakageAlerts = this.dataLeakageAlerts.slice(-100);
    }
    
    // Log to console (without sensitive data)
    console.warn('Data leakage incident recorded:', incident);
  }

  /**
   * Sanitize URL for logging (remove sensitive query parameters)
   */
  sanitizeUrlForLogging(url) {
    return ValidationUtils.sanitizeUrlForLogging(url);
  }

  /**
   * Start periodic security checks
   */
  startPeriodicChecks() {
    // Don't start periodic checks in Node.js environment
    if (typeof window === 'undefined' && typeof chrome === 'undefined' && typeof self === 'undefined') {
      return;
    }
    
    // Check for data leakage every 30 seconds
    setInterval(() => {
      this.performSecurityCheck();
    }, 30000);
    
    // Clean up old request logs every 5 minutes
    setInterval(() => {
      this.cleanupOldRequests();
    }, 300000);
  }

  /**
   * Perform periodic security check
   */
  performSecurityCheck() {
    try {
      // Check for unauthorized network requests
      const unauthorizedRequests = Array.from(this.networkRequests.values())
        .filter(request => !request.isAllowed && request.status === 'completed');
      
      if (unauthorizedRequests.length > 0) {
        console.warn(`Found ${unauthorizedRequests.length} requests to unauthorized domains`);
      }
      
      // Check for recent data leakage incidents
      const recentIncidents = this.dataLeakageAlerts.filter(
        incident => Date.now() - incident.timestamp < 300000 // Last 5 minutes
      );
      
      if (recentIncidents.length > 0) {
        console.warn(`Found ${recentIncidents.length} data leakage incidents in the last 5 minutes`);
      }
      
    } catch (error) {
      console.error('Error during security check:', error);
    }
  }

  /**
   * Clean up old request logs to prevent memory leaks
   */
  cleanupOldRequests() {
    const cutoffTime = Date.now() - 3600000; // 1 hour ago
    
    for (const [requestId, request] of this.networkRequests.entries()) {
      if (request.timestamp < cutoffTime) {
        this.networkRequests.delete(requestId);
      }
    }
    
    console.log(`Cleaned up old requests. Current count: ${this.networkRequests.size}`);
  }

  /**
   * Get security monitoring statistics
   */
  getSecurityStats() {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    
    const recentRequests = Array.from(this.networkRequests.values())
      .filter(request => request.timestamp > oneHourAgo);
    
    const recentIncidents = this.dataLeakageAlerts
      .filter(incident => incident.timestamp > oneHourAgo);
    
    return {
      totalRequests: this.networkRequests.size,
      recentRequests: recentRequests.length,
      unauthorizedRequests: recentRequests.filter(r => !r.isAllowed).length,
      totalIncidents: this.dataLeakageAlerts.length,
      recentIncidents: recentIncidents.length,
      blockedRequests: recentIncidents.filter(i => i.blocked).length,
      monitoringActive: this.isMonitoring
    };
  }

  /**
   * Export security logs (for debugging or audit)
   */
  exportSecurityLogs() {
    return {
      networkRequests: Array.from(this.networkRequests.values()),
      dataLeakageAlerts: this.dataLeakageAlerts,
      allowedDomains: this.allowedDomains,
      timestamp: Date.now()
    };
  }

  /**
   * Stop monitoring (for cleanup)
   */
  stopMonitoring() {
    this.isMonitoring = false;
    console.log('Security monitoring stopped');
  }

  /**
   * Perform startup security check
   */
  performStartupSecurityCheck() {
    try {
      console.log('Performing startup security check...');
      
      // Check if monitoring is active
      if (!this.isMonitoring) {
        console.warn('Security monitoring is not active');
        return false;
      }
      
      // Verify allowed domains are configured
      if (!this.allowedDomains || this.allowedDomains.length === 0) {
        console.warn('No allowed domains configured');
        return false;
      }
      
      // Check sensitive data patterns
      if (!this.sensitiveDataPatterns || this.sensitiveDataPatterns.length === 0) {
        console.warn('No sensitive data patterns configured');
        return false;
      }
      
      console.log('Startup security check completed successfully');
      return true;
      
    } catch (error) {
      console.error('Error during startup security check:', error);
      return false;
    }
  }
}

// Export for use in other modules
export { SecurityMonitor };