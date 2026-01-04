// LeetPilot Storage Manager
// Handles secure storage of API keys and user preferences with encryption

/**
 * Configuration data models and validation
 */

// Supported AI providers
const SUPPORTED_PROVIDERS = {
  openai: {
    name: 'OpenAI',
    keyPrefix: 'sk-',
    minKeyLength: 20,
    defaultModel: 'gpt-4',
    apiUrl: 'https://api.openai.com/v1/chat/completions'
  },
  anthropic: {
    name: 'Anthropic',
    keyPrefix: 'sk-ant-',
    minKeyLength: 20,
    defaultModel: 'claude-3-sonnet-20240229',
    apiUrl: 'https://api.anthropic.com/v1/messages'
  },
  gemini: {
    name: 'Google Gemini',
    keyPrefix: null, // Gemini keys have various formats
    minKeyLength: 10,
    defaultModel: 'gemini-pro',
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models'
  },
  custom: {
    name: 'Custom Provider (OpenAI Compatible)',
    keyPrefix: null, // Custom providers can have any key format
    minKeyLength: 10,
    defaultModel: 'gpt-3.5-turbo',
    apiUrl: null // Will be set by user
  }
};

/**
 * Configuration data model
 */
class AIProviderConfig {
  constructor(provider, apiKey, model = null, maxTokens = 1000, temperature = 0.7, customApiUrl = null, tokenTotalBudget = null) {
    this.provider = provider;
    this.apiKey = apiKey;
    this.model = model || SUPPORTED_PROVIDERS[provider]?.defaultModel || '';
    this.maxTokens = maxTokens;
    this.temperature = temperature;
    this.customApiUrl = customApiUrl;
    this.tokenTotalBudget = tokenTotalBudget;
    this.timestamp = Date.now();
  }

  /**
   * Validate the configuration
   */
  validate() {
    const errors = [];

    // Validate provider
    if (!this.provider || !SUPPORTED_PROVIDERS[this.provider]) {
      errors.push('Invalid or unsupported AI provider');
    }

    // Validate API key
    if (!this.apiKey || typeof this.apiKey !== 'string') {
      errors.push('API key is required');
    } else {
      const providerInfo = SUPPORTED_PROVIDERS[this.provider];
      if (providerInfo) {
        // Check key length
        if (this.apiKey.length < providerInfo.minKeyLength) {
          errors.push(`API key too short for ${providerInfo.name}`);
        }
        
        // Check key prefix if required (skip for custom providers)
        if (this.provider !== 'custom' && providerInfo.keyPrefix && !this.apiKey.startsWith(providerInfo.keyPrefix)) {
          errors.push(`Invalid API key format for ${providerInfo.name}`);
        }
      }
    }

    // Validate custom API URL for custom providers
    if (this.provider === 'custom') {
      if (!this.customApiUrl || typeof this.customApiUrl !== 'string') {
        errors.push('Custom API URL is required for custom providers');
      } else {
        try {
          const url = new URL(this.customApiUrl);
          if (!url.protocol.startsWith('https')) {
            errors.push('Custom API URL must use HTTPS');
          }
        } catch (e) {
          errors.push('Invalid custom API URL format');
        }
      }
    }

    // Validate model
    if (this.model && typeof this.model !== 'string') {
      errors.push('Model must be a string');
    }

    // Validate maxTokens
    if (this.maxTokens && (typeof this.maxTokens !== 'number' || this.maxTokens < 1 || this.maxTokens > 4000)) {
      errors.push('Max tokens must be a number between 1 and 4000');
    }

    // Validate temperature
    if (this.temperature && (typeof this.temperature !== 'number' || this.temperature < 0 || this.temperature > 2)) {
      errors.push('Temperature must be a number between 0 and 2');
    }

    // Validate tokenTotalBudget: null/undefined = no limit, 0 = no limit, positive number = budget limit
    if (this.tokenTotalBudget !== null && this.tokenTotalBudget !== undefined) {
      if (typeof this.tokenTotalBudget !== 'number' || this.tokenTotalBudget < 0) {
        errors.push('Token total budget must be 0 (no limit) or a positive number');
      }
    }

    return errors;
  }

  /**
   * Get sanitized version for logging (without API key)
   */
  getSanitized() {
    return {
      provider: this.provider,
      model: this.model,
      maxTokens: this.maxTokens,
      temperature: this.temperature,
      customApiUrl: this.customApiUrl,
      tokenTotalBudget: this.tokenTotalBudget,
      timestamp: this.timestamp,
      apiKey: this.apiKey ? '[REDACTED]' : null
    };
  }
}

/**
 * Secure encryption utilities for API keys using Web Crypto API
 */
class EncryptionUtils {
  /**
   * Generate a secure encryption key
   */
  static async generateKey() {
    const key = await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256
      },
      true,
      ['encrypt', 'decrypt']
    );
    
    const exported = await crypto.subtle.exportKey('raw', key);
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
  }

  /**
   * Encrypt text using AES-GCM
   */
  static async encrypt(text, keyString) {
    if (!text || !keyString) return text;
    
    try {
      // Import the key
      const keyData = new Uint8Array(atob(keyString).split('').map(c => c.charCodeAt(0)));
      const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      );
      
      // Generate IV
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // Encrypt
      const encoded = new TextEncoder().encode(text);
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encoded
      );
      
      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);
      
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt text using AES-GCM
   */
  static async decrypt(encryptedText, keyString) {
    if (!encryptedText || !keyString) return encryptedText;
    
    try {
      // Import the key
      const keyData = new Uint8Array(atob(keyString).split('').map(c => c.charCodeAt(0)));
      const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );
      
      // Decode the combined data
      const combined = new Uint8Array(atob(encryptedText).split('').map(c => c.charCodeAt(0)));
      
      // Extract IV and encrypted data
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);
      
      // Decrypt
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encrypted
      );
      
      return new TextDecoder().decode(decrypted);
    } catch (error) {
      console.error('Decryption failed:', error);
      return null;
    }
  }
}

/**
 * Storage Manager for secure handling of API keys and user preferences
 */
class StorageManager {
  constructor() {
    this.encryptionKey = null;
    this.initializeEncryption();
  }

  /**
   * Initialize encryption key
   */
  async initializeEncryption() {
    try {
      // Try to get existing key from storage
      const result = await chrome.storage.local.get(['encryptionKey']);
      
      if (result.encryptionKey) {
        this.encryptionKey = result.encryptionKey;
      } else {
        // Generate new key and store it
        this.encryptionKey = await EncryptionUtils.generateKey();
        await chrome.storage.local.set({ encryptionKey: this.encryptionKey });
      }
    } catch (error) {
      console.error('Failed to initialize encryption:', error);
      // Fallback to generating a new key
      this.encryptionKey = await EncryptionUtils.generateKey();
    }
  }

  /**
   * Store API key and configuration securely
   */
  async storeAPIKey(config) {
    try {
      // Validate configuration
      if (!(config instanceof AIProviderConfig)) {
        throw new Error('Invalid configuration object');
      }

      const validationErrors = config.validate();
      if (validationErrors.length > 0) {
        throw new Error('Configuration validation failed: ' + validationErrors.join(', '));
      }

      // Ensure encryption is initialized
      if (!this.encryptionKey) {
        await this.initializeEncryption();
      }

      // Encrypt the API key
      const encryptedApiKey = await EncryptionUtils.encrypt(config.apiKey, this.encryptionKey);

      // Prepare data for storage (without plain text API key)
      const storageData = {
        provider: config.provider,
        encryptedApiKey: encryptedApiKey,
        model: config.model,
        maxTokens: config.maxTokens,
        temperature: config.temperature,
        customApiUrl: config.customApiUrl,
        tokenTotalBudget: config.tokenTotalBudget,
        timestamp: config.timestamp
      };

      // Store configuration
      await chrome.storage.local.set({
        aiProviderConfig: storageData,
        lastConfigUpdate: Date.now()
      });

      console.log('Configuration stored successfully:', config.getSanitized());
      return true;

    } catch (error) {
      console.error('Failed to store API key:', error);
      throw error;
    }
  }

  /**
   * Retrieve and decrypt API key configuration
   */
  async retrieveConfiguration() {
    try {
      const result = await chrome.storage.local.get(['aiProviderConfig', 'encryptionKey']);
      
      if (!result.aiProviderConfig) {
        return null;
      }

      if (!this.encryptionKey && result.encryptionKey) {
        this.encryptionKey = result.encryptionKey;
      }

      if (!this.encryptionKey) {
        throw new Error('Encryption key not available');
      }

      const config = result.aiProviderConfig;
      
      const decryptedApiKey = await EncryptionUtils.decrypt(config.encryptedApiKey, this.encryptionKey);
      
      if (!decryptedApiKey) {
        console.error('Decryption returned null. Config:', { 
          hasEncryptedKey: !!config.encryptedApiKey,
          hasEncryptionKey: !!this.encryptionKey 
        });
        throw new Error('Failed to decrypt API key');
      }

      const aiConfig = new AIProviderConfig(
        config.provider,
        decryptedApiKey,
        config.model,
        config.maxTokens,
        config.temperature,
        config.customApiUrl,
        config.tokenTotalBudget
      );
      aiConfig.timestamp = config.timestamp;

      return aiConfig;

    } catch (error) {
      console.error('Failed to retrieve configuration:', error);
      throw error;
    }
  }

  /**
   * Clear all stored user data (for uninstall cleanup)
   */
  async clearUserData() {
    try {
      // Get all stored keys
      const allData = await chrome.storage.local.get(null);
      const keysToRemove = Object.keys(allData);

      // Remove all data
      await chrome.storage.local.remove(keysToRemove);
      
      console.log('All user data cleared successfully');
      return true;

    } catch (error) {
      console.error('Failed to clear user data:', error);
      throw error;
    }
  }

  /**
   * Update specific configuration fields
   */
  async updateConfiguration(updates) {
    try {
      const currentConfig = await this.retrieveConfiguration();
      
      if (!currentConfig) {
        throw new Error('No existing configuration found');
      }

      // Apply updates
      if (updates.provider !== undefined) currentConfig.provider = updates.provider;
      if (updates.apiKey !== undefined) currentConfig.apiKey = updates.apiKey;
      if (updates.model !== undefined) currentConfig.model = updates.model;
      if (updates.maxTokens !== undefined) currentConfig.maxTokens = updates.maxTokens;
      if (updates.temperature !== undefined) currentConfig.temperature = updates.temperature;
      if (updates.customApiUrl !== undefined) currentConfig.customApiUrl = updates.customApiUrl;

      if (updates.tokenTotalBudget !== undefined) currentConfig.tokenTotalBudget = updates.tokenTotalBudget;

      // Update timestamp
      currentConfig.timestamp = Date.now();

      // Store updated configuration
      return await this.storeAPIKey(currentConfig);

    } catch (error) {
      console.error('Failed to update configuration:', error);
      throw error;
    }
  }

  /**
   * Check if configuration exists and is valid
   */
  async hasValidConfiguration() {
    try {
      const config = await this.retrieveConfiguration();
      return config !== null && config.validate().length === 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get supported providers information
   */
  getSupportedProviders() {
    return SUPPORTED_PROVIDERS;
  }

  /**
   * Validate API key format for a specific provider
   */
  validateAPIKeyFormat(provider, apiKey) {
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
   * Initialize default settings for first-time installation
   */
  async initializeDefaultSettings() {
    try {
      // Set default extension settings
      const defaultSettings = {
        'leetpilot_first_run': true,
        'leetpilot_install_date': Date.now(),
        'leetpilot_version': '1.0.0',
        'leetpilot_settings': {
          enableHints: true,
          enableCompletion: true,
          enableExplanations: true,
          enableOptimizations: true,
          maxHintLevel: 4,
          autoShowHints: false
        }
      };

      await chrome.storage.local.set(defaultSettings);
      console.log('Default settings initialized');
      return true;

    } catch (error) {
      console.error('Failed to initialize default settings:', error);
      throw error;
    }
  }

  /**
   * Check storage health and integrity
   */
  async checkStorageHealth() {
    try {
      // Test basic storage operations
      const testKey = 'leetpilot_health_check';
      const testValue = { timestamp: Date.now(), test: true };
      
      // Write test
      await chrome.storage.local.set({ [testKey]: testValue });
      
      // Read test
      const result = await chrome.storage.local.get([testKey]);
      
      // Verify test
      const isHealthy = result[testKey] && 
                       result[testKey].timestamp === testValue.timestamp &&
                       result[testKey].test === true;
      
      // Cleanup test
      await chrome.storage.local.remove([testKey]);
      
      return isHealthy;

    } catch (error) {
      console.error('Storage health check failed:', error);
      return false;
    }
  }
}

// Export for use in other modules
export { StorageManager, AIProviderConfig, SUPPORTED_PROVIDERS };