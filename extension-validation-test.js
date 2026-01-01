// Comprehensive Extension Validation Test
// Run this in Chrome DevTools to verify all fixes

console.log('🚀 Starting LeetPilot Extension Validation...');

// Test 1: Manifest Validation
console.log('\n📋 Testing Manifest...');
try {
  const manifest = chrome.runtime.getManifest();
  
  // Check for removed problematic keys
  if (!manifest.build_info && !manifest.update_url) {
    console.log('✅ Manifest: No problematic keys found');
  } else {
    console.log('❌ Manifest: Still contains problematic keys');
  }
  
  // Check CSP
  if (manifest.content_security_policy && 
      manifest.content_security_policy.extension_pages.includes('style-src')) {
    console.log('✅ Manifest: CSP allows inline styles');
  } else {
    console.log('❌ Manifest: CSP may not allow inline styles');
  }
  
} catch (error) {
  console.log('❌ Manifest: Error reading manifest -', error.message);
}

// Test 2: Service Worker Context Compatibility
console.log('\n🔧 Testing Service Worker Compatibility...');

// Test global context detection
function testGlobalContext() {
  const hasWindow = typeof window !== 'undefined';
  const hasGlobalThis = typeof globalThis !== 'undefined';
  const hasSelf = typeof self !== 'undefined';
  
  console.log(`Window available: ${hasWindow}`);
  console.log(`GlobalThis available: ${hasGlobalThis}`);
  console.log(`Self available: ${hasSelf}`);
  
  if (hasGlobalThis || hasSelf) {
    console.log('✅ Service Worker: Compatible global context available');
    return true;
  } else {
    console.log('❌ Service Worker: No compatible global context');
    return false;
  }
}

testGlobalContext();

// Test 3: XMLHttpRequest Availability
console.log('\n🌐 Testing XMLHttpRequest Availability...');
if (typeof XMLHttpRequest === 'undefined') {
  console.log('✅ Service Worker: XMLHttpRequest correctly unavailable (expected in service worker)');
} else {
  console.log('ℹ️ Browser Context: XMLHttpRequest available (expected in browser context)');
}

// Test 4: Storage Manager Functionality
console.log('\n💾 Testing Storage Manager...');
try {
  // Test if storage manager can be instantiated
  if (typeof LeetPilotStorage !== 'undefined') {
    console.log('✅ Storage Manager: Available in global context');
    
    // Test supported providers
    const providers = LeetPilotStorage.SUPPORTED_PROVIDERS;
    if (providers && providers.openai && providers.anthropic && providers.gemini) {
      console.log('✅ Storage Manager: All providers configured');
    } else {
      console.log('❌ Storage Manager: Missing provider configurations');
    }
  } else {
    console.log('❌ Storage Manager: Not available in global context');
  }
} catch (error) {
  console.log('❌ Storage Manager: Error -', error.message);
}

// Test 5: Security Monitor Functionality
console.log('\n🔒 Testing Security Monitor...');
try {
  if (typeof LeetPilotSecurity !== 'undefined') {
    console.log('✅ Security Monitor: Available in global context');
  } else {
    console.log('❌ Security Monitor: Not available in global context');
  }
} catch (error) {
  console.log('❌ Security Monitor: Error -', error.message);
}

// Test 6: Error Handler Functionality
console.log('\n⚠️ Testing Error Handler...');
try {
  if (typeof LeetPilotErrorHandler !== 'undefined') {
    console.log('✅ Error Handler: Available in global context');
  } else {
    console.log('❌ Error Handler: Not available in global context');
  }
} catch (error) {
  console.log('❌ Error Handler: Error -', error.message);
}

// Test 7: Input Validator Functionality
console.log('\n✅ Testing Input Validator...');
try {
  if (typeof LeetPilotValidator !== 'undefined') {
    console.log('✅ Input Validator: Available in global context');
  } else {
    console.log('❌ Input Validator: Not available in global context');
  }
} catch (error) {
  console.log('❌ Input Validator: Error -', error.message);
}

// Test 8: Chrome Storage API
console.log('\n🗄️ Testing Chrome Storage API...');
try {
  if (chrome && chrome.storage && chrome.storage.local) {
    console.log('✅ Chrome Storage: API available');
    
    // Test basic storage operation
    chrome.storage.local.set({ 'test_key': 'test_value' }, () => {
      if (chrome.runtime.lastError) {
        console.log('❌ Chrome Storage: Write test failed -', chrome.runtime.lastError.message);
      } else {
        console.log('✅ Chrome Storage: Write test successful');
        
        // Test read
        chrome.storage.local.get(['test_key'], (result) => {
          if (chrome.runtime.lastError) {
            console.log('❌ Chrome Storage: Read test failed -', chrome.runtime.lastError.message);
          } else if (result.test_key === 'test_value') {
            console.log('✅ Chrome Storage: Read test successful');
            
            // Cleanup
            chrome.storage.local.remove(['test_key']);
          } else {
            console.log('❌ Chrome Storage: Read test returned wrong value');
          }
        });
      }
    });
  } else {
    console.log('❌ Chrome Storage: API not available');
  }
} catch (error) {
  console.log('❌ Chrome Storage: Error -', error.message);
}

console.log('\n🎉 Extension validation test completed!');
console.log('\nIf you see mostly ✅ marks above, the extension should work properly.');
console.log('If you see ❌ marks, there may still be issues to resolve.');