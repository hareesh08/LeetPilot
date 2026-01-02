// LeetPilot Input Validator
// Comprehensive input validation and sanitization for all user inputs and AI responses

import { ValidationUtils } from './validation-utils.js';

/**
 * Input Validator for comprehensive validation and sanitization
 * Uses consolidated ValidationUtils for core validation logic
 */
export class InputValidator {
  constructor() {
    // Dangerous content patterns to filter out
    this.dangerousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
      /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
      /data:text\/html/gi,
      /data:application\/javascript/gi,
      /vbscript:/gi,
      /expression\s*\(/gi,
      /@import/gi,
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
      /(\||&|;|\$\(|\`)/g,
      /\.\.[\/\\]/g,
      /\x00/g
    ];

    // CSP violation patterns
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
      aiResponse: 20000,
      url: 2000
    };

    // Allowed programming languages
    this.allowedLanguages = [
      'javascript', 'typescript', 'python', 'java', 'cpp', 'c', 'csharp',
      'go', 'rust', 'kotlin', 'swift', 'ruby', 'php', 'scala', 'dart'
    ];
  }

  // Delegate to ValidationUtils for core validation
  validateAPIKey(provider, apiKey) {
    const validation = ValidationUtils.validateAPIKey(provider, apiKey);
    return this._toLegacyFormat(validation, apiKey?.trim());
  }

  validateConfiguration(config) {
    return ValidationUtils.validateConfiguration(config);
  }

  validateModelName(model) {
    const validation = ValidationUtils.validateModel(model);
    return this._toLegacyFormat(validation, validation.sanitized);
  }

  validateMaxTokens(maxTokens) {
    const validation = ValidationUtils.validateMaxTokens(maxTokens);
    return this._toLegacyFormat(validation, validation.sanitized);
  }

  validateTemperature(temperature) {
    const validation = ValidationUtils.validateTemperature(temperature);
    return this._toLegacyFormat(validation, validation.sanitized);
  }

  validateCustomApiUrl(url) {
    const validation = ValidationUtils.validateCustomURL(url);
    return this._toLegacyFormat(validation, validation.sanitized);
  }

  // Convert new format to legacy format for backward compatibility
  _toLegacyFormat(validation, sanitizedValue) {
    return {
      valid: validation.valid,
      errors: validation.valid ? [] : [validation.error],
      sanitized: validation.valid ? sanitizedValue : null
    };
  }

  /**
   * Validate code context input
   */
  validateCodeContext(context) {
    const result = { valid: false, errors: [], sanitized: {} };

    if (!context || typeof context !== 'object') {
      result.errors.push('Code context must be an object');
      return result;
    }

    const fields = [
      { key: 'problemTitle', validator: 'validateProblemTitle' },
      { key: 'problemDescription', validator: 'validateProblemDescription' },
      { key: 'currentCode', validator: 'validateCode' },
      { key: 'language', validator: 'validateLanguage' },
      { key: 'cursorPosition', validator: 'validateCursorPosition' },
      { key: 'selectedText', validator: 'validateSelectedText' }
    ];

    for (const { key, validator } of fields) {
      if (context[key] !== undefined) {
        const validation = this[validator](context[key]);
        if (!validation.valid) {
          result.errors.push(...validation.errors);
        } else {
          result.sanitized[key] = validation.sanitized;
        }
      }
    }

    result.valid = result.errors.length === 0;
    return result;
  }

  validateProblemTitle(title) {
    return this._validateString(title, 'Problem title', this.maxLengths.problemTitle);
  }

  validateProblemDescription(description) {
    return this._validateString(description, 'Problem description', this.maxLengths.problemDescription);
  }

  validateCode(code) {
    const result = { valid: false, errors: [], sanitized: null };

    if (typeof code !== 'string') {
      result.errors.push('Code must be a string');
      return result;
    }

    if (code.length > this.maxLengths.code) {
      result.errors.push(`Code too long (max ${this.maxLengths.code} characters)`);
      return result;
    }

    const dangerousCheck = this.checkForDangerousContent(code, true);
    if (!dangerousCheck.safe) {
      result.errors.push('Code contains potentially dangerous content');
      return result;
    }

    result.valid = true;
    result.sanitized = code.replace(/\x00/g, '');
    return result;
  }

  validateLanguage(language) {
    const result = { valid: false, errors: [], sanitized: null };

    if (typeof language !== 'string') {
      result.errors.push('Language must be a string');
      return result;
    }

    const normalized = language.toLowerCase().trim();
    if (!this.allowedLanguages.includes(normalized)) {
      result.errors.push(`Unsupported programming language: ${language}`);
      return result;
    }

    result.valid = true;
    result.sanitized = normalized;
    return result;
  }

  validateCursorPosition(position) {
    const result = { valid: false, errors: [], sanitized: null };
    const pos = typeof position === 'string' ? parseInt(position, 10) : position;

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

  validateSelectedText(text) {
    return this._validateString(text, 'Selected text', this.maxLengths.userInput);
  }

  validateAIResponse(response) {
    const result = { valid: false, errors: [], sanitized: null };

    if (typeof response !== 'string') {
      result.errors.push('AI response must be a string');
      return result;
    }

    if (response.length > this.maxLengths.aiResponse) {
      result.errors.push(`AI response too long (max ${this.maxLengths.aiResponse} characters)`);
      return result;
    }

    const dangerousCheck = this.checkForDangerousContent(response);
    if (!dangerousCheck.safe) {
      result.errors.push('AI response contains potentially dangerous content');
    }

    result.valid = result.errors.length === 0;
    result.sanitized = this.sanitizeAIResponse(response);
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

      const dangerousCheck = this.checkForDangerousContent(url);
      if (!dangerousCheck.safe) {
        result.errors.push('URL contains potentially dangerous content');
        return result;
      }

      result.valid = true;
      result.sanitized = url;
    } catch {
      result.errors.push('Invalid URL format');
    }

    return result;
  }

  // Helper for string validation
  _validateString(value, fieldName, maxLength) {
    const result = { valid: false, errors: [], sanitized: null };

    if (typeof value !== 'string') {
      result.errors.push(`${fieldName} must be a string`);
      return result;
    }

    if (value.length > maxLength) {
      result.errors.push(`${fieldName} too long (max ${maxLength} characters)`);
      return result;
    }

    result.valid = true;
    result.sanitized = this.sanitizeText(value);
    return result;
  }

  checkForDangerousContent(content, isCode = false) {
    const result = { safe: true, violations: [] };

    if (!content || typeof content !== 'string') return result;

    const patterns = isCode
      ? this.dangerousPatterns.filter(p => !p.toString().includes('SELECT|INSERT'))
      : this.dangerousPatterns;

    for (const pattern of [...patterns, ...this.cspViolations]) {
      if (pattern.test(content)) {
        result.safe = false;
        result.violations.push(pattern.toString());
      }
    }

    return result;
  }

  sanitizeText(text) {
    return ValidationUtils.sanitizeText(text);
  }

  sanitizeErrorMessage(error) {
    return ValidationUtils.sanitizeErrorMessage(error);
  }

  sanitizeUrlForLogging(url) {
    return ValidationUtils.sanitizeUrlForLogging(url);
  }

  sanitizeAIResponse(response) {
    if (!response || typeof response !== 'string') return '';

    let sanitized = response
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/data:text\/html/gi, '')
      .replace(/data:application\/javascript/gi, '')
      .replace(/\x00/g, '');

    if (sanitized.length > this.maxLengths.aiResponse) {
      sanitized = sanitized.substring(0, this.maxLengths.aiResponse - 3) + '...';
    }

    return sanitized.trim();
  }
}
