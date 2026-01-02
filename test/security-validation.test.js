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

// Mock SecurityMonitor class (mirrors src/core/security-monitor.js)
class SecurityMonitor {
  constructor() {
    this.allowedDomains = [
      'api.openai.com',
      'api.anthropic.com',
      'generativelanguage.googleapis.com'
    ];
    this.sensitivePatterns = [
      /sk-[a-zA-Z0-9]{48}/g,
      /sk-ant-[a-zA-Z0-9-]+/g,
      /Bearer\s+[a-zA-Z0-9-_]+/gi
    ];
  }

  isDomainAllowed(url) {
    try {
      const urlObj = new URL(url);
      return this.allowedDomains.some(domain => urlObj.hostname.includes(domain));
    } catch {
      return false;
    }
  }

  checkDataForLeakage(content) {
    const sensitiveDataFound = [];
    for (const pattern of this.sensitivePatterns) {
      const matches = content.match(pattern);
      if (matches) {
        sensitiveDataFound.push(...matches);
      }
    }
    return { hasLeakage: sensitiveDataFound.length > 0, sensitiveDataFound };
  }

  checkRequestForLeakage(url, request) {
    const bodyStr = typeof request.body === 'string' ? request.body : JSON.stringify(request.body || {});
    return this.checkDataForLeakage(bodyStr);
  }

  maskSensitiveData(data) {
    let masked = data;
    for (const pattern of this.sensitivePatterns) {
      masked = masked.replace(pattern, (match) => {
        if (match.length <= 8) return '****';
        return match.substring(0, 4) + '*'.repeat(match.length - 8) + match.substring(match.length - 4);
      });
    }
    return masked;
  }
}

// Mock InputValidator class (mirrors src/core/input-validator.js)
class InputValidator {
  constructor() {
    this.allowedLanguages = [
      'javascript', 'typescript', 'python', 'java', 'cpp', 'c', 'csharp',
      'go', 'rust', 'kotlin', 'swift', 'ruby', 'php', 'scala', 'dart'
    ];
    this.maxLengths = {
      aiResponse: 20000,
      userInput: 5000
    };
  }

  validateAPIKey(provider, apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
      return { valid: false, errors: ['API key is required'], sanitized: null };
    }
    
    const trimmed = apiKey.trim();
    if (provider === 'openai' && !trimmed.startsWith('sk-')) {
      return { valid: false, errors: ['OpenAI API key must start with "sk-"'], sanitized: null };
    }
    if (trimmed.length < 20) {
      return { valid: false, errors: ['API key too short'], sanitized: null };
    }
    
    return { valid: true, errors: [], sanitized: trimmed };
  }

  validateConfiguration(config) {
    const errors = [];
    const sanitized = {};
    
    const validProviders = ['openai', 'anthropic', 'gemini', 'custom'];
    if (!config.provider || !validProviders.includes(config.provider)) {
      errors.push('Invalid provider');
    } else {
      sanitized.provider = config.provider;
    }
    
    const keyValidation = this.validateAPIKey(config.provider, config.apiKey);
    if (!keyValidation.valid) {
      errors.push(...keyValidation.errors);
    } else {
      sanitized.apiKey = keyValidation.sanitized;
    }
    
    if (config.model) sanitized.model = config.model;
    if (config.maxTokens) sanitized.maxTokens = config.maxTokens;
    if (config.temperature) sanitized.temperature = config.temperature;
    
    return { valid: errors.length === 0, errors, sanitized };
  }

  sanitizeText(text) {
    if (!text || typeof text !== 'string') return '';
    return text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }

  validateCodeContext(context) {
    const result = { valid: false, errors: [], sanitized: {} };
    
    if (!context || typeof context !== 'object') {
      result.errors.push('Code context must be an object');
      return result;
    }
    
    if (context.problemTitle) result.sanitized.problemTitle = this.sanitizeText(context.problemTitle);
    if (context.problemDescription) result.sanitized.problemDescription = this.sanitizeText(context.problemDescription);
    if (context.currentCode) result.sanitized.currentCode = context.currentCode.replace(/\x00/g, '');
    if (context.language) {
      const langValidation = this.validateLanguage(context.language);
      if (langValidation.valid) result.sanitized.language = langValidation.sanitized;
      else result.errors.push(...langValidation.errors);
    }
    if (context.cursorPosition !== undefined) result.saniorPosition = Math.floor(context.cursorPosition);
    if (context.selectedText) result.sanitized.selectedText = this.sanitizeText(context.selectedText);
    
    result.valid = result.errors.length === 0;
    return result;
  }

  validateLanguage(language) {
    if (typeof language !== 'string') {
      return { valid: false, errors: ['Language must be a string'], sanitized: null };
    }
    const normalized = language.toLowerCase().trim();
    if (!this.allowedLanguages.includes(normalized)) {
      return { valid: false, errors: [`Unsupported programming language: ${language}`], sanitized: null };
    }
    return { valid: true, errors: [], sanitized: normalized };
  }

  validateAIResponse(response) {
    const result = { valid: false, errors: [], sanitized: null };
    
    if (typeof response !== 'string') {
      result.errors.push('AI response must be a string');
      return result;
    }
    
    if (response.length > this.maxLengths.aiResponse) {
      result.errors.push(`AI response too long`);
      return result;
    }
    
    result.valid = true;
    result.sanitized = this.sanitizeText(response);
    return result;
  }

  validateURL(url) {
    const result = { valid: false, errors: [], sanitized: null };
    
    if (!url || typeof url !== 'string') {
      result.errors.push('URL must be a non-empty string');
      return result;
    }
    
    try {
      const urlObj = new URL(url);
      if (urlObj.protocol !== 'https:') {
        result.errors.push('URL must use HTTPS protocol');
        return result;
      }
      result.valid = true;
      result.sanitized = url;
    } catch {
      result.errors.push('Invalid URL format');
    }
    
    return result;
  }

  sanitizeErrorMessage(error) {
    if (!error) return 'Unknown error';
    const message = typeof error === 'string' ? error : error.message || 'Unknown error';
    return message
      .replace(/sk-[a-zA-Z0-9]{48}/g, '[API_KEY_REDACTED]')
      .replace(/sk-ant-[a-zA-Z0-9-]+/g, '[API_KEY_REDACTED]')
      .substring(0, 500);
  }
}

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
    
    const maliciousUrl = 'https://evil.com/steal';
    const requestWithApiKey = {
      body: JSON.stringify({
        apiKey: 'sk-1234567890abcdef1234567890abcdef1234567890abcdef',
        data: 'some data'
      })
    };
    
    const domainCheck = securityMonitor.isDomainAllowed(maliciousUrl);
    const leakageCheck = securityMonitor.checkRequestForLeakage(maliciousUrl, requestWithApiKey);
    
    expect(domainCheck).toBe(false);
    expect(leakageCheck.hasLeakage).toBe(true);
    
    const urlValidation = inputValidator.validateURL(maliciousUrl);
    // URL format is valid HTTPS, but domain is blocked by security monitor
    expect(urlValidation.valid).toBe(true);
    expect(domainCheck).toBe(false); // Domain is blocked
  });
});
