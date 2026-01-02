// LeetPilot Rate Limiter
// Manages API request rate limiting and throttling

/**
 * Rate Limiter for API requests with automatic cleanup
 */
export class RateLimiter {
  constructor() {
    this.limits = {
      completion: { requests: 10, window: 60000 }, // 10 requests per minute
      explanation: { requests: 5, window: 60000 },  // 5 requests per minute
      optimization: { requests: 5, window: 60000 }, // 5 requests per minute
      hint: { requests: 15, window: 60000 },        // 15 requests per minute
      default: { requests: 20, window: 60000 }      // 20 requests per minute total
    };
    
    this.requestHistory = new Map(); // tabId -> { type -> timestamps[] }
    this.globalHistory = new Map();  // type -> timestamps[]
    
    // Start automatic cleanup
    this.startCleanupTimer();
  }

  /**
   * Start automatic cleanup timer to prevent memory leaks
   */
  startCleanupTimer() {
    // Clean up every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Clean up old entries to prevent memory leaks
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // Keep data for 10 minutes max
    
    // Clean up tab-specific history
    for (const [tabId, tabHistory] of this.requestHistory.entries()) {
      for (const [requestType, timestamps] of tabHistory.entries()) {
        const recentTimestamps = timestamps.filter(ts => now - ts < maxAge);
        if (recentTimestamps.length === 0) {
          tabHistory.delete(requestType);
        } else {
          tabHistory.set(requestType, recentTimestamps);
        }
      }
      
      // Remove empty tab histories
      if (tabHistory.size === 0) {
        this.requestHistory.delete(tabId);
      }
    }
    
    // Clean up global history
    for (const [requestType, timestamps] of this.globalHistory.entries()) {
      const recentTimestamps = timestamps.filter(ts => now - ts < maxAge);
      if (recentTimestamps.length === 0) {
        this.globalHistory.delete(requestType);
      } else {
        this.globalHistory.set(requestType, recentTimestamps);
      }
    }
  }

  /**
   * Clean up data for a specific tab (call when tab is closed)
   */
  cleanupTab(tabId) {
    this.requestHistory.delete(tabId);
  }

  /**
   * Destroy the rate limiter and clean up resources
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.requestHistory.clear();
    this.globalHistory.clear();
  }

  /**
   * Check if request is within rate limits
   */
  async checkLimit(requestType, tabId = 'global') {
    const now = Date.now();
    const limit = this.limits[requestType] || this.limits.default;
    
    // Check per-tab limits
    const tabResult = this.checkTabLimit(requestType, tabId, now, limit);
    if (!tabResult.allowed) {
      return tabResult;
    }
    
    // Check global limits (across all tabs)
    const globalResult = this.checkGlobalLimit(requestType, now, limit);
    if (!globalResult.allowed) {
      return globalResult;
    }
    
    // Record the request
    this.recordRequest(requestType, tabId, now);
    
    return { allowed: true };
  }

  /**
   * Check rate limit for a specific tab
   */
  checkTabLimit(requestType, tabId, now, limit) {
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
        retryAfter: retryAfter,
        reason: 'tab_limit'
      };
    }
    
    return { allowed: true };
  }

  /**
   * Check global rate limit across all tabs
   */
  checkGlobalLimit(requestType, now, limit) {
    // Initialize global history for this request type if needed
    if (!this.globalHistory.has(requestType)) {
      this.globalHistory.set(requestType, []);
    }
    
    const globalTypeHistory = this.globalHistory.get(requestType);
    
    // Clean old entries
    const cutoff = now - limit.window;
    const recentRequests = globalTypeHistory.filter(timestamp => timestamp > cutoff);
    this.globalHistory.set(requestType, recentRequests);
    
    // Apply a higher global limit (2x the per-tab limit)
    const globalLimit = limit.requests * 2;
    
    if (recentRequests.length >= globalLimit) {
      const oldestRequest = Math.min(...recentRequests);
      const retryAfter = Math.ceil((oldestRequest + limit.window - now) / 1000);
      
      return {
        allowed: false,
        retryAfter: retryAfter,
        reason: 'global_limit'
      };
    }
    
    return { allowed: true };
  }

  /**
   * Record a successful request
   */
  recordRequest(requestType, tabId, timestamp) {
    // Record in tab history
    const tabHistory = this.requestHistory.get(tabId);
    const typeHistory = tabHistory.get(requestType);
    typeHistory.push(timestamp);
    
    // Record in global history
    const globalTypeHistory = this.globalHistory.get(requestType);
    globalTypeHistory.push(timestamp);
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(requestType, tabId = 'global') {
    const now = Date.now();
    const limit = this.limits[requestType] || this.limits.default;
    
    // Get tab status
    const tabHistory = this.requestHistory.get(tabId)?.get(requestType) || [];
    const cutoff = now - limit.window;
    const recentTabRequests = tabHistory.filter(timestamp => timestamp > cutoff);
    
    // Get global status
    const globalHistory = this.globalHistory.get(requestType) || [];
    const recentGlobalRequests = globalHistory.filter(timestamp => timestamp > cutoff);
    
    return {
      requestType: requestType,
      tabId: tabId,
      tab: {
        used: recentTabRequests.length,
        limit: limit.requests,
        remaining: Math.max(0, limit.requests - recentTabRequests.length),
        resetTime: recentTabRequests.length > 0 ? 
          Math.min(...recentTabRequests) + limit.window : now
      },
      global: {
        used: recentGlobalRequests.length,
        limit: limit.requests * 2,
        remaining: Math.max(0, (limit.requests * 2) - recentGlobalRequests.length),
        resetTime: recentGlobalRequests.length > 0 ? 
          Math.min(...recentGlobalRequests) + limit.window : now
      }
    };
  }

  /**
   * Clear rate limit history for a tab
   */
  clearTabHistory(tabId) {
    this.requestHistory.delete(tabId);
  }

  /**
   * Clear all rate limit history
   */
  clearAllHistory() {
    this.requestHistory.clear();
    this.globalHistory.clear();
  }

  /**
   * Update rate limits configuration
   */
  updateLimits(newLimits) {
    this.limits = { ...this.limits, ...newLimits };
  }

  /**
   * Get rate limit statistics
   */
  getStatistics() {
    const now = Date.now();
    const stats = {
      totalTabs: this.requestHistory.size,
      requestsByType: new Map(),
      requestsByTab: new Map(),
      recentActivity: new Map()
    };
    
    // Analyze request history
    for (const [tabId, tabHistory] of this.requestHistory.entries()) {
      let tabTotal = 0;
      
      for (const [requestType, timestamps] of tabHistory.entries()) {
        // Count recent requests (last hour)
        const recentCount = timestamps.filter(t => now - t < 3600000).length;
        
        // Update type statistics
        const currentTypeCount = stats.requestsByType.get(requestType) || 0;
        stats.requestsByType.set(requestType, currentTypeCount + recentCount);
        
        tabTotal += recentCount;
      }
      
      stats.requestsByTab.set(tabId, tabTotal);
    }
    
    // Analyze recent activity (last 5 minutes)
    for (const [requestType, timestamps] of this.globalHistory.entries()) {
      const recentCount = timestamps.filter(t => now - t < 300000).length;
      stats.recentActivity.set(requestType, recentCount);
    }
    
    return {
      totalTabs: stats.totalTabs,
      requestsByType: Object.fromEntries(stats.requestsByType),
      requestsByTab: Object.fromEntries(stats.requestsByTab),
      recentActivity: Object.fromEntries(stats.recentActivity),
      limits: this.limits
    };
  }

  /**
   * Cleanup old request history to prevent memory leaks
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour
    
    // Clean tab history
    for (const [tabId, tabHistory] of this.requestHistory.entries()) {
      for (const [requestType, timestamps] of tabHistory.entries()) {
        const recentTimestamps = timestamps.filter(t => now - t < maxAge);
        if (recentTimestamps.length === 0) {
          tabHistory.delete(requestType);
        } else {
          tabHistory.set(requestType, recentTimestamps);
        }
      }
      
      // Remove empty tab histories
      if (tabHistory.size === 0) {
        this.requestHistory.delete(tabId);
      }
    }
    
    // Clean global history
    for (const [requestType, timestamps] of this.globalHistory.entries()) {
      const recentTimestamps = timestamps.filter(t => now - t < maxAge);
      if (recentTimestamps.length === 0) {
        this.globalHistory.delete(requestType);
      } else {
        this.globalHistory.set(requestType, recentTimestamps);
      }
    }
  }

  /**
   * Check if a request type is currently throttled
   */
  isThrottled(requestType, tabId = 'global') {
    const status = this.getRateLimitStatus(requestType, tabId);
    return status.tab.remaining === 0 || status.global.remaining === 0;
  }

  /**
   * Get time until rate limit resets
   */
  getTimeUntilReset(requestType, tabId = 'global') {
    const status = this.getRateLimitStatus(requestType, tabId);
    const now = Date.now();
    
    const tabReset = Math.max(0, status.tab.resetTime - now);
    const globalReset = Math.max(0, status.global.resetTime - now);
    
    return Math.max(tabReset, globalReset);
  }
}