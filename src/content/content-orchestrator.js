// LeetPilot Content Script Orchestrator
// Main coordinator for content script functionality

import { MonacoDetector } from './monaco-detector.js';
import { EditorIntegration } from './editor-integration.js';
import { KeyboardHandler } from './keyboard-handler.js';

export class ContentOrchestrator {
  constructor() {
    this.monacoDetector = new MonacoDetector();
    this.editorIntegration = null;
    this.keyboardHandler = new KeyboardHandler();
    this.isInitialized = false;
  }

  /**
   * Initialize the content script orchestrator
   */
  async initialize() {
    if (this.isInitialized) return;
    
    console.log('LeetPilot content orchestrator initializing...');
    
    if (!window.location.href.includes('leetcode.com')) {
      console.log('Not on LeetCode, skipping initialization');
      return;
    }
    
    try {
      const editor = await this.monacoDetector.detectMonacoEditor();
      
      if (editor) {
        this.editorIntegration = new EditorIntegration(editor);
        await this.editorIntegration.initialize();
        
        this.setupShortcutListener();
        
        this.isInitialized = true;
        console.log('LeetPilot content orchestrator initialization complete');
      } else {
        console.warn('Monaco Editor not found');
      }
    } catch (error) {
      console.error('Error initializing content orchestrator:', error);
    }
  }

  setupShortcutListener() {
    document.addEventListener('leetpilot-shortcut', async (event) => {
      const { action, shortcut } = event.detail;
      console.log('Shortcut event received:', action);
      
      try {
        await this.handleShortcutAction(action);
      } catch (error) {
        console.error('Error handling shortcut:', error);
      }
    });
  }

  async handleShortcutAction(action) {
    if (!this.editorIntegration) {
      console.warn('Editor integration not ready');
      this.showToast('Editor not ready', 'error');
      return;
    }

    const currentCode = this.editorIntegration.getCurrentCode();
    const problemTitle = this.getProblemTitle();
    const language = this.getLanguage();

    console.log(`Processing ${action} request...`);
    
    this.showToast(`Initializing ${action}...`, 'info');

    const request = {
      type: action,
      currentCode: currentCode,
      problemTitle: problemTitle,
      language: language,
      context: {
        url: window.location.href,
        timestamp: Date.now()
      }
    };

    try {
      this.showToast(`Processing ${action}...`, 'loading');
      
      const response = await chrome.runtime.sendMessage(request);
      console.log(`${action} response received:`, response);
      
      if (response.error) {
        this.showToast(`${action} failed: ${response.error}`, 'error');
        this.showError(response.error);
      } else {
        this.showToast(`${action} completed!`, 'success');
        this.displayResponse(action, response);
      }
    } catch (error) {
      console.error(`${action} request failed:`, error);
      this.showToast(`${action} failed: ${error.message}`, 'error');
      this.showError(error.message);
    }
  }

  getProblemTitle() {
    const titleElement = document.querySelector('[data-cy="question-title"]') ||
                        document.querySelector('.text-title-large') ||
                        document.querySelector('h1');
    return titleElement ? titleElement.textContent.trim() : 'Unknown Problem';
  }

  getLanguage() {
    const languageButton = document.querySelector('button[id*="headlessui-listbox-button"]') ||
                          document.querySelector('.rounded.items-center.whitespace-nowrap') ||
                          document.querySelector('[class*="lang"]');
    
    if (languageButton) {
      const text = languageButton.textContent.trim();
      return text || 'javascript';
    }
    
    return 'javascript';
  }

  displayResponse(action, response) {
    console.log('Displaying response for:', action, response);
    
    const content = response.suggestion || response.explanation || response.optimization || response.hint || 'No response';
    
    const existingDisplay = document.querySelector('.leetpilot-response');
    if (existingDisplay) {
      existingDisplay.remove();
    }

    const display = document.createElement('div');
    display.className = 'leetpilot-response';
    display.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      max-width: 500px;
      background: white;
      border: 2px solid #6366f1;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    display.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h3 style="margin: 0; color: #6366f1; font-size: 16px;">${action.charAt(0).toUpperCase() + action.slice(1)}</h3>
        <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #666;">&times;</button>
      </div>
      <div style="color: #333; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${content}</div>
    `;
    
    document.body.appendChild(display);
    
    setTimeout(() => {
      if (display.parentElement) {
        display.remove();
      }
    }, 30000);
  }

  showToast(message, type = 'info') {
    const existingToast = document.querySelector('.leetpilot-toast');
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'leetpilot-toast';
    
    const colors = {
      info: { bg: '#3b82f6', border: '#2563eb' },
      loading: { bg: '#f59e0b', border: '#d97706' },
      success: { bg: '#10b981', border: '#059669' },
      error: { bg: '#ef4444', border: '#dc2626' }
    };
    
    const color = colors[type] || colors.info;
    const icon = type === 'loading' ? '⏳' : type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ';
    
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      min-width: 250px;
      max-width: 400px;
      background: ${color.bg};
      border: 2px solid ${color.border};
      border-radius: 8px;
      padding: 12px 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 10001;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: white;
      font-size: 14px;
      font-weight: 500;
      animation: slideIn 0.3s ease-out;
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(400px);
          opacity: 0;
        }
      }
    `;
    
    if (!document.querySelector('style[data-leetpilot-toast]')) {
      style.setAttribute('data-leetpilot-toast', 'true');
      document.head.appendChild(style);
    }
    
    toast.innerHTML = `<span style="font-size: 16px;">${icon}</span><span>${message}</span>`;
    
    document.body.appendChild(toast);
    
    const duration = type === 'loading' ? 10000 : type === 'error' ? 5000 : 3000;
    
    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => toast.remove(), 300);
      }
    }, duration);
  }

  showError(message) {
    const existingError = document.querySelector('.leetpilot-error');
    if (existingError) {
      existingError.remove();
    }

    const errorDisplay = document.createElement('div');
    errorDisplay.className = 'leetpilot-error';
    errorDisplay.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      max-width: 400px;
      background: #fef2f2;
      border: 2px solid #dc2626;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    errorDisplay.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <h3 style="margin: 0; color: #dc2626; font-size: 14px;">Error</h3>
        <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #dc2626;">&times;</button>
      </div>
      <div style="color: #991b1b; font-size: 13px;">${message}</div>
    `;
    
    document.body.appendChild(errorDisplay);
    
    setTimeout(() => {
      if (errorDisplay.parentElement) {
        errorDisplay.remove();
      }
    }, 10000);
  }

  /**
   * Get the current editor integration instance
   */
  getEditorIntegration() {
    return this.editorIntegration;
  }

  /**
   * Check if the orchestrator is initialized
   */
  isReady() {
    return this.isInitialized && this.editorIntegration;
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.editorIntegration) {
      this.editorIntegration.cleanup();
    }
    
    if (this.keyboardHandler) {
      this.keyboardHandler.cleanup();
    }
    
    this.isInitialized = false;
  }
}