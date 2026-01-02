// Test script to debug configuration saving issues
// Run this in the browser console on the popup page

async function testConfigurationSaving() {
  console.log('Testing configuration saving...');
  
  try {
    // Test 1: Check if Chrome storage API is available
    if (typeof chrome === 'undefined' || !chrome.storage) {
      console.error('Chrome storage API not available');
      return;
    }
    
    // Test 2: Try basic storage operation
    const testData = { test: 'value', timestamp: Date.now() };
    await chrome.storage.local.set({ 'test_key': testData });
    console.log('✓ Basic storage write successful');
    
    const retrieved = await chrome.storage.local.get(['test_key']);
    if (retrieved.test_key && retrieved.test_key.test === 'value') {
      console.log('✓ Basic storage read successful');
    } else {
      console.error('✗ Basic storage read failed');
      return;
    }
    
    // Test 3: Check if storage manager is loaded
    if (typeof LeetPilotStorage === 'undefined') {
      console.error('✗ LeetPilotStorage not loaded');
      return;
    }
    console.log('✓ LeetPilotStorage loaded');
    
    // Test 4: Check if input validator is loaded
    if (typeof LeetPilotValidator === 'undefined') {
      console.error('✗ LeetPilotValidator not loaded');
      return;
    }
    console.log('✓ LeetPilotValidator loaded');
    
    // Test 5: Try creating storage manager
    const storageManager = new LeetPilotStorage.StorageManager();
    console.log('✓ StorageManager created');
    
    // Test 6: Try creating input validator
    const inputValidator = new LeetPilotValidator.InputValidator();
    console.log('✓ InputValidator created');
    
    // Test 7: Test configuration validation
    const testConfig = {
      provider: 'openai',
      apiKey: 'sk-test1234567890123456789012345678901234567890123456',
      model: 'gpt-4',
      maxTokens: 1000,
      temperature: 0.7
    };
    
    const validation = inputValidator.validateConfiguration(testConfig);
    console.log('Configuration validation result:', validation);
    
    if (!validation.valid) {
      console.error('✗ Configuration validation failed:', validation.errors);
      return;
    }
    console.log('✓ Configuration validation passed');
    
    // Test 8: Try creating AIProviderConfig
    const config = new LeetPilotStorage.AIProviderConfig(
      testConfig.provider,
      testConfig.apiKey,
      testConfig.model,
      testConfig.maxTokens,
      testConfig.temperature
    );
    
    const configErrors = config.validate();
    if (configErrors.length > 0) {
      console.error('✗ AIProviderConfig validation failed:', configErrors);
      return;
    }
    console.log('✓ AIProviderConfig validation passed');
    
    // Test 9: Try storing configuration
    await storageManager.storeAPIKey(config);
    console.log('✓ Configuration stored successfully');
    
    // Test 10: Try retrieving configuration
    const retrieved_config = await storageManager.retrieveConfiguration();
    if (retrieved_config) {
      console.log('✓ Configuration retrieved successfully:', retrieved_config.getSanitized());
    } else {
      console.error('✗ Configuration retrieval failed');
      return;
    }
    
    // Cleanup
    await chrome.storage.local.remove(['test_key']);
    
    console.log('🎉 All tests passed! Configuration saving should work.');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    console.error('Error stack:', error.stack);
  }
}

// Run the test
testConfigurationSaving();