// LeetPilot Editor Integration
// Handles integration with Monaco Editor for code manipulation and event handling

// IIFE-based module pattern for Chrome content scripts
(function() {
  'use strict';

  /**
   * Editor Integration Manager
   * Handles integration with Monaco Editor for code manipulation and event handling
   */
  class EditorIntegration {
  constructor(monacoEditor) {
    this.monacoEditor = monacoEditor;
    this.observers = [];
    this.eventListeners = [];
    this.changeCallbacks = [];
    this.focusCallbacks = [];
    this.cursorCallbacks = [];
    
    this.lastContent = '';
    this.lastCursorPosition = 0;
    this.isInitialized = false;
    
    if (monacoEditor) {
      this.initialize();
    }
  }

  /**
   * Initialize editor integration
   */
  initialize() {
    if (this.isInitialized) return;

    console.log('Initializing editor integration...');
    
    try {
      this.setupContentObserver();
      this.setupEventListeners();
      this.cacheInitialState();
      
      this.isInitialized = true;
      console.log('Editor integration initialized successfully');
    } catch (error) {
      console.error('Error initializing editor integration:', error);
    }
  }

  /**
   * Set up mutation observer to detect editor content changes
   */
  setupContentObserver() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' || mutation.type === 'characterData') {
          this.handleContentChange();
        }
      });
    });

    // Observe changes in the editor content area
    const viewLines = this.monacoEditor.querySelector('.view-lines');
    if (viewLines) {
      observer.observe(viewLines, {
        childList: true,
        subtree: true,
        characterData: true
      });
      this.observers.push(observer);
    }

    // Also observe the textarea for direct changes
    const textarea = this.monacoEditor.querySelector('textarea');
    if (textarea) {
      const textareaObserver = new MutationObserver(() => {
        this.handleContentChange();
      });
      
      textareaObserver.observe(textarea, {
        attributes: true,
        attributeFilter: ['value']
      });
      this.observers.push(textareaObserver);
    }
  }

  /**
   * Set up event listeners for editor interactions
   */
  setupEventListeners() {
    const textarea = this.monacoEditor.querySelector('textarea');
    if (textarea) {
      // Content change events
      const inputHandler = () => this.handleContentChange();
      textarea.addEventListener('input', inputHandler);
      this.eventListeners.push({ element: textarea, event: 'input', handler: inputHandler });

      // Focus events
      const focusHandler = () => this.handleFocus();
      const blurHandler = () => this.handleBlur();
      textarea.addEventListener('focus', focusHandler);
      textarea.addEventListener('blur', blurHandler);
      this.eventListeners.push({ element: textarea, event: 'focus', handler: focusHandler });
      this.eventListeners.push({ element: textarea, event: 'blur', handler: blurHandler });

      // Cursor position events
      const keyupHandler = (event) => this.handleKeyUp(event);
      const clickHandler = (event) => this.handleClick(event);
      textarea.addEventListener('keyup', keyupHandler);
      textarea.addEventListener('click', clickHandler);
      this.eventListeners.push({ element: textarea, event: 'keyup', handler: keyupHandler });
      this.eventListeners.push({ element: textarea, event: 'click', handler: clickHandler });

      // Selection change events
      const selectionHandler = () => this.handleSelectionChange();
      document.addEventListener('selectionchange', selectionHandler);
      this.eventListeners.push({ element: document, event: 'selectionchange', handler: selectionHandler });
    }
  }

  /**
   * Cache initial editor state
   */
  cacheInitialState() {
    this.lastContent = this.getCurrentCode();
    this.lastCursorPosition = this.getCursorPosition();
  }

  /**
   * Handle content change events
   */
  handleContentChange() {
    // Debounce content change events
    clearTimeout(this._contentChangeTimeout);
    this._contentChangeTimeout = setTimeout(() => {
      const currentContent = this.getCurrentCode();
      
      if (currentContent !== this.lastContent) {
        console.log('Editor content changed');
        this.lastContent = currentContent;
        
        // Notify callbacks
        this.notifyChangeCallbacks({
          type: 'content',
          content: currentContent,
          previousContent: this.lastContent
        });
      }
    }, 300);
  }

  /**
   * Handle focus events
   */
  handleFocus() {
    console.log('Editor focused');
    this.notifyFocusCallbacks({ type: 'focus', focused: true });
  }

  /**
   * Handle blur events
   */
  handleBlur() {
    console.log('Editor blurred');
    this.notifyFocusCallbacks({ type: 'blur', focused: false });
  }

  /**
   * Handle key up events
   */
  handleKeyUp(event) {
    this.updateCursorPosition();
  }

  /**
   * Handle click events
   */
  handleClick(event) {
    this.updateCursorPosition();
  }

  /**
   * Handle selection change events
   */
  handleSelectionChange() {
    // Only handle if the selection is within our editor
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (this.monacoEditor.contains(range.commonAncestorContainer)) {
        this.updateCursorPosition();
      }
    }
  }

  /**
   * Update cursor position tracking
   */
  updateCursorPosition() {
    const currentPosition = this.getCursorPosition();
    
    if (currentPosition !== this.lastCursorPosition) {
      console.log('Cursor position updated:', currentPosition);
      this.lastCursorPosition = currentPosition;
      
      // Notify callbacks
      this.notifyCursorCallbacks({
        type: 'cursor',
        position: currentPosition,
        selectedText: this.getSelectedText()
      });
    }
  }

  /**
   * Get current code from the editor
   */
  getCurrentCode() {
    // Method 1: Get from textarea (most reliable)
    const textarea = this.monacoEditor.querySelector('textarea');
    if (textarea && textarea.value !== undefined) {
      return textarea.value;
    }

    // Method 2: Get from input area (alternative textarea selector)
    const inputArea = this.monacoEditor.querySelector('.inputarea textarea');
    if (inputArea && inputArea.value !== undefined) {
      return inputArea.value;
    }

    // Method 3: Get from view lines (visual representation)
    const viewLines = this.monacoEditor.querySelector('.view-lines') || 
                     this.monacoEditor.querySelector('.lines-content');
    if (viewLines) {
      return this.extractCodeFromViewLines(viewLines);
    }

    // Method 4: Try to find any contenteditable element
    const contentEditable = this.monacoEditor.querySelector('[contenteditable="true"]');
    if (contentEditable) {
      return contentEditable.textContent || '';
    }

    // Method 5: Fallback to entire editor text content
    return this.cleanEditorText(this.monacoEditor.textContent || '');
  }

  /**
   * Extract code from Monaco's view lines
   */
  extractCodeFromViewLines(viewLines) {
    const lines = viewLines.querySelectorAll('.view-line, [class*="view-line"]');
    const codeLines = [];

    lines.forEach(line => {
      // Extract text content, handling Monaco's span structure
      const spans = line.querySelectorAll('span');
      let lineText = '';

      if (spans.length > 0) {
        spans.forEach(span => {
          // Skip line numbers and other decorations
          if (!span.classList.contains('line-numbers') && 
              !span.classList.contains('margin') &&
              !span.classList.contains('glyph-margin')) {
            lineText += span.textContent || '';
          }
        });
      } else {
        // Fallback to entire line text content
        lineText = line.textContent || '';
      }

      codeLines.push(lineText);
    });

    return codeLines.join('\n');
  }

  /**
   * Clean editor text by removing UI elements
   */
  cleanEditorText(text) {
    const lines = text.split('\n');
    const cleanedLines = lines.filter(line => {
      // Filter out line numbers and empty lines
      const trimmed = line.trim();
      return trimmed && !(/^\d+$/.test(trimmed));
    });

    return cleanedLines.join('\n');
  }

  /**
   * Get cursor position in the editor
   */
  getCursorPosition() {
    const textarea = this.monacoEditor.querySelector('textarea');
    if (textarea) {
      return textarea.selectionStart || 0;
    }

    // Fallback: try to determine position from visual cursor
    const cursor = this.monacoEditor.querySelector('.cursor');
    if (cursor) {
      return this.estimateCursorPosition(cursor);
    }

    return 0;
  }

  /**
   * Estimate cursor position from visual cursor element
   */
  estimateCursorPosition(cursor) {
    const viewLines = this.monacoEditor.querySelector('.view-lines');
    if (!viewLines) return 0;

    const lines = viewLines.querySelectorAll('.view-line');
    let position = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineRect = line.getBoundingClientRect();
      const cursorRect = cursor.getBoundingClientRect();

      if (cursorRect.top >= lineRect.top && cursorRect.top <= lineRect.bottom) {
        // Cursor is on this line, estimate character position
        const lineText = line.textContent || '';
        const charWidth = lineRect.width / lineText.length;
        const charPosition = Math.floor((cursorRect.left - lineRect.left) / charWidth);
        position += Math.min(charPosition, lineText.length);
        break;
      } else {
        position += (line.textContent || '').length + 1; // +1 for newline
      }
    }

    return position;
  }

  /**
   * Get selected text from the editor
   */
  getSelectedText() {
    const textarea = this.monacoEditor.querySelector('textarea');
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      if (start !== end) {
        return textarea.value.substring(start, end);
      }
    }

    // Fallback: check for browser selection
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      // Verify the selection is within the editor
      const range = selection.getRangeAt(0);
      if (this.monacoEditor.contains(range.commonAncestorContainer)) {
        return selection.toString();
      }
    }

    return '';
  }

  /**
   * Insert text at cursor position
   */
  insertTextAtCursor(text) {
    const textarea = this.monacoEditor.querySelector('textarea');
    if (textarea) {
      const cursorPos = textarea.selectionStart;
      const currentValue = textarea.value;

      // Insert the text at cursor position
      const newValue = currentValue.slice(0, cursorPos) + text + currentValue.slice(cursorPos);

      // Update textarea value
      textarea.value = newValue;

      // Move cursor to end of inserted text
      const newCursorPos = cursorPos + text.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);

      // Trigger input event to notify Monaco Editor
      const inputEvent = new Event('input', { bubbles: true });
      textarea.dispatchEvent(inputEvent);

      // Focus back to textarea
      textarea.focus();

      return true;
    }

    return false;
  }

  /**
   * Replace selected text or insert at cursor
   */
  replaceSelectedText(text) {
    const textarea = this.monacoEditor.querySelector('textarea');
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentValue = textarea.value;

      // Replace selected text or insert at cursor
      const newValue = currentValue.slice(0, start) + text + currentValue.slice(end);

      // Update textarea value
      textarea.value = newValue;

      // Move cursor to end of inserted text
      const newCursorPos = start + text.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);

      // Trigger input event to notify Monaco Editor
      const inputEvent = new Event('input', { bubbles: true });
      textarea.dispatchEvent(inputEvent);

      // Focus back to textarea
      textarea.focus();

      return true;
    }

    return false;
  }

  /**
   * Set cursor position
   */
  setCursorPosition(position) {
    const textarea = this.monacoEditor.querySelector('textarea');
    if (textarea) {
      textarea.setSelectionRange(position, position);
      textarea.focus();
      return true;
    }

    return false;
  }

  /**
   * Focus the editor
   */
  focus() {
    const textarea = this.monacoEditor.querySelector('textarea');
    if (textarea) {
      textarea.focus();
      return true;
    }

    return false;
  }

  /**
   * Check if editor is focused
   */
  isFocused() {
    const textarea = this.monacoEditor.querySelector('textarea');
    return textarea && document.activeElement === textarea;
  }

  /**
   * Add callback for content changes
   */
  onContentChange(callback) {
    if (typeof callback === 'function') {
      this.changeCallbacks.push(callback);
    }
  }

  /**
   * Add callback for focus changes
   */
  onFocusChange(callback) {
    if (typeof callback === 'function') {
      this.focusCallbacks.push(callback);
    }
  }

  /**
   * Add callback for cursor changes
   */
  onCursorChange(callback) {
    if (typeof callback === 'function') {
      this.cursorCallbacks.push(callback);
    }
  }

  /**
   * Remove callback
   */
  removeCallback(callback) {
    this.changeCallbacks = this.changeCallbacks.filter(cb => cb !== callback);
    this.focusCallbacks = this.focusCallbacks.filter(cb => cb !== callback);
    this.cursorCallbacks = this.cursorCallbacks.filter(cb => cb !== callback);
  }

  /**
   * Notify content change callbacks
   */
  notifyChangeCallbacks(data) {
    this.changeCallbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in content change callback:', error);
      }
    });
  }

  /**
   * Notify focus change callbacks
   */
  notifyFocusCallbacks(data) {
    this.focusCallbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in focus change callback:', error);
      }
    });
  }

  /**
   * Notify cursor change callbacks
   */
  notifyCursorCallbacks(data) {
    this.cursorCallbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in cursor change callback:', error);
      }
    });
  }

  /**
   * Get editor statistics
   */
  getEditorStats() {
    const code = this.getCurrentCode();
    
    return {
      isInitialized: this.isInitialized,
      isFocused: this.isFocused(),
      codeLength: code.length,
      lineCount: code.split('\n').length,
      cursorPosition: this.getCursorPosition(),
      selectedText: this.getSelectedText(),
      hasContent: code.trim().length > 0,
      observerCount: this.observers.length,
      listenerCount: this.eventListeners.length,
      callbackCount: {
        change: this.changeCallbacks.length,
        focus: this.focusCallbacks.length,
        cursor: this.cursorCallbacks.length
      }
    };
  }

    /**
     * Cleanup resources
     */
    cleanup() {
      // Clear timeouts
      if (this._contentChangeTimeout) {
        clearTimeout(this._contentChangeTimeout);
      }

      // Disconnect observers
      this.observers.forEach(observer => observer.disconnect());
      this.observers = [];

      // Remove event listeners
      this.eventListeners.forEach(({ element, event, handler }) => {
        element.removeEventListener(event, handler);
      });
      this.eventListeners = [];

      // Clear callbacks
      this.changeCallbacks = [];
      this.focusCallbacks = [];
      this.cursorCallbacks = [];

      this.isInitialized = false;
      console.log('Editor integration cleaned up');
    }
  }

  // Expose to global scope for content script compatibility
  window.__LeetPilotEditorIntegration = EditorIntegration;
})();