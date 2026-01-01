#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Updates the manifest.json version to match package.json version
 */
function updateManifestVersion() {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const manifestPath = path.join(__dirname, '..', 'manifest.json');

  console.log('🔄 Updating manifest version...');

  try {
    // Read package.json version
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const newVersion = packageJson.version;

    // Read and update manifest.json
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const oldVersion = manifest.version;
    
    manifest.version = newVersion;

    // Write updated manifest
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

    console.log(`✅ Updated manifest version: ${oldVersion} → ${newVersion}`);

  } catch (error) {
    console.error('❌ Failed to update manifest version:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  updateManifestVersion();
}

module.exports = { updateManifestVersion };