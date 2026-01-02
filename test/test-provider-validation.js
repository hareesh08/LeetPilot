// Test script for provider validation fix
// Run this in the browser console when the popup is open

console.log('=== PROVIDER VALIDATION TEST ===');

// Test 1: Check form elements
console.log('1. Form Elements Check:');
const providerSelect = document.getElementById('provider');
console.log('Provider select found:', !!providerSelect);
console.log('Provider options:', Array.from(providerSelect.options).map(opt => ({
  value: JSON.stringify(opt.value),
  text: opt.text
})));

// Test 2: Check validation patterns
console.log('\n2. Validation Patterns Check:');
if (typeof inputValidator !== 'undefined') {
  console.log('Input validator available:', !!inputValidator);
  console.log('Allowed providers:', inputValidator.allowedProviders);
  console.log('API key patterns:', Object.keys(inputValidator.apiKeyPatterns));
} else {
  console.log('Input validator not available');
}

// Test 3: Test provider validation
console.log('\n3. Provider Validation Test:');
const testProviders = ['openai', 'anthropic', 'gemini', 'custom', 'customContext', 'invalid'];
testProviders.forEach(provider => {
  if (typeof inputValidator !== 'undefined') {
    const result = inputValidator.validateAPIKey(provider, 'test-key-12345');
    console.log(`${provider}:`, result.valid ? 'VALID' : `INVALID - ${result.errors.join(', ')}`);
  }
});

// Test 4: Test form submission simulation
console.log('\n4. Form Submission Simulation:');
function testFormSubmission(testProvider) {
  console.log(`Testing with provider: ${JSON.stringify(testProvider)}`);
  
  // Simulate the sanitization logic
  const validProviders = ['openai', 'anthropic', 'gemini', 'custom'];
  let sanitizedProvider = testProvider;
  
  if (!validProviders.includes(testProvider)) {
    console.log(`Invalid provider detected: ${testProvider}`);
    if (testProvider && testProvider.toLowerCase().includes('custom')) {
      sanitizedProvider = 'custom';
      console.log(`Corrected to: ${sanitizedProvider}`);
    } else {
      console.log('Cannot correct provider');
      return false;
    }
  }
  
  console.log(`Final provider: ${sanitizedProvider}`);
  return true;
}

// Test various provider values
['openai', 'custom', 'customContext', 'customProvider', 'invalid'].forEach(testFormSubmission);

console.log('\n=== TEST COMPLETE ===');