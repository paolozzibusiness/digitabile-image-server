const express = require('express');
const sharp = require('sharp');

const app = express();
const PORT = process.env.PORT || 3000;
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'djriubaun';
const UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || 'digitabile';

const ACCENT_COLORS = {
  blue:  '#4f8ef7',
  gold:  '#f7b94f',
  green: '#4ff7a0',
  pink:  '#f74f9e',
  purple:'#a855f7'
};

function esc(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapText(text, maxChars) {
  const words = (text || '').split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const test = current ? current + ' ' + word : word;
    if (test.length <= maxChars) { current = test; }
    else { if (current) lines.push(current); current = word; }
  }
  if (current) lines.push(current);
  return lines.slice(0, 4);
}

async function fetchImage(url) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.google.com/'
  };
  const resp = await fetch(url, { headers });
  if (!resp.ok) throw new Error(`Image fetch failed: ${resp.status} ${url}`);
  return Buffer.from(await resp.arrayBuffer());
}

async function uploadToCloudinary(imageBuffer) {
  const formData = new FormData();
  const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
  formData.append('file', blob, 'slide.jpg');
  formData.append('upload_preset', UPLOAD_PRESET);
  const resp = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: formData
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Cloudinary upload failed: ${resp.status} ${err}`);
  }
  const data = await resp.json();
  return data.secure_url;
}

function buildSliderSVG(params) {
  const { titolo, desc1, desc2, desc3, numero, accent, tag } = params;
  const accentColor = ACCENT_COLORS[accent] || '#4f8ef7';
  const titleLines = wrapText((titolo || 'TITOLO').toUpperCase(), 18);
  const descLines = [desc1, desc2, desc3].filter(d => d && d.trim());

  const TITLE_LINE_H = 98;
  const DESC_LINE_H = 46;
  const SIDE_PAD = 65;
  const BOTTOM_AREA = 100;

  const totalContentH = 6 + 16 + titleLines.length * TITLE_LINE_H + 20 + descLines.length * DESC_LINE_H;
  const contentStartY = 1350 - BOTTOM_AREA - totalContentH - 60;

  let titleSvg = '';
  titleLines.forEach((line, i) => {
    titleSvg += `<text x="${SIDE_PAD}" y="${contentStartY + 22 + i * TITLE_LINE_H}" font-family="Arial Black,Arial,sans-serif" font-size="86" font-weight="900" fill="white" letter-spacing="-1">${esc(line)}</text>`;
  });

  const descStartY = contentStartY + 22 + titleLines.length * TITLE_LINE_H + 28;
  let descSvg = '';
  descLines.forEach((line, i) => {
    descSvg += `<text x="${SIDE_PAD}" y="${descStartY + i * DESC_LINE_H}" font-family="Arial,sans-serif" font-size="38" font-weight="400" fill="rgba(255,255,255,0.85)">${esc(line)}</text>`;
  });

  const barY = contentStartY - 22;
  const slideNum = parseInt((numero || '1').split('/')[0].trim()) - 1;
  const dotsSvg = [0,1,2,3,4].map(i =>
    i === slideNum
      ? `<rect x="${SIDE_PAD + i * 22}" y="1290" width="26" height="8" rx="4" fill="white"/>`
      : `<circle cx="${SIDE_PAD + 13 + i * 22}" cy="1294" r="4" fill="rgba(255,255,255,0.25)"/>`
  ).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350">
    <defs>
      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#000" stop-opacity="0.08"/>
        <stop offset="40%" stop-color="#000" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#000" stop-opacity="0.93"/>
      </linearGradient>
    </defs>
    <rect width="1080" height="1350" fill="url(#grad)"/>
    <text x="${SIDE_PAD}" y="72" font-family="Arial,sans-serif" font-size="28" fill="rgba(255,255,255,0.45)" letter-spacing="3">${esc(numero || '01 / 05')}</text>
    <rect x="${1080 - SIDE_PAD - 150}" y="42" width="150" height="40" rx="4" fill="rgba(15,20,50,0.85)"/>
    <text x="${1080 - SIDE_PAD - 75}" y="68" font-family="Arial,sans-serif" font-size="22" font-weight="700" fill="${accentColor}" text-anchor="middle" letter-spacing="1">${esc((tag || 'AI').toUpperCase())}</text>
    <rect x="${SIDE_PAD}" y="${barY}" width="65" height="6" fill="${accentColor}" rx="3"/>
    ${titleSvg}
    ${descSvg}
    ${dotsSvg}
    <text x="${1080 - SIDE_PAD}" y="1300" font-family="Arial,sans-serif" font-size="26" font-weight="700" fill="rgba(255,255,255,0.55)" text-anchor="end">@digitabilenews</text>
  </svg>`;
}

function buildCtaSVG() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350">
    <defs>
      <linearGradient id="ctaGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#000820" stop-opacity="0.6"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0.95"/>
      </linearGradient>
    </defs>
    <rect width="1080" height="1350" fill="url(#ctaGrad)"/>
    <text x="1015" y="70" font-family="Arial,sans-serif" font-size="26" font-weight="700" fill="rgba(255,255,255,0.5)" text-anchor="end">@digitabilenews</text>
    <text x="65" y="70" font-family="Arial,sans-serif" font-size="28" fill="rgba(255,255,255,0.35)" letter-spacing="3">05 / 05</text>
    <rect x="440" y="430" width="200" height="4" fill="#4f8ef7" rx="2"/>
    <text x="540" y="560" font-family="Arial Black,Arial,sans-serif" font-size="96" font-weight="900" fill="white" text-anchor="middle">TI</text>
    <text x="540" y="670" font-family="Arial Black,Arial,sans-serif" font-size="96" font-weight="900" fill="white" text-anchor="middle">INTERESSA?</text>
    <text x="540" y="760" font-family="Arial,sans-serif" font-size="42" fill="rgba(255,255,255,0.75)" text-anchor="middle">Leggi la descrizione completa</text>
    <text x="540" y="815" font-family="Arial,sans-serif" font-size="42" fill="rgba(255,255,255,0.75)" text-anchor="middle">sotto questo post &#x2193;</text>
    <rect x="240" y="870" width="600" height="1" fill="rgba(255,255,255,0.12)"/>
    <text x="540" y="940" font-family="Arial,sans-serif" font-size="36" fill="rgba(255,255,255,0.55)" text-anchor="middle">Segui per news AI ogni giorno</text>
    <text x="540" y="1005" font-family="Arial,sans-serif" font-size="56" font-weight="700" fill="#4f8ef7" text-anchor="middle">@digitabilenews &#x1F514;</text>
    <text x="540" y="1160" font-family="Arial,sans-serif" font-size="24" fill="rgba(255,255,255,0.25)" text-anchor="middle">Contenuto creato con Intelligenza Artificiale</text>
    <circle cx="488" cy="1300" r="4" fill="rgba(255,255,255,0.25)"/>
    <circle cx="511" cy="1300" r="4" fill="rgba(255,255,255,0.25)"/>
    <circle cx="534" cy="1300" r="4" fill="rgba(255,255,255,0.25)"/>
    <circle cx="557" cy="1300" r="4" fill="rgba(255,255,255,0.25)"/>
    <rect x="572" y="1292" width="26" height="8" rx="4" fill="white"/>
  </svg>`;
}

// Main endpoint: generate slide + upload to Cloudinary + return URL
// GET /generate?imageUrl=...&titolo=...&desc1=...&desc2=...&desc3=...&numero=01/05&accent=blue&tag=AI&type=slide|cta
app.get('/generate', async (req, res) => {
  try {
    const { imageUrl, type = 'slide', ...rest } = req.query;
    if (!imageUrl) return res.status(400).json({ error: 'imageUrl is required' });

    // 1. Fetch background image with browser-like headers
    const imgBuffer = await fetchImage(imageUrl);

    // 2. Generate SVG overlay
    const svg = type === 'cta' ? buildCtaSVG() : buildSliderSVG(rest);

    // 3. Composite image + SVG with sharp
    const slideBuffer = await sharp(imgBuffer)
      .resize(1080, 1350, { fit: 'cover', position: 'centre' })
      .composite([{ input: Buffer.from(svg), blend: 'over' }])
      .jpeg({ quality: 92 })
      .toBuffer();

    // 4. Upload to Cloudinary → get stable URL
    const cloudinaryUrl = await uploadToCloudinary(slideBuffer);

    // 5. Return the Cloudinary URL
    res.json({ url: cloudinaryUrl });

  } catch (err) {
    console.error('GENERATE ERROR:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/', (req, res) => res.json({ status: 'ok', service: 'digitabile-image-server' }));

app.listen(PORT, () => console.log(`Digitabile Image Server on port ${PORT}`));
