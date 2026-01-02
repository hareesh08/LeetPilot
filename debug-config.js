// Debug script for configuration saving issues
// Open the extension popup and run this in the browser console

console.log('=== LeetPilot Configuration Debug ===');

// Check if we're in the popup context
if (typeof chrome === 'undefined') {
  console.error('❌ Chrome APIs not available - make sure you\'re running this in the extension popup');
} else {
  console.log('✅ Chrome APIs available');
}

// Check storage permissions
chrome.storage.local.get(null, (items) => {
  console.log('📦 Current storage contents:', items);
  console.log('📊 Storage items count:', Object.keys(items).length);
});

// Check if scripts are loaded
setTimeout(() => {
  console.log('🔍 Checking loaded scripts...');
  
  if (typeof LeetPilotStorage !== 'undefined') {
    console.log('✅ LeetPilotStorage loaded');
    
    try {
      const sm = new LeetPilotStorage.StorageManager();
      console.log('✅ StorageManager can be instantiated');
      
      // Test basic functionality
      sm.getSupportedProviders();
      console.log('✅ getSupportedProviders() works');
      
    } catch (error) {
      console.error('❌ StorageManager error:', error);
    }
  } else {
    console.error('❌ LeetPilotStorage not loaded');
  }
  
  if (typeof LeetPilotValidator !== 'undefined') {
    console.log('✅ LeetPilotValidator loaded');
    
    try {
      const iv = new LeetPilotValidator.InputValidator();
      console.log('✅ InputValidator can be instantiated');
    } catch (error) {
      console.error('❌ InputValidator error:', error);
    }
  } else {
    console.error('❌ LeetPilotValidator not loaded');
  }
  
  // Check form elements
  const form = document.getElementById('configForm');
  const provider = document.getElementById('provider');
  const apiKey = document.getElementById('apiKey');
  const saveButton = document.getElementById('saveButton');
  
  if (form && provider && apiKey && saveButton) {
    console.log('✅ Form elements found');
    console.log('📝 Current form values:', {
      provider: provider.value,
      apiKey: apiKey.value ? '[REDACTED]' : 'empty',
      hasEventListeners: form.onsubmit !== null
    });
  } else {
    console.error('❌ Form elements missing');
  }
  
}, 1000);

// Test configuration saving manually
window.testConfigSave = async function() {
  console.log('🧪 Testing configuration save...');
  
  try {
    if (typeof storageManager === 'undefined') {
      console.error('❌ storageManager not available globally');
      return;
    }
    
    const testConfig = new LeetPilotStorage.AIProviderConfig(
      'openai',
      'sk-test1234567890123456789012345678901234567890123456',
      'gpt-4',
      1000,
      0.7
    );
    
    console.log('📝 Test config created:', testConfig.getSanitized());
    
    await storageManager.storeAPIKey(testConfig);
    console.log('✅ Test config saved successfully');
    
    const retrieved = await storageManager.retrieveConfiguration();
    console.log('📖 Retrieved config:', retrieved ? retrieved.getSanitized() : 'null');
    
    if (retrieved) {
      console.log('🎉 Configuration save/load test PASSED');
    } else {
      console.error('❌ Configuration save/load test FAILED - could not retrieve');
    }
    
  } catch (error) {
    console.error('❌ Configuration save test failed:', error);
  }
};

console.log('💡 Run testConfigSave() to test configuration saving manually');
console.log('💡 Check the browser console for any error messages when saving');