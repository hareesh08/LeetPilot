/**
 * LeetPilot Extension Build Configuration
 * Defines build settings for different environments and deployment targets
 */

const path = require('path');
const fs = require('fs');

class BuildConfig {
  constructor() {
    this.environments = {
      development: {
        name: 'Development',
        outputDir: 'dist-dev',
        minify: false,
        sourceMaps: true,
        debugMode: true,
        apiTimeout: 30000,
        logLevel: 'debug'
      },
      staging: {
        name: 'Staging',
        outputDir: 'dist-staging',
        minify: true,
        sourceMaps: true,
        debugMode: false,
        apiTimeout: 15000,
        logLevel: 'info'
      },
      production: {
        name: 'Production',
        outputDir: 'dist',
        minify: true,
        sourceMaps: false,
        debugMode: false,
        apiTimeout: 10000,
        logLevel: 'error'
      }
    };

    this.buildTargets = {
      chrome: {
        name: 'Chrome Web Store',
        manifestVersion: 3,
        permissions: [
          'storage',
          'activeTab'
        ],
        hostPermissions: [
          'https://leetcode.com/*',
          'https://api.openai.com/*',
          'https://api.anthropic.com/*',
          'https://generativelanguage.googleapis.com/*',
          'https://apis.iflow.cn/*',
          'https://*/*'
        ]
      },
      edge: {
        name: 'Microsoft Edge Add-ons',
        manifestVersion: 3,
        permissions: [
          'storage',
          'activeTab'
        ],
        hostPermissions: [
          'https://leetcode.com/*',
          'https://api.openai.com/*',
          'https://api.anthropic.com/*',
          'https://generativelanguage.googleapis.com/*',
          'https://apis.iflow.cn/*',
          'https://*/*'
        ]
      }
    };

    this.filesToCopy = [
      'manifest.json',
      'icons/',
      'src/'
    ];

    this.filesToExclude = [
      '**/*.test.js',
      '**/*.spec.js',
      '**/test/',
      '**/tests/',
      '**/.DS_Store',
      '**/Thumbs.db',
      '**/*.log',
      '**/node_modules/',
      '**/.git/',
      '**/.gitignore',
      '**/README.md',
      '**/DEPLOYMENT.md',
      '**/build.config.js',
      '**/scripts/',
      '**/tsconfig.json',
      '**/package.json',
      '**/package-lock.json'
    ];
  }

  /**
   * Get configuration for specific environment
   */
  getEnvironmentConfig(env = 'production') {
    if (!this.environments[env]) {
      throw new Error(`Unknown environment: ${env}`);
    }
    return this.environments[env];
  }

  /**
   * Get configuration for specific build target
   */
  getTargetConfig(target = 'chrome') {
    if (!this.buildTargets[target]) {
      throw new Error(`Unknown build target: ${target}`);
    }
    return this.buildTargets[target];
  }

  /**
   * Generate manifest.json for specific environment and target
   */
  generateManifest(env = 'production', target = 'chrome') {
    const envConfig = this.getEnvironmentConfig(env);
    const targetConfig = this.getTargetConfig(target);
    
    // Read base manifest
    const baseManifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
    
    // Apply environment-specific modifications
    const manifest = {
      ...baseManifest,
      manifest_version: targetConfig.manifestVersion,
      permissions: targetConfig.permissions,
      host_permissions: targetConfig.hostPermissions
    };

    // Add environment-specific fields
    if (env === 'development') {
      manifest.name += ' (Dev)';
      manifest.version_name = `${manifest.version}-dev`;
    } else if (env === 'staging') {
      manifest.name += ' (Staging)';
      manifest.version_name = `${manifest.version}-staging`;
    }

    // Note: Build metadata is now stored in separate build-info.json file
    // to comply with Chrome extension manifest validation

    return manifest;
  }

  /**
   * Generate build-info.json file with metadata
   */
  generateBuildInfo(env = 'production', target = 'chrome') {
    return {
      environment: env,
      target: target,
      buildTime: new Date().toISOString(),
      buildVersion: this.getBuildVersion(),
      config: {
        environment: this.getEnvironmentConfig(env),
        target: this.getTargetConfig(target)
      }
    };
  }

  /**
   * Get build version with timestamp
   */
  getBuildVersion() {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    return `${packageJson.version}-${timestamp}`;
  }

  /**
   * Get webpack configuration for environment
   */
  getWebpackConfig(env = 'production') {
    const envConfig = this.getEnvironmentConfig(env);
    
    return {
      mode: env === 'production' ? 'production' : 'development',
      devtool: envConfig.sourceMaps ? 'source-map' : false,
      optimization: {
        minimize: envConfig.minify
      },
      output: {
        path: path.resolve(__dirname, envConfig.outputDir),
        filename: '[name].js'
      },
      resolve: {
        extensions: ['.ts', '.js']
      },
      module: {
        rules: [
          {
            test: /\.ts$/,
            use: 'ts-loader',
            exclude: /node_modules/
          }
        ]
      }
    };
  }

  /**
   * Get file copy patterns for environment
   */
  getCopyPatterns(env = 'production') {
    const envConfig = this.getEnvironmentConfig(env);
    
    return this.filesToCopy.map(file => ({
      from: file,
      to: path.join(envConfig.outputDir, file),
      globOptions: {
        ignore: this.filesToExclude
      }
    }));
  }

  /**
   * Validate build configuration
   */
  validateConfig() {
    const errors = [];

    // Check if required files exist
    const requiredFiles = ['manifest.json', 'package.json'];
    for (const file of requiredFiles) {
      if (!fs.existsSync(file)) {
        errors.push(`Required file missing: ${file}`);
      }
    }

    // Check if required directories exist
    const requiredDirs = ['src', 'icons'];
    for (const dir of requiredDirs) {
      if (!fs.existsSync(dir)) {
        errors.push(`Required directory missing: ${dir}`);
      }
    }

    // Validate manifest.json
    try {
      const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
      
      if (!manifest.name) {
        errors.push('Manifest missing name field');
      }
      
      if (!manifest.version) {
        errors.push('Manifest missing version field');
      }
      
      if (manifest.manifest_version !== 3) {
        errors.push('Manifest version must be 3 for Chrome Web Store');
      }
    } catch (error) {
      errors.push(`Invalid manifest.json: ${error.message}`);
    }

    // Validate package.json
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      
      if (!packageJson.name) {
        errors.push('Package.json missing name field');
      }
      
      if (!packageJson.version) {
        errors.push('Package.json missing version field');
      }
    } catch (error) {
      errors.push(`Invalid package.json: ${error.message}`);
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Get environment variables for build
   */
  getEnvironmentVariables(env = 'production') {
    const envConfig = this.getEnvironmentConfig(env);
    
    return {
      NODE_ENV: env,
      BUILD_ENV: env,
      DEBUG_MODE: envConfig.debugMode,
      API_TIMEOUT: envConfig.apiTimeout,
      LOG_LEVEL: envConfig.logLevel,
      BUILD_TIME: new Date().toISOString(),
      BUILD_VERSION: this.getBuildVersion()
    };
  }

  /**
   * Get Chrome Web Store metadata
   */
  getChromeWebStoreMetadata() {
    return {
      category: 'productivity',
      language: 'en',
      visibility: 'public',
      pricing: 'free',
      screenshots: {
        required: 1,
        maxSize: '1280x800',
        formats: ['PNG', 'JPEG']
      },
      promotional: {
        smallTile: '440x280',
        largeTile: '920x680',
        marquee: '1400x560'
      },
      description: {
        maxLength: 132,
        detailed: {
          maxLength: 16384
        }
      }
    };
  }

  /**
   * Generate build report
   */
  generateBuildReport(env, target, buildStats) {
    const envConfig = this.getEnvironmentConfig(env);
    const targetConfig = this.getTargetConfig(target);
    
    return {
      timestamp: new Date().toISOString(),
      environment: {
        name: envConfig.name,
        config: envConfig
      },
      target: {
        name: targetConfig.name,
        config: targetConfig
      },
      build: {
        version: this.getBuildVersion(),
        outputDir: envConfig.outputDir,
        stats: buildStats
      },
      validation: this.validateConfig()
    };
  }
}

module.exports = BuildConfig;