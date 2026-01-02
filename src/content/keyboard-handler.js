// LeetPilot Keyboard Handler
// Manages keyboard shortcuts and hotkeys for LeetPilot functionality

/**
 * Keyboard Handler
 * Manages keyboard shortcuts and hotkeys for LeetPilot functionality
 */
export class KeyboardHandler {
  constructor() {
    this.shortcuts = new Map();
    this.isEnabled = true;
    this.eventListener = null;
    
    // Default shortcuts
    this.defaultShortcuts = {
      'ctrl+space': 'completion',
      'alt+e': 'explanation',
      'alt+o': 'optimization',
      'alt+h': 'hint',
      'escape': 'dismiss',
      'tab': 'accept',
      'ctrl+shift+r': 'reset_hints'
    };
    
    this.initialize();
  }

  /**
   * Initialize keyboard handler
   */
  initialize() {
    this.setupDefaultShortcuts();
    this.setupEventListener();
    console.log('Keyboard handler initialized');
  }

  /**
   * Setup default keyboard shortcuts
   */
  setupDefaultShortcuts() {
    Object.entries(this.defaultShortcuts).forEach(([key, action]) => {
      this.addShortcut(key, action);
    });
  }

  /**
   * Setup global keyboard event listener
   */
  setupEventListener() {
    this.eventListener = (event) => {
      if (!this.isEnabled) return;
      
      const shortcutKey = this.getShortcutKey(event);
      const shortcut = this.shortcuts.get(shortcutKey);
      
      if (shortcut) {
        // Check if we should handle this shortcut
        if (this.shouldHandleShortcut(event, shortcut)) {
          event.preventDefault();
          event.stopPropagation();
          
          console.log(`Keyboard shortcut triggered: ${shortcutKey} -> ${shortcut.action}`);
          this.executeShortcut(shortcut, event);
        }
      }
    };

    document.addEventListener('keydown', this.eventListener, true);
  }

  /**
   * Get shortcut key string from keyboard event
   */
  getShortcutKey(event) {
    const parts = [];
    
    if (event.ctrlKey) parts.push('ctrl');
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');
    if (event.metaKey) parts.push('meta');
    
    // Handle special keys
    const key = event.key.toLowerCase();
    if (key === ' ') {
      parts.push('space');
    } else if (key === 'escape') {
      parts.push('escape');
    } else if (key === 'tab') {
      parts.push('tab');
    } else if (key === 'enter') {
      parts.push('enter');
    } else if (key.length === 1) {
      parts.push(key);
    } else {
      parts.push(key);
    }
    
    return parts.join('+');
  }

  /**
   * Check if we should handle this shortcut
   */
  shouldHandleShortcut(event, shortcut) {
    // Don't handle shortcuts in input fields (except for our specific cases)
    const target = event.target;
    const isInputField = target.tagName === 'INPUT' || 
                        target.tagName === 'TEXTAREA' || 
                        target.contentEditable === 'true';
    
    // Special handling for Monaco Editor
    const isMonacoEditor = target.closest('.monaco-editor') !== null;
    
    // Allow certain shortcuts in Monaco Editor
    if (isMonacoEditor) {
      const allowedInEditor = ['ctrl+space', 'alt+e', 'alt+o', 'alt+h', 'escape', 'tab'];
      return allowedInEditor.includes(this.getShortcutKey(event));
    }
    
    // Don't handle shortcuts in other input fields unless specifically allowed
    if (isInputField && !isMonacoEditor) {
      const allowedInInputs = ['escape'];
      return allowedInInputs.includes(this.getShortcutKey(event));
    }
    
    // Check if shortcut is contextually appropriate
    return this.isShortcutContextuallyAppropriate(shortcut, event);
  }

  /**
   * Check if shortcut is contextually appropriate
   */
  isShortcutContextuallyAppropriate(shortcut, event) {
    const action = shortcut.action;
    
    // Dismiss action should work when there are active popups
    if (action === 'dismiss') {
      return document.querySelector('.leetpilot-display, .leetpilot-popup') !== null;
    }
    
    // Accept action should work when there are completions
    if (action === 'accept') {
      return document.querySelector('.leetpilot-completion') !== null;
    }
    
    // AI actions should work when we're on LeetCode
    if (['completion', 'explanation', 'optimization', 'hint'].includes(action)) {
      return window.location.href.includes('leetcode.com');
    }
    
    return true;
  }

  /**
   * Execute a keyboard shortcut
   */
  executeShortcut(shortcut, event) {
    const action = shortcut.action;
    
    // Dispatch custom event for the action
    const customEvent = new CustomEvent('leetpilot-shortcut', {
      detail: {
        action: action,
        shortcut: shortcut,
        originalEvent: event
      }
    });
    
    document.dispatchEvent(customEvent);
    
    // Execute callback if provided
    if (shortcut.callback && typeof shortcut.callback === 'function') {
      try {
        shortcut.callback(event, shortcut);
      } catch (error) {
        console.error('Error executing shortcut callback:', error);
      }
    }
  }

  /**
   * Add a keyboard shortcut
   */
  addShortcut(keyCombo, action, callback = null, options = {}) {
    const normalizedKey = this.normalizeKeyCombo(keyCombo);
    
    const shortcut = {
      key: normalizedKey,
      action: action,
      callback: callback,
      description: options.description || `Execute ${action}`,
      enabled: options.enabled !== false,
      context: options.context || 'global'
    };
    
    this.shortcuts.set(normalizedKey, shortcut);
    console.log(`Keyboard shortcut added: ${normalizedKey} -> ${action}`);
    
    return shortcut;
  }

  /**
   * Remove a keyboard shortcut
   */
  removeShortcut(keyCombo) {
    const normalizedKey = this.normalizeKeyCombo(keyCombo);
    const removed = this.shortcuts.delete(normalizedKey);
    
    if (removed) {
      console.log(`Keyboard shortcut removed: ${normalizedKey}`);
    }
    
    return removed;
  }

  /**
   * Update a keyboard shortcut
   */
  updateShortcut(keyCombo, updates) {
    const normalizedKey = this.normalizeKeyCombo(keyCombo);
    const shortcut = this.shortcuts.get(normalizedKey);
    
    if (shortcut) {
      Object.assign(shortcut, updates);
      console.log(`Keyboard shortcut updated: ${normalizedKey}`);
      return shortcut;
    }
    
    return null;
  }

  /**
   * Normalize key combination string
   */
  normalizeKeyCombo(keyCombo) {
    return keyCombo.toLowerCase()
      .replace(/\s+/g, '')
      .split('+')
      .sort((a, b) => {
        // Sort modifiers first, then key
        const modifierOrder = ['ctrl', 'alt', 'shift', 'meta'];
        const aIndex = modifierOrder.indexOf(a);
        const bIndex = modifierOrder.indexOf(b);
        
        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex;
        } else if (aIndex !== -1) {
          return -1;
        } else if (bIndex !== -1) {
          return 1;
        } else {
          return a.localeCompare(b);
        }
      })
      .join('+');
  }

  /**
   * Enable keyboard shortcuts
   */
  enable() {
    this.isEnabled = true;
    console.log('Keyboard shortcuts enabled');
  }

  /**
   * Disable keyboard shortcuts
   */
  disable() {
    this.isEnabled = false;
    console.log('Keyboard shortcuts disabled');
  }

  /**
   * Check if keyboard shortcuts are enabled
   */
  isShortcutsEnabled() {
    return this.isEnabled;
  }

  /**
   * Get all registered shortcuts
   */
  getShortcuts() {
    return Array.from(this.shortcuts.values());
  }

  /**
   * Get shortcut by key combination
   */
  getShortcut(keyCombo) {
    const normalizedKey = this.normalizeKeyCombo(keyCombo);
    return this.shortcuts.get(normalizedKey);
  }

  /**
   * Check if a key combination is registered
   */
  hasShortcut(keyCombo) {
    const normalizedKey = this.normalizeKeyCombo(keyCombo);
    return this.shortcuts.has(normalizedKey);
  }

  /**
   * Get shortcuts by action
   */
  getShortcutsByAction(action) {
    return Array.from(this.shortcuts.values()).filter(shortcut => shortcut.action === action);
  }

  /**
   * Set callback for a specific action
   */
  setActionCallback(action, callback) {
    const shortcuts = this.getShortcutsByAction(action);
    shortcuts.forEach(shortcut => {
      shortcut.callback = callback;
    });
    
    return shortcuts.length;
  }

  /**
   * Clear all callbacks for an action
   */
  clearActionCallbacks(action) {
    const shortcuts = this.getShortcutsByAction(action);
    shortcuts.forEach(shortcut => {
      shortcut.callback = null;
    });
    
    return shortcuts.length;
  }

  /**
   * Get keyboard shortcut help text
   */
  getHelpText() {
    const shortcuts = this.getShortcuts().filter(s => s.enabled);
    
    const helpText = shortcuts.map(shortcut => {
      const keyDisplay = shortcut.key
        .split('+')
        .map(key => {
          const keyMap = {
            'ctrl': 'Ctrl',
            'alt': 'Alt',
            'shift': 'Shift',
            'meta': 'Cmd',
            'space': 'Space',
            'escape': 'Esc',
            'tab': 'Tab',
            'enter': 'Enter'
          };
          return keyMap[key] || key.toUpperCase();
        })
        .join(' + ');
      
      return `${keyDisplay}: ${shortcut.description}`;
    }).join('\n');
    
    return helpText;
  }

  /**
   * Create help popup
   */
  showHelp() {
    const helpText = this.getHelpText();
    
    // Create help popup
    const overlay = document.createElement('div');
    overlay.className = 'leetpilot-overlay leetpilot-display';
    
    const popup = document.createElement('div');
    popup.className = 'leetpilot-popup leetpilot-help';
    popup.style.maxWidth = '500px';
    
    const header = document.createElement('div');
    header.className = 'leetpilot-popup-header';
    
    const title = document.createElement('h3');
    title.className = 'leetpilot-popup-title';
    title.textContent = 'LeetPilot Keyboard Shortcuts';
    
    const closeButton = document.createElement('button');
    closeButton.className = 'leetpilot-popup-close';
    closeButton.innerHTML = '×';
    closeButton.title = 'Close (Esc)';
    
    header.appendChild(title);
    header.appendChild(closeButton);
    
    const content = document.createElement('div');
    content.className = 'leetpilot-popup-content';
    
    const helpPre = document.createElement('pre');
    helpPre.style.whiteSpace = 'pre-line';
    helpPre.style.fontFamily = 'inherit';
    helpPre.textContent = helpText;
    
    content.appendChild(helpPre);
    
    popup.appendChild(header);
    popup.appendChild(content);
    overlay.appendChild(popup);
    
    // Setup close handlers
    const closeHelp = () => {
      overlay.remove();
    };
    
    closeButton.addEventListener('click', closeHelp);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeHelp();
    });
    
    // Add to page
    document.body.appendChild(overlay);
    
    // Show with animation
    setTimeout(() => overlay.classList.add('show'), 10);
  }

  /**
   * Reset to default shortcuts
   */
  resetToDefaults() {
    this.shortcuts.clear();
    this.setupDefaultShortcuts();
    console.log('Keyboard shortcuts reset to defaults');
  }

  /**
   * Get statistics
   */
  getStats() {
    const shortcuts = Array.from(this.shortcuts.values());
    const actionCounts = {};
    
    shortcuts.forEach(shortcut => {
      actionCounts[shortcut.action] = (actionCounts[shortcut.action] || 0) + 1;
    });
    
    return {
      totalShortcuts: shortcuts.length,
      enabledShortcuts: shortcuts.filter(s => s.enabled).length,
      isEnabled: this.isEnabled,
      actionCounts: actionCounts,
      hasEventListener: this.eventListener !== null
    };
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.eventListener) {
      document.removeEventListener('keydown', this.eventListener, true);
      this.eventListener = null;
    }
    
    this.shortcuts.clear();
    this.isEnabled = false;
    
    console.log('Keyboard handler cleaned up');
  }
}