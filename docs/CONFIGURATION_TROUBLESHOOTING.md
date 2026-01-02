# Configuration Saving Troubleshooting Guide

## Common Issues and Solutions

### Issue 1: Provider Validation Error
**Symptoms:** "No validation pattern for provider: customContext" or similar provider validation errors

**Debugging Steps:**
1. Open the extension popup
2. Open browser developer tools (F12)
3. Go to Console tab
4. Run `debugFormState()` to check form values
5. Look for any corrupted provider values

**Common Causes:**
- Browser autofill interfering with form values
- Extension conflicts
- Cached form data with invalid values
- JavaScript errors during form processing

**Solutions:**
1. Clear browser autofill data for the extension
2. Disable other extensions temporarily
3. Refresh the extension popup
4. Check console logs for the exact provider value being submitted

### Issue 2: Configuration Not Saving
**Symptoms:** Save button doesn't work, no success message, configuration doesn't persist

**Debugging Steps:**
1. Open the extension popup
2. Open browser developer tools (F12)
3. Go to Console tab
4. Try to save configuration and watch for error messages

**Common Causes:**
- Script loading failures
- Validation errors
- Chrome storage API issues
- Malformed API keys

### Issue 2: Scripts Not Loading
**Symptoms:** "Storage manager not initialized" error

**Solution:**
1. Check if the extension is properly installed
2. Reload the extension in chrome://extensions/
3. Check browser console for script loading errors

### Issue 3: Validation Failures
**Symptoms:** "Configuration validation failed" error

**Common Fixes:**
- Ensure API key format is correct for your provider
- Check that all required fields are filled
- For custom providers, ensure HTTPS URL is provided

### Issue 4: Chrome Storage Issues
**Symptoms:** Storage operations fail silently

**Solution:**
1. Check chrome://extensions/ - ensure storage permission is granted
2. Clear extension storage: chrome://settings/content/all?search=storage
3. Reload the extension

## Manual Testing

Run this in the popup console to test configuration saving:

```javascript
// Debug form state
debugFormState();

// Test provider validation
console.log('Testing provider values:');
['openai', 'anthropic', 'gemini', 'custom'].forEach(provider => {
  console.log(`${provider}:`, inputValidator ? inputValidator.validateAPIKey(provider, 'test-key') : 'No validator');
});

// Test basic storage
chrome.storage.local.set({test: 'value'}, () => {
  chrome.storage.local.get(['test'], (result) => {
    console.log('Storage test:', result.test === 'value' ? 'PASS' : 'FAIL');
  });
});

// Test configuration saving (replace with your actual values)
if (typeof storageManager !== 'undefined') {
  const testConfig = new LeetPilotStorage.AIProviderConfig(
    'openai',  // or your provider
    'your-api-key-here',
    'gpt-4',
    1000,
    0.7
  );
  
  storageManager.storeAPIKey(testConfig)
    .then(() => console.log('✅ Config saved'))
    .catch(err => console.error('❌ Config save failed:', err));
}
```

## Fixed Issues

### 1. Provider Value Corruption (NEW FIX)
**Issue:** "No validation pattern for provider: customContext" - provider values getting corrupted
**Root Cause:** Browser autofill, extension conflicts, or form processing issues causing provider values to be modified
**Fix:** Added provider value sanitization and validation with automatic correction for common issues

### 2. Custom Provider Validation Error (FIXED)
**Issue:** "Configuration validation failed: No validation pattern for provider: custom"
**Root Cause:** Missing validation pattern for custom providers in input validator
**Fix:** Added proper validation pattern for custom providers that allows flexible API key formats while maintaining security

### 2. Regex Pattern Error
Fixed malformed regex in input validator for custom elements.

### 3. Missing Custom API URL Parameter
Added missing customApiUrl parameter to handleTestAPIConnection function.

### 4. Enhanced Error Logging
Added comprehensive console logging to track configuration saving process.

### 5. Better Script Loading
Improved script loading with proper error handling and initialization checks.

## Verification Steps

After applying fixes:

1. Open extension popup
2. Fill in configuration form
3. Check browser console for any errors
4. Click "Save Configuration"
5. Look for success message
6. Verify configuration persists after closing/reopening popup

## Still Having Issues?

If configuration saving still doesn't work:

1. Check the browser console for specific error messages
2. Try the manual testing scripts above
3. Ensure you're using a valid API key format for your provider
4. Try reloading the extension completely
5. Check if there are any browser security policies blocking storage

### Issue 5: Custom Provider CSP (Content Security Policy) Errors
**Symptoms:** "Refused to connect to 'https://your-custom-api.com' because it violates the following Content Security Policy directive"

**Root Cause:** The extension's Content Security Policy (CSP) was too restrictive and only allowed connections to predefined AI provider domains (OpenAI, Anthropic, Google).

**Fix Applied:** 
- Updated `manifest.json` to allow HTTPS connections to any domain
- Modified CSP to use `connect-src 'self' https:` instead of specific domains
- Added `https://*/*` to host_permissions for broader custom provider support

**Verification:**
1. Configure a custom provider with any HTTPS API endpoint
2. The connection should no longer be blocked by CSP
3. You may still get authentication errors (401/403) which is expected with invalid API keys

**Test Script:**
Run this in the browser console to verify the fix:
```javascript
// Test if CSP allows custom provider connections
fetch('https://your-custom-api.com/v1/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ test: true })
}).then(() => {
  console.log('✅ CSP allows custom provider connections');
}).catch(error => {
  if (error.message.includes('Content Security Policy')) {
    console.error('❌ CSP still blocking:', error.message);
  } else {
    console.log('✅ CSP allows connection (other error expected):', error.message);
  }
});
```

**Important Notes:**
- Only HTTPS URLs are allowed for security reasons
- The security monitor still validates requests to prevent data leakage
- After updating manifest.json, you may need to reload the extension in chrome://extensions/

### Issue 6: Security Monitor Blocking Custom Provider Requests
**Symptoms:** "Data leakage detected - blocking request to unauthorized domain" even after CSP fix

**Root Cause:** The security monitor has additional domain validation that may be blocking custom provider requests.

**Debug Steps:**
1. Open browser developer tools (F12)
2. Go to Console tab
3. Look for "Security Monitor" log messages when making requests
4. Check if the domain is being properly extracted and validated

**Expected Log Output:**
```
Security Monitor - isDomainAllowed called with: https://apis.iflow.cn/v1/chat/completions
Security Monitor - Extracted domain: apis.iflow.cn
Security Monitor - Checking apis.iflow.cn against api.openai.com: false
Security Monitor - Checking apis.iflow.cn against api.anthropic.com: false
Security Monitor - Checking apis.iflow.cn against generativelanguage.googleapis.com: false
Security Monitor - Checking apis.iflow.cn against leetcode.com: false
Security Monitor - Is HTTPS: true
Security Monitor - Allowing custom provider domain (HTTPS): apis.iflow.cn
```

**Common Issues:**
- URL not starting with `https://` (security monitor only allows HTTPS)
- Domain extraction failing due to malformed URL
- Security monitor not properly initialized

**Manual Fix:**
If the security monitor is still blocking requests, you can temporarily disable it by commenting out the security check in `background/background.js`:

```javascript
// Comment out this section temporarily for testing
/*
if (securityMonitor) {
  const leakageCheck = securityMonitor.checkRequestForLeakage(url, options);
  const domainAllowed = securityMonitor.isDomainAllowed(url);
  
  if (leakageCheck.hasLeakage && !domainAllowed) {
    console.error('Data leakage detected - blocking request to unauthorized domain');
    throw new Error('Request blocked: Potential API key leakage to unauthorized domain');
  }
}
*/
```

**Permanent Fix:**
The security monitor should allow any HTTPS domain for custom providers. If it's still blocking, check the console logs to see exactly what's happening in the domain validation process.