// LeetPilot Background Service Worker Entry Point
// Uses dependency injection for better architecture

import { ServiceContainer } from './core/service-container.js';
import { StorageManager, AIProviderConfig } from './core/storage-manager.js';
import { SecurityMonitor } from './core/security-monitor.js';
import { InputValidator } from './core/input-validator.js';
import { ComprehensiveErrorHandler } from './core/error-handler.js';
import { RateLimiter } from './core/rate-limiter.js';
import { AIProviderClient } from './core/api-client.js';
import { PromptEngineer } from './core/prompt-engineer.js';

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
  container.register('promptEngineer', () => new PromptEngineer());
  
  console.log('Services registered successfully');
}

// Command name mapping
const COMMAND_ACTION_MAP = {
  'trigger-completion': 'completion',
  'trigger-explanation': 'explanation',
  'trigger-optimization': 'optimization',
  'trigger-hint': 'hint'
};

// Extension lifecycle handlers
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('LeetPilot extension installed/updated');
  
  if (details.reason === 'install') {
    try {
      await chrome.action.openPopup();
    } catch (error) {
      console.log('Could not open popup automatically:', error.message);
    }

    await chrome.storage.local.set({
      requestCount: 0,
      tokenCount: 0,
      sessionCount: 0
    });
  }
  
  await incrementSessionCount();
  
  initializeServices();
});

// Initialize message handler immediately
console.log('Initializing message handler immediately');
initializeMessageHandler();

// Initialize services immediately on script load
console.log('Initializing services immediately');
initializeServices();

console.log('LeetPilot background service worker loaded and ready');

// Initialize commands listener for keyboard shortcuts
initializeCommandsListener();

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

// Track content script readiness per tab
const contentScriptReady = new Map();

// Initialize commands listener for manifest-defined keyboard shortcuts
function initializeCommandsListener() {
  console.log('Initializing commands listener');
  
  chrome.commands.onCommand.addListener(async (command) => {
    console.log('Command received:', command);
    
    const action = COMMAND_ACTION_MAP[command];
    if (!action) {
      console.warn('Unknown command:', command);
      return;
    }
    
    // Get the active tab and send message to content script
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab && tab.id && tab.url && tab.url.includes('leetcode.com')) {
        console.log('Sending action to content script:', action);
        
        // Check if content script is ready
        if (contentScriptReady.get(tab.id)) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'trigger-shortcut',
            action: action
          }).catch(error => {
            console.warn('Content script not responding:', error.message);
            contentScriptReady.delete(tab.id);
          });
        } else {
          console.log('Content script not ready on tab', tab.id);
          // Try to send anyway - it might be in the process of loading
          chrome.tabs.sendMessage(tab.id, {
            type: 'trigger-shortcut',
            action: action
          }).catch(error => {
            console.warn('Failed to send message to content script:', error.message);
          });
        }
      } else {
        console.log('Not on LeetCode tab, ignoring command');
      }
    } catch (error) {
      console.error('Error handling command:', error);
    }
  });
  
  console.log('Commands listener initialized');
}

// Listen for content script ready messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'contentScriptReady') {
    console.log('Content script ready on tab:', sender.tab?.id);
    if (sender.tab?.id) {
      contentScriptReady.set(sender.tab.id, true);
    }
    return false;
  }
  return undefined;
});

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
    const promptEngineer = container.get('promptEngineer') || new PromptEngineer();
    
    const config = await storageManager.retrieveConfiguration();
    if (!config) {
      throw new Error('No AI provider configuration found. Please configure your API key first.');
    }

    await incrementRequestCount();
    
    // Create AI client and generate prompt
    const aiClient = new AIProviderClient(config);
    let prompt;
    
    switch (request.type) {
      case 'completion':
        prompt = promptEngineer.createCompletionPrompt(request);
        break;
      case 'explanation':
        prompt = promptEngineer.createExplanationPrompt(request);
        break;
      case 'optimization':
        prompt = promptEngineer.createOptimizationPrompt(request);
        break;
      case 'hint':
        prompt = promptEngineer.createProgressiveHintPrompt(
          request,
          request.hintLevel || 1,
          request.hintContext
        );
        break;
      default:
        throw new Error(`Unknown AI request type: ${request.type}`);
    }
    
    // Make the actual API request
    const response = await aiClient.makeRequest(prompt, request.type);
    
    // Filter and sanitize the response
    const filteredResponse = promptEngineer.filterResponse(response.content, request.type);
    const sanitizedContent = promptEngineer.sanitizeContent(filteredResponse.content);
    
    await incrementTokenCount(response.usage?.total_tokens || 100);
    
    sendResponse({
      [request.type === 'completion' ? 'suggestion' : request.type]: sanitizedContent,
      type: request.type,
      provider: response.provider,
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

    await incrementRequestCount();

    const aiClient = new AIProviderClient(config);
    
    const response = await aiClient.makeRequest(request.message, 'chat');
    
    await incrementTokenCount(response.usage?.total_tokens || 100);
    
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

async function incrementRequestCount() {
  try {
    const result = await chrome.storage.local.get(['requestCount']);
    const newCount = (result.requestCount || 0) + 1;
    await chrome.storage.local.set({ requestCount: newCount });
  } catch (error) {
    console.error('Failed to increment request count:', error);
  }
}

async function incrementTokenCount(tokens) {
  try {
    const result = await chrome.storage.local.get(['tokenCount']);
    const newCount = (result.tokenCount || 0) + tokens;
    await chrome.storage.local.set({ tokenCount: newCount });
  } catch (error) {
    console.error('Failed to increment token count:', error);
  }
}

async function incrementSessionCount() {
  try {
    const result = await chrome.storage.local.get(['sessionCount']);
    const newCount = (result.sessionCount || 0) + 1;
    await chrome.storage.local.set({ sessionCount: newCount });
  } catch (error) {
    console.error('Failed to increment session count:', error);
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