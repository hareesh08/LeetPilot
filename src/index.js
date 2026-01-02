// LeetPilot Main Entry Point
// Comprehensive module exports and application initialization

// Entry points
export { default as backgroundEntry } from './background.js';
export { default as contentEntry } from './content.js';

// Core modules
export * from './core/index.js';

// UI modules  
export * from './ui/index.js';

// Content modules
export * from './content/index.js';

// Background modules
export * from './background/index.js';

// Utilities
export * from './utils/index.js';

// Legacy modules (for backward compatibility)
export { StorageManager as LeetPilotStorage, AIProviderConfig } from './core/storage-manager.js';
export { SecurityMonitor as LeetPilotSecurity } from './core/security-monitor.js';
export { InputValidator as LeetPilotValidator } from './core/input-validator.js';
export { ComprehensiveErrorHandler as LeetPilotErrorHandler } from './core/error-handler.js';

// Application initialization for content scripts
import { ContentOrchestrator } from './content/content-orchestrator.js';
import { logger } from './utils/logger.js';

// Initialize the application
class LeetPilotApp {
  constructor() {
    this.orchestrator = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      logger.info('LeetPilot application initializing...');

      // Check if we're in the right context
      if (typeof window === 'undefined') {
        logger.warn('Not in browser context, skipping content initialization');
        return;
      }

      // Check if we're on LeetCode
      if (!window.location.href.includes('leetcode.com')) {
        logger.info('Not on LeetCode, skipping initialization');
        return;
      }

      // Initialize content orchestrator
      this.orchestrator = new ContentOrchestrator();
      await this.orchestrator.initialize();

      this.initialized = true;
      logger.info('LeetPilot application initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize LeetPilot application', error);
    }
  }

  getOrchestrator() {
    return this.orchestrator;
  }

  isInitialized() {
    return this.initialized;
  }

  async cleanup() {
    if (this.orchestrator) {
      this.orchestrator.cleanup();
    }
    this.initialized = false;
    logger.info('LeetPilot application cleaned up');
  }
}

// Auto-initialize if in browser context
if (typeof window !== 'undefined') {
  const app = new LeetPilotApp();

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.initialize());
  } else {
    app.initialize();
  }

  // Handle page navigation (for SPA behavior)
  let currentUrl = window.location.href;
  const observer = new MutationObserver(() => {
    if (window.location.href !== currentUrl) {
      currentUrl = window.location.href;
      logger.info('Page navigation detected, reinitializing...');
      app.cleanup().then(() => app.initialize());
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Export for global access
  window.LeetPilotApp = app;
}

export { LeetPilotApp };