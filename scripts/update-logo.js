#!/usr/bin/env node

/**
 * Script to update logo references in the LeetPilot extension
 * Run this after saving the new logo as icons/logo-128.png
 */

const fs = require('fs');
const path = require('path');

console.log('🎨 Updating LeetPilot logo references...');

// Files to update
const filesToUpdate = [
  'src/ui/popup.html',
  'manifest.json'
];

// Update popup.html logo references
const popupHtmlPath = 'src/ui/popup.html';
if (fs.existsSync(popupHtmlPath)) {
  let popupContent = fs.readFileSync(popupHtmlPath, 'utf8');
  
  // Replace logo references
  popupContent = popupContent.replace(
    /src="\.\.\/\.\.\/icons\/icon-source-Q1\.png"/g,
    'src="../../icons/logo-128.png"'
  );
  
  fs.writeFileSync(popupHtmlPath, popupContent);
  console.log('✅ Updated popup.html logo references');
} else {
  console.log('❌ popup.html not found');
}

// Update manifest.json icon references
const manifestPath = 'manifest.json';
if (fs.existsSync(manifestPath)) {
  let manifestContent = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestContent);
  
  // Update action icons
  if (manifest.action && manifest.action.default_icon) {
    manifest.action.default_icon = {
      "16": "icons/logo-128.png",
      "32": "icons/logo-128.png", 
      "48": "icons/logo-128.png",
      "128": "icons/logo-128.png"
    };
  }
  
  // Update main icons
  if (manifest.icons) {
    manifest.icons = {
      "16": "icons/logo-128.png",
      "32": "icons/logo-128.png",
      "48": "icons/logo-128.png", 
      "128": "icons/logo-128.png"
    };
  }
  
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('✅ Updated manifest.json icon references');
} else {
  console.log('❌ manifest.json not found');
}

console.log('🎉 Logo update completed!');
console.log('📝 Next steps:');
console.log('   1. Save your new logo as icons/logo-128.png');
console.log('   2. Run: node scripts/build.js');
console.log('   3. Reload the extension in Chrome');