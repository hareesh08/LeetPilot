#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Validates that all required extension icons exist and meet Chrome Web Store requirements
 */
function validateIcons() {
  const iconsDir = path.join(__dirname, '..', 'icons');
  const requiredIcons = [
    { name: 'icon16.png', size: 16 },
    { name: 'icon32.png', size: 32 },
    { name: 'icon48.png', size: 48 },
    { name: 'icon128.png', size: 128 }
  ];

  console.log('🔍 Validating extension icons...');

  let allValid = true;

  for (const icon of requiredIcons) {
    const iconPath = path.join(iconsDir, icon.name);
    
    if (!fs.existsSync(iconPath)) {
      console.error(`❌ Missing required icon: ${icon.name}`);
      allValid = false;
      continue;
    }

    const stats = fs.statSync(iconPath);
    if (stats.size === 0) {
      console.error(`❌ Icon file is empty: ${icon.name}`);
      allValid = false;
      continue;
    }

    // Basic PNG validation (check for PNG signature)
    const buffer = fs.readFileSync(iconPath);
    const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    
    if (!buffer.subarray(0, 8).equals(pngSignature)) {
      console.error(`❌ Invalid PNG file: ${icon.name}`);
      allValid = false;
      continue;
    }

    console.log(`✅ Valid icon: ${icon.name} (${stats.size} bytes)`);
  }

  if (!allValid) {
    console.error('\n❌ Icon validation failed. Please ensure all required icons are present and valid.');
    process.exit(1);
  }

  console.log('\n✅ All icons validated successfully!');
}

if (require.main === module) {
  validateIcons();
}

module.exports = { validateIcons };