// Simple script to help reload the extension during development
// This can be run from the command line to trigger a reload

console.log('LeetPilot Extension Reload Helper');
console.log('================================');
console.log('');
console.log('To reload the extension:');
console.log('1. Open Chrome and go to chrome://extensions/');
console.log('2. Make sure "Developer mode" is enabled');
console.log('3. Click the reload button for LeetPilot');
console.log('4. Or use Ctrl+R on the extensions page');
console.log('');
console.log('To test the popup:');
console.log('1. Click the LeetPilot icon in the toolbar');
console.log('2. Open browser console (F12)');
console.log('3. Check for any error messages');
console.log('');
console.log('Common issues:');
console.log('- "Loading build info..." stuck: Background script not responding');
console.log('- Form not working: Module loading failed');
console.log('- No popup: Manifest or permissions issue');
console.log('');
console.log('Debug steps:');
console.log('1. Check background script console in chrome://extensions/');
console.log('2. Check popup console when popup is open');
console.log('3. Verify all files are present in the extension directory');