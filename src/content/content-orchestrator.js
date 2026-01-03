// LeetPilot Content Script Orchestrator
// Main coordinator for content script functionality

// IIFE-based module pattern for Chrome content scripts
(function() {
  'use strict';

  // Get dependencies from global scope (loaded via dynamic import)
  const MonacoDetector = window.__LeetPilotMonacoDetector;
  const EditorIntegration = window.__LeetPilotEditorIntegration;
  const KeyboardHandler = window.__LeetPilotKeyboardHandler;

  class ContentOrchestrator {
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
      // Set up listeners immediately (before Monaco detection)
      this.setupShortcutListener();
      this.setupCommandListener();
      
      const editor = await this.monacoDetector.detectMonacoEditor();
      
      if (editor) {
        this.editorIntegration = new EditorIntegration(editor);
        await this.editorIntegration.initialize();
        
        this.isInitialized = true;
        console.log('LeetPilot content orchestrator initialization complete');
      } else {
        console.warn('Monaco Editor not found - keyboard shortcuts still active');
        // Still mark as partially initialized so shortcuts work
        this.isInitialized = true;
      }
    } catch (error) {
      console.error('Error initializing content orchestrator:', error);
    }
  }

  setupCommandListener() {
    // Listen for commands from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'trigger-shortcut') {
        console.log('Command triggered from background:', message.action);
        this.handleShortcutAction(message.action);
        sendResponse({ success: true });
      }
      return true; // Keep message channel open for async response
    });
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
    const problemTitle = this.getProblemTitle();
    const language = this.getLanguage();
    let currentCode = '';

    // Try to get code from editor if available
    if (this.editorIntegration) {
      currentCode = this.editorIntegration.getCurrentCode();
    } else {
      // Fallback: try to get code directly from the page
      currentCode = this.getCodeFromPage();
    }

    // If still no code, warn but continue
    if (!currentCode) {
      console.warn('Could not retrieve code from editor');
      this.showToast('Could not retrieve code. Please make sure the editor is loaded.', 'warning');
      // Continue anyway - the user might still want to proceed
    }

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

  /**
   * Fallback method to get code directly from the page
   */
  getCodeFromPage() {
    // Try Monaco editor first
    const monacoEditor = document.querySelector('.monaco-editor');
    if (monacoEditor) {
      // Try to get code from Monaco's model
      const monaco = window.monaco;
      if (monaco) {
        try {
          const models = monaco.editor.getModels();
          if (models && models.length > 0) {
            return models[0].getValue();
          }
        } catch (e) {
          console.warn('Failed to get code from Monaco models:', e);
        }
      }
    }
    
    // Try LeetCode's code editor iframe or element
    const codeElement = document.querySelector('[class*="code-editor"]') ||
                       document.querySelector('#editor') ||
                       document.querySelector('textarea[name*="code"]');
    
    if (codeElement) {
      return codeElement.value || codeElement.textContent || '';
    }
    
    // Try to find pre/code elements
    const preElement = document.querySelector('pre[class*="code"]');
    if (preElement) {
      return preElement.textContent || '';
    }
    
    // Return empty string if nothing found
    console.warn('Could not find code element on page');
    return '';
  }

  displayResponse(action, response) {
    console.log('Displaying response for:', action, response);
    
    // Inject popup styles if not already present
    this.injectPopupStyles();
    
    const content = response.suggestion || response.explanation || response.optimization || response.hint || 'No response';
    
    const existingDisplay = document.querySelector('.leetpilot-response');
    if (existingDisplay) {
      existingDisplay.remove();
    }

    const display = document.createElement('div');
    display.className = 'leetpilot-response leetpilot-popup';
    display.innerHTML = `
      <div class="leetpilot-drag-handle">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="4" cy="4" r="1.5"/><circle cx="12" cy="4" r="1.5"/>
          <circle cx="4" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/>
        </svg>
      </div>
      <div class="leetpilot-popup-header">
        <h3 class="leetpilot-popup-title">${action.charAt(0).toUpperCase() + action.slice(1)}</h3>
        <button class="leetpilot-popup-close">×</button>
      </div>
      <div class="leetpilot-popup-content" style="color: var(--leetpilot-text); font-size: 14px; line-height: 1.6; white-space: pre-wrap;">
        ${content}
      </div>
      <div class="leetpilot-resize-handle">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
          <path d="M14 10V14H10V10H14ZM8 14V10H4V14H8ZM10 8V4H14V8H10ZM4 8V4H0V8H4Z"/>
        </svg>
      </div>
    `;
    
    document.body.appendChild(display);
    
    // Setup close button
    const closeBtn = display.querySelector('.leetpilot-popup-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => display.remove());
    }
    
    // Setup drag functionality
    this.setupDragging(display);
    
    // Setup resize functionality
    this.setupResizing(display);
    
    setTimeout(() => {
      if (display.parentElement) {
        display.remove();
      }
    }, 30000);
  }

  /**
   * Inject popup styles into the page
   */
  injectPopupStyles() {
    if (document.querySelector('#leetpilot-popup-styles')) return;
    
    const link = document.createElement('link');
    link.id = 'leetpilot-popup-styles';
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('src/ui/popup-styles.css');
    document.head.appendChild(link);
  }

  /**
   * Setup dragging for popup
   */
  setupDragging(popup) {
    const dragHandle = popup.querySelector('.leetpilot-drag-handle');
    if (!dragHandle) return;
    
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    
    dragHandle.addEventListener('mousedown', (e) => {
      isDragging = true;
      const rect = popup.getBoundingClientRect();
      dragOffset = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      popup.style.zIndex = '10000';
      
      const onMouseMove = (e) => {
        if (!isDragging) return;
        const x = e.clientX - dragOffset.x;
        const y = e.clientY - dragOffset.y;
        popup.style.left = x + 'px';
        popup.style.top = y + 'px';
        popup.style.right = 'auto';
        popup.style.transform = 'none';
      };
      
      const onMouseUp = () => {
        isDragging = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
      
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  /**
   * Setup resizing for popup
   */
  setupResizing(popup) {
    const resizeHandle = popup.querySelector('.leetpilot-resize-handle');
    if (!resizeHandle) return;
    
    let isResizing = false;
    let startPos = { x: 0, y: 0 };
    let startSize = { width: 0, height: 0 };
    
    resizeHandle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      isResizing = true;
      startPos = { x: e.clientX, y: e.clientY };
      startSize = { width: popup.offsetWidth, height: popup.offsetHeight };
      popup.style.zIndex = '10000';
      
      const onMouseMove = (e) => {
        if (!isResizing) return;
        const deltaX = e.clientX - startPos.x;
        const deltaY = e.clientY - startPos.y;
        popup.style.width = Math.max(280, startSize.width + deltaX) + 'px';
        popup.style.height = Math.max(200, startSize.height + deltaY) + 'px';
      };
      
      const onMouseUp = () => {
        isResizing = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
      
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
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
      error: { bg: '#ef4444', border: '#dc2626' },
      warning: { bg: '#f59e0b', border: '#d97706' }
    };
    
    const color = colors[type] || colors.info;
    const icon = type === 'loading' ? '⏳' : type === 'success' ? '✓' : type === 'error' ? '✗' : type === 'warning' ? '⚠' : 'ℹ';
    
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
    // Inject popup styles if not already present
    this.injectPopupStyles();
    
    const existingError = document.querySelector('.leetpilot-error.leetpilot-popup');
    if (existingError) {
      existingError.remove();
    }

    const errorDisplay = document.createElement('div');
    errorDisplay.className = 'leetpilot-error leetpilot-popup';
    errorDisplay.innerHTML = `
      <div class="leetpilot-drag-handle">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="4" cy="4" r="1.5"/><circle cx="12" cy="4" r="1.5"/>
          <circle cx="4" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/>
        </svg>
      </div>
      <div class="leetpilot-popup-header" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
        <h3 class="leetpilot-popup-title">Error</h3>
        <button class="leetpilot-popup-close">×</button>
      </div>
      <div class="leetpilot-popup-content" style="color: var(--leetpilot-text);">
        <p class="leetpilot-error-message" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); padding: 12px; border-radius: 8px; font-size: 14px; margin: 0;">${message}</p>
      </div>
      <div class="leetpilot-resize-handle">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
          <path d="M14 10V14H10V10H14ZM8 14V10H4V14H8ZM10 8V4H14V8H10ZM4 8V4H0V8H4Z"/>
        </svg>
      </div>
    `;
    
    document.body.appendChild(errorDisplay);
    
    // Setup close button
    const closeBtn = errorDisplay.querySelector('.leetpilot-popup-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => errorDisplay.remove());
    }
    
    // Setup drag functionality
    this.setupDragging(errorDisplay);
    
    // Setup resize functionality
    this.setupResizing(errorDisplay);
    
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

  // Expose to global scope for content script compatibility
  window.__LeetPilotContentOrchestrator = ContentOrchestrator;
})();