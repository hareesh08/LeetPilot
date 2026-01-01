// Security and Validation Tests
// Basic tests to verify security monitoring and input validation functionality

// Mock Chrome APIs for testing
global.chrome = {
  runtime: {
    id: 'test-extension-id'
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn()
    }
  }
};

// Mock fetch for testing
global.fetch = jest.fn();
global.window = global;
global.URL = require('url').URL;

// Import modules
const { SecurityMonitor } = require('../src/security-monitor.js');
const { InputValidator } = require('../src/input-validator.js');

describe('Security Monitor', () => {
  let securityMonitor;

  beforeEach(() => {
    securityMonitor = new SecurityMonitor();
  });

  test('should detect API keys in content', () => {
    const testContent = 'Here is my API key: sk-1234567890abcdef1234567890abcdef1234567890abcdef';
    const result = securityMonitor.checkDataForLeakage(testContent);
    
    expect(result.hasLeakage).toBe(true);
    expect(result.sensitiveDataFound.length).toBeGreaterThan(0);
  });

  test('should allow requests to authorized domains', () => {
    const openaiUrl = 'https://api.openai.com/v1/chat/completions';
    const result = securityMonitor.isDomainAllowed(openaiUrl);
    
    expect(result).toBe(true);
  });

  test('should block requests to unauthorized domains', () => {
    const maliciousUrl = 'https://evil.com/steal-data';
    const result = securityMonitor.isDomainAllowed(maliciousUrl);
    
    expect(result).toBe(false);
  });

  test('should mask sensitive data in logs', () => {
    const apiKey = 'sk-1234567890abcdef1234567890abcdef1234567890abcdef';
    const masked = securityMonitor.maskSensitiveData(apiKey);
    
    expect(masked).not.toBe(apiKey);
    expect(masked).toContain('*');
    expect(masked.length).toBeGreaterThan(8);
  });
});

describe('Input Validator', () => {
  let inputValidator;

  beforeEach(() => {
    inputValidator = new InputValidator();
  });

  test('should validate OpenAI API key format', () => {
    const validKey = 'sk-' + 'a'.repeat(48);
    const result = inputValidator.validateAPIKey('openai', validKey);
    
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  test('should reject invalid API key format', () => {
    const invalidKey = 'invalid-key';
    const result = inputValidator.validateAPIKey('openai', invalidKey);
    
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('should validate configuration object', () => {
    const config = {
      provider: 'openai',
      apiKey: 'sk-' + 'a'.repeat(48),
      model: 'gpt-4',
      maxTokens: 1000,
      temperature: 0.7
    };
    
    const result = inputValidator.validateConfiguration(config);
    
    expect(result.valid).toBe(true);
    expect(result.sanitized.provider).toBe('openai');
  });

  test('should sanitize dangerous content', () => {
    const dangerousContent = '<script>alert("xss")</script>Hello World';
    const result = inputValidator.sanitizeText(dangerousContent);
    
    expect(result).not.toContain('<script>');
    expect(result).toContain('Hello World');
  });

  test('should validate code context', () => {
    const context = {
      problemTitle: 'Two Sum',
      problemDescription: 'Find two numbers that add up to target',
      currentCode: 'function twoSum(nums, target) {\n  // code here\n}',
      language: 'javascript',
      cursorPosition: 50,
      selectedText: ''
    };
    
    const result = inputValidator.validateCodeContext(context);
    
    expect(result.valid).toBe(true);
    expect(result.sanitized.language).toBe('javascript');
  });

  test('should reject unsupported programming language', () => {
    const result = inputValidator.validateLanguage('malicious-lang');
    
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('should validate and sanitize AI response', () => {
    const response = 'Here is a helpful coding suggestion:\n\nfunction solution() {\n  return "safe code";\n}';
    const result = inputValidator.validateAIResponse(response);
    
    expect(result.valid).toBe(true);
    expect(result.sanitized).toContain('function solution');
  });

  test('should detect and filter dangerous AI response', () => {
    const dangerousResponse = '<script>alert("xss")</script>Here is your code solution';
    const result = inputValidator.validateAIResponse(dangerousResponse);
    
    expect(result.sanitized).not.toContain('<script>');
    expect(result.sanitized).toContain('Here is your code solution');
  });

  test('should validate URL security', () => {
    const httpsUrl = 'https://api.openai.com/v1/chat/completions';
    const result = inputValidator.validateURL(httpsUrl);
    
    expect(result.valid).toBe(true);
  });

  test('should reject non-HTTPS URLs', () => {
    const httpUrl = 'http://api.openai.com/v1/chat/completions';
    const result = inputValidator.validateURL(httpUrl);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('URL must use HTTPS protocol');
  });

  test('should sanitize error messages', () => {
    const errorWithApiKey = 'Authentication failed with key sk-1234567890abcdef1234567890abcdef1234567890abcdef';
    const sanitized = inputValidator.sanitizeErrorMessage(errorWithApiKey);
    
    expect(sanitized).not.toContain('sk-1234567890abcdef1234567890abcdef1234567890abcdef');
    expect(sanitized).toContain('[API_KEY_REDACTED]');
  });
});

describe('Integration Tests', () => {
  test('should work together for comprehensive security', () => {
    const securityMonitor = new SecurityMonitor();
    const inputValidator = new InputValidator();
    
    // Test a potentially dangerous request
    const maliciousUrl = 'https://evil.com/steal';
    const requestWithApiKey = {
      body: JSON.stringify({
        apiKey: 'sk-1234567890abcdef1234567890abcdef1234567890abcdef',
        data: 'some data'
      })
    };
    
    // Security monitor should detect the issue
    const domainCheck = securityMonitor.isDomainAllowed(maliciousUrl);
    const leakageCheck = securityMonitor.checkRequestForLeakage(maliciousUrl, requestWithApiKey);
    
    expect(domainCheck).toBe(false);
    expect(leakageCheck.hasLeakage).toBe(true);
    
    // Input validator should sanitize the content
    const urlValidation = inputValidator.validateURL(maliciousUrl);
    expect(urlValidation.valid).toBe(false);
  });
});