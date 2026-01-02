#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Validates the packaged extension for Chrome Web Store submission
 */
function validatePackage() {
  const distDir = path.join(__dirname, '..', 'dist');
  const packagePath = path.join(__dirname, '..', 'leetpilot-extension.zip');

  console.log('🔍 Validating extension package...');

  // Check if package exists
  if (!fs.existsSync(packagePath)) {
    console.error('❌ Package file not found: leetpilot-extension.zip');
    process.exit(1);
  }

  // Check package size (Chrome Web Store has a 128MB limit)
  const stats = fs.statSync(packagePath);
  const sizeMB = stats.size / (1024 * 1024);
  
  if (sizeMB > 128) {
    console.error(`❌ Package too large: ${sizeMB.toFixed(2)}MB (limit: 128MB)`);
    process.exit(1);
  }

  console.log(`✅ Package size: ${sizeMB.toFixed(2)}MB`);

  // Check required files in dist directory
  const requiredFiles = [
    'manifest.json',
    'src/background.js',
    'src/content.js',
    'src/ui/popup.html',
    'src/ui/popup.js',
    'icons/icon16.png',
    'icons/icon32.png',
    'icons/icon48.png',
    'icons/icon128.png'
  ];

  let allFilesPresent = true;

  for (const file of requiredFiles) {
    const filePath = path.join(distDir, file);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Missing required file in package: ${file}`);
      allFilesPresent = false;
    } else {
      console.log(`✅ Found: ${file}`);
    }
  }

  if (!allFilesPresent) {
    console.error('\n❌ Package validation failed. Missing required files.');
    process.exit(1);
  }

  // Validate manifest.json in dist
  try {
    const manifestPath = path.join(distDir, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    // Check required manifest fields
    const requiredFields = ['name', 'version', 'description', 'manifest_version'];
    for (const field of requiredFields) {
      if (!manifest[field]) {
        console.error(`❌ Missing required manifest field: ${field}`);
        allFilesPresent = false;
      }
    }

    if (manifest.manifest_version !== 3) {
      console.error('❌ Manifest version must be 3 for Chrome Web Store');
      allFilesPresent = false;
    }

    console.log(`✅ Manifest version: ${manifest.version}`);
    console.log(`✅ Extension name: ${manifest.name}`);

  } catch (error) {
    console.error('❌ Invalid manifest.json:', error.message);
    process.exit(1);
  }

  if (!allFilesPresent) {
    process.exit(1);
  }

  console.log('\n✅ Package validation successful! Ready for Chrome Web Store submission.');
}

if (require.main === module) {
  validatePackage();
}

module.exports = { validatePackage };