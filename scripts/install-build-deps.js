#!/usr/bin/env node

/**
 * Install dependencies for production build
 */

const { execSync } = require('child_process');

console.log('📦 Installing production build dependencies...');

const dependencies = [
  'webpack',
  'webpack-cli',
  'terser-webpack-plugin',
  'webpack-obfuscator',
  'archiver'
];

try {
  console.log(`Installing: ${dependencies.join(', ')}`);
  
  execSync(`npm install --save-dev ${dependencies.join(' ')}`, {
    stdio: 'inherit',
    shell: true
  });
  
  console.log('✅ Dependencies installed successfully!');
  console.log('🚀 You can now run: npm run build:production');
  
} catch (error) {
  console.error('❌ Failed to install dependencies:', error.message);
  console.log('');
  console.log('Please run manually:');
  console.log(`npm install --save-dev ${dependencies.join(' ')}`);
  process.exit(1);
}