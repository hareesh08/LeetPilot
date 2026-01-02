// LeetPilot Service Container
// Dependency injection container for better architecture

/**
 * Service Container for dependency injection
 */
export class ServiceContainer {
  constructor() {
    this.services = new Map();
    this.singletons = new Map();
    this.factories = new Map();
  }

  /**
   * Register a service factory
   */
  register(name, factory, options = {}) {
    if (typeof factory !== 'function') {
      throw new Error(`Service factory for '${name}' must be a function`);
    }

    this.factories.set(name, {
      factory,
      singleton: options.singleton !== false, // Default to singleton
      dependencies: options.dependencies || []
    });

    return this;
  }

  /**
   * Register a singleton service instance
   */
  registerInstance(name, instance) {
    this.singletons.set(name, instance);
    return this;
  }

  /**
   * Get a service instance
   */
  get(name) {
    // Check if we have a singleton instance
    if (this.singletons.has(name)) {
      return this.singletons.get(name);
    }

    // Check if we have a factory
    if (!this.factories.has(name)) {
      throw new Error(`Service '${name}' not registered`);
    }

    const serviceConfig = this.factories.get(name);
    
    // Resolve dependencies
    const dependencies = serviceConfig.dependencies.map(dep => this.get(dep));
    
    // Create instance
    const instance = serviceConfig.factory(...dependencies);
    
    // Store as singleton if configured
    if (serviceConfig.singleton) {
      this.singletons.set(name, instance);
    }

    return instance;
  }

  /**
   * Check if a service is registered
   */
  has(name) {
    return this.singletons.has(name) || this.factories.has(name);
  }

  /**
   * Remove a service
   */
  remove(name) {
    this.singletons.delete(name);
    this.factories.delete(name);
    return this;
  }

  /**
   * Clear all services
   */
  clear() {
    // Call destroy method on singletons if they have one
    for (const [name, instance] of this.singletons.entries()) {
      if (instance && typeof instance.destroy === 'function') {
        try {
          instance.destroy();
        } catch (error) {
          console.error(`Error destroying service '${name}':`, error);
        }
      }
    }

    this.singletons.clear();
    this.factories.clear();
    return this;
  }

  /**
   * Get all registered service names
   */
  getServiceNames() {
    const names = new Set();
    
    for (const name of this.singletons.keys()) {
      names.add(name);
    }
    
    for (const name of this.factories.keys()) {
      names.add(name);
    }
    
    return Array.from(names);
  }

  /**
   * Create a child container that inherits from this one
   */
  createChild() {
    const child = new ServiceContainer();
    
    // Copy factories (not instances)
    for (const [name, config] of this.factories.entries()) {
      child.factories.set(name, config);
    }
    
    return child;
  }
}

/**
 * Default service container instance
 */
export const container = new ServiceContainer();

/**
 * Service registration helper
 */
export function registerServices(container) {
  // Import services dynamically to avoid circular dependencies
  
  container.register('storageManager', () => {
    const { StorageManager } = require('./storage-manager.js');
    return new StorageManager();
  });

  container.register('inputValidator', () => {
    const { InputValidator } = require('./input-validator.js');
    return new InputValidator();
  });

  container.register('securityMonitor', () => {
    const { SecurityMonitor } = require('./security-monitor.js');
    return new SecurityMonitor();
  });

  container.register('errorHandler', () => {
    const { ComprehensiveErrorHandler } = require('./error-handler.js');
    return new ComprehensiveErrorHandler();
  });

  container.register('rateLimiter', () => {
    const { RateLimiter } = require('./rate-limiter.js');
    return new RateLimiter();
  });

  container.register('apiClient', (storageManager) => {
    const { AIProviderClient } = require('./api-client.js');
    // API client needs configuration, so it's created on demand
    return {
      createClient: async (config) => {
        return new AIProviderClient(config);
      }
    };
  }, { dependencies: ['storageManager'] });

  return container;
}