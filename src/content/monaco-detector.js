// LeetPilot Monaco Editor Detector
// Detects and validates Monaco Editor instances on LeetCode

// IIFE-based module pattern for Chrome content scripts
(function() {
  'use strict';

  /**
   * Monaco Editor Detector
   * Detects and validates Monaco Editor instances on LeetCode
   */
  class MonacoDetector {
  constructor() {
    this.detectedEditor = null;
    this.detectionCallbacks = [];
    this.isDetecting = false;
    this.maxPollAttempts = 30; // 30 seconds with 1 second intervals
    this.pollInterval = 1000; // 1 second
  }

  /**
   * Start detecting Monaco Editor with polling mechanism
   */
  async detectMonacoEditor() {
    if (this.isDetecting) {
      console.log('Monaco detection already in progress');
      return this.detectedEditor;
    }

    console.log('Starting Monaco Editor detection...');
    this.isDetecting = true;

    return new Promise((resolve, reject) => {
      let pollAttempts = 0;

      const pollForEditor = setInterval(() => {
        pollAttempts++;

        const editor = this.attemptDetection();
        
        if (editor) {
          console.log('Monaco Editor detected:', editor);
          this.detectedEditor = editor;
          this.isDetecting = false;
          clearInterval(pollForEditor);
          
          // Notify callbacks
          this.notifyDetectionCallbacks(editor);
          resolve(editor);
        } else if (pollAttempts >= this.maxPollAttempts) {
          console.warn('Monaco Editor not found after', this.maxPollAttempts, 'attempts');
          this.isDetecting = false;
          clearInterval(pollForEditor);
          
          this.logDetectionFailure();
          reject(new Error('Monaco Editor not detected'));
        } else {
          // Log progress every 5 attempts
          if (pollAttempts % 5 === 0) {
            console.log(`Monaco Editor detection attempt ${pollAttempts}/${this.maxPollAttempts}`);
          }
        }
      }, this.pollInterval);
    });
  }

  /**
   * Attempt to detect Monaco Editor using multiple strategies
   */
  attemptDetection() {
    // Strategy 0: Check if Monaco is available on window object
    const windowEditor = this.detectFromWindow();
    if (windowEditor) {
      console.log('Detected Monaco from window object');
      return windowEditor;
    }

    // Strategy 1: Use LeetCode-specific selectors
    const leetCodeEditor = this.detectWithLeetCodeSelectors();
    if (leetCodeEditor) {
      console.log('Detected editor using LeetCode selectors');
      return leetCodeEditor;
    }

    // Strategy 2: Look for Monaco Editor instances using multiple selectors
    const editorSelectors = [
      '.monaco-editor',
      '.view-lines',
      '[data-mode-id]',
      '.editor-scrollable',
      '.monaco-editor-background',
      '.inputarea',
      '.overflow-guard',
      '.lines-content'
    ];

    let foundEditor = null;

    for (const selector of editorSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        // Find the main code editor (not auxiliary editors like diff viewers)
        for (const element of elements) {
          const editorContainer = element.closest('.monaco-editor') ||
                                 element.closest('[class*="monaco"]') ||
                                 element.closest('[class*="editor"]');

          if (editorContainer && this.isMainCodeEditor(editorContainer)) {
            foundEditor = editorContainer;
            break;
          }
        }
        if (foundEditor) break;
      }
    }

    // Strategy 3: Additional fallback - look for any element with Monaco-like characteristics
    if (!foundEditor) {
      const potentialEditors = document.querySelectorAll('div[class*="editor"], div[class*="monaco"], div[role="textbox"]');
      for (const element of potentialEditors) {
        if (this.isMainCodeEditor(element)) {
          foundEditor = element;
          break;
        }
      }
    }

    // Strategy 4: Last resort - look for any textarea that could be an editor
    if (!foundEditor) {
      const textareas = document.querySelectorAll('textarea');
      for (const textarea of textareas) {
        const parent = textarea.parentElement;
        if (parent && this.isMainCodeEditor(parent)) {
          foundEditor = parent;
          break;
        }
        // Also check if textarea itself could be the editor
        const rect = textarea.getBoundingClientRect();
        if (rect.width > 100 && rect.height > 50) {
          // Check if it's in an editor-like container
          const container = textarea.closest('[class*="editor"], [class*="code"]');
          if (container) {
            foundEditor = textarea;
            break;
          }
        }
      }
    }

    return foundEditor;
  }

  /**
   * Check if the editor element is the main code editor
   */
  isMainCodeEditor(editorElement) {
    if (!editorElement) return false;

    // Check if this is not a diff viewer or auxiliary editor
    const parentClasses = editorElement.parentElement?.className || '';
    const editorClasses = editorElement.className || '';

    // Exclude diff viewers and other auxiliary editors
    if (parentClasses.includes('diff') || editorClasses.includes('diff')) {
      return false;
    }

    // Exclude minimap and other auxiliary components
    if (editorClasses.includes('minimap') ||
        editorClasses.includes('scrollbar') ||
        editorClasses.includes('suggest-widget') ||
        editorClasses.includes('parameter-hints')) {
      return false;
    }

    // Look for indicators that this is the main code editor
    const codeArea = editorElement.querySelector('.view-lines') ||
                     editorElement.querySelector('.lines-content') ||
                     editorElement.querySelector('[class*="view-line"]');

    const hasTextArea = editorElement.querySelector('textarea') ||
                        editorElement.querySelector('.inputarea') ||
                        editorElement.querySelector('[role="textbox"]');

    // Additional checks for LeetCode-specific structure
    const hasMonacoStructure = editorElement.querySelector('.overflow-guard') ||
                              editorElement.querySelector('.monaco-editor-background') ||
                              editorElement.classList.contains('monaco-editor');

    // LeetCode-specific editor container check
    const isLeetCodeEditor = editorElement.closest('[class*="code-editor"]') ||
                            editorElement.closest('[class*="editor-container"]') ||
                            editorElement.closest('[class*="ace"]') ||
                            editorElement.classList.contains('code');
    
    // Check if element is visible and has reasonable dimensions
    const rect = editorElement.getBoundingClientRect();
    const isVisible = rect.width > 100 && rect.height > 50;

    // Check for code-like content (optional - empty editors are still valid)
    const hasCodeContent = this.hasCodeLikeContent(editorElement);

    // For LeetCode, accept editors with Monaco structure even if empty
    const isValidEditor = (codeArea || hasTextArea || hasMonacoStructure || isLeetCodeEditor) && isVisible;
    
    return isValidEditor;
  }

  /**
   * Check if element contains code-like content
   */
  hasCodeLikeContent(element) {
    // Look for textarea with code
    const textarea = element.querySelector('textarea');
    if (textarea && textarea.value) {
      const content = textarea.value.trim();
      // Check for common programming constructs
      const codePatterns = [
        /function\s*\(/,
        /def\s+\w+/,
        /class\s+\w+/,
        /\{[\s\S]*\}/,
        /\[[\s\S]*\]/,
        /if\s*\(/,
        /for\s*\(/,
        /while\s*\(/,
        /return\s/,
        /var\s+\w+/,
        /let\s+\w+/,
        /const\s+\w+/
      ];
      
      return codePatterns.some(pattern => pattern.test(content)) || content.length > 10;
    }

    // Look for code in view lines
    const viewLines = element.querySelector('.view-lines');
    if (viewLines) {
      const textContent = viewLines.textContent || '';
      return textContent.trim().length > 0;
    }

    // Check if it's an empty editor (still valid)
    const hasEditorStructure = element.querySelector('.monaco-editor-background') ||
                              element.querySelector('.overflow-guard') ||
                              element.classList.contains('monaco-editor');

    return hasEditorStructure;
  }

  /**
   * Get the currently detected editor
   */
  getDetectedEditor() {
    return this.detectedEditor;
  }

  /**
   * Check if editor is currently detected and valid
   */
  isEditorDetected() {
    return this.detectedEditor && document.contains(this.detectedEditor);
  }

  /**
   * Re-validate the detected editor
   */
  validateDetectedEditor() {
    if (!this.detectedEditor) return false;

    // Check if editor is still in DOM
    if (!document.contains(this.detectedEditor)) {
      console.log('Detected editor no longer in DOM');
      this.detectedEditor = null;
      return false;
    }

    // Re-validate that it's still a main code editor
    if (!this.isMainCodeEditor(this.detectedEditor)) {
      console.log('Detected editor no longer valid');
      this.detectedEditor = null;
      return false;
    }

    return true;
  }

  /**
   * Force re-detection of Monaco Editor
   */
  async redetect() {
    this.detectedEditor = null;
    this.isDetecting = false;
    return this.detectMonacoEditor();
  }

  /**
   * Add callback for when editor is detected
   */
  onEditorDetected(callback) {
    if (typeof callback === 'function') {
      this.detectionCallbacks.push(callback);
      
      // If editor is already detected, call callback immediately
      if (this.detectedEditor) {
        callback(this.detectedEditor);
      }
    }
  }

  /**
   * Remove detection callback
   */
  removeDetectionCallback(callback) {
    const index = this.detectionCallbacks.indexOf(callback);
    if (index > -1) {
      this.detectionCallbacks.splice(index, 1);
    }
  }

  /**
   * Notify all detection callbacks
   */
  notifyDetectionCallbacks(editor) {
    this.detectionCallbacks.forEach(callback => {
      try {
        callback(editor);
      } catch (error) {
        console.error('Error in detection callback:', error);
      }
    });
  }

  /**
   * Log detection failure with diagnostic information
   */
  logDetectionFailure() {
    console.warn('Monaco Editor detection failed');
    console.log('Available elements with "editor" or "monaco" in class:', 
      document.querySelectorAll('[class*="editor"], [class*="monaco"]'));
    
    // Log potential editor elements for debugging
    const potentialElements = document.querySelectorAll('div[role="textbox"], textarea, [contenteditable="true"]');
    console.log('Potential editor elements found:', potentialElements.length);
    
    potentialElements.forEach((element, index) => {
      const rect = element.getBoundingClientRect();
      console.log(`Element ${index}:`, {
        tagName: element.tagName,
        className: element.className,
        id: element.id,
        visible: rect.width > 0 && rect.height > 0,
        dimensions: `${rect.width}x${rect.height}`
      });
    });
  }

  /**
   * Get detection statistics
   */
  getDetectionStats() {
    return {
      isDetected: this.isEditorDetected(),
      detectedEditor: this.detectedEditor ? {
        tagName: this.detectedEditor.tagName,
        className: this.detectedEditor.className,
        id: this.detectedEditor.id
      } : null,
      isDetecting: this.isDetecting,
      callbackCount: this.detectionCallbacks.length
    };
  }

  /**
   * Setup automatic re-detection on page changes
   */
  setupAutoRedetection() {
    // Watch for DOM changes that might indicate new editor
    const observer = new MutationObserver((mutations) => {
      let shouldRedetect = false;
      
      mutations.forEach((mutation) => {
        // Check if nodes were added that might contain an editor
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node;
              if (element.classList.contains('monaco-editor') ||
                  element.querySelector && element.querySelector('.monaco-editor')) {
                shouldRedetect = true;
                break;
              }
            }
          }
        }
      });
      
      if (shouldRedetect && !this.isEditorDetected()) {
        console.log('DOM changes detected, attempting re-detection');
        this.redetect().catch(error => {
          console.log('Auto re-detection failed:', error.message);
        });
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    return observer;
  }

  /**
   * Try to detect editor using LeetCode's specific selectors
   */
  detectWithLeetCodeSelectors() {
    // LeetCode-specific selectors for their code editor
    const leetCodeSelectors = [
      '[class*="code-editor"]',
      '[class*="editor-container"]',
      '[class*="monaco-container"]',
      '.monaco-editor',
      '#editor',
      '[data-cy="code-editor"]'
    ];

    for (const selector of leetCodeSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        // Try to find the Monaco editor within this container
        const monacoEditor = element.closest('.monaco-editor') || element.querySelector('.monaco-editor');
        if (monacoEditor && this.isMainCodeEditor(monacoEditor)) {
          return monacoEditor;
        }
        // If element itself looks like an editor
        if (this.isMainCodeEditor(element)) {
          return element;
        }
      }
    }

    return null;
  }

  /**
   * Try to get Monaco from window object (Monaco sometimes exposes itself)
   */
  detectFromWindow() {
    // Check if Monaco is available globally
    if (window.monaco) {
      try {
        // Try to get active models/editors from Monaco
        const models = window.monaco.editor.getModels();
        if (models && models.length > 0) {
          // Try to find the DOM element for this model
          for (const model of models) {
            const editor = window.monaco.editor.getEditors().find(e => e.getModel() === model);
            if (editor && editor.getDomNode()) {
              const domNode = editor.getDomNode();
              const monacoContainer = domNode.closest('.monaco-editor');
              if (monacoContainer) {
                return domNode;
              }
            }
          }
        }
      } catch (e) {
        console.warn('Failed to detect Monaco from window object:', e);
      }
    }
    return null;
  }

    /**
     * Cleanup resources
     */
    cleanup() {
      this.detectedEditor = null;
      this.detectionCallbacks = [];
      this.isDetecting = false;
    }
  }

  // Expose to global scope for content script compatibility
  window.__LeetPilotMonacoDetector = MonacoDetector;
})();