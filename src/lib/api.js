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
