const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const outputDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Generate SVG string for standard icon
function createIconSvg(size, isMaskable = false) {
  const padding = isMaskable ? size * 0.15 : size * 0.05;
  const innerSize = size - padding * 2;
  const rx = isMaskable ? 0 : size * 0.22;

  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e40af" />
      <stop offset="50%" stop-color="#2563eb" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#e2e8f0" />
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#f59e0b" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="${size * 0.02}" stdDeviation="${size * 0.02}" flood-opacity="0.25" />
    </filter>
  </defs>

  <!-- Background -->
  <rect x="0" y="0" width="${size}" height="${size}" rx="${rx}" fill="url(#bgGrad)" />

  <!-- Grid subtle overlay -->
  <circle cx="${size * 0.8}" cy="${size * 0.2}" r="${size * 0.35}" fill="#ffffff" fill-opacity="0.06" />
  <circle cx="${size * 0.2}" cy="${size * 0.8}" r="${size * 0.25}" fill="#ffffff" fill-opacity="0.04" />

  <!-- Document / Tender Symbol -->
  <g transform="translate(${size / 2}, ${size / 2}) scale(${innerSize / 100}) translate(-50, -50)" filter="url(#shadow)">
    <!-- Document Base -->
    <rect x="22" y="14" width="56" height="72" rx="7" fill="url(#shieldGrad)" />
    
    <!-- Folded Corner Effect -->
    <path d="M60 14 L78 32 L60 32 Z" fill="#cbd5e1" />
    <path d="M22 21 C22 17.13 25.13 14 29 14 L60 14 L78 32 L78 79 C78 82.87 74.87 86 71 86 L29 86 C25.13 86 22 82.87 22 79 Z" fill="none" stroke="#f1f5f9" stroke-width="1.5" />

    <!-- Document Lines -->
    <rect x="30" y="38" width="40" height="4.5" rx="2.25" fill="#3b82f6" />
    <rect x="30" y="47" width="28" height="4" rx="2" fill="#94a3b8" />
    <rect x="30" y="55" width="34" height="4" rx="2" fill="#94a3b8" />
    <rect x="30" y="63" width="22" height="4" rx="2" fill="#94a3b8" />

    <!-- Badge / Stamp (Automation Icon) -->
    <circle cx="64" cy="68" r="14" fill="url(#accentGrad)" filter="url(#shadow)" />
    <path d="M59 68 L63 72 L70 64" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
  </g>
</svg>
`;
}

async function generate() {
  const sizes = [
    { name: 'icon-192x192.png', size: 192, maskable: false },
    { name: 'icon-512x512.png', size: 512, maskable: false },
    { name: 'icon-maskable-512x512.png', size: 512, maskable: true },
    { name: 'apple-touch-icon.png', size: 180, maskable: false },
    { name: 'favicon-32x32.png', size: 32, maskable: false },
    { name: 'favicon-16x16.png', size: 16, maskable: false },
  ];

  for (const item of sizes) {
    const svg = createIconSvg(item.size, item.maskable);
    const dest = path.join(outputDir, item.name);
    await sharp(Buffer.from(svg))
      .png()
      .toFile(dest);
    console.log(`Generated ${item.name}`);
  }

  // Also write SVG icon
  fs.writeFileSync(path.join(outputDir, 'icon.svg'), createIconSvg(512, false));
  console.log('Generated icon.svg');
}

generate().catch(console.error);
