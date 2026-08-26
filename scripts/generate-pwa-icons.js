const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const inputLogoPath = path.join(__dirname, '..', 'public', 'Assets', 'TenderFlow AI Gradient Logo Only.png');
const outputDir = path.join(__dirname, '..', 'public', 'icons');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateIcons() {
  console.log('Reading source logo from:', inputLogoPath);

  // Trim transparent edges first to get exact logo bounding box
  const trimmedBuffer = await sharp(inputLogoPath).trim().toBuffer();

  // 1. Generate standard 512x512 icon (transparent background, padded)
  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: await sharp(trimmedBuffer)
          .resize({ width: 440, height: 440, fit: 'inside' })
          .toBuffer(),
        gravity: 'center',
      },
    ])
    .png()
    .toFile(path.join(outputDir, 'icon-512x512.png'));
  console.log('Generated icon-512x512.png');

  // 2. Generate standard 192x192 icon (transparent background, padded)
  await sharp({
    create: {
      width: 192,
      height: 192,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: await sharp(trimmedBuffer)
          .resize({ width: 164, height: 164, fit: 'inside' })
          .toBuffer(),
        gravity: 'center',
      },
    ])
    .png()
    .toFile(path.join(outputDir, 'icon-192x192.png'));
  console.log('Generated icon-192x192.png');

  // 3. Generate Android Maskable 512x512 icon (solid white/light background, safe area ~65%)
  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([
      {
        input: await sharp(trimmedBuffer)
          .resize({ width: 330, height: 330, fit: 'inside' })
          .toBuffer(),
        gravity: 'center',
      },
    ])
    .png()
    .toFile(path.join(outputDir, 'icon-maskable-512x512.png'));
  console.log('Generated icon-maskable-512x512.png');

  // 4. Generate Apple Touch Icon 180x180 (solid background, safe area)
  await sharp({
    create: {
      width: 180,
      height: 180,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([
      {
        input: await sharp(trimmedBuffer)
          .resize({ width: 130, height: 130, fit: 'inside' })
          .toBuffer(),
        gravity: 'center',
      },
    ])
    .png()
    .toFile(path.join(outputDir, 'apple-touch-icon.png'));
  console.log('Generated apple-touch-icon.png');

  // 5. Generate Favicons (32x32 and 16x16)
  await sharp({
    create: {
      width: 32,
      height: 32,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: await sharp(trimmedBuffer)
          .resize({ width: 30, height: 30, fit: 'inside' })
          .toBuffer(),
        gravity: 'center',
      },
    ])
    .png()
    .toFile(path.join(outputDir, 'favicon-32x32.png'));
  console.log('Generated favicon-32x32.png');

  await sharp({
    create: {
      width: 16,
      height: 16,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: await sharp(trimmedBuffer)
          .resize({ width: 15, height: 15, fit: 'inside' })
          .toBuffer(),
        gravity: 'center',
      },
    ])
    .png()
    .toFile(path.join(outputDir, 'favicon-16x16.png'));
  console.log('Generated favicon-16x16.png');

  // 6. Generate SVG icon (512x512 vector wrapper with high-res TenderFlow AI mark)
  const png512Buffer = await sharp(path.join(outputDir, 'icon-512x512.png')).toBuffer();
  const png512Base64 = png512Buffer.toString('base64');
  const svgContent = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <title>TenderFlow AI</title>
  <image href="data:image/png;base64,${png512Base64}" x="0" y="0" width="512" height="512" preserveAspectRatio="xMidYMid meet" />
</svg>
`;
  fs.writeFileSync(path.join(outputDir, 'icon.svg'), svgContent, 'utf-8');
  console.log('Generated icon.svg');

  console.log('All PWA icons & icon.svg successfully generated from TenderFlow AI Gradient Logo Only.png!');
}

generateIcons().catch(console.error);
