// LeetPilot Content Script Entry Point
// Loads the modular content orchestrator

console.log('LeetPilot content script loading...');

// Import and initialize the modular content orchestrator
import('./content/content-orchestrator.js')
  .then(() => {
    console.log('LeetPilot modular content system loaded successfully');
  })
  .catch(error => {
    console.error('Failed to load LeetPilot content system:', error);
    
    // Fallback: Basic error reporting
    chrome.runtime.sendMessage({
      type: 'error',
      message: 'Content script failed to load',
      error: error.message
    }).catch(() => {
      console.error('Failed to report content script error to background');
    });
  });