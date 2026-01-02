// LeetPilot Request Orchestrator
// Orchestrates AI requests with queuing, rate limiting, and context management

/**
 * Request Orchestration System
 * Handles message passing, queuing, rate limiting, and context management
 */
export class RequestOrchestrator {
  constructor() {
    this.requestQueue = [];
    this.activeRequests = new Map();
    this.contextManager = new ContextManager();
    this.requestId = 0;
    
    this.isInitialized = false;
  }

  /**
   * Initialize the request orchestrator
   */
  initialize(backgroundService) {
    if (this.isInitialized) return;
    
    this.backgroundService = backgroundService;
    
    this.isInitialized = true;
    console.log('Request orchestrator initialized');
  }

  /**
   * Get orchestrator statistics
   */
  getStats() {
    return {
      isInitialized: this.isInitialized,
      queueLength: this.requestQueue.length,
      activeRequests: this.activeRequests.size,
      totalRequests: this.requestId
    };
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.requestQueue = [];
    this.activeRequests.clear();
    this.requestId = 0;
    this.isInitialized = false;
    
    console.log('Request orchestrator cleaned up');
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