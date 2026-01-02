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
    
    // Check if we're on a LeetCode problem page
    if (!window.location.href.includes('leetcode.com')) {
      console.log('Not on LeetCode, skipping initialization');
      return;
    }
    
    try {
      // Detect Monaco Editor
      const editor = await this.monacoDetector.detectMonacoEditor();
      
      if (editor) {
        // Initialize editor integration
        this.editorIntegration = new EditorIntegration(editor);
        await this.editorIntegration.initialize();
        
        // Set up keyboard shortcuts with editor integration
        this.keyboardHandler.initialize(this.editorIntegration);
        
        this.isInitialized = true;
        console.log('LeetPilot content orchestrator initialization complete');
      } else {
        console.warn('Monaco Editor not found');
      }
    } catch (error) {
      console.error('Error initializing content orchestrator:', error);
    }
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

// Initialize when DOM is ready
let orchestrator = null;

function initializeOrchestrator() {
  if (!orchestrator) {
    orchestrator = new ContentOrchestrator();
    orchestrator.initialize();
  }
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeOrchestrator);
} else {
  initializeOrchestrator();
}

// Export for external access
window.LeetPilotOrchestrator = orchestrator;