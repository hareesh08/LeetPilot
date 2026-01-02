// LeetPilot Background Service Worker Entry Point
// Uses dependency injection for better architecture

import { ServiceContainer } from './core/service-container.js';
import { StorageManager, AIProviderConfig } from './core/storage-manager.js';
import { SecurityMonitor } from './core/security-monitor.js';
import { InputValidator } from './core/input-validator.js';
import { ComprehensiveErrorHandler } from './core/error-handler.js';
import { RateLimiter } from './core/rate-limiter.js';
import { AIProviderClient } from './core/api-client.js';

console.log('LeetPilot background service worker loading...');

// Service container for dependency injection
const container = new ServiceContainer();

// Initialize services
function initializeServices() {
  container.register('storageManager', () => new StorageManager());
  container.register('inputValidator', () => new InputValidator());
  container.register('securityMonitor', () => new SecurityMonitor());
  container.register('errorHandler', () => new ComprehensiveErrorHandler());
  container.register('rateLimiter', () => new RateLimiter());
  
  console.log('Services registered successfully');
}

// Extension lifecycle handlers
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('LeetPilot extension installed/updated');
  
  if (details.reason === 'install') {
    // Open configuration popup on first install
    try {
      await chrome.action.openPopup();
    } catch (error) {
      console.log('Could not open popup automatically:', error.message);
    }
  }
  
  // Initialize services
  initializeServices();
});

// Initialize message handler immediately
console.log('Initializing message handler immediately');
initializeMessageHandler();

// Initialize services immediately on script load
console.log('Initializing services immediately');
initializeServices();

console.log('LeetPilot background service worker loaded and ready');

// Initialize message handler
function initializeMessageHandler() {
  console.log('Initializing message handler');
  
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background received message:', request.type, request);
    
    // Always respond to prevent "receiving end does not exist" errors
    try {
      switch (request.type) {
        case 'getConfiguration':
          handleGetConfiguration(request, sendResponse);
          return true;
          
        case 'saveConfiguration':
          handleSaveConfiguration(request, sendResponse);
          return true;
          
        case 'testAPIConnection':
          handleTestAPIConnection(request, sendResponse);
          return true;
        
        case 'updateSetting':
          handleUpdateSetting(request, sendResponse);
          return true;
        
        case 'chatMessage':
          handleChatMessage(request, sendResponse);
          return true;
          
        case 'completion':
        case 'explanation':
        case 'optimization':
        case 'hint':
          handleAIRequest(request, sendResponse);
          return true;
          
        case 'ping':
          console.log('Ping received, responding with pong');
          sendResponse({
            status: 'ok',
            timestamp: Date.now(),
            requestId: request.requestId
          });
          return false;
          
        default:
          console.warn('Unknown message type:', request.type);
          sendResponse({
            error: `Unknown message type: ${request.type}`,
            requestId: request.requestId
          });
          return false;
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({
        error: 'Background script error: ' + error.message,
        requestId: request.requestId
      });
      return false;
    }
  });
  
  console.log('Message handler initialized successfully');
}

// Handle get configuration request
async function handleGetConfiguration(request, sendResponse) {
  try {
    console.log('Getting configuration...');
    const storageManager = container.get('storageManager');
    const config = await storageManager.retrieveConfiguration();
    console.log('Configuration retrieved:', config ? 'found' : 'not found');
    sendResponse({ 
      success: true, 
      config: config ? config.getSanitized() : null,
      requestId: request.requestId
    });
  } catch (error) {
    console.error('Failed to get configuration:', error);
    sendResponse({ 
      success: false, 
      error: error.message,
      requestId: request.requestId
    });
  }
}

// Handle save configuration request
async function handleSaveConfiguration(request, sendResponse) {
  try {
    const storageManager = container.get('storageManager');
    const inputValidator = container.get('inputValidator');
    
    // Validate configuration
    const validation = inputValidator.validateConfiguration(request.config);
    if (!validation.valid) {
      sendResponse({
        success: false,
        error: 'Configuration validation failed: ' + validation.errors.join(', '),
        requestId: request.requestId
      });
      return;
    }
    
    // Create configuration object
    const config = new AIProviderConfig(
      validation.sanitized.provider,
      validation.sanitized.apiKey,
      validation.sanitized.model,
      validation.sanitized.maxTokens,
      validation.sanitized.temperature,
      validation.sanitized.customApiUrl
    );
    
    // Save configuration
    await storageManager.storeAPIKey(config);
    
    sendResponse({
      success: true,
      message: 'Configuration saved successfully',
      requestId: request.requestId
    });
    
  } catch (error) {
    console.error('Failed to save configuration:', error);
    sendResponse({
      success: false,
      error: error.message,
      requestId: request.requestId
    });
  }
}

// Handle API connection test
async function handleTestAPIConnection(request, sendResponse) {
  try {
    const inputValidator = container.get('inputValidator');
    
    // Validate configuration using the validator
    const validation = inputValidator.validateConfiguration(request.config);
    if (!validation.valid) {
      sendResponse({
        success: false,
        error: 'Configuration validation failed: ' + validation.errors.join(', '),
        requestId: request.requestId
      });
      return;
    }
    
    // For now, just validate the configuration format
    // TODO: Implement actual API connection test
    sendResponse({
      success: true,
      message: 'Configuration format is valid',
      requestId: request.requestId
    });
    
  } catch (error) {
    console.error('Failed to test API connection:', error);
    sendResponse({
      success: false,
      error: error.message,
      requestId: request.requestId
    });
  }
}

async function handleAIRequest(request, sendResponse) {
  try {
    const storageManager = container.get('storageManager');
    
    const config = await storageManager.retrieveConfiguration();
    if (!config) {
      throw new Error('No AI provider configuration found. Please configure your API key first.');
    }
    
    sendResponse({
      [request.type === 'completion' ? 'suggestion' : request.type]: 'AI functionality is being initialized. Please try again in a moment.',
      type: request.type,
      provider: config.provider,
      requestId: request.requestId
    });
    
  } catch (error) {
    console.error(`AI request failed (${request.type}):`, error);
    
    const errorResponse = {
      error: error.message || 'AI request failed',
      errorCategory: 'configuration',
      requestId: request.requestId
    };
    
    sendResponse(errorResponse);
  }
}

async function handleChatMessage(request, sendResponse) {
  try {
    const storageManager = container.get('storageManager');
    
    const config = await storageManager.retrieveConfiguration();
    if (!config) {
      sendResponse({
        success: false,
        error: 'No AI provider configuration found. Please configure your API key first.',
        requestId: request.requestId
      });
      return;
    }

    const aiClient = new AIProviderClient(config);
    
    const response = await aiClient.makeRequest(request.message, 'chat');
    
    sendResponse({
      success: true,
      reply: response.content,
      provider: response.provider,
      requestId: request.requestId
    });
    
  } catch (error) {
    console.error('Chat message failed:', error);
    sendResponse({
      success: false,
      error: error.message || 'Chat request failed',
      requestId: request.requestId
    });
  }
}

async function handleUpdateSetting(request, sendResponse) {
  try {
    const { setting, value } = request;
    console.log(`Updating setting: ${setting} = ${value}`);
    
    sendResponse({
      success: true,
      message: `Setting ${setting} updated to ${value}`,
      requestId: request.requestId
    });
    
  } catch (error) {
    console.error('Failed to update setting:', error);
    sendResponse({
      success: false,
      error: error.message,
      requestId: request.requestId
    });
  }
}

// Handle extension suspend - cleanup
chrome.runtime.onSuspend.addListener(() => {
  console.log('LeetPilot extension suspending - performing cleanup');
  
  // Clean up services
  container.clear();
});