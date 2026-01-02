#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const BuildConfig = require('../build.config.js');

/**
 * Enhanced build script for LeetPilot extension
 * Supports multiple environments and build targets
 */
class ExtensionBuilder {
  constructor() {
    this.buildConfig = new BuildConfig();
    this.startTime = Date.now();
  }

  /**
   * Main build function
   */
  async build(environment = 'production', target = 'chrome') {
    console.log(`🚀 Building LeetPilot extension...`);
    console.log(`📦 Environment: ${environment}`);
    console.log(`🎯 Target: ${target}`);
    console.log('');

    try {
      // Validate configuration
      await this.validateBuild();

      // Clean previous build
      await this.cleanBuild(environment);

      // Create build directory
      await this.createBuildDirectory(environment);

      // Copy files
      await this.copyFiles(environment);

      // Process TypeScript
      await this.processTypeScript(environment);

      // Generate manifest
      await this.generateManifest(environment, target);

      // Generate build info
      await this.generateBuildInfo(environment, target);

      // Validate build output
      await this.validateBuildOutput(environment);

      // Generate build report
      const buildStats = await this.getBuildStats(environment);
      const report = this.buildConfig.generateBuildReport(environment, target, buildStats);
      await this.saveBuildReport(environment, report);

      // Success message
      const duration = Date.now() - this.startTime;
      console.log(`✅ Build completed successfully in ${duration}ms`);
      console.log(`📁 Output directory: ${this.buildConfig.getEnvironmentConfig(environment).outputDir}`);
      
      return {
        success: true,
        outputDir: this.buildConfig.getEnvironmentConfig(environment).outputDir,
        duration: duration,
        report: report
      };

    } catch (error) {
      console.error('❌ Build failed:', error.message);
      throw error;
    }
  }

  /**
   * Validate build prerequisites
   */
  async validateBuild() {
    console.log('🔍 Validating build configuration...');

    const validation = this.buildConfig.validateConfig();
    
    if (!validation.valid) {
      console.error('❌ Build validation failed:');
      validation.errors.forEach(error => {
        console.error(`  - ${error}`);
      });
      throw new Error('Build validation failed');
    }

    console.log('✅ Build configuration valid');
  }

  /**
   * Clean previous build
   */
  async cleanBuild(environment) {
    const envConfig = this.buildConfig.getEnvironmentConfig(environment);
    const outputDir = envConfig.outputDir;

    console.log(`🧹 Cleaning previous build: ${outputDir}`);

    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }

    console.log('✅ Clean completed');
  }

  /**
   * Create build directory structure
   */
  async createBuildDirectory(environment) {
    const envConfig = this.buildConfig.getEnvironmentConfig(environment);
    const outputDir = envConfig.outputDir;

    console.log(`📁 Creating build directory: ${outputDir}`);

    // Create main output directory
    fs.mkdirSync(outputDir, { recursive: true });

    // Create subdirectories
    const subdirs = ['background', 'content', 'popup', 'icons', 'src'];
    subdirs.forEach(subdir => {
      fs.mkdirSync(path.join(outputDir, subdir), { recursive: true });
    });

    console.log('✅ Build directory created');
  }

  /**
   * Copy files to build directory
   */
  async copyFiles(environment) {
    const envConfig = this.buildConfig.getEnvironmentConfig(environment);
    const outputDir = envConfig.outputDir;

    console.log('📋 Copying files...');

    const filesToCopy = this.buildConfig.filesToCopy;
    const filesToExclude = this.buildConfig.filesToExclude;

    for (const filePattern of filesToCopy) {
      if (filePattern === 'manifest.json') {
        // Skip manifest.json - we'll generate it separately
        continue;
      }

      const sourcePath = filePattern;
      const destPath = path.join(outputDir, filePattern);

      if (fs.existsSync(sourcePath)) {
        if (fs.statSync(sourcePath).isDirectory()) {
          // Copy directory
          this.copyDirectory(sourcePath, destPath, filesToExclude);
        } else {
          // Copy file
          if (!this.shouldExcludeFile(sourcePath, filesToExclude)) {
            fs.copyFileSync(sourcePath, destPath);
          }
        }
      }
    }

    console.log('✅ Files copied');
  }

  /**
   * Copy directory recursively with exclusions
   */
  copyDirectory(source, dest, excludePatterns = []) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const items = fs.readdirSync(source);

    for (const item of items) {
      const sourcePath = path.join(source, item);
      const destPath = path.join(dest, item);

      if (this.shouldExcludeFile(sourcePath, excludePatterns)) {
        continue;
      }

      const stat = fs.statSync(sourcePath);

      if (stat.isDirectory()) {
        this.copyDirectory(sourcePath, destPath, excludePatterns);
      } else {
        fs.copyFileSync(sourcePath, destPath);
      }
    }
  }

  /**
   * Check if file should be excluded
   */
  shouldExcludeFile(filePath, excludePatterns) {
    const normalizedPath = filePath.replace(/\\/g, '/');
    
    return excludePatterns.some(pattern => {
      // Simple pattern matching (could be enhanced with glob library)
      const regexPattern = pattern
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*')
        .replace(/\./g, '\\.');
      
      const regex = new RegExp(regexPattern);
      return regex.test(normalizedPath);
    });
  }

  /**
   * Process TypeScript files
   */
  async processTypeScript(environment) {
    console.log('🔧 Processing TypeScript...');

    try {
      // Check if TypeScript files exist
      const hasTypeScriptFiles = fs.existsSync('src') && 
        fs.readdirSync('src').some(file => file.endsWith('.ts'));
      
      if (hasTypeScriptFiles && fs.existsSync('tsconfig.json')) {
        console.log('ℹ️  TypeScript files found, attempting compilation...');
        
        try {
          // Run TypeScript compiler with error handling
          execSync('npx tsc --noEmit', { stdio: 'pipe' });
          console.log('✅ TypeScript type checking passed');
        } catch (tscError) {
          console.warn('⚠️  TypeScript compilation has errors, but continuing build');
          console.warn('   Run "npx tsc" separately to see detailed errors');
        }
      } else {
        console.log('ℹ️  No TypeScript files found, skipping compilation');
      }
    } catch (error) {
      console.warn(`⚠️  TypeScript processing failed: ${error.message}`);
      console.log('ℹ️  Continuing build without TypeScript compilation');
    }
  }

  /**
   * Generate manifest.json for build
   */
  async generateManifest(environment, target) {
    const envConfig = this.buildConfig.getEnvironmentConfig(environment);
    const outputDir = envConfig.outputDir;

    console.log('📝 Generating manifest.json...');

    try {
      const manifest = this.buildConfig.generateManifest(environment, target);
      const manifestPath = path.join(outputDir, 'manifest.json');
      
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      
      console.log('✅ Manifest generated');
    } catch (error) {
      throw new Error(`Manifest generation failed: ${error.message}`);
    }
  }

  /**
   * Generate build-info.json file
   */
  async generateBuildInfo(environment, target) {
    const envConfig = this.buildConfig.getEnvironmentConfig(environment);
    const outputDir = envConfig.outputDir;

    console.log('📝 Generating build-info.json...');

    try {
      const buildInfo = this.buildConfig.generateBuildInfo(environment, target);
      const buildInfoPath = path.join(outputDir, 'build-info.json');
      
      fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo, null, 2));
      
      console.log('✅ Build info generated');
    } catch (error) {
      throw new Error(`Build info generation failed: ${error.message}`);
    }
  }

  /**
   * Validate build output
   */
  async validateBuildOutput(environment) {
    const envConfig = this.buildConfig.getEnvironmentConfig(environment);
    const outputDir = envConfig.outputDir;

    console.log('🔍 Validating build output...');

    // Check required files
    const requiredFiles = [
      'manifest.json',
      'src/background.js',
      'src/content.js',
      'src/ui/popup.html',
      'src/ui/popup.js'
    ];

    const missingFiles = [];

    for (const file of requiredFiles) {
      const filePath = path.join(outputDir, file);
      if (!fs.existsSync(filePath)) {
        missingFiles.push(file);
      }
    }

    if (missingFiles.length > 0) {
      throw new Error(`Missing required files in build output: ${missingFiles.join(', ')}`);
    }

    // Validate manifest
    try {
      const manifestPath = path.join(outputDir, 'manifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      
      if (!manifest.name || !manifest.version) {
        throw new Error('Invalid manifest: missing name or version');
      }
    } catch (error) {
      throw new Error(`Manifest validation failed: ${error.message}`);
    }

    console.log('✅ Build output validated');
  }

  /**
   * Get build statistics
   */
  async getBuildStats(environment) {
    const envConfig = this.buildConfig.getEnvironmentConfig(environment);
    const outputDir = envConfig.outputDir;

    const stats = {
      totalFiles: 0,
      totalSize: 0,
      fileTypes: {},
      directories: []
    };

    const calculateStats = (dir, relativePath = '') => {
      const items = fs.readdirSync(dir);

      for (const item of items) {
        const itemPath = path.join(dir, item);
        const relativeItemPath = path.join(relativePath, item);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory()) {
          stats.directories.push(relativeItemPath);
          calculateStats(itemPath, relativeItemPath);
        } else {
          stats.totalFiles++;
          stats.totalSize += stat.size;

          const ext = path.extname(item).toLowerCase();
          stats.fileTypes[ext] = (stats.fileTypes[ext] || 0) + 1;
        }
      }
    };

    if (fs.existsSync(outputDir)) {
      calculateStats(outputDir);
    }

    return stats;
  }

  /**
   * Save build report
   */
  async saveBuildReport(environment, report) {
    const envConfig = this.buildConfig.getEnvironmentConfig(environment);
    const outputDir = envConfig.outputDir;
    const reportPath = path.join(outputDir, 'build-report.json');

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📊 Build report saved: ${reportPath}`);
  }
}

/**
 * CLI interface
 */
async function main() {
  const args = process.argv.slice(2);
  const environment = args[0] || 'production';
  const target = args[1] || 'chrome';

  const builder = new ExtensionBuilder();
  
  try {
    await builder.build(environment, target);
    process.exit(0);
  } catch (error) {
    console.error('Build failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = ExtensionBuilder;