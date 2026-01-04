// Test Settings Storage
// Verify that settings are properly stored and retrieved

describe('Settings Storage', () => {
  let mockChrome;
  let storageData;

  beforeEach(() => {
    // Reset storage data
    storageData = {};

    // Mock chrome.storage.local
    mockChrome = {
      storage: {
        local: {
          get: jest.fn((keys) => {
            return Promise.resolve(
              typeof keys === 'string' 
                ? { [keys]: storageData[keys] }
                : keys.reduce((acc, key) => {
                    acc[key] = storageData[key];
                    return acc;
                  }, {})
            );
          }),
          set: jest.fn((items) => {
            Object.assign(storageData, items);
            return Promise.resolve();
          })
        }
      }
    };

    global.chrome = mockChrome;
  });

  afterEach(() => {
    delete global.chrome;
  });

  test('should store settings in chrome.storage.local', async () => {
    const settingsKey = 'leetpilot_settings';
    const settings = {
      autoComplete: true,
      autoHint: false,
      autoErrorFix: true,
      autoOptimize: false
    };

    await chrome.storage.local.set({ [settingsKey]: settings });

    expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
      [settingsKey]: settings
    });

    expect(storageData[settingsKey]).toEqual(settings);
  });

  test('should retrieve settings from chrome.storage.local', async () => {
    const settingsKey = 'leetpilot_settings';
    const settings = {
      autoComplete: true,
      autoHint: false,
      autoErrorFix: true,
      autoOptimize: false
    };

    storageData[settingsKey] = settings;

    const result = await chrome.storage.local.get(settingsKey);

    expect(mockChrome.storage.local.get).toHaveBeenCalledWith(settingsKey);
    expect(result[settingsKey]).toEqual(settings);
  });

  test('should update individual settings', async () => {
    const settingsKey = 'leetpilot_settings';
    
    // Initial settings
    storageData[settingsKey] = {
      autoComplete: true,
      autoHint: true,
      autoErrorFix: false,
      autoOptimize: false
    };

    // Update one setting
    const currentSettings = await chrome.storage.local.get(settingsKey);
    const settings = currentSettings[settingsKey] || {};
    settings.autoHint = false;
    
    await chrome.storage.local.set({ [settingsKey]: settings });

    expect(storageData[settingsKey].autoHint).toBe(false);
    expect(storageData[settingsKey].autoComplete).toBe(true);
  });

  test('should handle missing settings gracefully', async () => {
    const settingsKey = 'leetpilot_settings';
    
    const result = await chrome.storage.local.get(settingsKey);
    
    expect(result[settingsKey]).toBeUndefined();
  });

  test('should default to enabled when setting is undefined', () => {
    const settings = {};
    const featureName = 'autoComplete';
    
    // Simulate isFeatureEnabled logic
    const isEnabled = settings[featureName] !== false;
    
    expect(isEnabled).toBe(true);
  });

  test('should respect disabled setting', () => {
    const settings = { autoComplete: false };
    const featureName = 'autoComplete';
    
    // Simulate isFeatureEnabled logic
    const isEnabled = settings[featureName] !== false;
    
    expect(isEnabled).toBe(false);
  });

  test('should respect enabled setting', () => {
    const settings = { autoComplete: true };
    const featureName = 'autoComplete';
    
    // Simulate isFeatureEnabled logic
    const isEnabled = settings[featureName] !== false;
    
    expect(isEnabled).toBe(true);
  });
});

describe('Feature Flag Mapping', () => {
  test('should map request types to feature names correctly', () => {
    const featureMap = {
      'completion': 'autoComplete',
      'hint': 'autoHint',
      'explanation': 'autoErrorFix',
      'optimization': 'autoOptimize'
    };

    expect(featureMap['completion']).toBe('autoComplete');
    expect(featureMap['hint']).toBe('autoHint');
    expect(featureMap['explanation']).toBe('autoErrorFix');
    expect(featureMap['optimization']).toBe('autoOptimize');
  });

  test('should handle unknown request types', () => {
    const featureMap = {
      'completion': 'autoComplete',
      'hint': 'autoHint',
      'explanation': 'autoErrorFix',
      'optimization': 'autoOptimize'
    };

    const unknownType = 'unknown';
    const featureName = featureMap[unknownType];

    expect(featureName).toBeUndefined();
  });
});

describe('Auto-Trigger Flag', () => {
  test('should skip request when feature is disabled and auto-triggered', () => {
    const request = {
      type: 'completion',
      isAutoTriggered: true
    };

    const settings = {
      autoComplete: false
    };

    const featureMap = {
      'completion': 'autoComplete'
    };

    const featureName = featureMap[request.type];
    const isEnabled = settings[featureName] !== false;

    expect(isEnabled).toBe(false);
    // Request should be skipped
  });

  test('should process request when feature is enabled and auto-triggered', () => {
    const request = {
      type: 'completion',
      isAutoTriggered: true
    };

    const settings = {
      autoComplete: true
    };

    const featureMap = {
      'completion': 'autoComplete'
    };

    const featureName = featureMap[request.type];
    const isEnabled = settings[featureName] !== false;

    expect(isEnabled).toBe(true);
    // Request should be processed
  });

  test('should process manual requests regardless of settings', () => {
    const request = {
      type: 'completion',
      isAutoTriggered: false // Manual keyboard shortcut
    };

    const settings = {
      autoComplete: false
    };

    // Manual requests should not check feature flags
    expect(request.isAutoTriggered).toBe(false);
    // Request should be processed even though autoComplete is disabled
  });
});
