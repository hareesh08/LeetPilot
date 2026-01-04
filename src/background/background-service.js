// LeetPilot Background Service
// Main background service worker that coordinates all background functionality

import { MessageRouter } from './message-router.js';
import { RequestOrchestrator } from './request-orchestrator.js';
import { StorageManager, AIProviderConfig } from '../core/storage-manager.js';
import { SecurityMonitor } from '../core/security-monitor.js';
import { InputValidator } from '../core/input-validator.js';
import { ComprehensiveErrorHandler } from '../core/error-handler.js';

/**
 * Background Service
 * Main background service worker that coordinates all background functionality
 */
class BackgroundService {
  constructor() {
    this.isInitialized = false;
    
    // Core services
    this.messageRouter = new MessageRouter();
    this.requestOrchestrator = new RequestOrchestrator();
    
    // Managers (will be loaded dynamically)
    this.storageManager = null;
    this.securityMonitor = null;
    this.inputValidator = null;
    this.errorHandler = null;
    
    // AI components (will be loaded dynamically)
    this.promptEngineer = null;
    this.aiClient = null;
    
    this.initialize();
  }

  /**
   * Initialize the background service
   */
  async initialize() {
    if (this.isInitialized) return;
    
    console.log('LeetPilot background service initializing...');
    
    try {
      // Load required modules dynamically
      await this.loadModules();
      
      // Initialize core managers
      await this.initializeManagers();
      
      // Initialize routing and orchestration
      this.messageRouter.initialize(this);
      this.requestOrchestrator.initialize(this);
      
      // Setup service event handlers
      this.setupServiceHandlers();
      
      // Setup extension lifecycle handlers
      this.setupLifecycleHandlers();
      
      this.isInitialized = true;
      console.log('LeetPilot background service initialized successfully');
      
    } catch (error) {
      console.error('Error initializing background service:', error);
    }
  }

  /**
   * Load required modules dynamically
   */
  async loadModules() {
    try {
      // Load core modules
      const [
        { PromptEngineer },
        { AIProviderClient }
      ] = await Promise.all([
        import('../core/prompt-engineer.js'),
        import('../core/api-client.js')
      ]);
      
      this.promptEngineer = new PromptEngineer();
      this.AIProviderClient = AIProviderClient;
      
      console.log('Core modules loaded successfully');
    } catch (error) {
      console.error('Error loading core modules:', error);
      throw error;
    }
  }

  /**
   * Initialize core managers
   */
  async initializeManagers() {
    try {
      // Initialize storage and helper managers using ES modules
      this.storageManager = new StorageManager();
      console.log('Storage manager initialized');

      this.securityMonitor = new SecurityMonitor();
      console.log('Security monitor initialized');

      this.inputValidator = new InputValidator();
      console.log('Input validator initialized');

      this.errorHandler = new ComprehensiveErrorHandler();
      console.log('Error handler initialized');
    } catch (error) {
      console.error('Error initializing managers:', error);
    }
  }

  /**
   * Setup service event handlers
   */
  setupServiceHandlers() {
    // Listen for service events from message router
    document.addEventListener('leetpilot-service-ai', (event) => {
      this.handleAIRequest(event.detail.request, event.detail.sendResponse);
    });
    
    document.addEventListener('leetpilot-service-config', (event) => {
      this.handleConfigRequest(event.detail.request, event.detail.sendResponse);
    });
    
    document.addEventListener('leetpilot-service-security', (event) => {
      this.handleSecurityRequest(event.detail.request, event.detail.sendResponse);
    });
    
    document.addEventListener('leetpilot-service-system', (event) => {
      this.handleSystemRequest(event.detail.request, event.detail.sendResponse);
    });
  }

  /**
   * Setup extension lifecycle handlers
   */
  setupLifecycleHandlers() {
    // Handle extension install/update
    chrome.runtime.onInstalled.addListener((details) => {
      if (details.reason === 'install') {
        console.log('LeetPilot extension installed');
        // Open configuration popup on first install
        chrome.action.openPopup();
      }
    });

    // Handle extension suspend - secure cleanup
    chrome.runtime.onSuspend.addListener(() => {
      console.log('Extension suspending - performing secure cleanup');
      this.performSecureCleanup();
    });
  }

  /**
   * Check if a feature is enabled in settings
   */
  async isFeatureEnabled(featureName) {
    try {
      const settingsKey = 'leetpilot_settings';
      const result = await chrome.storage.local.get(settingsKey);
      const settings = result[settingsKey] || {};
      
      // Default to true if setting doesn't exist (for backward compatibility)
      return settings[featureName] !== false;
    } catch (error) {
      console.error('Error checking feature setting:', error);
      return true; // Default to enabled on error
    }
  }

  /**
   * Handle AI requests (completion, explanation, optimization, hint)
   */
  async handleAIRequest(request, sendResponse) {
    try {
      console.log('Handling AI request:', request.type);
      
      // Check if the feature is enabled (only for auto-triggered requests)
      if (request.isAutoTriggered) {
        const featureMap = {
          'completion': 'autoComplete',
          'hint': 'autoHint',
          'explanation': 'autoErrorFix',
          'optimization': 'autoOptimize'
        };
        
        const featureName = featureMap[request.type];
        if (featureName) {
          const isEnabled = await this.isFeatureEnabled(featureName);
          if (!isEnabled) {
            console.log(`Feature ${featureName} is disabled, skipping request`);
            sendResponse({
              success: false,
              skipped: true,
              message: `${request.type} is currently disabled in settings`,
              requestId: request.requestId
            });
            return;
          }
        }
      }
      
      // Check if modules are loaded
      if (!this.promptEngineer || !this.AIProviderClient) {
        throw new Error('AI modules not loaded');
      }
      
      // Get configuration
      if (!this.storageManager) {
        throw new Error('Storage manager not initialized');
      }
      
      const config = await this.storageManager.retrieveConfiguration();
      if (!config) {
        const error = new Error('No AI provider configuration found. Please configure your API key first.');
        error.category = 'configuration';
        throw error;
      }

      // Create AI client and make request
      const aiClient = new this.AIProviderClient(config);
      let prompt;
      
      switch (request.type) {
        case 'completion':
          prompt = this.promptEngineer.createCompletionPrompt(request);
          break;
        case 'explanation':
          prompt = this.promptEngineer.createExplanationPrompt(request);
          break;
        case 'optimization':
          prompt = this.promptEngineer.createOptimizationPrompt(request);
          break;
        case 'hint':
          prompt = this.promptEngineer.createProgressiveHintPrompt(
            request, 
            request.hintLevel || 1, 
            request.hintContext
          );
          break;
        case 'chatMessage':
          prompt = request.message;
          break;
        default:
          throw new Error(`Unknown AI request type: ${request.type}`);
      }
      
      const response = await aiClient.makeRequest(prompt, request.type);
      
      // Track output tokens and check budget
      const outputTokens = response.outputTokens || 0;
      await this.trackOutputTokens(outputTokens);
      
      const filteredResponse = this.promptEngineer.filterResponse(response.content, request.type);
      const sanitizedContent = this.promptEngineer.sanitizeContent(filteredResponse.content);
      
      if (request.type === 'chatMessage') {
        sendResponse({
          success: true,
          reply: sanitizedContent,
          provider: response.provider,
          requestId: request.requestId
        });
      } else {
        const responseKey = request.type === 'completion' ? 'suggestion' : request.type;
        sendResponse({
          [responseKey]: sanitizedContent,
          type: request.type,
          provider: response.provider,
          filtered: filteredResponse.filtered,
          filterReason: filteredResponse.reason,
          requestId: request.requestId
        });
      }
      
    } catch (error) {
      console.error(`AI request failed (${request.type}):`, error);
      
      // Use error handler if available
      if (this.errorHandler) {
        const errorResponse = this.errorHandler.createErrorResponse(
          error, 
          request.requestId, 
          { type: request.type, provider: request.provider }
        );
        sendResponse(errorResponse);
      } else {
        // Fallback error response
        sendResponse({
          error: error.message || 'AI request failed',
          errorCategory: error.category || 'unknown',
          requestId: request.requestId
        });
      }
    }
  }

  /**
   * Handle configuration requests
   */
  async handleConfigRequest(request, sendResponse) {
    try {
      switch (request.type) {
        case 'getConfiguration':
          await this.handleGetConfiguration(sendResponse);
          break;
        case 'saveConfiguration':
          await this.handleSaveConfiguration(request, sendResponse);
          break;
        case 'testAPIConnection':
          await this.handleTestAPIConnection(request, sendResponse);
          break;
        case 'updateSetting':
          await this.handleUpdateSetting(request, sendResponse);
          break;
        case 'getSettings':
          await this.handleGetSettings(sendResponse);
          break;
        default:
          sendResponse({
            error: `Unknown config request: ${request.type}`,
            errorCategory: 'validation',
            requestId: request.requestId
          });
      }
    } catch (error) {
      console.error('Config request failed:', error);
      sendResponse({
        error: error.message || 'Configuration request failed',
        errorCategory: 'config',
        requestId: request.requestId
      });
    }
  }

  /**
   * Handle get configuration request
   * Returns full config with apiKey for internal use (popup) and sanitized for external
   */
  async handleGetConfiguration(sendResponse) {
    try {
      if (!this.storageManager) {
        throw new Error('Storage manager not initialized');
      }
      
      const config = await this.storageManager.retrieveConfiguration();
      if (!config) {
        sendResponse({
          success: true,
          config: null
        });
        return;
      }
      
      // Get tokenTotalBudget from storage (stored separately)
      const storageResult = await chrome.storage.local.get(['tokenTotalBudget']);
      const tokenTotalBudget = storageResult.tokenTotalBudget;
      
      // Return full config with apiKey for internal use (popup)
      // Also include tokenTotalBudget which is stored separately
      sendResponse({
        success: true,
        config: {
          provider: config.provider,
          apiKey: config.apiKey,  // Include actual API key for internal use
          model: config.model,
          maxTokens: config.maxTokens,
          temperature: config.temperature,
          customApiUrl: config.customApiUrl,
          tokenTotalBudget: tokenTotalBudget ?? config.tokenTotalBudget,
          timestamp: config.timestamp
        }
      });
    } catch (error) {
      console.error('Failed to get configuration:', error);
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Handle save configuration request
   */
  async handleSaveConfiguration(request, sendResponse) {
    try {
      if (!this.storageManager) {
        throw new Error('Storage manager not initialized');
      }
      
      const config = request.config;
      if (!config) {
        sendResponse({ 
          success: false, 
          error: 'No configuration provided' 
        });
        return;
      }

      // Create configuration object
      const configObj = new AIProviderConfig(
        config.provider,
        config.apiKey,
        config.model,
        config.maxTokens,
        config.temperature,
        config.customApiUrl,
        config.tokenTotalBudget
      );
      
      // Validate the configuration
      const validationErrors = configObj.validate();
      if (validationErrors.length > 0) {
        sendResponse({ 
          success: false, 
          error: 'Configuration validation failed: ' + validationErrors.join(', ')
        });
        return;
      }

      // Store the configuration
      await this.storageManager.storeAPIKey(configObj);
      
      // Also store tokenTotalBudget separately for easy access
      // Always save tokenTotalBudget to ensure it's properly tracked
      // null/undefined means no limit, 0 also means no limit
      await chrome.storage.local.set({ tokenTotalBudget: config.tokenTotalBudget ?? null });
      
      sendResponse({
        success: true,
        message: 'Configuration saved successfully'
      });

    } catch (error) {
      console.error('Failed to save configuration:', error);
      sendResponse({ 
        success: false, 
        error: error.message 
      });
    }
  }

  /**
   * Handle API connection test request
   */
  async handleTestAPIConnection(request, sendResponse) {
    try {
      if (!this.storageManager) {
        throw new Error('Storage manager not initialized');
      }
      
      if (!this.AIProviderClient) {
        throw new Error('AI client not loaded');
      }
      
      const config = request.config;
      if (!config) {
        sendResponse({ 
          success: false, 
          error: 'No configuration provided' 
        });
        return;
      }

      const configObj = new AIProviderConfig(
        config.provider,
        config.apiKey,
        config.model,
        config.maxTokens,
        config.temperature,
        config.customApiUrl,
        config.tokenTotalBudget
      );
      
      const validationErrors = configObj.validate();
      if (validationErrors.length > 0) {
        sendResponse({ 
          success: false, 
          error: 'Configuration validation failed: ' + validationErrors.join(', ')
        });
        return;
      }

      const aiClient = new this.AIProviderClient(configObj);
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

  async handleUpdateSetting(request, sendResponse) {
    try {
      const { setting, value } = request;
      console.log(`Updating setting: ${setting} = ${value}`);
      
      // Store setting in chrome.storage.local
      const settingsKey = 'leetpilot_settings';
      const currentSettings = await chrome.storage.local.get(settingsKey);
      const settings = currentSettings[settingsKey] || {};
      
      settings[setting] = value;
      
      await chrome.storage.local.set({ [settingsKey]: settings });
      
      sendResponse({ 
        success: true, 
        message: `Setting ${setting} updated to ${value}` 
      });

    } catch (error) {
      console.error('Failed to update setting:', error);
      sendResponse({ 
        success: false, 
        error: error.message 
      });
    }
  }

  async handleGetSettings(sendResponse) {
    try {
      const settingsKey = 'leetpilot_settings';
      const result = await chrome.storage.local.get(settingsKey);
      const settings = result[settingsKey] || {};
      
      sendResponse({ 
        success: true, 
        settings: settings 
      });

    } catch (error) {
      console.error('Failed to get settings:', error);
      sendResponse({ 
        success: false, 
        error: error.message 
      });
    }
  }

  /**
   * Handle security requests
   */
  async handleSecurityRequest(request, sendResponse) {
    try {
      if (!this.securityMonitor) {
        sendResponse({
          success: false,
          error: 'Security monitor not initialized',
          requestId: request.requestId
        });
        return;
      }
      
      const stats = this.securityMonitor.getSecurityStats();
      
      sendResponse({
        success: true,
        securityStats: stats,
        requestId: request.requestId
      });
      
    } catch (error) {
      console.error('Security status request failed:', error);
      sendResponse({
        error: error.message || 'Security request failed',
        errorCategory: 'security',
        requestId: request.requestId
      });
    }
  }

  /**
   * Handle system requests
   */
  async handleSystemRequest(request, sendResponse) {
    try {
      switch (request.type) {
        case 'ping':
          sendResponse({
            status: 'ok',
            timestamp: Date.now(),
            requestId: request.requestId
          });
          break;
          
        case 'getStats':
          sendResponse({
            stats: this.getStats(),
            requestId: request.requestId
          });
          break;
          
        default:
          sendResponse({
            error: `Unknown system request: ${request.type}`,
            errorCategory: 'validation',
            requestId: request.requestId
          });
      }
    } catch (error) {
      console.error('Error in system request:', error);
      sendResponse({
        error: 'Failed to process system request',
        errorCategory: 'unknown',
        requestId: request.requestId
      });
    }
  }

  /**
   * Track output tokens from API responses
   */
  async trackOutputTokens(outputTokens) {
    try {
      if (outputTokens <= 0) return;

      // Get current token count
      const result = await chrome.storage.local.get(['outputTokenCount', 'tokenTotalBudget']);
      const currentCount = result.outputTokenCount || 0;
      const totalBudget = result.tokenTotalBudget || 0;

      // Update token count
      const newCount = currentCount + outputTokens;
      await chrome.storage.local.set({ outputTokenCount: newCount });

      // Increment request count
      const requestResult = await chrome.storage.local.get(['requestCount']);
      const requestCount = (requestResult.requestCount || 0) + 1;
      await chrome.storage.local.set({ requestCount: requestCount });

      // Check budget warnings
      if (totalBudget > 0) {
        const percentUsed = (newCount / totalBudget) * 100;
        
        if (percentUsed >= 100) {
          // Budget exceeded - send warning but allow request to proceed
          console.warn(`Token budget exceeded: ${percentUsed.toFixed(1)}% used`);
        } else if (percentUsed >= 90) {
          // 90% - Red warning
          await this.sendTokenWarning('red', percentUsed, newCount, totalBudget);
        } else if (percentUsed >= 70) {
          // 70% - Yellow warning
          await this.sendTokenWarning('yellow', percentUsed, newCount, totalBudget);
        } else if (percentUsed >= 50) {
          // 50% - Green warning
          await this.sendTokenWarning('green', percentUsed, newCount, totalBudget);
        }
      }
    } catch (error) {
      console.error('Error tracking output tokens:', error);
    }
  }

  /**
   * Send token warning to popup
   */
  async sendTokenWarning(level, percent, used, total) {
    try {
      // Store warning info for popup to read
      await chrome.storage.local.set({
        tokenWarning: {
          level: level,
          percent: percent,
          used: used,
          total: total,
          timestamp: Date.now()
        }
      });

      // Send message to any open popup
      chrome.runtime.sendMessage({
        type: 'tokenWarning',
        warning: {
          level: level,
          percent: percent,
          used: used,
          total: total
        }
      }).catch(() => {
        // Popup may not be open, ignore
      });
    } catch (error) {
      console.error('Error sending token warning:', error);
    }
  }

  /**
   * Get current token stats
   */
  async getTokenStats() {
    try {
      const result = await chrome.storage.local.get([
        'outputTokenCount',
        'tokenTotalBudget',
        'requestCount'
      ]);
      
      return {
        usedTokens: result.outputTokenCount || 0,
        totalBudget: result.tokenTotalBudget || 0,
        requestCount: result.requestCount || 0,
        percentUsed: result.tokenTotalBudget > 0
          ? ((result.outputTokenCount || 0) / result.tokenTotalBudget) * 100
          : 0
      };
    } catch (error) {
      console.error('Error getting token stats:', error);
      return {
        usedTokens: 0,
        totalBudget: 0,
        requestCount: 0,
        percentUsed: 0
      };
    }
  }

  /**
   * Clear token stats
   */
  async clearTokenStats() {
    try {
      await chrome.storage.local.set({
        outputTokenCount: 0,
        requestCount: 0
      });
      console.log('Token stats cleared');
    } catch (error) {
      console.error('Error clearing token stats:', error);
    }
  }

  /**
   * Perform secure cleanup on extension uninstall/suspend
   */
  async performSecureCleanup() {
    try {
      console.log('Starting secure cleanup process...');
      
      // Stop security monitoring
      if (this.securityMonitor) {
        this.securityMonitor.stopMonitoring();
      }
      
      // Clear sensitive data from storage manager
      if (this.storageManager) {
        await this.storageManager.clearUserData();
        console.log('User data cleared from storage');
      }
      
      // Clear any cached data in memory
      this.clearMemoryCache();
      
      console.log('Secure cleanup completed');
    } catch (error) {
      console.error('Error during secure cleanup:', error);
    }
  }

  /**
   * Clear sensitive data from memory
   */
  clearMemoryCache() {
    try {
      // Clear request orchestrator caches
      if (this.requestOrchestrator) {
        this.requestOrchestrator.cleanup();
      }
      
      // Clear message router
      if (this.messageRouter) {
        this.messageRouter.cleanup();
      }
      
      console.log('Memory cache cleared');
    } catch (error) {
      console.error('Error clearing memory cache:', error);
    }
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      isInitialized: this.isInitialized,
      components: {
        messageRouter: this.messageRouter ? this.messageRouter.getStats() : null,
        requestOrchestrator: this.requestOrchestrator ? this.requestOrchestrator.getStats() : null,
        storageManager: this.storageManager ? 'initialized' : 'not available',
        securityMonitor: this.securityMonitor ? 'initialized' : 'not available',
        inputValidator: this.inputValidator ? 'initialized' : 'not available',
        errorHandler: this.errorHandler ? 'initialized' : 'not available'
      },
      timestamp: Date.now()
    };
  }

  /**
   * Cleanup all resources
   */
  cleanup() {
    console.log('Cleaning up background service...');
    
    // Cleanup components
    if (this.requestOrchestrator) {
      this.requestOrchestrator.cleanup();
    }
    
    if (this.messageRouter) {
      this.messageRouter.cleanup();
    }
    
    if (this.securityMonitor) {
      this.securityMonitor.stopMonitoring();
    }
    
    // Reset state
    this.isInitialized = false;
    
    console.log('Background service cleaned up');
  }
}

// Initialize the background service
console.log('LeetPilot background service worker loaded');

// In a Manifest V3 service worker we use ES modules directly,
// so we can instantiate the background service immediately.
const backgroundService = new BackgroundService();

// Expose for debugging/tests (service worker global scope)
self.leetPilotBackgroundService = backgroundService;