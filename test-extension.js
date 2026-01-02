// Simple test script to verify extension functionality
// Run this in the browser console on the popup page

console.log('Testing LeetPilot extension...');

// Test 1: Check if popup elements exist
const elements = {
  provider: document.getElementById('provider'),
  apiKey: document.getElementById('apiKey'),
  buildVersion: document.getElementById('buildVersion'),
  status: document.getElementById('status')
};

console.log('Popup elements:', elements);

// Test 2: Check if chrome.runtime is available
console.log('Chrome runtime available:', typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined');

// Test 3: Try to get manifest
try {
  const manifest = chrome.runtime.getManifest();
  console.log('Manifest loaded:', manifest.name, manifest.version);
} catch (error) {
  console.error('Failed to load manifest:', error);
}

// Test 4: Try to send a ping message to background
if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.sendMessage({ type: 'ping' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Ping failed:', chrome.runtime.lastError);
    } else {
      console.log('Ping successful:', response);
    }
  });
}

console.log('Extension test completed');