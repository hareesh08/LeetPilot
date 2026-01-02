// LeetPilot Popup Interface - Modular Architecture
// Provides user configuration and settings management

import { PopupManager } from './popup-manager.js';

document.addEventListener('DOMContentLoaded', async function() {
  console.log('LeetPilot popup loaded');
  
  try {
    const popupManager = new PopupManager();
    await popupManager.initialize();
    console.log('Popup manager initialized successfully');
  } catch (error) {
    console.error('Failed to initialize popup manager:', error);
    showFallbackInterface();
  }
});

// Fallback interface for initialization failures
function showFallbackInterface() {
  console.log('Initializing fallback interface');
  
  // Update build version immediately
  const buildVersionElement = document.getElementById('buildVersion');
  if (buildVersionElement) {
    try {
      const manifest = chrome.runtime.getManifest();
      buildVersionElement.textContent = `v${manifest.version}`;
    } catch (error) {
      buildVersionElement.textContent = 'v1.0.0';
    }
  }
  
  // Show error message
  const statusDiv = document.getElementById('status');
  if (statusDiv) {
    statusDiv.textContent = 'Extension modules failed to load. Please refresh the extension or restart your browser.';
    statusDiv.className = 'status error';
    statusDiv.style.display = 'block';
  }
  
  // Setup basic form handler
  const form = document.getElementById('configForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      if (statusDiv) {
        statusDiv.textContent = 'Extension is not fully loaded. Please refresh and try again.';
        statusDiv.className = 'status error';
        statusDiv.style.display = 'block';
      }
    });
  }
}