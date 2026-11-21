// Fixed scenes for the maker's screenshots, driven by the query string:
//   ?shot=cover&layout=grid9&grade=sunset&size=portrait&caption=Neon+Coast&script=vice+nights
// shows one exported cover full frame; ?shot=editor shows the studio with
// the sample photos loaded into the panels. window.__shotReady is set once
// the scene has painted, so a screenshot tool can wait for it.

export function readShotQuery() {
  const q = new URLSearchParams(location.search);
  if (!q.has('shot')) return null;
  return {
    mode: q.get('shot'),
    layout: q.get('layout') || 'grid9',
    grade: q.get('grade') || 'sunset',
    size: q.get('size') || 'portrait',
    caption: q.get('caption') || 'Neon Coast',
    script: q.get('script') || 'vice nights',
    badge: q.get('badge') || 'EST 2026',
    stars: Number(q.get('stars') || 5),
  };
}

// The sample photos bundled with the app, by short name.
export const SAMPLE_PHOTOS = {
  boulevard: 'samples/boulevard.jpg',
  pier: 'samples/pier.jpg',
};

export function loadImageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

// Varied framings so two sample photos fill a whole grid like many shots:
// each panel takes one photo with its own crop, pan and zoom.
export function sampleFramings(panelCount, photoCount) {
  const zooms = [1.15, 1.5, 1.05, 1.8, 1.3, 1.0, 1.6, 1.25, 1.45];
  const pans = [[0, -0.35], [-0.5, -0.2], [0.4, 0.3], [0.1, -0.5], [-0.3, 0.4], [0.5, -0.4], [-0.6, 0.1], [0.2, 0.5], [0, -0.3]];
  const out = [];
  for (let i = 0; i < panelCount; i++) {
    out.push({
      photo: i % Math.max(1, photoCount),
      zoom: zooms[i % zooms.length],
      dx: pans[i % pans.length][0],
      dy: pans[i % pans.length][1],
    });
  }
  return out;
}
