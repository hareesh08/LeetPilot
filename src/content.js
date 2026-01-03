// LeetPilot Content Script Entry Point
// Loads the modular content orchestrator with IIFE modules

console.log('LeetPilot content script loading...');

// Track initialization state
let isInitialized = false;
let orchestrator = null;

// Set up message listener BEFORE orchestrator to handle early messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Always respond to prevent "receiving end does not exist" errors
  if (message.type === 'ping') {
    sendResponse({ status: 'ok', contentScriptReady: isInitialized });
    return false;
  }
  
  // Handle shortcut triggers
  if (message.type === 'trigger-shortcut' && orchestrator) {
    orchestrator.handleShortcutAction(message.action).then(response => {
      sendResponse(response);
    }).catch(error => {
      sendResponse({ error: error.message });
    });
    return true; // Keep channel open for async response
  }
  
  // If orchestrator isn't ready yet, queue the message
  if (!isInitialized && orchestrator === null) {
    console.log('Content script initializing, message queued');
    setTimeout(() => {
      chrome.runtime.onMessage.dispatch(message, sender, sendResponse);
    }, 1000);
    return true;
  }
  
  sendResponse({ error: 'Content script not ready', contentScriptReady: false });
  return false;
});

// Notify background that content script is ready
function notifyBackgroundReady() {
  chrome.runtime.sendMessage({
    type: 'contentScriptReady',
    url: window.location.href
  }).catch(() => {
    // Background might not be ready yet, that's okay
  });
}

// Load modules sequentially and initialize
async function loadAndInitialize() {
  if (isInitialized) return;
  
  try {
    console.log('Loading LeetPilot modules...');
    
    // Load modules sequentially to ensure dependencies are available
    await import('./content/monaco-detector.js');
    console.log('MonacoDetector loaded');
    
    await import('./content/keyboard-handler.js');
    console.log('KeyboardHandler loaded');
    
    await import('./content/editor-integration.js');
    console.log('EditorIntegration loaded');
    
    // Wait a bit for global scope to be populated
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Verify modules are available
    if (!window.__LeetPilotMonacoDetector ||
        !window.__LeetPilotKeyboardHandler ||
        !window.__LeetPilotEditorIntegration) {
      throw new Error('Required modules not loaded to global scope');
    }
    
    console.log('All modules loaded, initializing orchestrator...');
    
    // Now load and initialize orchestrator
    await import('./content/content-orchestrator.js');
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const ContentOrchestrator = window.__LeetPilotContentOrchestrator;
    if (!ContentOrchestrator) {
      throw new Error('ContentOrchestrator not available');
    }
    
    orchestrator = new ContentOrchestrator();
    await orchestrator.initialize();
    window.LeetPilotOrchestrator = orchestrator;
    isInitialized = true;
    console.log('LeetPilot content orchestrator initialized successfully');
    notifyBackgroundReady();
    
  } catch (error) {
    console.error('Failed to initialize content orchestrator:', error);
    isInitialized = false;
    
    chrome.runtime.sendMessage({
      type: 'error',
      message: 'Content script failed to initialize',
      error: error.message
    }).catch(() => {
      console.error('Failed to report content script error to background');
    });
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadAndInitialize);
} else {
  loadAndInitialize();
}

console.log('LeetPilot content script entry point loaded');