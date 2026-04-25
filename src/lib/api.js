// Thin client for the glide-backend API (Next.js, runs on :3000 in dev).
// All requests go through Vite's /api proxy so origins match in development.

const AMSTERDAM_BBOX = {
  minLat: 52.28,
  maxLat: 52.43,
  minLng: 4.72,
  maxLng: 5.08,
};

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

/**
 * Resolve an address string into { lat, lng, display_name }.
 * Bounded to Amsterdam.
 */
export async function geocode(query) {
  const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
  const json = await res.json();
  if (!res.ok || !('lat' in json)) {
    throw new ApiError(
      json.error || `Could not find "${query}"`,
      res.status,
      json,
    );
  }
  return json;
}

/**
 * Plan up to 3 wheelchair-accessible routes between two points.
 * Returns { routes: ScoredRoute[] } sorted highest score first.
 */
export async function planRoute(from, to) {
  if (!inBbox(from) || !inBbox(to)) {
    throw new ApiError('Both endpoints must be inside Amsterdam.', 400, null);
  }
  const res = await fetch('/api/route', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to }),
  });
  const json = await res.json();
  if (!res.ok || !json.routes) {
    throw new ApiError(
      json.error || 'Routing failed',
      res.status,
      json,
    );
  }
  return json;
}

/**
 * Pull obstacle layers (reports + WIOR construction; OSM extras when osm=true).
 */
export async function getObstacles({ osm = false } = {}) {
  const url = osm ? '/api/obstacles?osm=1' : '/api/obstacles';
  const res = await fetch(url);
  if (!res.ok) throw new ApiError('Could not load obstacles', res.status, null);
  return res.json();
}

/**
 * Convenience: geocode → plan, in one call.
 */
export async function searchRoute(fromText, toText) {
  const [from, to] = await Promise.all([geocode(fromText), geocode(toText)]);
  const route = await planRoute([from.lat, from.lng], [to.lat, to.lng]);
  return { from, to, ...route };
}

/**
 * Send a photo to the backend for Claude-powered classification.
 * Either pass a base64 string (with optional data: prefix) or set demo: true.
 */
export async function classifyPhoto({ base64, mediaType, demo = false }) {
  const body = demo
    ? { action: 'classify', use_demo: true }
    : {
        action: 'classify',
        photo_base64: base64,
        media_type: mediaType,
      };
  const res = await fetch('/api/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok || !json.classification) {
    throw new ApiError(json.message || json.error || 'Classification failed', res.status, json);
  }
  return json.classification;
}

/**
 * Persist a report to the local reports.json after the user confirms.
 */
export async function saveReport({ classification, lat, lng, note }) {
  const res = await fetch('/api/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'save', classification, lat, lng, note }),
  });
  const json = await res.json();
  if (!res.ok || !json.report) {
    throw new ApiError(json.message || json.error || 'Save failed', res.status, json);
  }
  return json.report;
}

/**
 * Resize a File from <input type="file"> to a max dimension and JPEG-encode.
 * Returns { base64, mediaType } ready to ship over JSON.
 */
export async function fileToBase64(file, maxDimension = 1280, quality = 0.85) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error('Could not decode image'));
    i.src = dataUrl;
  });

  let { width, height } = img;
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  width = Math.round(width * scale);
  height = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);

  const jpegDataUrl = canvas.toDataURL('image/jpeg', quality);
  const base64 = jpegDataUrl.replace(/^data:image\/jpeg;base64,/, '');
  return { base64, mediaType: 'image/jpeg' };
}

/**
 * Wrap browser geolocation in a promise. Falls back to a sensible Amsterdam
 * coordinate (Dam Square area) if the user denies or the API isn't available.
 */
export async function getLocation({ timeoutMs = 8000 } = {}) {
  const fallback = { lat: 52.3702, lng: 4.8952 };
  if (!navigator.geolocation) return { ...fallback, source: 'fallback' };
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, source: 'gps' }),
      () => resolve({ ...fallback, source: 'fallback' }),
      { timeout: timeoutMs, maximumAge: 60_000 },
    );
  });
}

// ---------- formatting helpers used by UI ----------
export function formatDistance(meters) {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

export function formatDuration(seconds) {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h} h ${m} min`;
}

/**
 * Map our 0–100 accessibility score to the existing design tokens
 * good / moderate / difficult — preserves the colour system in tailwind.config.js.
 */
export function scoreToAccessibility(score) {
  if (score >= 80) return 'good';
  if (score >= 60) return 'moderate';
  return 'difficult';
}

export function scoreToColor(score) {
  if (score >= 80) return '#2ECC71'; // tailwind: accessible
  if (score >= 60) return '#F39C12'; // tailwind: moderate
  return '#E74C3C';                  // tailwind: difficult
}

function inBbox([lat, lng]) {
  return (
    lat >= AMSTERDAM_BBOX.minLat &&
    lat <= AMSTERDAM_BBOX.maxLat &&
    lng >= AMSTERDAM_BBOX.minLng &&
    lng <= AMSTERDAM_BBOX.maxLng
  );
}
