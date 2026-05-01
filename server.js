const express = require('express');
const sharp = require('sharp');

const app = express();
const PORT = process.env.PORT || 3000;

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

// SLIDE endpoint - Design A Dark Editorial
// GET /slide?imageUrl=...&titolo=...&desc1=...&desc2=...&desc3=...&desc4=...&numero=01/05&accent=blue&tag=AI
app.get('/slide', async (req, res) => {
  try {
    const { imageUrl, titolo = 'TITOLO', desc1 = '', desc2 = '', desc3 = '', desc4 = '', numero = '01 / 05', accent = 'blue', tag = 'AI NEWS' } = req.query;
    if (!imageUrl) return res.status(400).json({ error: 'imageUrl is required' });

    const accentColor = ACCENT_COLORS[accent] || '#4f8ef7';
    const imgResp = await fetch(imageUrl);
    if (!imgResp.ok) throw new Error(`Image fetch failed: ${imgResp.status}`);
    const imgBuffer = Buffer.from(await imgResp.arrayBuffer());

    const titleLines = wrapText(titolo.toUpperCase(), 18);
    const descLines = [desc1, desc2, desc3, desc4].filter(d => d && d.trim());

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
      descSvg += `<text x="${SIDE_PAD}" y="${descStartY + i * DESC_LINE_H}" font-family="Arial,sans-serif" font-size="38" font-weight="400" fill="rgba(255,255,255,0.82)">${esc(line)}</text>`;
    });

    const barY = contentStartY - 22;
    const slideNum = parseInt(numero.split('/')[0].trim()) - 1;

    const dotsSvg = [0,1,2,3,4].map(i => {
      return i === slideNum
        ? `<rect x="${SIDE_PAD + i * 22}" y="1290" width="26" height="8" rx="4" fill="white"/>`
        : `<circle cx="${SIDE_PAD + 13 + i * 22}" cy="1294" r="4" fill="rgba(255,255,255,0.25)"/>`;
    }).join('');

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350">
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#000" stop-opacity="0.08"/>
          <stop offset="40%" stop-color="#000" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#000" stop-opacity="0.92"/>
        </linearGradient>
      </defs>
      <rect width="1080" height="1350" fill="url(#grad)"/>
      <text x="${SIDE_PAD}" y="72" font-family="Arial,sans-serif" font-size="28" fill="rgba(255,255,255,0.45)" letter-spacing="3">${esc(numero)}</text>
      <rect x="${1080 - SIDE_PAD - 150}" y="42" width="150" height="40" rx="4" fill="rgba(15,20,50,0.85)"/>
      <text x="${1080 - SIDE_PAD - 75}" y="68" font-family="Arial,sans-serif" font-size="22" font-weight="700" fill="${accentColor}" text-anchor="middle" letter-spacing="1">${esc(tag.toUpperCase())}</text>
      <rect x="${SIDE_PAD}" y="${barY}" width="65" height="6" fill="${accentColor}" rx="3"/>
      ${titleSvg}
      ${descSvg}
      ${dotsSvg}
      <text x="${1080 - SIDE_PAD}" y="1300" font-family="Arial,sans-serif" font-size="26" font-weight="700" fill="rgba(255,255,255,0.55)" text-anchor="end">@digitabilenews</text>
    </svg>`;

    const result = await sharp(imgBuffer)
      .resize(1080, 1350, { fit: 'cover', position: 'centre' })
      .composite([{ input: Buffer.from(svg), blend: 'over' }])
      .jpeg({ quality: 92 })
      .toBuffer();

    res.set('Content-Type', 'image/jpeg');
    res.set('Cache-Control', 'no-cache');
    res.send(result);
  } catch (err) {
    console.error('SLIDE ERROR:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// CTA endpoint - Slide 5
app.get('/cta', async (req, res) => {
  try {
    const { imageUrl } = req.query;
    if (!imageUrl) return res.status(400).json({ error: 'imageUrl is required' });

    const imgResp = await fetch(imageUrl);
    if (!imgResp.ok) throw new Error(`Image fetch failed: ${imgResp.status}`);
    const imgBuffer = Buffer.from(await imgResp.arrayBuffer());

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350">
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

    const result = await sharp(imgBuffer)
      .resize(1080, 1350, { fit: 'cover', position: 'centre' })
      .composite([{ input: Buffer.from(svg), blend: 'over' }])
      .jpeg({ quality: 92 })
      .toBuffer();

    res.set('Content-Type', 'image/jpeg');
    res.set('Cache-Control', 'no-cache');
    res.send(result);
  } catch (err) {
    console.error('CTA ERROR:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => res.json({ status: 'ok', service: 'digitabile-image-server' }));
app.listen(PORT, () => console.log(`Digitabile Image Server on port ${PORT}`));
