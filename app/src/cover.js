// Neon Coast Cover Studio — the cover engine.
//
// Everything the exported PNG is made of lives here: the panel layouts, the
// per-panel photo framing (cover-fit with pan and zoom), the gradient-map
// colour grades that give the Vice City sunset / neon look, the inked panel
// borders, the procedural palm silhouettes, the bold caption lettering with
// its script subtitle, the five-star heat meter, the badge ribbon, and the
// film grain and vignette finish. All art is drawn by this code — no image,
// logo or font file from any game is used.

// The three post sizes the studio exports, in pixels.
export const POST_SIZES = {
  square: { id: 'square', label: 'Square 1080 × 1080', w: 1080, h: 1080 },
  portrait: { id: 'portrait', label: 'Portrait 1080 × 1350', w: 1080, h: 1350 },
  wide: { id: 'wide', label: 'Wide 1920 × 1080', w: 1920, h: 1080 },
};

// Gradient-map ramps: [luminance stop, colour] pairs, shadows first. A photo
// panel is recoloured by mapping its brightness through one of these, which
// is what makes unrelated photos sit together as one poster.
export const GRADES = {
  sunset: {
    id: 'sunset', label: 'Vice Sunset',
    ramp: [[0, '#1d0b38'], [0.28, '#6d1e5e'], [0.52, '#c73e6d'], [0.74, '#ff7e47'], [0.9, '#ffb35c'], [1, '#ffedb8']],
    sky: ['#2a0a4a', '#7b1e5e', '#e0497a', '#ff8c42', '#ffd23f'],
    ink: '#160a24',
  },
  neon: {
    id: 'neon', label: 'Neon Nights',
    ramp: [[0, '#050914'], [0.3, '#0b2a4a'], [0.52, '#0e7d8c'], [0.72, '#e0218a'], [0.88, '#ff5da2'], [1, '#eafcff']],
    sky: ['#04061a', '#0d1440', '#123a6d', '#7a1e5e', '#ff2e88'],
    ink: '#04060f',
  },
  gold: {
    id: 'gold', label: 'Golden Hour',
    ramp: [[0, '#170b02'], [0.3, '#5e2f08'], [0.55, '#b35c1e'], [0.78, '#f59e42'], [0.92, '#ffd76a'], [1, '#fff6d8']],
    sky: ['#1d0f02', '#5e2f08', '#b35c1e', '#f59e42', '#ffe9a8'],
    ink: '#170b02',
  },
  pastel: {
    id: 'pastel', label: 'Pastel Vice',
    ramp: [[0, '#241536'], [0.3, '#5b2a6e'], [0.55, '#c65d7b'], [0.78, '#f28c6d'], [0.92, '#ffc98a'], [1, '#fff3d6']],
    sky: ['#241536', '#5b2a6e', '#c65d7b', '#f28c6d', '#ffd9a0'],
    ink: '#1c0f2a',
  },
};

// Panel layouts. Each returns panels as fractions of the area below the
// title band: {x, y, w, h} in 0..1.
export const LAYOUTS = {
  grid9: {
    id: 'grid9', label: 'Cover Grid · 9 panels',
    panels() {
      const out = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) out.push({ x: c / 3, y: r / 3, w: 1 / 3, h: 1 / 3 });
      return out;
    },
  },
  hero: {
    id: 'hero', label: 'Hero + Trio',
    panels() {
      return [
        { x: 0, y: 0, w: 0.58, h: 1 },
        { x: 0.58, y: 0, w: 0.42, h: 0.5 },
        { x: 0.58, y: 0.5, w: 0.42, h: 0.5 },
      ];
    },
  },
  mosaic: {
    id: 'mosaic', label: 'Mosaic · 5 panels',
    panels() {
      return [
        { x: 0, y: 0, w: 0.5, h: 0.55 },
        { x: 0.5, y: 0, w: 0.5, h: 0.55 },
        { x: 0, y: 0.55, w: 0.34, h: 0.45 },
        { x: 0.34, y: 0.55, w: 0.33, h: 0.45 },
        { x: 0.67, y: 0.55, w: 0.33, h: 0.45 },
      ];
    },
  },
  fullbleed: {
    id: 'fullbleed', label: 'Full Bleed · 1 photo',
    panels() {
      return [{ x: 0, y: 0, w: 1, h: 1 }];
    },
  },
};

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Build the 256-entry lookup tables of a gradient-map ramp.
export function buildGradeLut(ramp) {
  const lut = new Uint8Array(256 * 3);
  const stops = ramp.map(([t, c]) => [t, hexToRgb(c)]);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let a = stops[0], b = stops[stops.length - 1];
    for (let s = 0; s < stops.length - 1; s++) {
      if (t >= stops[s][0] && t <= stops[s + 1][0]) { a = stops[s]; b = stops[s + 1]; break; }
    }
    const span = Math.max(1e-6, b[0] - a[0]);
    const f = Math.min(1, Math.max(0, (t - a[0]) / span));
    for (let ch = 0; ch < 3; ch++) lut[i * 3 + ch] = Math.round(a[1][ch] + (b[1][ch] - a[1][ch]) * f);
  }
  return lut;
}

// Recolour a canvas in place through a grade ramp, keeping a share of the
// photo's own colour so faces and clothes stay readable under the grade.
export function applyGrade(canvas, grade, strength = 0.82) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const img = ctx.getImageData(0, 0, width, height);
  const d = img.data;
  const lut = buildGradeLut(grade.ramp);
  const keep = 1 - strength;
  for (let i = 0; i < d.length; i += 4) {
    const lum = Math.round(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]);
    const o = lum * 3;
    d[i] = Math.round(d[i] * keep + lut[o] * strength);
    d[i + 1] = Math.round(d[i + 1] * keep + lut[o + 1] * strength);
    d[i + 2] = Math.round(d[i + 2] * keep + lut[o + 2] * strength);
  }
  ctx.putImageData(img, 0, 0);
}

// Punch up contrast and saturation before grading: the flat, inked look.
export function punchPhoto(ctx, x, y, w, h) {
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = 'rgba(128,128,128,0.35)';
  ctx.fillRect(x, y, w, h);
  ctx.globalCompositeOperation = 'saturation';
  ctx.fillStyle = 'rgba(128,128,128,0.55)';
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

// Draw one photo into a panel rect with cover-fit framing: the photo fills
// the panel, framing.zoom scales it, framing.dx/dy pan it (-1..1).
export function drawPhotoInPanel(ctx, img, rect, framing) {
  const zoom = framing?.zoom ?? 1;
  const dx = framing?.dx ?? 0;
  const dy = framing?.dy ?? 0;
  const scale = Math.max(rect.w / img.width, rect.h / img.height) * zoom;
  const dw = img.width * scale;
  const dh = img.height * scale;
  const cx = rect.x + (rect.w - dw) / 2 + dx * rect.w * 0.35;
  const cy = rect.y + (rect.h - dh) / 2 + dy * rect.h * 0.35;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, cx, cy, dw, dh);
  ctx.restore();
  return { x: cx, y: cy, w: dw, h: dh };
}

// A palm silhouette drawn from paths — the studio's own artwork, used along
// the title band and in empty panels. (x, y) is the base of the trunk.
export function drawPalmSilhouette(ctx, x, y, size, ink, flip = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip * size, size);
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;
  ctx.beginPath();
  ctx.moveTo(-0.06, 0);
  ctx.quadraticCurveTo(-0.02, -0.55, 0.16, -0.92);
  ctx.lineTo(0.26, -0.9);
  ctx.quadraticCurveTo(0.1, -0.5, 0.08, 0);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 0.055;
  ctx.lineCap = 'round';
  const crown = [0.2, -0.92];
  const fronds = [[-0.75, -1.25], [-0.45, -1.38], [-0.05, -1.45], [0.38, -1.38], [0.72, -1.22], [0.85, -0.95]];
  for (const [fx, fy] of fronds) {
    ctx.beginPath();
    ctx.moveTo(crown[0], crown[1]);
    ctx.quadraticCurveTo((crown[0] + fx) / 2, Math.min(crown[1], fy) - 0.12, fx, fy + 0.18);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(0.13, -0.84, 0.06, 0, Math.PI * 2);
  ctx.arc(0.27, -0.82, 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// The sunset sky of the title band, with a banded sun disc and a skyline.
export function drawTitleBandSky(ctx, rect, grade) {
  const g = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  grade.sky.forEach((c, i) => g.addColorStop(i / (grade.sky.length - 1), c));
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  const sunR = rect.h * 0.52;
  const sunX = rect.x + rect.w * 0.82;
  const sunY = rect.y + rect.h * 0.98;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  const sg = ctx.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
  sg.addColorStop(0, '#ffe259');
  sg.addColorStop(1, '#ff7518');
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = grade.ink;
  for (let i = 0; i < 4; i++) {
    const by = sunY - sunR * 0.1 + i * sunR * 0.22;
    ctx.fillRect(sunX - sunR, by, sunR * 2, sunR * 0.07 + i * 2);
  }
  ctx.restore();
  ctx.fillStyle = grade.ink;
  const base = rect.y + rect.h;
  const towers = [0.02, 0.09, 0.16, 0.24, 0.33, 0.42, 0.55, 0.63, 0.71, 0.9, 0.96];
  const heights = [0.34, 0.5, 0.28, 0.62, 0.4, 0.55, 0.3, 0.48, 0.36, 0.44, 0.3];
  towers.forEach((tx, i) => {
    const tw = rect.w * 0.055;
    const th = rect.h * heights[i];
    ctx.fillRect(rect.x + rect.w * tx, base - th, tw, th);
  });
  ctx.fillRect(rect.x, base - rect.h * 0.06, rect.w, rect.h * 0.06);
}

// Five-star heat meter, filled to `stars`.
export function drawHeatStars(ctx, x, y, size, stars, ink) {
  ctx.save();
  for (let i = 0; i < 5; i++) {
    const cx = x + i * size * 1.25;
    ctx.beginPath();
    for (let p = 0; p < 10; p++) {
      const r = p % 2 === 0 ? size * 0.5 : size * 0.21;
      const a = -Math.PI / 2 + p * Math.PI / 5;
      const px = cx + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (p === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    if (i < stars) {
      ctx.fillStyle = '#ffd23f';
      ctx.fill();
    }
    ctx.lineWidth = size * 0.07;
    ctx.strokeStyle = ink;
    ctx.stroke();
  }
  ctx.restore();
}

// A circular badge ribbon for the cover's bottom corner.
export function drawBadgeRibbon(ctx, cx, cy, r, text, grade) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#ff2e88';
  ctx.fill();
  ctx.lineWidth = r * 0.07;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.78, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = r * 0.035;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const words = text.split(' ');
  ctx.font = `700 ${r * 0.34}px 'Arial Narrow', Arial, sans-serif`;
  if (words.length > 1) {
    ctx.fillText(words[0], cx, cy - r * 0.2);
    ctx.font = `700 ${r * 0.3}px 'Arial Narrow', Arial, sans-serif`;
    ctx.fillText(words.slice(1).join(' '), cx, cy + r * 0.22);
  } else {
    ctx.fillText(text, cx, cy);
  }
  ctx.restore();
}

const DISPLAY_FONT = `'Arial Narrow', 'Liberation Sans Narrow', Impact, 'Helvetica Neue', Arial, sans-serif`;
const SCRIPT_FONT = `'Segoe Script', 'Brush Script MT', cursive`;

// Fit a font size so `text` spans at most maxWidth, starting from startPx.
function fitFontSize(ctx, text, fontFamily, weight, maxWidth, startPx) {
  let px = startPx;
  while (px > 12) {
    ctx.font = `${weight} ${px}px ${fontFamily}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    px -= 4;
  }
  return px;
}

// The caption: a script subtitle overlapping big condensed display lines
// filled with a pale sunset gradient, inked outline and hard shadow.
export function drawCaptionLettering(ctx, band, caption, script, grade) {
  const title = (caption || 'NEON COAST').toUpperCase();
  const words = title.split(/\s+/).filter(Boolean);
  const half = Math.ceil(words.length / 2);
  const lines = words.length > 1 ? [words.slice(0, half).join(' '), words.slice(half).join(' ')] : [title];
  const cx = band.x + band.w * 0.06;
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const startPx = band.h * (lines.length > 1 ? 0.52 : 0.78);
  let px = startPx;
  for (const line of lines) px = Math.min(px, fitFontSize(ctx, line, DISPLAY_FONT, 900, band.w * 0.62, startPx));
  ctx.font = `900 ${px}px ${DISPLAY_FONT}`;
  const lineH = px * 0.94;
  let ty = band.y + band.h * 0.16 + px * 0.82;
  for (const line of lines) {
    ctx.save();
    ctx.translate(cx, ty);
    ctx.scale(0.86, 1);
    const grad = ctx.createLinearGradient(0, -px * 0.8, 0, px * 0.25);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.55, '#ffd9ec');
    grad.addColorStop(1, '#ff9a5a');
    ctx.lineWidth = px * 0.16;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = grade.ink;
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowOffsetX = px * 0.05;
    ctx.shadowOffsetY = px * 0.07;
    ctx.strokeText(line, 0, 0);
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = grad;
    ctx.fillText(line, 0, 0);
    ctx.restore();
    ty += lineH;
  }
  if (script) {
    const spx = fitFontSize(ctx, script, SCRIPT_FONT, 700, band.w * 0.5, band.h * 0.34);
    ctx.font = `700 ${spx}px ${SCRIPT_FONT}`;
    ctx.save();
    ctx.translate(band.x + band.w * 0.075, band.y + band.h * 0.97);
    ctx.rotate(-0.045);
    ctx.lineWidth = spx * 0.14;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = grade.ink;
    ctx.strokeText(script, 0, 0);
    ctx.fillStyle = '#ff5da2';
    ctx.fillText(script, 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

// Film grain and a vignette to finish the poster.
export function applyGrainAndVignette(ctx, w, h, amount = 0.05) {
  const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.78);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(5,2,12,0.42)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
  const gw = Math.max(2, Math.floor(w / 3));
  const gh = Math.max(2, Math.floor(h / 3));
  const noise = document.createElement('canvas');
  noise.width = gw;
  noise.height = gh;
  const nctx = noise.getContext('2d');
  const img = nctx.createImageData(gw, gh);
  for (let i = 0; i < img.data.length; i += 4) {
    const val = 118 + Math.floor(Math.random() * 90);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = val;
    img.data[i + 3] = 255;
  }
  nctx.putImageData(img, 0, 0);
  ctx.save();
  ctx.globalAlpha = amount;
  ctx.globalCompositeOperation = 'overlay';
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(noise, 0, 0, w, h);
  ctx.restore();
}

// A placeholder scene for a panel with no photo yet: graded sky, sun, palms.
export function drawEmptyPanelScene(ctx, rect, grade, seed) {
  const g = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  grade.sky.forEach((c, i) => g.addColorStop(i / (grade.sky.length - 1), c));
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = '#ffd76a';
  ctx.beginPath();
  ctx.arc(rect.x + rect.w * (0.3 + (seed % 3) * 0.2), rect.y + rect.h * 0.42, rect.w * 0.16, 0, Math.PI * 2);
  ctx.fill();
  drawPalmSilhouette(ctx, rect.x + rect.w * 0.24, rect.y + rect.h * 0.98, rect.h * 0.62, grade.ink, 1);
  drawPalmSilhouette(ctx, rect.x + rect.w * 0.86, rect.y + rect.h * 0.99, rect.h * 0.46, grade.ink, -1);
}

function panelRectList(size, layout) {
  const bandH = Math.round(size.h * (size.id === 'wide' ? 0.24 : 0.21));
  const area = { x: 0, y: bandH, w: size.w, h: size.h - bandH };
  const gap = Math.max(6, Math.round(size.w * 0.008));
  const rects = layout.panels().map((p) => ({
    x: area.x + p.x * area.w + gap / 2,
    y: area.y + p.y * area.h + gap / 2,
    w: p.w * area.w - gap,
    h: p.h * area.h - gap,
  }));
  return { band: { x: 0, y: 0, w: size.w, h: bandH }, area, gap, rects };
}

// The panel rects of a state, in canvas pixels — the editor hit-tests these.
export function panelRects(state) {
  const size = POST_SIZES[state.size] ?? POST_SIZES.square;
  const layout = LAYOUTS[state.layout] ?? LAYOUTS.grid9;
  return panelRectList(size, layout).rects;
}

function pickPhoto(state, framing, index) {
  const photos = state.photos ?? [];
  if (!photos.length) return null;
  const wanted = framing?.photo ?? index;
  const idx = ((wanted % photos.length) + photos.length) % photos.length;
  return photos[idx];
}

// Render a whole cover onto a canvas. See the editor for the state shape:
// {size, layout, grade, caption, script, stars, badge, photos, framings,
//  gradeStrength}.
export function renderCover(canvas, state) {
  const size = POST_SIZES[state.size] ?? POST_SIZES.square;
  canvas.width = size.w;
  canvas.height = size.h;
  const ctx = canvas.getContext('2d');
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  const layout = LAYOUTS[state.layout] ?? LAYOUTS.grid9;
  const W = size.w;
  const H = size.h;
  const { band, gap, rects } = panelRectList(size, layout);

  ctx.fillStyle = grade.ink;
  ctx.fillRect(0, 0, W, H);

  // Panels are painted on their own layer with the title sky, so the grade
  // maps photos and sky together; the lettering goes on top, ungraded.
  const layer = document.createElement('canvas');
  layer.width = W;
  layer.height = H;
  const lctx = layer.getContext('2d');
  lctx.fillStyle = grade.ink;
  lctx.fillRect(0, 0, W, H);
  drawTitleBandSky(lctx, band, grade);

  rects.forEach((rect, i) => {
    const framing = state.framings?.[i] ?? { photo: i, dx: 0, dy: 0, zoom: 1 };
    const img = pickPhoto(state, framing, i);
    if (img) {
      drawPhotoInPanel(lctx, img, rect, framing);
      punchPhoto(lctx, rect.x, rect.y, rect.w, rect.h);
    } else {
      drawEmptyPanelScene(lctx, rect, grade, i);
    }
  });

  applyGrade(layer, grade, state.gradeStrength ?? 0.8);
  ctx.drawImage(layer, 0, 0);

  // Inked panel borders with a thin white keyline inside each.
  rects.forEach((rect) => {
    ctx.lineWidth = Math.max(5, W * 0.006);
    ctx.strokeStyle = grade.ink;
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.lineWidth = Math.max(1.5, W * 0.0016);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.strokeRect(rect.x + gap * 0.32, rect.y + gap * 0.32, rect.w - gap * 0.64, rect.h - gap * 0.64);
  });
  // Outer frame.
  ctx.lineWidth = Math.max(10, W * 0.012);
  ctx.strokeStyle = grade.ink;
  ctx.strokeRect(0, 0, W, H);
  ctx.lineWidth = Math.max(2, W * 0.002);
  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  ctx.strokeRect(W * 0.012, W * 0.012, W - W * 0.024, H - W * 0.024);

  // Palms over the band's foot, the heat meter, the caption, the badge.
  drawPalmSilhouette(ctx, W * 0.045, band.h * 1.02, band.h * 0.92, grade.ink, 1);
  drawPalmSilhouette(ctx, W * 0.965, band.h * 1.03, band.h * 0.7, grade.ink, -1);
  drawHeatStars(ctx, W * 0.775, band.h * 0.3, band.h * 0.21, state.stars ?? 5, grade.ink);
  drawCaptionLettering(ctx, band, state.caption, state.script, grade);
  if (state.badge) drawBadgeRibbon(ctx, W * 0.915, H - W * 0.085, W * 0.062, state.badge, grade);

  applyGrainAndVignette(ctx, W, H);
  return canvas;
}
