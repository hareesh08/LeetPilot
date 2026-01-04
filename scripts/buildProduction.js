#!/usr/bin/env node

/**
 * Production Build Script for LeetPilot Extension
 * Features:
 * - Webpack bundling with optimization
 * - Terser minification
 * - JavaScript obfuscation
 * - Single JS file output (where possible)
 * - ZIP compression
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ProductionBuilder {
  constructor() {
    this.startTime = Date.now();
    this.outputDir = 'dist-production';
    this.zipFileName = 'leetpilot-production.zip';
  }

  /**
   * Main build process
   */
  async build() {
    console.log('🚀 Starting Production Build with Webpack + Terser + Obfuscation...');
    console.log('');

    try {
      // Check and install dependencies
      await this.checkDependencies();

      // Clean previous build
      await this.cleanBuild();

      // Create webpack config
      await this.createWebpackConfig();

      // Run webpack build
      await this.runWebpackBuild();

      // Copy static assets
      await this.copyStaticAssets();

      // Generate optimized manifest
      await this.generateManifest();

      // Create ZIP package
      await this.createZipPackage();

      // Cleanup temporary files
      await this.cleanup();

      const duration = Date.now() - this.startTime;
      console.log(`✅ Production build completed in ${duration}ms`);
      console.log(`📦 Package created: ${this.zipFileName}`);
      console.log(`📁 Build directory: ${this.outputDir}`);

      return {
        success: true,
        outputDir: this.outputDir,
        zipFile: this.zipFileName,
        duration: duration
      };

    } catch (error) {
      console.error('❌ Production build failed:', error.message);
      throw error;
    }
  }

  /**
   * Check and install required dependencies
   */
  async checkDependencies() {
    console.log('📦 Checking dependencies...');

    const requiredDeps = [
      'webpack',
      'webpack-cli', 
      'terser-webpack-plugin',
      'webpack-obfuscator'
    ];

    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const installedDeps = {
      ...packageJson.dependencies || {},
      ...packageJson.devDependencies || {}
    };

    const missingDeps = requiredDeps.filter(dep => !installedDeps[dep]);

    if (missingDeps.length > 0) {
      console.log(`📥 Installing missing dependencies: ${missingDeps.join(', ')}`);
      console.log('⚠️  Please run the following command manually:');
      console.log(`npm install --save-dev ${missingDeps.join(' ')}`);
      console.log('Then run this script again.');
      process.exit(1);
    } else {
      console.log('✅ All dependencies available');
    }
  }

  /**
   * Clean previous build
   */
  async cleanBuild() {
    console.log('🧹 Cleaning previous build...');

    // Remove output directory
    if (fs.existsSync(this.outputDir)) {
      fs.rmSync(this.outputDir, { recursive: true, force: true });
    }

    // Remove previous zip
    if (fs.existsSync(this.zipFileName)) {
      fs.unlinkSync(this.zipFileName);
    }

    // Remove webpack config if exists
    if (fs.existsSync('webpack.production.config.js')) {
      fs.unlinkSync('webpack.production.config.js');
    }

    console.log('✅ Clean completed');
  }

  /**
   * Create webpack configuration
   */
  async createWebpackConfig() {
    console.log('⚙️  Creating webpack configuration...');

    // Check if webpack-obfuscator is available
    let obfuscatorPlugin = '';
    let obfuscatorConfig = '';

    try {
      require.resolve('webpack-obfuscator');
      // Obfuscator is available, include it with safer settings
      obfuscatorPlugin = `
const WebpackObfuscator = require('webpack-obfuscator');`;
      obfuscatorConfig = `,
  plugins: [
    new WebpackObfuscator({
      rotateStringArray: true,
      stringArray: true,
      stringArrayThreshold: 0.7,
      unicodeEscapeSequence: false,
      identifierNamesGenerator: 'hexadecimal',
      renameGlobals: false,
      transformObjectKeys: false,
      compact: true,
      controlFlowFlattening: false,
      controlFlowFlatteningThreshold: 0,
      deadCodeInjection: false,
      deadCodeInjectionThreshold: 0,
      debugProtection: false,
      debugProtectionInterval: 0,
      disableConsoleOutput: false,
      domainLock: [],
      reservedNames: [],
      seed: 0,
      selfDefending: false,
      sourceMap: false,
      splitStrings: true,
      splitStringsChunkLength: 10,
      stringArrayEncoding: ['base64'],
      target: 'browser',
      numbersToExpressions: false,
      simplify: true
    })
  ]`;
    } catch (e) {
      // Obfuscator not available, skip it
      console.log('⚠️  webpack-obfuscator not found, building without obfuscation');
    }

    const webpackConfig = `
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
${obfuscatorPlugin}

module.exports = {
  mode: 'production',
  
  entry: {
    background: './src/background.js',
    content: './src/content.js',
    popup: './src/ui/popup.js'
  },

  output: {
    path: path.resolve(__dirname, '${this.outputDir}'),
    filename: '[name].bundle.js',
    clean: true
  },

  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.info', 'console.debug'],
            passes: 3
          },
          mangle: {
            toplevel: true,
            properties: {
              regex: /^_/
            }
          },
          format: {
            comments: false
          }
        },
        extractComments: false
      })
    ]
  }${obfuscatorConfig},

  resolve: {
    extensions: ['.js', '.ts', '.json']
  },

  module: {
    rules: [
      {
        test: /\\.js$/,
        exclude: /node_modules/,
        type: 'javascript/auto'
      },
      {
        test: /\\.css$/,
        type: 'asset/source'
      }
    ]
  },

  performance: {
    hints: false,
    maxEntrypointSize: 512000,
    maxAssetSize: 512000
  }
};
`;

    fs.writeFileSync('webpack.production.config.js', webpackConfig);
    console.log('✅ Webpack configuration created');
  }

  /**
   * Run webpack build
   */
  async runWebpackBuild() {
    console.log('🔨 Running webpack build...');

    try {
      execSync('npx webpack --config webpack.production.config.js --progress', {
        stdio: 'inherit',
        cwd: process.cwd(),
        shell: true
      });
      console.log('✅ Webpack build completed');
    } catch (error) {
      throw new Error(`Webpack build failed: ${error.message}`);
    }
  }

  /**
   * Copy static assets
   */
  async copyStaticAssets() {
    console.log('📋 Copying static assets...');

    // Create output directory if it doesn't exist
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    // Copy icons
    if (fs.existsSync('icons')) {
      this.copyDirectory('icons', path.join(this.outputDir, 'icons'));
    }

    // Copy HTML files
    if (fs.existsSync('src/ui/popup.html')) {
      fs.copyFileSync('src/ui/popup.html', path.join(this.outputDir, 'popup.html'));
    }

    // Copy CSS files
    if (fs.existsSync('src/ui/popup-styles.css')) {
      fs.copyFileSync('src/ui/popup-styles.css', path.join(this.outputDir, 'popup-styles.css'));
    }

    // Copy any other necessary static files
    const staticFiles = [
      'src/ui/popup.html',
      'src/ui/popup-styles.css'
    ];

    staticFiles.forEach(file => {
      if (fs.existsSync(file)) {
        const fileName = path.basename(file);
        fs.copyFileSync(file, path.join(this.outputDir, fileName));
      }
    });

    console.log('✅ Static assets copied');
  }

  /**
   * Generate optimized manifest
   */
  async generateManifest() {
    console.log('📝 Generating optimized manifest...');

    const baseManifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
    
    // Update paths to use bundled files
    const optimizedManifest = {
      ...baseManifest,
      background: {
        service_worker: 'background.bundle.js',
        type: 'module'
      },
      content_scripts: [
        {
          matches: ['https://leetcode.com/*'],
          js: ['content.bundle.js'],
          run_at: 'document_end'
        }
      ],
      action: {
        ...baseManifest.action,
        default_popup: 'popup.html'
      },
      web_accessible_resources: [
        {
          resources: [
            '*.bundle.js',
            'popup.html',
            'popup-styles.css',
            'icons/*'
          ],
          matches: ['https://leetcode.com/*']
        }
      ]
    };

    fs.writeFileSync(
      path.join(this.outputDir, 'manifest.json'),
      JSON.stringify(optimizedManifest, null, 2)
    );

    console.log('✅ Optimized manifest generated');
  }

  /**
   * Create ZIP package using system command
   */
  async createZipPackage() {
    console.log('📦 Creating ZIP package...');

    try {
      // Use PowerShell Compress-Archive command
      const command = `powershell -Command "Compress-Archive -Path '${this.outputDir}\\*' -DestinationPath '${this.zipFileName}' -Force"`;
      
      execSync(command, {
        stdio: 'inherit',
        shell: true
      });

      // Get file size
      const stats = fs.statSync(this.zipFileName);
      const sizeInMB = (stats.size / 1024 / 1024).toFixed(2);
      
      console.log(`✅ ZIP package created: ${this.zipFileName} (${sizeInMB} MB)`);
    } catch (error) {
      console.warn('⚠️  PowerShell zip failed, trying alternative method...');
      
      try {
        // Alternative: use 7zip if available
        execSync(`7z a -tzip "${this.zipFileName}" "${this.outputDir}\\*"`, {
          stdio: 'inherit',
          shell: true
        });
        console.log(`✅ ZIP package created with 7zip: ${this.zipFileName}`);
      } catch (zipError) {
        console.warn('⚠️  7zip not available, creating manual zip instruction...');
        console.log(`📁 Build files are ready in: ${this.outputDir}`);
        console.log('📦 Please manually zip the contents of this folder for deployment');
      }
    }
  }

  /**
   * Copy directory recursively
   */
  copyDirectory(source, dest) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const items = fs.readdirSync(source);

    for (const item of items) {
      const sourcePath = path.join(source, item);
      const destPath = path.join(dest, item);
      const stat = fs.statSync(sourcePath);

      if (stat.isDirectory()) {
        this.copyDirectory(sourcePath, destPath);
      } else {
        fs.copyFileSync(sourcePath, destPath);
      }
    }
  }

  /**
   * Cleanup temporary files
   */
  async cleanup() {
    console.log('🧹 Cleaning up temporary files...');

    // Remove webpack config
    if (fs.existsSync('webpack.production.config.js')) {
      fs.unlinkSync('webpack.production.config.js');
    }

    console.log('✅ Cleanup completed');
  }

  /**
   * Get build statistics
   */
  getBuildStats() {
    const stats = {
      outputDir: this.outputDir,
      zipFile: this.zipFileName,
      files: []
    };

    if (fs.existsSync(this.outputDir)) {
      const files = fs.readdirSync(this.outputDir);
      files.forEach(file => {
        const filePath = path.join(this.outputDir, file);
        const stat = fs.statSync(filePath);
        stats.files.push({
          name: file,
          size: stat.size,
          sizeKB: (stat.size / 1024).toFixed(2)
        });
      });
    }

    return stats;
  }
}

/**
 * CLI interface
 */
async function main() {
  const builder = new ProductionBuilder();
  
  try {
    const result = await builder.build();
    
    console.log('');
    console.log('📊 Build Statistics:');
    const stats = builder.getBuildStats();
    stats.files.forEach(file => {
      console.log(`  📄 ${file.name}: ${file.sizeKB} KB`);
    });
    
    console.log('');
    console.log('🎉 Production build ready for deployment!');
    console.log(`📦 Install package: ${result.zipFile}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Production build failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = ProductionBuilder;