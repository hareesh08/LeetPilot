// LeetPilot Input Validator
// Comprehensive input validation and sanitization for all user inputs and AI responses

/**
 * Input Validator for comprehensive validation and sanitization
 */
class InputValidator {
  constructor() {
    // API key validation patterns
    this.apiKeyPatterns = {
      openai: {
        pattern: /^sk-[a-zA-Z0-9]{48}$/,
        minLength: 51,
        maxLength: 51,
        prefix: 'sk-'
      },
      anthropic: {
        pattern: /^sk-ant-[a-zA-Z0-9]{95}$/,
        minLength: 103,
        maxLength: 103,
        prefix: 'sk-ant-'
      },
      gemini: {
        pattern: /^[a-zA-Z0-9_-]{39}$/,
        minLength: 39,
        maxLength: 39,
        prefix: null
      },
      customElements: {
        pattern: /^[a-zA-Z0-9]{48}$/,
        minLength: 1,
        maxLength: 100,
        prefix: null
      }
    };

    // Dangerous content patterns to filter out
    this.dangerousPatterns = [
      // Script injection
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      
      // HTML injection
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
      /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
      
      // Data URLs that could be dangerous
      /data:text\/html/gi,
      /data:application\/javascript/gi,
      
      // Potential XSS vectors
      /vbscript:/gi,
      /expression\s*\(/gi,
      /@import/gi,
      
      // SQL injection patterns (basic)
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
      
      // Command injection patterns
      /(\||&|;|\$\(|\`)/g,
      
      // Path traversal
      /\.\.[\/\\]/g,
      
      // Null bytes
      /\x00/g
    ];

    // Content Security Policy violations
    this.cspViolations = [
      /eval\s*\(/gi,
      /Function\s*\(/gi,
      /setTimeout\s*\(\s*["']/gi,
      /setInterval\s*\(\s*["']/gi
    ];

    // Maximum lengths for different input types
    this.maxLengths = {
      apiKey: 200,
      modelName: 100,
      problemTitle: 500,
      problemDescription: 10000,
      code: 50000,
      language: 50,
      userInput: 5000,
      aiResponse: 20000
    };

    // Allowed programming languages
    this.allowedLanguages = [
      'javascript', 'typescript', 'python', 'java', 'cpp', 'c', 'csharp',
      'go', 'rust', 'kotlin', 'swift', 'ruby', 'php', 'scala', 'dart'
    ];

    // Allowed AI providers
    this.allowedProviders = ['openai', 'anthropic', 'gemini'];
  }

  /**
   * Validate API key format and structure
   */
  validateAPIKey(provider, apiKey) {
    const result = {
      valid: false,
      errors: [],
      sanitized: null
    };

    // Basic validation
    if (!apiKey || typeof apiKey !== 'string') {
      result.errors.push('API key is required and must be a string');
      return result;
    }

    // Length validation
    if (apiKey.length > this.maxLengths.apiKey) {
      result.errors.push(`API key too long (max ${this.maxLengths.apiKey} characters)`);
      return result;
    }

    // Trim whitespace
    const trimmedKey = apiKey.trim();
    if (trimmedKey !== apiKey) {
      result.sanitized = trimmedKey;
    }

    // Provider-specific validation
    if (!this.allowedProviders.includes(provider)) {
      result.errors.push('Invalid AI provider');
      return result;
    }

    const providerPattern = this.apiKeyPatterns[provider];
    if (!providerPattern) {
      result.errors.push(`No validation pattern for provider: ${provider}`);
      return result;
    }

    // Check length requirements
    if (trimmedKey.length < providerPattern.minLength || trimmedKey.length > providerPattern.maxLength) {
      result.errors.push(`API key length invalid for ${provider} (expected ${providerPattern.minLength}-${providerPattern.maxLength} characters)`);
      return result;
    }

    // Check prefix if required
    if (providerPattern.prefix && !trimmedKey.startsWith(providerPattern.prefix)) {
      result.errors.push(`API key must start with ${providerPattern.prefix} for ${provider}`);
      return result;
    }

    // Check pattern match
    if (!providerPattern.pattern.test(trimmedKey)) {
      result.errors.push(`API key format invalid for ${provider}`);
      return result;
    }

    // Check for dangerous content
    const dangerousCheck = this.checkForDangerousContent(trimmedKey);
    if (!dangerousCheck.safe) {
      result.errors.push('API key contains potentially dangerous content');
      return result;
    }

    result.valid = true;
    result.sanitized = result.sanitized || trimmedKey;
    return result;
  }

  /**
   * Validate configuration data
   */
  validateConfiguration(config) {
    const result = {
      valid: false,
      errors: [],
      sanitized: {}
    };

    if (!config || typeof config !== 'object') {
      result.errors.push('Configuration must be an object');
      return result;
    }

    // Validate provider
    if (!config.provider || !this.allowedProviders.includes(config.provider)) {
      result.errors.push('Invalid or missing AI provider');
    } else {
      result.sanitized.provider = config.provider;
    }

    // Validate API key
    if (config.provider && config.apiKey) {
      const keyValidation = this.validateAPIKey(config.provider, config.apiKey);
      if (!keyValidation.valid) {
        result.errors.push(...keyValidation.errors);
      } else {
        result.sanitized.apiKey = keyValidation.sanitized;
      }
    }

    // Validate model name
    if (config.model) {
      const modelValidation = this.validateModelName(config.model);
      if (!modelValidation.valid) {
        result.errors.push(...modelValidation.errors);
      } else {
        result.sanitized.model = modelValidation.sanitized;
      }
    }

    // Validate maxTokens
    if (config.maxTokens !== undefined) {
      const tokensValidation = this.validateMaxTokens(config.maxTokens);
      if (!tokensValidation.valid) {
        result.errors.push(...tokensValidation.errors);
      } else {
        result.sanitized.maxTokens = tokensValidation.sanitized;
      }
    }

    // Validate temperature
    if (config.temperature !== undefined) {
      const tempValidation = this.validateTemperature(config.temperature);
      if (!tempValidation.valid) {
        result.errors.push(...tempValidation.errors);
      } else {
        result.sanitized.temperature = tempValidation.sanitized;
      }
    }

    result.valid = result.errors.length === 0;
    return result;
  }

  /**
   * Validate model name
   */
  validateModelName(model) {
    const result = {
      valid: false,
      errors: [],
      sanitized: null
    };

    if (!model || typeof model !== 'string') {
      result.errors.push('Model name must be a non-empty string');
      return result;
    }

    if (model.length > this.maxLengths.modelName) {
      result.errors.push(`Model name too long (max ${this.maxLengths.modelName} characters)`);
      return result;
    }

    // Sanitize model name
    const sanitized = model.trim().replace(/[^a-zA-Z0-9\-_.]/g, '');
    
    if (sanitized.length === 0) {
      result.errors.push('Model name contains only invalid characters');
      return result;
    }

    // Check for dangerous content
    const dangerousCheck = this.checkForDangerousContent(sanitized);
    if (!dangerousCheck.safe) {
      result.errors.push('Model name contains potentially dangerous content');
      return result;
    }

    result.valid = true;
    result.sanitized = sanitized;
    return result;
  }

  /**
   * Validate max tokens parameter
   */
  validateMaxTokens(maxTokens) {
    const result = {
      valid: false,
      errors: [],
      sanitized: null
    };

    // Convert to number if string
    let tokens = maxTokens;
    if (typeof tokens === 'string') {
      tokens = parseInt(tokens, 10);
    }

    if (typeof tokens !== 'number' || isNaN(tokens)) {
      result.errors.push('Max tokens must be a valid number');
      return result;
    }

    if (tokens < 1 || tokens > 4000) {
      result.errors.push('Max tokens must be between 1 and 4000');
      return result;
    }

    result.valid = true;
    result.sanitized = Math.floor(tokens);
    return result;
  }

  /**
   * Validate temperature parameter
   */
  validateTemperature(temperature) {
    const result = {
      valid: false,
      errors: [],
      sanitized: null
    };

    // Convert to number if string
    let temp = temperature;
    if (typeof temp === 'string') {
      temp = parseFloat(temp);
    }

    if (typeof temp !== 'number' || isNaN(temp)) {
      result.errors.push('Temperature must be a valid number');
      return result;
    }

    if (temp < 0 || temp > 2) {
      result.errors.push('Temperature must be between 0 and 2');
      return result;
    }

    result.valid = true;
    result.sanitized = Math.round(temp * 100) / 100; // Round to 2 decimal places
    return result;
  }

  /**
   * Validate code context input
   */
  validateCodeContext(context) {
    const result = {
      valid: false,
      errors: [],
      sanitized: {}
    };

    if (!context || typeof context !== 'object') {
      result.errors.push('Code context must be an object');
      return result;
    }

    // Validate problem title
    if (context.problemTitle) {
      const titleValidation = this.validateProblemTitle(context.problemTitle);
      if (!titleValidation.valid) {
        result.errors.push(...titleValidation.errors);
      } else {
        result.sanitized.problemTitle = titleValidation.sanitized;
      }
    }

    // Validate problem description
    if (context.problemDescription) {
      const descValidation = this.validateProblemDescription(context.problemDescription);
      if (!descValidation.valid) {
        result.errors.push(...descValidation.errors);
      } else {
        result.sanitized.problemDescription = descValidation.sanitized;
      }
    }

    // Validate current code
    if (context.currentCode) {
      const codeValidation = this.validateCode(context.currentCode);
      if (!codeValidation.valid) {
        result.errors.push(...codeValidation.errors);
      } else {
        result.sanitized.currentCode = codeValidation.sanitized;
      }
    }

    // Validate language
    if (context.language) {
      const langValidation = this.validateLanguage(context.language);
      if (!langValidation.valid) {
        result.errors.push(...langValidation.errors);
      } else {
        result.sanitized.language = langValidation.sanitized;
      }
    }

    // Validate cursor position
    if (context.cursorPosition !== undefined) {
      const posValidation = this.validateCursorPosition(context.cursorPosition);
      if (!posValidation.valid) {
        result.errors.push(...posValidation.errors);
      } else {
        result.sanitized.cursorPosition = posValidation.sanitized;
      }
    }

    // Validate selected text
    if (context.selectedText) {
      const textValidation = this.validateSelectedText(context.selectedText);
      if (!textValidation.valid) {
        result.errors.push(...textValidation.errors);
      } else {
        result.sanitized.selectedText = textValidation.sanitized;
      }
    }

    result.valid = result.errors.length === 0;
    return result;
  }

  /**
   * Validate problem title
   */
  validateProblemTitle(title) {
    const result = {
      valid: false,
      errors: [],
      sanitized: null
    };

    if (typeof title !== 'string') {
      result.errors.push('Problem title must be a string');
      return result;
    }

    if (title.length > this.maxLengths.problemTitle) {
      result.errors.push(`Problem title too long (max ${this.maxLengths.problemTitle} characters)`);
      return result;
    }

    // Sanitize title
    const sanitized = this.sanitizeText(title);
    
    result.valid = true;
    result.sanitized = sanitized;
    return result;
  }

  /**
   * Validate problem description
   */
  validateProblemDescription(description) {
    const result = {
      valid: false,
      errors: [],
      sanitized: null
    };

    if (typeof description !== 'string') {
      result.errors.push('Problem description must be a string');
      return result;
    }

    if (description.length > this.maxLengths.problemDescription) {
      result.errors.push(`Problem description too long (max ${this.maxLengths.problemDescription} characters)`);
      return result;
    }

    // Sanitize description
    const sanitized = this.sanitizeText(description);
    
    result.valid = true;
    result.sanitized = sanitized;
    return result;
  }

  /**
   * Validate code input
   */
  validateCode(code) {
    const result = {
      valid: false,
      errors: [],
      sanitized: null
    };

    if (typeof code !== 'string') {
      result.errors.push('Code must be a string');
      return result;
    }

    if (code.length > this.maxLengths.code) {
      result.errors.push(`Code too long (max ${this.maxLengths.code} characters)`);
      return result;
    }

    // Check for dangerous content (but be more lenient for code)
    const dangerousCheck = this.checkForDangerousContent(code, true);
    if (!dangerousCheck.safe) {
      result.errors.push('Code contains potentially dangerous content');
      return result;
    }

    // Basic sanitization for code (minimal to preserve functionality)
    const sanitized = code.replace(/\x00/g, ''); // Remove null bytes
    
    result.valid = true;
    result.sanitized = sanitized;
    return result;
  }

  /**
   * Validate programming language
   */
  validateLanguage(language) {
    const result = {
      valid: false,
      errors: [],
      sanitized: null
    };

    if (typeof language !== 'string') {
      result.errors.push('Language must be a string');
      return result;
    }

    const normalizedLang = language.toLowerCase().trim();
    
    if (!this.allowedLanguages.includes(normalizedLang)) {
      result.errors.push(`Unsupported programming language: ${language}`);
      return result;
    }

    result.valid = true;
    result.sanitized = normalizedLang;
    return result;
  }

  /**
   * Validate cursor position
   */
  validateCursorPosition(position) {
    const result = {
      valid: false,
      errors: [],
      sanitized: null
    };

    let pos = position;
    if (typeof pos === 'string') {
      pos = parseInt(pos, 10);
    }

    if (typeof pos !== 'number' || isNaN(pos)) {
      result.errors.push('Cursor position must be a valid number');
      return result;
    }

    if (pos < 0) {
      result.errors.push('Cursor position cannot be negative');
      return result;
    }

    result.valid = true;
    result.sanitized = Math.floor(pos);
    return result;
  }

  /**
   * Validate selected text
   */
  validateSelectedText(text) {
    const result = {
      valid: false,
      errors: [],
      sanitized: null
    };

    if (typeof text !== 'string') {
      result.errors.push('Selected text must be a string');
      return result;
    }

    if (text.length > this.maxLengths.userInput) {
      result.errors.push(`Selected text too long (max ${this.maxLengths.userInput} characters)`);
      return result;
    }

    // Sanitize selected text
    const sanitized = this.sanitizeText(text);
    
    result.valid = true;
    result.sanitized = sanitized;
    return result;
  }

  /**
   * Validate and sanitize AI response
   */
  validateAIResponse(response) {
    const result = {
      valid: false,
      errors: [],
      sanitized: null
    };

    if (typeof response !== 'string') {
      result.errors.push('AI response must be a string');
      return result;
    }

    if (response.length > this.maxLengths.aiResponse) {
      result.errors.push(`AI response too long (max ${this.maxLengths.aiResponse} characters)`);
      return result;
    }

    // Check for dangerous content
    const dangerousCheck = this.checkForDangerousContent(response);
    if (!dangerousCheck.safe) {
      result.errors.push('AI response contains potentially dangerous content');
      // Still sanitize and return the cleaned version
    }

    // Sanitize the response
    const sanitized = this.sanitizeAIResponse(response);
    
    result.valid = result.errors.length === 0;
    result.sanitized = sanitized;
    return result;
  }

  /**
   * Check for dangerous content patterns
   */
  checkForDangerousContent(content, isCode = false) {
    const result = {
      safe: true,
      violations: []
    };

    if (!content || typeof content !== 'string') {
      return result;
    }

    // Check dangerous patterns (skip some for code)
    const patternsToCheck = isCode ? 
      this.dangerousPatterns.filter(p => !p.toString().includes('SELECT|INSERT')) : 
      this.dangerousPatterns;

    for (const pattern of patternsToCheck) {
      if (pattern.test(content)) {
        result.safe = false;
        result.violations.push(pattern.toString());
      }
    }

    // Check CSP violations (always check these)
    for (const pattern of this.cspViolations) {
      if (pattern.test(content)) {
        result.safe = false;
        result.violations.push(`CSP: ${pattern.toString()}`);
      }
    }

    return result;
  }

  /**
   * Sanitize general text content
   */
  sanitizeText(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }

    let sanitized = text;

    // Remove dangerous patterns
    for (const pattern of this.dangerousPatterns) {
      sanitized = sanitized.replace(pattern, '');
    }

    // Remove CSP violations
    for (const pattern of this.cspViolations) {
      sanitized = sanitized.replace(pattern, '');
    }

    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    return sanitized;
  }

  /**
   * Sanitize AI response content
   */
  sanitizeAIResponse(response) {
    if (!response || typeof response !== 'string') {
      return '';
    }

    let sanitized = response;

    // Remove script tags and dangerous HTML
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=/gi, '');

    // Remove data URLs that could be dangerous
    sanitized = sanitized.replace(/data:text\/html/gi, '');
    sanitized = sanitized.replace(/data:application\/javascript/gi, '');

    // Remove null bytes
    sanitized = sanitized.replace(/\x00/g, '');

    // Limit length if too long
    if (sanitized.length > this.maxLengths.aiResponse) {
      sanitized = sanitized.substring(0, this.maxLengths.aiResponse - 3) + '...';
    }

    return sanitized.trim();
  }

  /**
   * Validate URL for security
   */
  validateURL(url) {
    const result = {
      valid: false,
      errors: [],
      sanitized: null
    };

    if (!url || typeof url !== 'string') {
      result.errors.push('URL must be a non-empty string');
      return result;
    }

    try {
      const urlObj = new URL(url);
      
      // Must be HTTPS
      if (urlObj.protocol !== 'https:') {
        result.errors.push('URL must use HTTPS protocol');
        return result;
      }

      // Check for dangerous content in URL
      const dangerousCheck = this.checkForDangerousContent(url);
      if (!dangerousCheck.safe) {
        result.errors.push('URL contains potentially dangerous content');
        return result;
      }

      result.valid = true;
      result.sanitized = url;
      return result;
      
    } catch (error) {
      result.errors.push('Invalid URL format');
      return result;
    }
  }

  /**
   * Create sanitized error message
   */
  sanitizeErrorMessage(error) {
    if (!error) return 'Unknown error';
    
    let message = typeof error === 'string' ? error : error.message || 'Unknown error';
    
    // Remove sensitive information
    message = message
      .replace(/sk-[a-zA-Z0-9]+/g, '[API_KEY_REDACTED]')
      .replace(/sk-ant-[a-zA-Z0-9]+/g, '[API_KEY_REDACTED]')
      .replace(/AIza[a-zA-Z0-9]{35}/g, '[API_KEY_REDACTED]')
      .replace(/Bearer\s+[a-zA-Z0-9-_]+/g, '[AUTH_TOKEN_REDACTED]')
      .replace(/api[_-]?key[:\s=]+[a-zA-Z0-9-_]+/gi, 'api_key=[REDACTED]')
      .replace(/token[:\s=]+[a-zA-Z0-9-_]+/gi, 'token=[REDACTED]')
      .replace(/password[:\s=]+[^\s]+/gi, 'password=[REDACTED]');

    // Limit length
    if (message.length > 500) {
      message = message.substring(0, 497) + '...';
    }

    return message;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { InputValidator };
} else if (typeof globalThis !== 'undefined') {
  // Service worker or other global context - attach to globalThis
  globalThis.LeetPilotValidator = { InputValidator };
} else if (typeof self !== 'undefined') {
  // Web worker context - attach to self
  self.LeetPilotValidator = { InputValidator };
}