# Monaco Editor Detection Fixes

## Issues Fixed

### 1. Chrome Tabs API Error (Line 301)
**Problem**: Content scripts cannot access `chrome.tabs.query` API, causing "Cannot read properties of undefined (reading 'query')" error.

**Solution**: 
- Removed `chrome.tabs.query` calls from content script
- Added `needsTabId: true` flag to requests that need tab ID
- Updated background script to inject tab ID from `sender.tab.id`

### 2. Monaco Editor Detection Timeout
**Problem**: Monaco Editor detection was failing after 30 attempts, likely due to outdated selectors.

**Solution**:
- Added more comprehensive selectors:
  - `.monaco-editor-background`
  - `.inputarea`
  - `.overflow-guard`
  - `.lines-content`
  - `[role="textbox"]`
- Improved fallback detection for elements with Monaco-like characteristics
- Enhanced `isMainCodeEditor` function with better validation

### 3. Poor Error Handling
**Problem**: No user feedback when Monaco Editor detection fails.

**Solution**:
- Added `showEditorDetectionFailure()` function to display user-friendly notifications
- Enhanced error handling in all request functions
- Added `editorNotFound` flag to context extraction
- Improved runtime error detection with `chrome.runtime.lastError` checks

## Code Changes

### Content Script (`content/content.js`)

1. **Removed chrome.tabs.query usage**:
```javascript
// Before (causing error)
chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
  const tabId = tabs[0]?.id || 'default';
  // ...
});

// After (fixed)
chrome.runtime.sendMessage({
  type: 'hint',
  context: context,
  needsTabId: true  // Background script will add tab ID
}, (response) => {
  // ...
});
```

2. **Enhanced Monaco Editor detection**:
```javascript
// Added more selectors and fallback detection
const editorSelectors = [
  '.monaco-editor',
  '.view-lines',
  '[data-mode-id]',
  '.editor-scrollable',
  '.monaco-editor-background',  // New
  '.inputarea',                 // New
  '.overflow-guard',            // New
  '.lines-content'              // New
];
```

3. **Improved error handling**:
```javascript
// Check if editor was found before making requests
if (context.editorNotFound) {
  displayError(
    'Code editor not detected. Please make sure you are on a LeetCode problem page with the code editor visible.',
    'config',
    false
  );
  return;
}
```

### Background Script (`background/background.js`)

1. **Added tab ID injection**:
```javascript
// Handle tab ID requests by adding tab ID to the request
if (request.needsTabId && sender.tab) {
  request.tabId = sender.tab.id;
  delete request.needsTabId; // Clean up the flag
}
```

## Testing

Created comprehensive test suite in `test/test-monaco-detection.js` that verifies:
- ✅ `chrome.tabs.query` removed from content script
- ✅ `needsTabId` flag implementation
- ✅ Background script tab ID handling
- ✅ Improved Monaco Editor selectors
- ✅ Error handling for editor not found

## User Experience Improvements

1. **Better Feedback**: Users now see helpful notifications when the editor isn't detected
2. **More Reliable Detection**: Expanded selectors work with LeetCode's current DOM structure
3. **Graceful Degradation**: Extension provides meaningful error messages instead of silent failures
4. **Automatic Retry**: Some errors now include retry mechanisms

## Browser Compatibility

These fixes ensure compatibility with:
- Chrome Manifest V3 requirements
- Modern LeetCode interface updates
- Content script security restrictions

## Future Considerations

1. **Dynamic Detection**: Consider using MutationObserver to detect editor changes
2. **Selector Updates**: Monitor LeetCode for future DOM structure changes
3. **Performance**: Current polling approach could be optimized with event-based detection