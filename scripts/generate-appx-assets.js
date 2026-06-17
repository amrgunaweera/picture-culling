const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function generateAppxAssets() {
  const sourcePath = path.join(__dirname, '../resources/icon.png');
  const targetDir = path.join(__dirname, '../resources/appx');

  // Ensure target directory exists
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const assets = [
    { name: 'StoreLogo.png', width: 50, height: 50, fit: 'cover' },
    { name: 'Square150x150Logo.png', width: 150, height: 150, fit: 'cover' },
    { name: 'Square44x44Logo.png', width: 44, height: 44, fit: 'cover' },
    { name: 'Wide310x150Logo.png', width: 310, height: 150, fit: 'contain', background: { r: 30, g: 30, b: 30, alpha: 1 } },
    { name: 'BadgeLogo.png', width: 24, height: 24, fit: 'cover' },
    { name: 'LargeTile.png', width: 310, height: 310, fit: 'cover' },
    { name: 'SmallTile.png', width: 71, height: 71, fit: 'cover' }
  ];

  console.log('Generating AppX/MSIX assets...');

  try {
    for (const asset of assets) {
      const outputPath = path.join(targetDir, asset.name);
      let transform = sharp(sourcePath).resize(asset.width, asset.height, {
        fit: asset.fit,
        background: asset.background || { r: 0, g: 0, b: 0, alpha: 0 }
      });

      await transform.png().toFile(outputPath);
      console.log(`Generated: ${asset.name} (${asset.width}x${asset.height})`);
    }
    console.log('All AppX/MSIX assets successfully generated in resources/appx!');
  } catch (error) {
    console.error('Error generating AppX assets:', error);
    process.exit(1);
  }
}

generateAppxAssets();
