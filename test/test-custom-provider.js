// Test script for custom provider API connection
// Run this in the browser console after configuring a custom provider

console.log('=== LeetPilot Custom Provider Test ===');

// Test the security monitor directly
if (typeof LeetPilotSecurity !== 'undefined') {
  const securityMonitor = new LeetPilotSecurity.SecurityMonitor();
  
  // Test various URLs
  const testUrls = [
    'https://api.openai.com/v1/chat/completions',
    'https://apis.iflow.cn/v1/chat/completions',
    'https://your-custom-api.com/v1/chat/completions',
    'http://insecure-api.com/v1/chat/completions', // Should fail
    'https://malicious-site.com/steal-keys' // Should pass (HTTPS) but might be blocked by other logic
  ];
  
  console.log('Testing domain validation:');
  testUrls.forEach(url => {
    const allowed = securityMonitor.isDomainAllowed(url);
    console.log(`${url}: ${allowed ? '✅ ALLOWED' : '❌ BLOCKED'}`);
  });
  
  // Test leakage detection
  console.log('\nTesting leakage detection:');
  const testRequest = {
    headers: {
      'Authorization': 'Bearer sk-test1234567890123456789012345678901234567890123456',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Hello' }]
    })
  };
  
  const leakageCheck = securityMonitor.checkRequestForLeakage('https://apis.iflow.cn/v1/chat/completions', testRequest);
  console.log('Leakage check result:', {
    hasLeakage: leakageCheck.hasLeakage,
    leakageTypes: leakageCheck.leakageTypes,
    sensitiveDataCount: leakageCheck.sensitiveDataFound?.length || 0
  });
  
} else {
  console.error('❌ LeetPilotSecurity not available');
}

// Test configuration saving with custom provider
async function testCustomProviderConfig() {
  console.log('\n=== Testing Custom Provider Configuration ===');
  
  if (typeof storageManager === 'undefined') {
    console.error('❌ Storage manager not available');
    return;
  }
  
  try {
    // Test configuration with custom provider
    const testConfig = new LeetPilotStorage.AIProviderConfig(
      'custom',
      'sk-test1234567890123456789012345678901234567890123456', // Test API key
      'gpt-3.5-turbo',
      1000,
      0.7,
      'https://apis.iflow.cn/v1/chat/completions' // Custom API URL
    );
    
    console.log('✅ Custom provider config created:', testConfig.getSanitized());
    
    // Validate the configuration
    const errors = testConfig.validate();
    if (errors.length > 0) {
      console.error('❌ Configuration validation failed:', errors);
      return;
    }
    
    console.log('✅ Configuration validation passed');
    
    // Test API connection (this will use the fixed security logic)
    console.log('🧪 Testing API connection...');
    
    // Send test request to background script
    chrome.runtime.sendMessage({
      type: 'testAPIConnection',
      config: testConfig
    }, (response) => {
      if (response && response.success) {
        console.log('✅ API connection test passed:', response.message);
      } else {
        console.log('ℹ️ API connection test result:', response?.error || 'Unknown error');
        console.log('Note: Authentication errors are expected with test API keys');
      }
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Add test function to window for manual execution
window.testCustomProviderConfig = testCustomProviderConfig;

console.log('💡 Run testCustomProviderConfig() to test custom provider configuration');
console.log('💡 Expected: Security checks should pass, authentication may fail (normal with test keys)');