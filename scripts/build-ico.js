const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function makeIco() {
  const pngPath = path.join(__dirname, '../resources/icon.jpg');
  const icoPath = path.join(__dirname, '../resources/icon.ico');

  try {
    // Resize the image to 256x256 (standard large icon format)
    const pngBuffer = await sharp(pngPath)
      .resize(256, 256)
      .png()
      .toBuffer();

    // ICO header (6 bytes)
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0); // Reserved
    header.writeUInt16LE(1, 2); // Image type (1 = ICO)
    header.writeUInt16LE(1, 4); // Number of images (1)

    // Icon directory entry (16 bytes)
    const entry = Buffer.alloc(16);
    entry.writeUInt8(0, 0); // Width: 0 means 256
    entry.writeUInt8(0, 1); // Height: 0 means 256
    entry.writeUInt8(0, 2); // Color palette size (0 = no palette)
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes (1)
    entry.writeUInt16LE(32, 6); // Bits per pixel (32)
    entry.writeUInt32LE(pngBuffer.length, 8); // Size of image data
    entry.writeUInt32LE(22, 12); // Offset of image data (header 6 + entry 16 = 22)

    // Combine header, directory entry, and the actual PNG data
    const icoBuffer = Buffer.concat([header, entry, pngBuffer]);

    fs.writeFileSync(icoPath, icoBuffer);
    console.log('Successfully created resources/icon.ico!');
  } catch (err) {
    console.error('Error generating ICO file:', err);
    process.exit(1);
  }
}

makeIco();
