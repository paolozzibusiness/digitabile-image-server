const express = require('express');
const sharp = require('sharp');

const app = express();
const PORT = process.env.PORT || 3000;
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'djriubaun';
const UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || 'digitabile';

const ACCENT_COLORS = { blue:'#4f8ef7', gold:'#f7b94f', green:'#4ff7a0', pink:'#f74f9e', purple:'#a855f7' };

function esc(str) {
  return (str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}

function wrapText(text, maxChars) {
  const words = (text||'').split(' ');
  const lines = []; let current = '';
  for (const word of words) {
    const test = current ? current+' '+word : word;
    if (test.length <= maxChars) { current = test; }
    else { if (current) lines.push(current); current = word; }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

async function fetchImage(url) {
  const attempts = [
    { 'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36', 'Referer':'https://www.google.com/', 'Accept':'image/*,*/*' },
    { 'User-Agent':'Googlebot/2.1 (+http://www.google.com/bot.html)', 'Accept':'image/*' },
    { 'User-Agent':'facebookexternalhit/1.1', 'Accept':'image/*' }
  ];
  for (const headers of attempts) {
    try {
      const resp = await fetch(url, { headers });
      if (resp.ok) return Buffer.from(await resp.arrayBuffer());
    } catch(e) { continue; }
  }
  return null;
}

function makeFallbackImage(accent) {
  const color = ACCENT_COLORS[accent] || '#4f8ef7';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350">
    <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#050510"/>
      <stop offset="100%" stop-color="#0a0a1e"/>
    </linearGradient></defs>
    <rect width="1080" height="1350" fill="url(#bg)"/>
    <circle cx="200" cy="200" r="300" fill="${color}" fill-opacity="0.05"/>
    <circle cx="880" cy="1150" r="250" fill="${color}" fill-opacity="0.07"/>
  </svg>`;
  return Buffer.from(svg);
}

async function uploadToCloudinary(imageBuffer) {
  const formData = new FormData();
  const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
  formData.append('file', blob, 'slide.jpg');
  formData.append('upload_preset', UPLOAD_PRESET);
  const resp = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method:'POST', body:formData });
  if (!resp.ok) throw new Error(`Cloudinary: ${resp.status} ${await resp.text()}`);
  const data = await resp.json();
  return data.secure_url;
}

function buildSlideSVG(params, accentColor) {
  const { titolo, desc1, desc2, desc3, numero, tag } = params;
  const titleLines = wrapText((titolo||'TITOLO').toUpperCase(), 18);
  const descLines = [desc1,desc2,desc3].filter(d=>d&&d.trim());

  const TITLE_H=98, DESC_H=50, SIDE=65, BOTTOM=85;
  const totalH = 6+16+titleLines.length*TITLE_H+24+descLines.length*DESC_H;
  const startY = 1350-BOTTOM-totalH-60;

  let titleSvg='';
  titleLines.forEach((l,i) => {
    titleSvg+=`<text x="${SIDE}" y="${startY+22+i*TITLE_H}" font-family="Arial Black,Arial,sans-serif" font-size="86" font-weight="900" fill="white">${esc(l)}</text>`;
  });

  const descY = startY+22+titleLines.length*TITLE_H+28;
  let descSvg='';
  descLines.forEach((l,i) => {
    descSvg+=`<text x="${SIDE}" y="${descY+i*DESC_H}" font-family="Arial,sans-serif" font-size="40" fill="rgba(255,255,255,0.88)">${esc(l)}</text>`;
  });

  const slideNum = parseInt((numero||'1').split('/')[0].trim())-1;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350">
    <defs><linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000" stop-opacity="0.05"/>
      <stop offset="40%" stop-color="#000" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.93"/>
    </linearGradient></defs>
    <rect width="1080" height="1350" fill="url(#grad)"/>
    <text x="${SIDE}" y="72" font-family="Arial,sans-serif" font-size="28" fill="rgba(255,255,255,0.45)" letter-spacing="3">${esc(numero||'01 / 05')}</text>
    <rect x="${1080-SIDE-150}" y="42" width="150" height="40" rx="4" fill="rgba(15,20,50,0.85)"/>
    <text x="${1080-SIDE-75}" y="68" font-family="Arial,sans-serif" font-size="22" font-weight="700" fill="${accentColor}" text-anchor="middle" letter-spacing="1">${esc((tag||'AI').toUpperCase())}</text>
    ${titleSvg}
    ${descSvg}
    <text x="${1080-SIDE}" y="${1350-BOTTOM+20}" font-family="Arial,sans-serif" font-size="26" font-weight="700" fill="rgba(255,255,255,0.55)" text-anchor="end">@digitabilenews</text>
  </svg>`;
}

function buildCtaSVG(ctaMessage, ctaQuestion) {
  // Split cta message into lines
  const msgLines = [];
  const words = (ctaMessage||'').split(' ');
  let cur = '';
  for (const w of words) {
    const test = cur ? cur+' '+w : w;
    if (test.length <= 22) { cur = test; }
    else { if (cur) msgLines.push(cur); cur = w; }
  }
  if (cur) msgLines.push(cur);
  const topLines = msgLines.slice(0, 3);

  const MSG_H = 90;
  const msgStartY = 490;

  let msgSvg = '';
  topLines.forEach((l, i) => {
    msgSvg += `<text x="540" y="${msgStartY + i * MSG_H}" font-family="Arial Black,Arial,sans-serif" font-size="80" font-weight="900" fill="white" text-anchor="middle">${esc(l)}</text>`;
  });

  const afterMsgY = msgStartY + topLines.length * MSG_H + 40;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350">
    <defs><linearGradient id="ctaGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000820" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.95"/>
    </linearGradient></defs>
    <rect width="1080" height="1350" fill="url(#ctaGrad)"/>

    <text x="1015" y="70" font-family="Arial,sans-serif" font-size="26" font-weight="700" fill="rgba(255,255,255,0.5)" text-anchor="end">@digitabilenews</text>
    <text x="65" y="70" font-family="Arial,sans-serif" font-size="28" fill="rgba(255,255,255,0.35)" letter-spacing="3">05 / 05</text>

    <rect x="440" y="420" width="200" height="4" fill="#4f8ef7" rx="2"/>

    ${msgSvg}

    <rect x="240" y="${afterMsgY}" width="600" height="1" fill="rgba(255,255,255,0.15)"/>

    <text x="540" y="${afterMsgY + 70}" font-family="Arial,sans-serif" font-size="48" font-weight="700" fill="#4f8ef7" text-anchor="middle">${esc(ctaQuestion||'Che ne pensi?')}</text>
    <text x="540" y="${afterMsgY + 130}" font-family="Arial,sans-serif" font-size="36" fill="rgba(255,255,255,0.65)" text-anchor="middle">Scrivilo nei commenti &#x1F447;</text>

    <rect x="240" y="${afterMsgY + 170}" width="600" height="1" fill="rgba(255,255,255,0.12)"/>

    <text x="540" y="${afterMsgY + 240}" font-family="Arial,sans-serif" font-size="34" fill="rgba(255,255,255,0.5)" text-anchor="middle">Segui per news AI ogni giorno</text>
    <text x="540" y="${afterMsgY + 300}" font-family="Arial,sans-serif" font-size="48" font-weight="700" fill="#4f8ef7" text-anchor="middle">@digitabilenews &#x1F514;</text>
  </svg>`;
}

app.get('/generate', async (req, res) => {
  try {
    const { imageUrl, type='slide', accent='blue', cta_message, cta_question, ...rest } = req.query;
    const accentColor = ACCENT_COLORS[accent] || '#4f8ef7';

    let baseBuffer;
    if (imageUrl) {
      const fetched = await fetchImage(imageUrl);
      if (fetched) {
        baseBuffer = await sharp(fetched).resize(1080,1350,{fit:'cover',position:'centre'}).jpeg({quality:88}).toBuffer();
      }
    }
    if (!baseBuffer) {
      const fallbackSvg = makeFallbackImage(accent);
      baseBuffer = await sharp(fallbackSvg).resize(1080,1350).jpeg({quality:88}).toBuffer();
    }

    const svg = type==='cta'
      ? buildCtaSVG(cta_message, cta_question)
      : buildSlideSVG(rest, accentColor);

    const slideBuffer = await sharp(baseBuffer)
      .composite([{input:Buffer.from(svg), blend:'over'}])
      .jpeg({quality:92})
      .toBuffer();

    const url = await uploadToCloudinary(slideBuffer);
    res.json({ url });
  } catch (err) {
    console.error('GENERATE ERROR:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => res.json({ status:'ok', service:'digitabile-image-server' }));
app.listen(PORT, () => console.log(`Server on port ${PORT}`));
