// Test script to verify custom provider domain handling in SecurityMonitor

// Import the SecurityMonitor
const { SecurityMonitor } = require('./src/security-monitor.js');

console.log('Testing SecurityMonitor custom provider support...\n');

// Create a new SecurityMonitor instance
const monitor = new SecurityMonitor();

// Test cases
const testCases = [
  // Known providers (should be allowed)
  { url: 'https://api.openai.com/v1/chat/completions', expected: true, description: 'OpenAI API' },
  { url: 'https://api.anthropic.com/v1/messages', expected: true, description: 'Anthropic API' },
  { url: 'https://generativelanguage.googleapis.com/v1/models', expected: true, description: 'Google Gemini API' },
  { url: 'https://leetcode.com/api/problems', expected: true, description: 'LeetCode API' },
  
  // Custom providers (should be allowed via HTTPS check)
  { url: 'https://api.example.com/v1/chat/completions', expected: true, description: 'Custom provider (HTTPS)' },
  { url: 'https://my-custom-ai.herokuapp.com/api/chat', expected: true, description: 'Custom Heroku provider' },
  { url: 'https://localhost:8080/api/chat', expected: true, description: 'Local custom provider (HTTPS)' },
  
  // Should be blocked
  { url: 'http://api.example.com/v1/chat/completions', expected: false, description: 'Custom provider (HTTP - insecure)' },
  { url: 'ftp://api.example.com/data', expected: false, description: 'Non-HTTPS protocol' },
];

console.log('Testing domain allowance...\n');

testCases.forEach((testCase, index) => {
  try {
    const result = monitor.isDomainAllowed(testCase.url);
    const status = result === testCase.expected ? '✅ PASS' : '❌ FAIL';
    console.log(`${index + 1}. ${status} - ${testCase.description}`);
    console.log(`   URL: ${testCase.url}`);
    console.log(`   Expected: ${testCase.expected}, Got: ${result}`);
    
    if (result !== testCase.expected) {
      console.log(`   ⚠️  Test failed!`);
    }
    console.log('');
  } catch (error) {
    console.log(`${index + 1}. ❌ ERROR - ${testCase.description}`);
    console.log(`   Error: ${error.message}`);
    console.log('');
  }
});

// Test custom provider detection
console.log('Testing custom provider detection...\n');

const customProviderTests = [
  { url: 'https://api.openai.com/v1/chat/completions', expected: false, description: 'Known OpenAI provider' },
  { url: 'https://api.example.com/v1/chat/completions', expected: true, description: 'Unknown HTTPS provider' },
  { url: 'http://api.example.com/v1/chat/completions', expected: false, description: 'Unknown HTTP provider' },
];

customProviderTests.forEach((testCase, index) => {
  try {
    const result = monitor.isLikelyCustomProvider(testCase.url);
    const status = result === testCase.expected ? '✅ PASS' : '❌ FAIL';
    console.log(`${index + 1}. ${status} - ${testCase.description}`);
    console.log(`   URL: ${testCase.url}`);
    console.log(`   Expected: ${testCase.expected}, Got: ${result}`);
    console.log('');
  } catch (error) {
    console.log(`${index + 1}. ❌ ERROR - ${testCase.description}`);
    console.log(`   Error: ${error.message}`);
    console.log('');
  }
});

console.log('Test completed!');