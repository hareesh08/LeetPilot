// LeetPilot Popup Manager
// Manages the popup interface for configuration and settings

export class PopupManager {
  constructor() {
    this.isInitialized = false;
    this.storageManager = null;
    this.inputValidator = null;
  }

  /**
   * Initialize the popup manager
   */
  async initialize() {
    if (this.isInitialized) return;
    
    console.log('Popup manager initializing...');
    
    try {
      // Load build info first (non-blocking)
      this.loadBuildInfo().catch(error => {
        console.log('Build info loading failed:', error);
      });
      
      // Load required modules
      await this.loadModules();
      
      // Setup form handlers
      this.setupFormHandlers();
      
      // Load existing configuration (with timeout)
      try {
        await Promise.race([
          this.loadConfiguration(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Configuration loading timeout')), 5000)
          )
        ]);
      } catch (error) {
        console.log('Configuration loading failed or timed out:', error);
        // Continue initialization even if config loading fails
      }
      
      this.isInitialized = true;
      console.log('Popup manager initialized successfully');
      
    } catch (error) {
      console.error('Error initializing popup manager:', error);
      this.showStatus('Extension initialization failed. Some features may not work properly.', 'error');
      
      // Still mark as initialized so the popup is usable
      this.isInitialized = true;
    }
  }

  /**
   * Load required modules
   */
  async loadModules() {
    // Check if modules are available globally (loaded via script tags)
    if (typeof window.LeetPilotModules !== 'undefined' && typeof window.LeetPilotModules.StorageManager !== 'undefined') {
      this.storageManager = new window.LeetPilotModules.StorageManager();
      console.log('Storage manager loaded in popup');
    } else {
      console.warn('Storage manager not available in popup - will use background script');
    }
    
    if (typeof window.LeetPilotModules !== 'undefined' && typeof window.LeetPilotModules.InputValidator !== 'undefined') {
      this.inputValidator = new window.LeetPilotModules.InputValidator();
      console.log('Input validator loaded in popup');
    } else {
      console.warn('Input validator not available in popup');
    }
  }

  /**
   * Setup form event handlers
   */
  setupFormHandlers() {
    const form = document.getElementById('configForm');
    const providerSelect = document.getElementById('provider');
    const apiKeyInput = document.getElementById('apiKey');
    const customApiUrlInput = document.getElementById('customApiUrl');
    const testButton = document.getElementById('testButton');

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveConfiguration();
      });
    }

    if (providerSelect) {
      providerSelect.addEventListener('change', () => {
        this.updateProviderInfo();
        this.updateModelPlaceholder();
        this.validateAPIKeyFormat();
        this.toggleCustomProviderFields();
      });
    }

    if (apiKeyInput) {
      apiKeyInput.addEventListener('input', () => {
        this.validateAPIKeyFormat();
      });
    }

    if (customApiUrlInput) {
      customApiUrlInput.addEventListener('input', () => {
        this.validateCustomApiUrl();
      });
    }

    if (testButton) {
      testButton.addEventListener('click', () => {
        this.testAPIConnection();
      });
    }
  }

  /**
   * Load saved configuration
   */
  async loadConfiguration() {
    try {
      // Use background script to get configuration
      const response = await this.sendMessageToBackground({
        type: 'getConfiguration'
      });
      
      if (response && response.success && response.config) {
        const config = response.config;
        console.log('Configuration loaded successfully');
        
        const providerSelect = document.getElementById('provider');
        const apiKeyInput = document.getElementById('apiKey');
        const modelInput = document.getElementById('model');
        const maxTokensInput = document.getElementById('maxTokens');
        const temperatureInput = document.getElementById('temperature');
        const customApiUrlInput = document.getElementById('customApiUrl');
        
        if (providerSelect) providerSelect.value = config.provider;
        if (apiKeyInput) apiKeyInput.value = '[CONFIGURED]'; // Don't show actual key
        if (modelInput) modelInput.value = config.model || '';
        if (maxTokensInput) maxTokensInput.value = config.maxTokens || '';
        if (temperatureInput) temperatureInput.value = config.temperature || '';
        
        if (config.provider === 'custom' && config.customApiUrl && customApiUrlInput) {
          customApiUrlInput.value = config.customApiUrl;
        }
        
        this.updateProviderInfo();
        this.updateModelPlaceholder();
        this.toggleCustomProviderFields();
        
        // Hide setup guide if configuration exists
        const setupGuide = document.getElementById('setupGuide');
        const testButton = document.getElementById('testButton');
        if (setupGuide) setupGuide.style.display = 'none';
        if (testButton) testButton.style.display = 'block';
        
      } else {
        console.log('No existing configuration found');
      }
    } catch (error) {
      console.log('No existing configuration found or failed to load:', error.message);
    }
  }

  /**
   * Save configuration
   */
  async saveConfiguration() {
    const providerSelect = document.getElementById('provider');
    const apiKeyInput = document.getElementById('apiKey');
    const modelInput = document.getElementById('model');
    const maxTokensInput = document.getElementById('maxTokens');
    const temperatureInput = document.getElementById('temperature');
    const customApiUrlInput = document.getElementById('customApiUrl');

    const provider = providerSelect?.value;
    const apiKey = apiKeyInput?.value?.trim();
    const model = modelInput?.value?.trim();
    const maxTokens = parseInt(maxTokensInput?.value) || 1000;
    const temperature = parseFloat(temperatureInput?.value) || 0.7;
    const customApiUrl = customApiUrlInput?.value?.trim();

    console.log('Saving configuration:', { provider, model, maxTokens, temperature });

    // Validate inputs
    if (!provider) {
      this.showStatus('Please select an AI provider', 'error');
      return;
    }

    if (!apiKey || apiKey === '[CONFIGURED]') {
      this.showStatus('Please enter your API key', 'error');
      return;
    }

    // Validate using input validator if available
    if (this.inputValidator) {
      const configValidation = this.inputValidator.validateConfiguration({
        provider: provider,
        apiKey: apiKey,
        model: model,
        maxTokens: maxTokens,
        temperature: temperature,
        customApiUrl: customApiUrl
      });

      if (!configValidation.valid) {
        this.showStatus('Configuration validation failed: ' + configValidation.errors.join(', '), 'error');
        return;
      }
    } else {
      // Fallback validation when input validator is not available
      if (!provider || !apiKey || apiKey.length < 10) {
        this.showStatus('Provider and API key are required', 'error');
        return;
      }
    }

    // Show loading state
    const saveButton = document.getElementById('saveButton');
    const saveButtonText = document.getElementById('saveButtonText');
    if (saveButton) saveButton.disabled = true;
    if (saveButtonText) saveButtonText.innerHTML = '<span class="loading"></span>Saving...';

    try {
      // Send configuration to background script
      const response = await this.sendMessageToBackground({
        type: 'saveConfiguration',
        config: {
          provider: provider,
          apiKey: apiKey,
          model: model || null,
          maxTokens: maxTokens,
          temperature: temperature,
          customApiUrl: customApiUrl || null
        }
      });

      if (response && response.success) {
        this.showStatus('Configuration saved successfully!', 'success');
        
        // Hide setup guide and show test button
        const setupGuide = document.getElementById('setupGuide');
        const testButton = document.getElementById('testButton');
        if (setupGuide) setupGuide.style.display = 'none';
        if (testButton) testButton.style.display = 'block';
        
        // Update API key field to show it's configured
        if (apiKeyInput) apiKeyInput.value = '[CONFIGURED]';
        
        // Test the API key
        setTimeout(() => {
          this.testAPIConnection();
        }, 1000);
      } else {
        this.showStatus('Failed to save configuration: ' + (response?.error || 'Unknown error'), 'error');
      }

    } catch (error) {
      console.error('Failed to save configuration:', error);
      this.showStatus('Failed to save configuration: ' + error.message, 'error');
    } finally {
      // Reset button state
      if (saveButton) saveButton.disabled = false;
      if (saveButtonText) saveButtonText.textContent = 'Save Configuration';
    }
  }

  /**
   * Test API connection
   */
  async testAPIConnection() {
    try {
      // Show testing status
      this.showStatus('Testing API connection...', 'info');
      const testButton = document.getElementById('testButton');
      if (testButton) {
        testButton.disabled = true;
        testButton.innerHTML = '<span class="loading"></span>Testing...';
      }

      // Send test request to background script
      const response = await this.sendMessageToBackground({
        type: 'testAPIConnection',
        config: await this.getCurrentFormConfig()
      });

      if (testButton) {
        testButton.disabled = false;
        testButton.textContent = 'Test API Connection';
      }

      if (response && response.success) {
        this.showStatus('✓ API connection successful!', 'success');
      } else {
        this.showStatus('✗ API connection failed: ' + (response?.error || 'Unknown error'), 'error');
      }

    } catch (error) {
      const testButton = document.getElementById('testButton');
      if (testButton) {
        testButton.disabled = false;
        testButton.textContent = 'Test API Connection';
      }
      this.showStatus('Failed to test API connection: ' + error.message, 'error');
    }
  }

  /**
   * Get current form configuration
   */
  async getCurrentFormConfig() {
    const providerSelect = document.getElementById('provider');
    const apiKeyInput = document.getElementById('apiKey');
    const modelInput = document.getElementById('model');
    const maxTokensInput = document.getElementById('maxTokens');
    const temperatureInput = document.getElementById('temperature');
    const customApiUrlInput = document.getElementById('customApiUrl');

    // If API key shows [CONFIGURED], get the actual config from background
    let apiKey = apiKeyInput?.value?.trim();
    if (apiKey === '[CONFIGURED]') {
      const response = await this.sendMessageToBackground({ type: 'getConfiguration' });
      if (response && response.success && response.config) {
        return response.config;
      }
    }

    return {
      provider: providerSelect?.value,
      apiKey: apiKey,
      model: modelInput?.value?.trim() || null,
      maxTokens: parseInt(maxTokensInput?.value) || 1000,
      temperature: parseFloat(temperatureInput?.value) || 0.7,
      customApiUrl: customApiUrlInput?.value?.trim() || null
    };
  }

  /**
   * Send message to background script
   */
  async sendMessageToBackground(message) {
    return new Promise((resolve, reject) => {
      console.log('Sending message to background:', message);
      
      // Add a timeout to prevent hanging
      const timeout = setTimeout(() => {
        reject(new Error('Background script not responding - please refresh the extension'));
      }, 8000); // 8 second timeout
      
      try {
        chrome.runtime.sendMessage(message, (response) => {
          clearTimeout(timeout);
          
          if (chrome.runtime.lastError) {
            console.error('Chrome runtime error:', chrome.runtime.lastError);
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            console.log('Received response from background:', response);
            resolve(response);
          }
        });
      } catch (error) {
        clearTimeout(timeout);
        console.error('Error sending message:', error);
        reject(new Error('Failed to communicate with background script'));
      }
    });
  }

  /**
   * Update provider information display
   */
  updateProviderInfo() {
    const providerSelect = document.getElementById('provider');
    const providerInfo = document.getElementById('providerInfo');
    const providerDetails = document.getElementById('providerDetails');
    
    if (!providerSelect) return;
    
    const provider = providerSelect.value;
    
    if (provider && providerInfo && providerDetails) {
      // Use hardcoded provider info since we might not have storage manager
      const providers = {
        openai: {
          name: 'OpenAI',
          defaultModel: 'gpt-4',
          apiUrl: 'https://api.openai.com/v1/chat/completions'
        },
        anthropic: {
          name: 'Anthropic',
          defaultModel: 'claude-3-sonnet-20240229',
          apiUrl: 'https://api.anthropic.com/v1/messages'
        },
        gemini: {
          name: 'Google Gemini',
          defaultModel: 'gemini-pro',
          apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models'
        },
        custom: {
          name: 'Custom Provider (OpenAI Compatible)',
          defaultModel: 'gpt-3.5-turbo',
          apiUrl: null
        }
      };
      
      const providerData = providers[provider];
      
      if (providerData) {
        let infoHtml = `<strong>${providerData.name}</strong><br>`;
        
        if (provider === 'custom') {
          infoHtml += `Compatible with OpenAI API format<br>`;
          infoHtml += `Requires custom API base URL`;
        } else {
          infoHtml += `Default Model: ${providerData.defaultModel}<br>`;
          infoHtml += `API URL: ${providerData.apiUrl}`;
        }
        
        providerDetails.innerHTML = infoHtml;
        providerInfo.classList.remove('hidden');
      }
    } else if (providerInfo) {
      providerInfo.classList.add('hidden');
    }
  }

  /**
   * Toggle custom provider fields visibility
   */
  toggleCustomProviderFields() {
    const providerSelect = document.getElementById('provider');
    const customProviderFields = document.getElementById('customProviderFields');
    const customApiUrlInput = document.getElementById('customApiUrl');
    const urlValidation = document.getElementById('urlValidation');
    
    if (!providerSelect || !customProviderFields) return;
    
    const provider = providerSelect.value;
    
    if (provider === 'custom') {
      customProviderFields.style.display = 'block';
      if (customApiUrlInput) customApiUrlInput.required = true;
    } else {
      customProviderFields.style.display = 'none';
      if (customApiUrlInput) {
        customApiUrlInput.required = false;
        customApiUrlInput.value = '';
      }
      if (urlValidation) urlValidation.style.display = 'none';
    }
  }

  /**
   * Validate custom API URL format
   */
  validateCustomApiUrl() {
    const customApiUrlInput = document.getElementById('customApiUrl');
    const urlValidation = document.getElementById('urlValidation');
    
    if (!customApiUrlInput || !urlValidation) return;
    
    const customApiUrl = customApiUrlInput.value.trim();
    
    if (customApiUrl) {
      try {
        const url = new URL(customApiUrl);
        
        if (!url.protocol.startsWith('https')) {
          urlValidation.textContent = '⚠ API URL should use HTTPS for security';
          urlValidation.className = 'validation-feedback invalid';
          urlValidation.style.display = 'block';
        } else if (!customApiUrl.includes('/chat/completions') && !customApiUrl.includes('/v1/')) {
          urlValidation.textContent = 'ℹ Make sure this is the correct OpenAI-compatible endpoint';
          urlValidation.className = 'validation-feedback invalid';
          urlValidation.style.display = 'block';
        } else {
          urlValidation.textContent = '✓ Valid API URL format';
          urlValidation.className = 'validation-feedback valid';
          urlValidation.style.display = 'block';
        }
      } catch (e) {
        urlValidation.textContent = '✗ Invalid URL format';
        urlValidation.className = 'validation-feedback invalid';
        urlValidation.style.display = 'block';
      }
    } else {
      urlValidation.style.display = 'none';
    }
  }

  /**
   * Validate API key format
   */
  validateAPIKeyFormat() {
    const providerSelect = document.getElementById('provider');
    const apiKeyInput = document.getElementById('apiKey');
    const keyValidation = document.getElementById('keyValidation');
    
    if (!providerSelect || !apiKeyInput || !keyValidation) return;
    
    const provider = providerSelect.value;
    const apiKey = apiKeyInput.value.trim();
    
    // Skip validation if showing [CONFIGURED]
    if (apiKey === '[CONFIGURED]') {
      keyValidation.textContent = '✓ API key is configured';
      keyValidation.className = 'validation-feedback valid';
      keyValidation.style.display = 'block';
      return;
    }
    
    if (provider && apiKey && this.inputValidator) {
      const validation = this.inputValidator.validateAPIKey(provider, apiKey);
      
      if (validation.valid) {
        keyValidation.textContent = '✓ Valid API key format';
        keyValidation.className = 'validation-feedback valid';
        keyValidation.style.display = 'block';
      } else {
        keyValidation.textContent = validation.errors.join(', ');
        keyValidation.className = 'validation-feedback invalid';
        keyValidation.style.display = 'block';
      }
    } else if (provider && apiKey) {
      // Basic validation without input validator
      if (apiKey.length < 10) {
        keyValidation.textContent = 'API key appears too short';
        keyValidation.className = 'validation-feedback invalid';
        keyValidation.style.display = 'block';
      } else {
        keyValidation.textContent = 'API key format looks reasonable';
        keyValidation.className = 'validation-feedback valid';
        keyValidation.style.display = 'block';
      }
    } else {
      keyValidation.style.display = 'none';
    }
  }

  /**
   * Update model placeholder based on provider
   */
  updateModelPlaceholder() {
    const providerSelect = document.getElementById('provider');
    const modelInput = document.getElementById('model');
    
    if (!providerSelect || !modelInput) return;
    
    const provider = providerSelect.value;
    
    if (provider) {
      // Use hardcoded provider info
      const providers = {
        openai: { defaultModel: 'gpt-4' },
        anthropic: { defaultModel: 'claude-3-sonnet-20240229' },
        gemini: { defaultModel: 'gemini-pro' },
        custom: { defaultModel: 'gpt-3.5-turbo' }
      };
      
      const defaultModel = providers[provider]?.defaultModel;
      
      if (provider === 'custom') {
        modelInput.placeholder = 'e.g., gpt-3.5-turbo, gpt-4, llama-2-7b-chat';
      } else if (defaultModel) {
        modelInput.placeholder = `e.g., ${defaultModel}`;
      } else {
        modelInput.placeholder = 'Enter model name';
      }
    } else {
      modelInput.placeholder = 'Enter model name';
    }
  }

  /**
   * Load build information
   */
  async loadBuildInfo() {
    const buildVersionElement = document.getElementById('buildVersion');
    
    if (!buildVersionElement) {
      return;
    }
    
    try {
      // Try to load build info with a timeout
      const buildInfoUrl = chrome.runtime.getURL('build-info.json');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      const response = await fetch(buildInfoUrl, { 
        signal: controller.signal 
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const buildInfo = await response.json();
        buildVersionElement.textContent = `v${buildInfo.buildVersion} (${buildInfo.environment})`;
        return;
      }
    } catch (error) {
      console.log('Could not load build info:', error);
    }
    
    // Fallback to manifest version
    try {
      const manifest = chrome.runtime.getManifest();
      buildVersionElement.textContent = `v${manifest.version}`;
    } catch (manifestError) {
      console.log('Could not load manifest version:', manifestError);
      buildVersionElement.textContent = 'v1.0.0';
    }
  }

  /**
   * Show status message
   */
  showStatus(message, type) {
    const statusDiv = document.getElementById('status');
    if (statusDiv) {
      statusDiv.textContent = message;
      statusDiv.className = `status ${type}`;
      statusDiv.style.display = 'block';

      // Hide status after 5 seconds for success messages
      if (type === 'success') {
        setTimeout(() => {
          statusDiv.style.display = 'none';
        }, 5000);
      }
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.isInitialized = false;
    console.log('Popup manager cleaned up');
  }
}

// PopupManager is already exported as a class above