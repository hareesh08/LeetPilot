// LeetPilot Popup Interface
// Provides user configuration and settings management

document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('configForm');
  const providerSelect = document.getElementById('provider');
  const apiKeyInput = document.getElementById('apiKey');
  const modelInput = document.getElementById('model');
  const maxTokensInput = document.getElementById('maxTokens');
  const temperatureInput = document.getElementById('temperature');
  const customApiUrlInput = document.getElementById('customApiUrl');
  const customProviderFields = document.getElementById('customProviderFields');
  const saveButton = document.getElementById('saveButton');
  const saveButtonText = document.getElementById('saveButtonText');
  const testButton = document.getElementById('testButton');
  const statusDiv = document.getElementById('status');
  const setupGuide = document.getElementById('setupGuide');
  const providerInfo = document.getElementById('providerInfo');
  const providerDetails = document.getElementById('providerDetails');
  const keyValidation = document.getElementById('keyValidation');
  const urlValidation = document.getElementById('urlValidation');

  // Initialize storage manager and input validator
  let storageManager;
  let inputValidator;
  let isFirstTimeSetup = true;
  
  // Load storage manager script and initialize
  const script = document.createElement('script');
  script.src = '../src/storage-manager.js';
  script.onload = function() {
    // Load input validator
    const validatorScript = document.createElement('script');
    validatorScript.src = '../src/input-validator.js';
    validatorScript.onload = function() {
      if (window.LeetPilotStorage && window.LeetPilotValidator) {
        storageManager = new window.LeetPilotStorage.StorageManager();
        inputValidator = new window.LeetPilotValidator.InputValidator();
        loadConfiguration();
        loadBuildInfo();
      } else {
        showStatus('Failed to load required modules', 'error');
      }
    };
    validatorScript.onerror = function() {
      showStatus('Failed to load input validator script', 'error');
    };
    document.head.appendChild(validatorScript);
  };
  script.onerror = function() {
    showStatus('Failed to load storage manager script', 'error');
  };
  document.head.appendChild(script);

  // Handle form submission
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    saveConfiguration();
  });

  // Handle provider selection changes
  providerSelect.addEventListener('change', function() {
    updateProviderInfo();
    updateModelPlaceholder();
    validateAPIKeyFormat();
    toggleCustomProviderFields();
  });

  // Handle API key input changes for real-time validation
  apiKeyInput.addEventListener('input', function() {
    validateAPIKeyFormat();
  });

  // Handle custom API URL input changes for real-time validation
  customApiUrlInput.addEventListener('input', function() {
    validateCustomApiUrl();
  });

  // Handle test button click
  testButton.addEventListener('click', function() {
    testAPIConnection();
  });

  // Load saved configuration
  async function loadConfiguration() {
    if (!storageManager) return;
    
    try {
      const config = await storageManager.retrieveConfiguration();
      if (config) {
        providerSelect.value = config.provider;
        apiKeyInput.value = config.apiKey;
        modelInput.value = config.model;
        maxTokensInput.value = config.maxTokens;
        temperatureInput.value = config.temperature;
        
        // Handle custom provider fields
        if (config.provider === 'custom' && config.customApiUrl) {
          customApiUrlInput.value = config.customApiUrl;
        }
        
        updateProviderInfo();
        updateModelPlaceholder();
        validateAPIKeyFormat();
        toggleCustomProviderFields();
        
        // Hide setup guide if configuration exists
        isFirstTimeSetup = false;
        setupGuide.style.display = 'none';
        testButton.style.display = 'block';
      }
    } catch (error) {
      console.log('No existing configuration found or failed to load:', error.message);
      // This is normal for first-time users
      isFirstTimeSetup = true;
    }
  }

  // Save configuration
  async function saveConfiguration() {
    if (!storageManager) {
      showStatus('Storage manager not initialized', 'error');
      return;
    }

    const provider = providerSelect.value;
    const apiKey = apiKeyInput.value.trim();
    const model = modelInput.value.trim();
    const maxTokens = parseInt(maxTokensInput.value) || 1000;
    const temperature = parseFloat(temperatureInput.value) || 0.7;
    const customApiUrl = customApiUrlInput.value.trim();

    // Validate inputs using input validator if available
    if (inputValidator) {
      // Validate configuration object
      const configValidation = inputValidator.validateConfiguration({
        provider: provider,
        apiKey: apiKey,
        model: model,
        maxTokens: maxTokens,
        temperature: temperature,
        customApiUrl: customApiUrl
      });

      if (!configValidation.valid) {
        showStatus('Configuration validation failed: ' + configValidation.errors.join(', '), 'error');
        return;
      }

      // Use sanitized values
      const sanitizedConfig = configValidation.sanitized;
      
      // Show loading state
      saveButton.disabled = true;
      saveButtonText.innerHTML = '<span class="loading"></span>Saving...';

      try {
        // Create configuration object with sanitized values
        const config = new window.LeetPilotStorage.AIProviderConfig(
          sanitizedConfig.provider,
          sanitizedConfig.apiKey,
          sanitizedConfig.model || null,
          sanitizedConfig.maxTokens,
          sanitizedConfig.temperature,
          sanitizedConfig.customApiUrl || null
        );

        // Save configuration using storage manager
        await storageManager.storeAPIKey(config);
        
        showStatus('Configuration saved successfully!', 'success');
        
        // Hide setup guide and show test button
        if (isFirstTimeSetup) {
          setupGuide.style.display = 'none';
          testButton.style.display = 'block';
          isFirstTimeSetup = false;
        }
        
        // Test the API key
        setTimeout(() => {
          testAPIConnection();
        }, 1000);

      } catch (error) {
        showStatus('Failed to save configuration: ' + error.message, 'error');
      } finally {
        // Reset button state
        saveButton.disabled = false;
        saveButtonText.textContent = 'Save Configuration';
      }
    } else {
      // Fallback to basic validation
      // Validate inputs
      if (!provider) {
        showStatus('Please select an AI provider', 'error');
        return;
      }

      if (!apiKey) {
        showStatus('Please enter your API key', 'error');
        return;
      }

      // Additional validation for custom providers
      if (provider === 'custom') {
        if (!customApiUrl) {
          showStatus('Please enter a custom API URL for custom providers', 'error');
          return;
        }
        
        try {
          const url = new URL(customApiUrl);
          if (!url.protocol.startsWith('https')) {
            showStatus('Custom API URL must use HTTPS', 'error');
            return;
          }
        } catch (e) {
          showStatus('Invalid custom API URL format', 'error');
          return;
        }
      }

      // Validate API key format using storage manager
      const validation = storageManager.validateAPIKeyFormat(provider, apiKey);
      if (!validation.valid) {
        showStatus(validation.error, 'error');
        return;
      }

      // Show loading state
      saveButton.disabled = true;
      saveButtonText.innerHTML = '<span class="loading"></span>Saving...';

      try {
        // Create configuration object
        const config = new window.LeetPilotStorage.AIProviderConfig(
          provider,
          apiKey,
          model || null,
          maxTokens,
          temperature,
          customApiUrl || null
        );

        // Save configuration using storage manager
        await storageManager.storeAPIKey(config);
        
        showStatus('Configuration saved successfully!', 'success');
        
        // Hide setup guide and show test button
        if (isFirstTimeSetup) {
          setupGuide.style.display = 'none';
          testButton.style.display = 'block';
          isFirstTimeSetup = false;
        }
        
        // Test the API key
        setTimeout(() => {
          testAPIConnection();
        }, 1000);

      } catch (error) {
        showStatus('Failed to save configuration: ' + error.message, 'error');
      } finally {
        // Reset button state
        saveButton.disabled = false;
        saveButtonText.textContent = 'Save Configuration';
      }
    }
  }

  // Update provider information display
  function updateProviderInfo() {
    const provider = providerSelect.value;
    
    if (provider && storageManager) {
      const providers = storageManager.getSupportedProviders();
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
    } else {
      providerInfo.classList.add('hidden');
    }
  }

  // Toggle custom provider fields visibility
  function toggleCustomProviderFields() {
    const provider = providerSelect.value;
    
    if (provider === 'custom') {
      customProviderFields.style.display = 'block';
      customApiUrlInput.required = true;
    } else {
      customProviderFields.style.display = 'none';
      customApiUrlInput.required = false;
      customApiUrlInput.value = '';
      urlValidation.style.display = 'none';
    }
  }

  // Validate custom API URL format in real-time
  function validateCustomApiUrl() {
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

  // Validate API key format in real-time
  function validateAPIKeyFormat() {
    const provider = providerSelect.value;
    const apiKey = apiKeyInput.value.trim();
    
    if (provider && apiKey && storageManager) {
      const validation = storageManager.validateAPIKeyFormat(provider, apiKey);
      
      if (validation.valid) {
        keyValidation.textContent = '✓ Valid API key format';
        keyValidation.className = 'validation-feedback valid';
        keyValidation.style.display = 'block';
      } else {
        keyValidation.textContent = validation.error;
        keyValidation.className = 'validation-feedback invalid';
        keyValidation.style.display = 'block';
      }
    } else {
      keyValidation.style.display = 'none';
    }
  }

  // Update model placeholder based on provider
  function updateModelPlaceholder() {
    const provider = providerSelect.value;
    
    if (storageManager && provider) {
      const providers = storageManager.getSupportedProviders();
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

  // Test API connection
  async function testAPIConnection() {
    if (!storageManager) {
      showStatus('Storage manager not initialized', 'error');
      return;
    }

    try {
      const config = await storageManager.retrieveConfiguration();
      if (!config) {
        showStatus('No configuration found to test', 'error');
        return;
      }

      // Show testing status
      showStatus('Testing API connection...', 'info');
      testButton.disabled = true;
      testButton.innerHTML = '<span class="loading"></span>Testing...';

      // Send test request to background script
      chrome.runtime.sendMessage({
        type: 'testAPIConnection',
        config: config
      }, (response) => {
        testButton.disabled = false;
        testButton.textContent = 'Test API Connection';

        if (response && response.success) {
          showStatus('✓ API connection successful!', 'success');
        } else {
          showStatus('✗ API connection failed: ' + (response?.error || 'Unknown error'), 'error');
        }
      });

    } catch (error) {
      testButton.disabled = false;
      testButton.textContent = 'Test API Connection';
      showStatus('Failed to test API connection: ' + error.message, 'error');
    }
  }

  // Show status message
  function showStatus(message, type) {
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

  // Load build information from build-info.json
  async function loadBuildInfo() {
    try {
      const buildInfoUrl = chrome.runtime.getURL('build-info.json');
      const response = await fetch(buildInfoUrl);
      
      if (response.ok) {
        const buildInfo = await response.json();
        const buildVersionElement = document.getElementById('buildVersion');
        
        if (buildVersionElement) {
          buildVersionElement.textContent = `v${buildInfo.buildVersion} (${buildInfo.environment})`;
        }
      } else {
        // Fallback to manifest version if build-info.json is not available
        const manifest = chrome.runtime.getManifest();
        const buildVersionElement = document.getElementById('buildVersion');
        
        if (buildVersionElement) {
          buildVersionElement.textContent = `v${manifest.version}`;
        }
      }
    } catch (error) {
      console.log('Could not load build info:', error);
      
      // Fallback to manifest version
      try {
        const manifest = chrome.runtime.getManifest();
        const buildVersionElement = document.getElementById('buildVersion');
        
        if (buildVersionElement) {
          buildVersionElement.textContent = `v${manifest.version}`;
        }
      } catch (manifestError) {
        console.log('Could not load manifest version:', manifestError);
      }
    }
  }
});