// Neon Coast Cover Studio — the editor.
//
// Wires the page to the cover engine (./cover.js): load photos from the
// person's own machine (never uploaded), fill the panels of the chosen
// layout with one photo or several, click a panel to select it, drag to pan
// its photo, scroll or slide to zoom, edit the caption, pick a colour grade
// and a post size, and export the cover as a PNG. A ?shot= query instead
// sets up a fixed scene for the maker's screenshots (./shots.js).

import { POST_SIZES, GRADES, LAYOUTS, renderCover, panelRects } from './cover.js';
import { readShotQuery, SAMPLE_PHOTOS, loadImageFromUrl, sampleFramings } from './shots.js';

const canvas = document.getElementById('preview');
const els = {
  photoInput: document.getElementById('photoInput'),
  dropZone: document.getElementById('dropZone'),
  photoStrip: document.getElementById('photoStrip'),
  layoutSeg: document.getElementById('layoutSeg'),
  gradeSeg: document.getElementById('gradeSeg'),
  sizeSeg: document.getElementById('sizeSeg'),
  captionInput: document.getElementById('captionInput'),
  scriptInput: document.getElementById('scriptInput'),
  starsInput: document.getElementById('starsInput'),
  badgeInput: document.getElementById('badgeInput'),
  gradeStrength: document.getElementById('gradeStrength'),
  panelName: document.getElementById('panelName'),
  zoomInput: document.getElementById('zoomInput'),
  exportBtn: document.getElementById('exportBtn'),
};

const state = {
  size: 'portrait',
  layout: 'grid9',
  grade: 'sunset',
  caption: 'Neon Coast',
  script: 'vice nights',
  stars: 5,
  badge: 'EST 2026',
  gradeStrength: 0.8,
  photos: [],
  photoUrls: [],
  framings: [],
  selected: 0,
};

// One framing per panel of the current layout; panel i starts on photo i so
// several photos spread across the cover, and one photo fills every panel
// when it is the only one loaded.
function resetFramings(keepCrops = false) {
  const count = LAYOUTS[state.layout].panels().length;
  const old = keepCrops ? state.framings : [];
  state.framings = Array.from({ length: count }, (_, i) => old[i] ?? { photo: i, dx: 0, dy: 0, zoom: 1 });
  if (state.selected >= count) state.selected = 0;
}

function redraw() {
  renderCover(canvas, state);
  drawSelectionOutline();
  els.panelName.textContent = `Panel ${state.selected + 1} of ${state.framings.length}`;
  const f = state.framings[state.selected];
  if (f) els.zoomInput.value = Math.round(f.zoom * 100);
  markUsedThumbnails();
}

// A dashed gold outline over the selected panel, editor-only: it is drawn
// after the cover render and never reaches the export, which re-renders.
function drawSelectionOutline() {
  const rects = panelRects(state);
  const rect = rects[state.selected];
  if (!rect) return;
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.setLineDash([18, 12]);
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#ffd23f';
  ctx.strokeRect(rect.x + 6, rect.y + 6, rect.w - 12, rect.h - 12);
  ctx.restore();
}

function markUsedThumbnails() {
  const used = new Set(state.framings.map((f) => ((f.photo % Math.max(1, state.photos.length)) + Math.max(1, state.photos.length)) % Math.max(1, state.photos.length)));
  [...els.photoStrip.children].forEach((img, i) => img.classList.toggle('used', used.has(i)));
}

function addPhoto(img, url) {
  state.photos.push(img);
  state.photoUrls.push(url);
  const thumb = document.createElement('img');
  thumb.src = url;
  thumb.alt = `Loaded photo ${state.photos.length}`;
  els.photoStrip.appendChild(thumb);
  redraw();
}

function loadPhotoFile(file) {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => addPhoto(img, url);
  img.src = url;
}

async function loadSample(name) {
  const url = SAMPLE_PHOTOS[name];
  const img = await loadImageFromUrl(url);
  addPhoto(img, url);
}

// --- controls ------------------------------------------------------------

function wireSegment(seg, attr, apply) {
  seg.addEventListener('click', (e) => {
    const btn = e.target.closest(`button[data-${attr}]`);
    if (!btn) return;
    seg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === btn));
    apply(btn.dataset[attr]);
    redraw();
  });
}

function setSegment(seg, attr, value) {
  seg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset[attr] === value));
}

wireSegment(els.layoutSeg, 'layout', (v) => { state.layout = v; resetFramings(true); });
wireSegment(els.gradeSeg, 'grade', (v) => { state.grade = v; });
wireSegment(els.sizeSeg, 'size', (v) => { state.size = v; });

els.captionInput.addEventListener('input', () => { state.caption = els.captionInput.value; redraw(); });
els.scriptInput.addEventListener('input', () => { state.script = els.scriptInput.value; redraw(); });
els.badgeInput.addEventListener('input', () => { state.badge = els.badgeInput.value.toUpperCase(); redraw(); });
els.starsInput.addEventListener('input', () => { state.stars = Number(els.starsInput.value); redraw(); });
els.gradeStrength.addEventListener('input', () => { state.gradeStrength = Number(els.gradeStrength.value) / 100; redraw(); });
els.zoomInput.addEventListener('input', () => {
  const f = state.framings[state.selected];
  if (f) { f.zoom = Number(els.zoomInput.value) / 100; redraw(); }
});

els.photoInput.addEventListener('change', () => {
  [...els.photoInput.files].forEach(loadPhotoFile);
  els.photoInput.value = '';
});
for (const evt of ['dragover', 'dragleave', 'drop']) {
  els.dropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    els.dropZone.classList.toggle('over', evt === 'dragover');
    if (evt === 'drop') [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/')).forEach(loadPhotoFile);
  });
}
document.getElementById('sampleBoulevard').addEventListener('click', () => loadSample('boulevard'));
document.getElementById('samplePier').addEventListener('click', () => loadSample('pier'));

document.getElementById('prevPhoto').addEventListener('click', () => cyclePanelPhoto(-1));
document.getElementById('nextPhoto').addEventListener('click', () => cyclePanelPhoto(1));
document.getElementById('fillAll').addEventListener('click', () => {
  const f = state.framings[state.selected];
  if (f) state.framings.forEach((fr) => { fr.photo = f.photo; });
  redraw();
});
document.getElementById('resetFrame').addEventListener('click', () => {
  const f = state.framings[state.selected];
  if (f) { f.dx = 0; f.dy = 0; f.zoom = 1; }
  redraw();
});

function cyclePanelPhoto(dir) {
  const f = state.framings[state.selected];
  if (!f || !state.photos.length) return;
  f.photo = ((f.photo + dir) % state.photos.length + state.photos.length) % state.photos.length;
  redraw();
}

// --- canvas interaction: select, drag to pan, wheel to zoom --------------

function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * (canvas.width / r.width),
    y: (e.clientY - r.top) * (canvas.height / r.height),
  };
}

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const rects = panelRects(state);
  const hit = rects.findIndex((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
  if (hit >= 0) state.selected = hit;
  drag = { x: p.x, y: p.y, moved: false };
  canvas.setPointerCapture(e.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = canvasPoint(e);
  const f = state.framings[state.selected];
  const rect = panelRects(state)[state.selected];
  if (f && rect) {
    f.dx = clamp(f.dx + (p.x - drag.x) / rect.w * 2.8, -1, 1);
    f.dy = clamp(f.dy + (p.y - drag.y) / rect.h * 2.8, -1, 1);
    drag.moved = true;
  }
  drag.x = p.x;
  drag.y = p.y;
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const f = state.framings[state.selected];
  if (!f) return;
  f.zoom = clamp(f.zoom * (e.deltaY < 0 ? 1.08 : 0.93), 1, 3);
  redraw();
}, { passive: false });

function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

// --- export ----------------------------------------------------------------

els.exportBtn.addEventListener('click', () => {
  const out = document.createElement('canvas');
  renderCover(out, state);
  out.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-coast-cover-${state.size}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }, 'image/png');
});

// --- start -----------------------------------------------------------------

async function start() {
  resetFramings();
  const shot = readShotQuery();
  if (shot) {
    state.layout = shot.layout in LAYOUTS ? shot.layout : 'grid9';
    state.grade = shot.grade in GRADES ? shot.grade : 'sunset';
    state.size = shot.size in POST_SIZES ? shot.size : 'portrait';
    state.caption = shot.caption;
    state.script = shot.script;
    state.badge = shot.badge;
    state.stars = shot.stars;
    els.captionInput.value = shot.caption;
    els.scriptInput.value = shot.script;
    els.badgeInput.value = shot.badge;
    setSegment(els.layoutSeg, 'layout', state.layout);
    setSegment(els.gradeSeg, 'grade', state.grade);
    setSegment(els.sizeSeg, 'size', state.size);
    resetFramings();
    await loadSample('boulevard');
    await loadSample('pier');
    state.framings = sampleFramings(state.framings.length, state.photos.length);
    if (shot.mode === 'cover') document.body.classList.add('shot-cover');
    if (shot.mode === 'editor') document.body.classList.add('shot-editor');
    redraw();
    window.__shotReady = true;
    return;
  }
  redraw();
}

start();
