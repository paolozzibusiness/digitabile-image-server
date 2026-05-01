const express = require('express');
const sharp = require('sharp');

const app = express();
const PORT = process.env.PORT || 3000;

const ACCENT_COLORS = {
  blue:  '#4f8ef7',
  gold:  '#f7b94f',
  green: '#4ff7a0',
  pink:  '#f74f9e'
};

// Wrap text into lines based on max chars per line
function wrapText(text, maxChars) {
  const words = (text || '').split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const test = current ? current + ' ' + word : word;
    if (test.length <= maxChars) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// Escape XML special chars for SVG text
function esc(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── SLIDE endpoint ─────────────────────────────────────────────────────────
// GET /slide?imageUrl=...&titolo=...&testo=...&numero=01/05&accent=blue
app.get('/slide', async (req, res) => {
  try {
    const {
      imageUrl,
      titolo  = 'TITOLO',
      testo   = 'Sottotitolo della slide',
      numero  = '01 / 05',
      accent  = 'blue'
    } = req.query;

    if (!imageUrl) return res.status(400).json({ error: 'imageUrl is required' });

    const accentColor = ACCENT_COLORS[accent] || '#4f8ef7';

    // Fetch background image
    const imgResp = await fetch(imageUrl);
    if (!imgResp.ok) throw new Error(`Image fetch failed: ${imgResp.status}`);
    const imgBuffer = Buffer.from(await imgResp.arrayBuffer());

    // Text layout
    const titleLines = wrapText(titolo.toUpperCase(), 15); // ~15 chars per line at 88px
    const subLines   = wrapText(testo, 38);

    const TITLE_LINE_H = 105;
    const SUB_LINE_H   = 52;
    const BOTTOM_PAD   = 80;

    const totalTextH =
      titleLines.length * TITLE_LINE_H +
      subLines.length   * SUB_LINE_H + 20 + 60; // bar + spacing

    const startY = 1350 - totalTextH - BOTTOM_PAD;

    // Build SVG
    let titleSvg = '';
    titleLines.forEach((line, i) => {
      titleSvg += `<text x="65" y="${startY + 40 + i * TITLE_LINE_H}"
        font-family="Arial,sans-serif" font-size="88" font-weight="bold"
        fill="white">${esc(line)}</text>`;
    });

    const subStartY = startY + 40 + titleLines.length * TITLE_LINE_H + 20;
    let subSvg = '';
    subLines.forEach((line, i) => {
      subSvg += `<text x="65" y="${subStartY + i * SUB_LINE_H}"
        font-family="Arial,sans-serif" font-size="40"
        fill="rgba(255,255,255,0.88)">${esc(line)}</text>`;
    });

    const barY = startY - 18;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#000" stop-opacity="0.05"/>
          <stop offset="50%"  stop-color="#000" stop-opacity="0.45"/>
          <stop offset="100%" stop-color="#000" stop-opacity="0.90"/>
        </linearGradient>
      </defs>
      <rect width="1080" height="1350" fill="url(#g)"/>
      <rect x="65" y="${barY}" width="65" height="6" fill="${accentColor}" rx="3"/>
      ${titleSvg}
      ${subSvg}
      <text x="65" y="1320"
        font-family="Arial,sans-serif" font-size="26"
        fill="rgba(255,255,255,0.5)">${esc(numero)}</text>
      <text x="1015" y="1320"
        font-family="Arial,sans-serif" font-size="26" font-weight="bold"
        fill="rgba(255,255,255,0.6)" text-anchor="end">@digitabilenews</text>
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

// ── CTA endpoint (slide 5 — follow us) ────────────────────────────────────
// GET /cta?imageUrl=...
app.get('/cta', async (req, res) => {
  try {
    const { imageUrl } = req.query;
    if (!imageUrl) return res.status(400).json({ error: 'imageUrl is required' });

    const imgResp = await fetch(imageUrl);
    if (!imgResp.ok) throw new Error(`Image fetch failed: ${imgResp.status}`);
    const imgBuffer = Buffer.from(await imgResp.arrayBuffer());

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#000033" stop-opacity="0.55"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0.93"/>
        </linearGradient>
      </defs>
      <rect width="1080" height="1350" fill="url(#g)"/>

      <!-- brand top right -->
      <text x="1015" y="65"
        font-family="Arial,sans-serif" font-size="26" font-weight="bold"
        fill="rgba(255,255,255,0.6)" text-anchor="end">@digitabilenews</text>

      <!-- robot emoji area (text fallback) -->
      <text x="540" y="530"
        font-family="Arial,sans-serif" font-size="110"
        text-anchor="middle">&#x1F916;</text>

      <!-- main title -->
      <text x="540" y="660"
        font-family="Arial,sans-serif" font-size="82" font-weight="bold"
        fill="white" text-anchor="middle">SEGUICI SU</text>
      <text x="540" y="755"
        font-family="Arial,sans-serif" font-size="82" font-weight="bold"
        fill="white" text-anchor="middle">INSTAGRAM</text>

      <!-- subtitle -->
      <text x="540" y="850"
        font-family="Arial,sans-serif" font-size="42"
        fill="rgba(255,255,255,0.85)" text-anchor="middle">News AI ogni giorno</text>
      <text x="540" y="910"
        font-family="Arial,sans-serif" font-size="42"
        fill="#7eb4ff" text-anchor="middle">@digitabilenews</text>

      <!-- CTA button -->
      <rect x="290" y="960" width="500" height="82" rx="41"
        fill="rgba(79,142,247,0.28)" stroke="#7eb4ff" stroke-width="2"/>
      <text x="540" y="1012"
        font-family="Arial,sans-serif" font-size="32" font-weight="bold"
        fill="#7eb4ff" text-anchor="middle">SEGUICI ORA &#x1F514;</text>

      <!-- AI note -->
      <text x="540" y="1120"
        font-family="Arial,sans-serif" font-size="24"
        fill="rgba(255,255,255,0.38)" text-anchor="middle">Contenuto creato con Intelligenza Artificiale</text>

      <!-- dots navigator -->
      <circle cx="490" cy="1290" r="8" fill="rgba(255,255,255,0.3)"/>
      <circle cx="515" cy="1290" r="8" fill="rgba(255,255,255,0.3)"/>
      <circle cx="540" cy="1290" r="8" fill="rgba(255,255,255,0.3)"/>
      <circle cx="565" cy="1290" r="8" fill="rgba(255,255,255,0.3)"/>
      <rect    x="582" y="1282" width="24" height="16" rx="8" fill="white"/>
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

// Health check
app.get('/', (req, res) => res.json({ status: 'ok', service: 'digitabile-image-server' }));

app.listen(PORT, () => console.log(`✅ Digitabile Image Server on port ${PORT}`));
