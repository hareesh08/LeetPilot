// LeetPilot Validation Utilities
// Consolidated validation logic to eliminate duplication

import { SUPPORTED_PROVIDERS } from './storage-manager.js';

/**
 * Consolidated validation utilities
 */
export class ValidationUtils {
  /**
   * Validate API key format for any provider
   */
  static validateAPIKey(provider, apiKey) {
    const providerInfo = SUPPORTED_PROVIDERS[provider];
    if (!providerInfo) {
      return { valid: false, error: 'Unsupported provider' };
    }

    if (!apiKey || typeof apiKey !== 'string') {
      return { valid: false, error: 'API key is required' };
    }

    if (apiKey.length < providerInfo.minKeyLength) {
      return { valid: false, error: `API key too short for ${providerInfo.name}` };
    }

    // Skip prefix validation for custom providers
    if (provider !== 'custom' && providerInfo.keyPrefix && !apiKey.startsWith(providerInfo.keyPrefix)) {
      return { valid: false, error: `Invalid API key format for ${providerInfo.name}` };
    }

    return { valid: true };
  }

  /**
   * Validate configuration object
   */
  static validateConfiguration(config) {
    const errors = [];
    const sanitized = {};

    // Validate provider
    if (!config.provider || !SUPPORTED_PROVIDERS[config.provider]) {
      errors.push('Invalid or unsupported AI provider');
    } else {
      sanitized.provider = config.provider;
    }

    // Validate API key
    const keyValidation = this.validateAPIKey(config.provider, config.apiKey);
    if (!keyValidation.valid) {
      errors.push(keyValidation.error);
    } else {
      sanitized.apiKey = config.apiKey;
    }

    // Validate custom API URL for custom providers
    if (config.provider === 'custom') {
      const urlValidation = this.validateCustomURL(config.customApiUrl);
      if (!urlValidation.valid) {
        errors.push(urlValidation.error);
      } else {
        sanitized.customApiUrl = urlValidation.sanitized;
      }
    }

    // Validate model
    if (config.model) {
      const modelValidation = this.validateModel(config.model);
      if (!modelValidation.valid) {
        errors.push(modelValidation.error);
      } else {
        sanitized.model = modelValidation.sanitized;
      }
    }

    // Validate maxTokens
    if (config.maxTokens !== undefined) {
      const tokensValidation = this.validateMaxTokens(config.maxTokens);
      if (!tokensValidation.valid) {
        errors.push(tokensValidation.error);
      } else {
        sanitized.maxTokens = tokensValidation.sanitized;
      }
    }

    // Validate temperature
    if (config.temperature !== undefined) {
      const tempValidation = this.validateTemperature(config.temperature);
      if (!tempValidation.valid) {
        errors.push(tempValidation.error);
      } else {
        sanitized.temperature = tempValidation.sanitized;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitized
    };
  }

  /**
   * Validate custom API URL
   */
  static validateCustomURL(url) {
    if (!url || typeof url !== 'string') {
      return { valid: false, error: 'Custom API URL is required for custom providers' };
    }

    try {
      const urlObj = new URL(url);
      if (!urlObj.protocol.startsWith('https')) {
        return { valid: false, error: 'Custom API URL must use HTTPS' };
      }
      return { valid: true, sanitized: url.trim() };
    } catch (e) {
      return { valid: false, error: 'Invalid custom API URL format' };
    }
  }

  /**
   * Validate model name
   */
  static validateModel(model) {
    if (typeof model !== 'string') {
      return { valid: false, error: 'Model must be a string' };
    }

    const sanitized = model.trim();
    if (sanitized.length === 0) {
      return { valid: false, error: 'Model name cannot be empty' };
    }

    if (sanitized.length > 100) {
      return { valid: false, error: 'Model name too long' };
    }

    return { valid: true, sanitized };
  }

  /**
   * Validate max tokens
   */
  static validateMaxTokens(maxTokens) {
    const num = Number(maxTokens);
    if (isNaN(num) || num < 1 || num > 4000) {
      return { valid: false, error: 'Max tokens must be a number between 1 and 4000' };
    }
    return { valid: true, sanitized: Math.floor(num) };
  }

  /**
   * Validate temperature
   */
  static validateTemperature(temperature) {
    const num = Number(temperature);
    if (isNaN(num) || num < 0 || num > 2) {
      return { valid: false, error: 'Temperature must be a number between 0 and 2' };
    }
    return { valid: true, sanitized: num };
  }

  /**
   * Sanitize text for safe display/logging
   */
  static sanitizeText(text, maxLength = 1000) {
    if (!text || typeof text !== 'string') {
      return '';
    }

    let sanitized = text
      .replace(/[<>]/g, '') // Remove potential HTML
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();

    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength) + '...';
    }

    return sanitized;
  }

  /**
   * Sanitize URL for logging (remove sensitive parts)
   */
  static sanitizeUrlForLogging(url) {
    if (!url || typeof url !== 'string') {
      return '[invalid-url]';
    }

    try {
      const urlObj = new URL(url);
      // Remove query parameters and fragments that might contain sensitive data
      return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
    } catch (e) {
      return '[malformed-url]';
    }
  }

  /**
   * Sanitize error message for safe display
   */
  static sanitizeErrorMessage(error) {
    if (!error) return 'Unknown error';
    
    const message = typeof error === 'string' ? error : error.message || 'Unknown error';
    
    // Remove potential API keys or sensitive data
    return message
      .replace(/sk-[a-zA-Z0-9]{48}/g, '[API-KEY-REDACTED]')
      .replace(/sk-ant-[a-zA-Z0-9]{95}/g, '[API-KEY-REDACTED]')
      .replace(/Bearer\s+[a-zA-Z0-9\-_\.]+/gi, 'Bearer [REDACTED]')
      .replace(/api[_-]?key[:\s=]+[a-zA-Z0-9\-_\.]+/gi, 'api_key=[REDACTED]')
      .substring(0, 500); // Limit length
  }

  /**
   * Check if text contains potential sensitive data
   */
  static containsSensitiveData(text) {
    if (!text || typeof text !== 'string') {
      return false;
    }

    const sensitivePatterns = [
      /sk-[a-zA-Z0-9]{48}/, // OpenAI keys
      /sk-ant-[a-zA-Z0-9]{95}/, // Anthropic keys
      /Bearer\s+[a-zA-Z0-9\-_\.]{20,}/, // Bearer tokens
      /api[_-]?key[:\s=]+[a-zA-Z0-9\-_\.]{10,}/i, // Generic API keys
      /password[:\s=]+\S+/i, // Passwords
      /token[:\s=]+[a-zA-Z0-9\-_\.]{20,}/i // Generic tokens
    ];

    return sensitivePatterns.some(pattern => pattern.test(text));
  }
}