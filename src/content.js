// LeetPilot Content Script Entry Point
// Loads the modular content orchestrator

console.log('LeetPilot content script loading...');

import { ContentOrchestrator } from './content/content-orchestrator.js';

let orchestrator = null;

function initializeOrchestrator() {
  try {
    console.log('Initializing content orchestrator...');
    if (!orchestrator) {
      orchestrator = new ContentOrchestrator();
      orchestrator.initialize();
    }
  } catch (error) {
    console.error('Failed to initialize content orchestrator:', error);
    
    chrome.runtime.sendMessage({
      type: 'error',
      message: 'Content script failed to initialize',
      error: error.message
    }).catch(() => {
      console.error('Failed to report content script error to background');
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeOrchestrator);
} else {
  initializeOrchestrator();
}

window.LeetPilotOrchestrator = orchestrator;

console.log('LeetPilot content script loaded');