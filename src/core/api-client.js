// LeetPilot API Client
// Handles secure communication with AI providers (OpenAI, Anthropic, Gemini, Custom)

import { StorageManager, SUPPORTED_PROVIDERS } from './storage-manager.js';

/**
 * AI Provider Communication Layer
 * Handles secure API communication with OpenAI, Anthropic, and Gemini
 */
export class AIProviderClient {
  constructor(config) {
    this.config = config;
    this.providerInfo = SUPPORTED_PROVIDERS[config.provider];
    
    if (!this.providerInfo) {
      throw new Error(`Unsupported AI provider: ${config.provider}`);
    }
    
    // For custom providers, override the API URL with the user's custom URL
    if (config.provider === 'custom' && config.customApiUrl) {
      this.providerInfo = { ...this.providerInfo, apiUrl: config.customApiUrl };
    }
  }

  /**
   * Test API connection with a simple request
   */
  async testConnection() {
    try {
      const testPrompt = "Hello, this is a connection test.";
      const response = await this.makeRequest(testPrompt, 'test');
      
      return {
        success: true,
        message: `Successfully connected to ${this.providerInfo.name}`,
        provider: this.config.provider
      };
    } catch (error) {
      return {
        success: false,
        error: `Connection failed: ${error.message}`,
        provider: this.config.provider
      };
    }
  }

  /**
   * Make API request to the configured provider
   */
  async makeRequest(prompt, requestType = 'completion') {
    // Enforce HTTPS
    if (!this.providerInfo.apiUrl.startsWith('https://')) {
      throw new Error('HTTPS is required for API communications');
    }

    switch (this.config.provider) {
      case 'openai':
        return await this.callOpenAI(prompt, requestType);
      case 'anthropic':
        return await this.callAnthropic(prompt, requestType);
      case 'gemini':
        return await this.callGemini(prompt, requestType);
      case 'custom':
        return await this.callCustomProvider(prompt, requestType);
      default:
        throw new Error(`Unsupported provider: ${this.config.provider}`);
    }
  }

  /**
   * OpenAI API client
   */
  async callOpenAI(prompt, requestType) {
    const url = this.providerInfo.apiUrl;
    
    const requestBody = {
      model: this.config.model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      content: data.choices[0]?.message?.content || '',
      provider: 'openai',
      model: this.config.model,
      usage: data.usage
    };
  }

  /**
   * Anthropic API client
   */
  async callAnthropic(prompt, requestType) {
    const url = this.providerInfo.apiUrl;
    
    const requestBody = {
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      content: data.content[0]?.text || '',
      provider: 'anthropic',
      model: this.config.model,
      usage: data.usage
    };
  }

  /**
   * Google Gemini API client
   */
  async callGemini(prompt, requestType) {
    const url = `${this.providerInfo.apiUrl}/${this.config.model}:generateContent?key=${this.config.apiKey}`;
    
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: this.config.temperature,
        maxOutputTokens: this.config.maxTokens
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      content: data.candidates[0]?.content?.parts[0]?.text || '',
      provider: 'gemini',
      model: this.config.model,
      usage: data.usageMetadata
    };
  }

  /**
   * Custom provider API client (OpenAI-compatible)
   */
  async callCustomProvider(prompt, requestType) {
    const url = this.providerInfo.apiUrl;
    
    const requestBody = {
      model: this.config.model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      content: data.choices[0]?.message?.content || '',
      provider: 'custom',
      model: this.config.model,
      usage: data.usage
    };
  }
}