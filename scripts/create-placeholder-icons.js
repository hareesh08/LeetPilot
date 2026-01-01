#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Creates placeholder PNG icons for development
 * These should be replaced with actual designed icons before publishing
 */
function createPlaceholderIcons() {
  const iconsDir = path.join(__dirname, '..', 'icons');
  
  // Ensure icons directory exists
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  // Minimal PNG file structure (1x1 transparent pixel)
  // This is a valid PNG file that can be used as a placeholder
  const pngHeader = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x00, 0x01, // Width: 1
    0x00, 0x00, 0x00, 0x01, // Height: 1
    0x08, 0x06, 0x00, 0x00, 0x00, // Bit depth: 8, Color type: 6 (RGBA), Compression: 0, Filter: 0, Interlace: 0
    0x1F, 0x15, 0xC4, 0x89, // CRC
    0x00, 0x00, 0x00, 0x0B, // IDAT chunk length
    0x49, 0x44, 0x41, 0x54, // IDAT
    0x78, 0x9C, 0x62, 0x00, 0x02, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0D, // Compressed data (transparent pixel)
    0x0A, 0x2D, 0xB4, // CRC
    0x00, 0x00, 0x00, 0x00, // IEND chunk length
    0x49, 0x45, 0x4E, 0x44, // IEND
    0xAE, 0x42, 0x60, 0x82  // CRC
  ]);

  const iconSizes = [16, 32, 48, 128];
  
  console.log('🎨 Creating placeholder icons...');
  
  for (const size of iconSizes) {
    const iconPath = path.join(iconsDir, `icon${size}.png`);
    
    if (!fs.existsSync(iconPath)) {
      fs.writeFileSync(iconPath, pngHeader);
      console.log(`✅ Created placeholder: icon${size}.png`);
    } else {
      console.log(`⚠️  Icon already exists: icon${size}.png`);
    }
  }
  
  console.log('\n📝 Note: These are placeholder icons. Replace with actual designed icons before publishing to Chrome Web Store.');
}

if (require.main === module) {
  createPlaceholderIcons();
}

module.exports = { createPlaceholderIcons };