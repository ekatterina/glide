import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import RouteCard from '../components/RouteCard';
import LanguageToggle from '../components/LanguageToggle';
import { useLanguage } from '../context/LanguageContext';
import { routeSegments, fullRouteCoordinates } from '../data/mockRoute';
import { scoreToColor, getObstacles } from '../lib/api';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// ─── Per-route colours (best / alt 1 / alt 2) ───────────────────────────────
// Designed so the three options are immediately distinguishable on the
// navy-night basemap and don't clash with the obstacle layer hues below.
const ROUTE_COLORS = ['#2ECC71', '#3B82F6', '#9333EA']; // green / blue / purple

// ─── Obstruction layer colours ──────────────────────────────────────────────
const COLORS = {
  osm: '#94A3B8',           // slate-400 — permanent OSM data
  construction: '#F59E0B',  // amber-500 — live WIOR
  report: '#EC4899',        // pink-500  — community reports
};

// ─── SVG fallback map (shown when token is absent) ──────────────────────────
const BOUNDS = { lngMin: 4.886, lngMax: 4.924, latMin: 52.360, latMax: 52.380 };
const SVG_W = 390;
const SVG_H = 700;

function project([lng, lat]) {
  const x = ((lng - BOUNDS.lngMin) / (BOUNDS.lngMax - BOUNDS.lngMin)) * SVG_W;
  const y = ((BOUNDS.latMax - lat) / (BOUNDS.latMax - BOUNDS.latMin)) * SVG_H;
  return [x, y];
}

function coordsToPolyline(coords) {
  return coords.map((c) => project(c).join(',')).join(' ');
}

const canals = [
  [[4.8930,52.3750],[4.8928,52.3730],[4.8930,52.3710],[4.8938,52.3693],[4.8950,52.3680],[4.8972,52.3673]],
  [[4.8910,52.3752],[4.8908,52.3732],[4.8910,52.3712],[4.8918,52.3695],[4.8930,52.3682]],
  [[4.8892,52.3754],[4.8890,52.3734],[4.8892,52.3714],[4.8900,52.3697]],
  [[4.9005,52.3755],[4.9006,52.3730],[4.9007,52.3710],[4.9008,52.3690],[4.9009,52.3670],[4.9010,52.3650]],
  [[4.9062,52.3675],[4.9085,52.3668],[4.9110,52.3662],[4.9140,52.3658],[4.9165,52.3656]],
];

const streets = [
  [[4.888,52.375],[4.920,52.375]],
  [[4.888,52.370],[4.920,52.370]],
  [[4.888,52.365],[4.920,52.365]],
  [[4.893,52.380],[4.893,52.360]],
  [[4.900,52.380],[4.900,52.360]],
  [[4.910,52.380],[4.910,52.360]],
];

function SvgMapFallback({ liveCoords }) {
  const { t } = useLanguage();
  const sourceCoords = liveCoords ?? fullRouteCoordinates;
  const sourceSegments = liveCoords ? null : routeSegments.features;
  const [animStep, setAnimStep] = useState(1);

  useEffect(() => {
    if (animStep >= sourceCoords.length) return;
    const timer = setTimeout(() => setAnimStep((s) => s + 1), 60);
    return () => clearTimeout(timer);
  }, [animStep, sourceCoords.length]);

  const animCoords = sourceCoords.slice(0, animStep);
  const [sx, sy] = project(sourceCoords[0]);
  const [ex, ey] = project(sourceCoords[sourceCoords.length - 1]);

  return (
    <div className="absolute inset-0 bg-[#EAE6DB]">
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        {streets.map((pts, i) => (
          <polyline key={`st-${i}`} points={coordsToPolyline(pts)} stroke="#C8C1B0" strokeWidth="6" fill="none" strokeLinecap="round" />
        ))}
        {canals.map((pts, i) => (
          <polyline key={`cn-${i}`} points={coordsToPolyline(pts)} stroke="#A8C4D4" strokeWidth="8" fill="none" strokeLinecap="round" opacity="0.75" />
        ))}
        {sourceSegments && sourceSegments.map((feat, i) => (
          <polyline key={`sg-${i}`} points={coordsToPolyline(feat.geometry.coordinates)} stroke={feat.properties.color} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.9" />
        ))}
        {!sourceSegments && (
          <polyline points={coordsToPolyline(sourceCoords)} stroke="#2ECC71" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.9" />
        )}
        {animCoords.length > 1 && (
          <polyline points={coordsToPolyline(animCoords)} stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={animStep < sourceCoords.length ? 0.65 : 0} style={{ transition: 'opacity 1s' }} />
        )}
        <circle cx={sx} cy={sy} r="10" fill="#0F1F3D" />
        <circle cx={sx} cy={sy} r="5"  fill="white" />
        <circle cx={ex} cy={ey} r="10" fill="#2ECC71" />
        <circle cx={ex} cy={ey} r="5"  fill="white" />
      </svg>
      <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-navy/80 backdrop-blur-sm text-cream text-xs font-body font-medium px-3 py-1.5 rounded-full pointer-events-none whitespace-nowrap text-center">
        {liveCoords ? 'Set VITE_MAPBOX_TOKEN for interactive map' : t('demoNotice')}
      </div>
    </div>
  );
}

// ─── Mock-data fallback (no live route yet) ─────────────────────────────────
function setupMockRouteAnimation(map, intervalRef) {
  routeSegments.features.forEach((feat, i) => {
    map.addSource(`mock-seg-${i}`, { type: 'geojson', data: feat });
    map.addLayer({
      id: `mock-seg-${i}`,
      type: 'line',
      source: `mock-seg-${i}`,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': feat.properties.color, 'line-width': 8, 'line-opacity': 0.95 },
    });
  });

  map.addSource('mock-draw', {
    type: 'geojson',
    data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [fullRouteCoordinates[0]] } },
  });
  map.addLayer({
    id: 'mock-draw',
    type: 'line',
    source: 'mock-draw',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#ffffff', 'line-width': 3, 'line-opacity': 0.7 },
  });

  let step = 1;
  intervalRef.current = setInterval(() => {
    if (step >= fullRouteCoordinates.length) {
      clearInterval(intervalRef.current);
      setTimeout(() => {
        if (map.getLayer('mock-draw')) map.setPaintProperty('mock-draw', 'line-opacity', 0);
      }, 600);
      return;
    }
    map.getSource('mock-draw').setData({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: fullRouteCoordinates.slice(0, step + 1) },
    });
    step++;
  }, 70);

  const mkEl = (bg) => {
    const el = document.createElement('div');
    el.style.cssText = `width:14px;height:14px;border-radius:50%;background:${bg};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.5)`;
    return el;
  };
  new mapboxgl.Marker({ element: mkEl('#0F1F3D') }).setLngLat(fullRouteCoordinates[0]).addTo(map);
  new mapboxgl.Marker({ element: mkEl('#2ECC71') }).setLngLat(fullRouteCoordinates[fullRouteCoordinates.length - 1]).addTo(map);
}

// ─── Live route(s): all 3 alternatives, selected one highlighted ────────────
function setupLiveRoutes(map, routes, selectedIndex, setSelectedIndex) {
  // Render unselected first so the selected one ends on top.
  const order = routes.map((_, i) => i).filter((i) => i !== selectedIndex);
  order.push(selectedIndex);

  for (const i of order) {
    const r = routes[i];
    const isSel = i === selectedIndex;
    map.addSource(`route-${i}`, { type: 'geojson', data: r.geometry });
    map.addLayer({
      id: `route-${i}-casing`,
      type: 'line',
      source: `route-${i}`,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#0F1F3D',
        'line-width': isSel ? 11 : 6,
        'line-opacity': isSel ? 0.45 : 0.25,
      },
    });
    map.addLayer({
      id: `route-${i}`,
      type: 'line',
      source: `route-${i}`,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': ROUTE_COLORS[i] ?? '#9CA3AF',
        'line-width': isSel ? 7 : 4,
        'line-opacity': isSel ? 0.95 : 0.55,
      },
    });

    // Click on a non-selected route to switch to it.
    if (!isSel) {
      map.on('click', `route-${i}`, () => setSelectedIndex(i));
      map.on('mouseenter', `route-${i}`, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', `route-${i}`, () => { map.getCanvas().style.cursor = ''; });
    }
  }

  // Start/end markers from the selected route only.
  const selected = routes[selectedIndex];
  const coords = selected.geometry.coordinates;
  const mkEl = (bg) => {
    const el = document.createElement('div');
    el.style.cssText = `width:14px;height:14px;border-radius:50%;background:${bg};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.5)`;
    return el;
  };
  new mapboxgl.Marker({ element: mkEl('#0F1F3D') }).setLngLat(coords[0]).addTo(map);
  new mapboxgl.Marker({ element: mkEl('#2ECC71') }).setLngLat(coords[coords.length - 1]).addTo(map);

  // Fit bounds across ALL routes so all alternatives are visible.
  const allLngs = routes.flatMap((r) => r.geometry.coordinates.map((c) => c[0]));
  const allLats = routes.flatMap((r) => r.geometry.coordinates.map((c) => c[1]));
  map.fitBounds(
    [[Math.min(...allLngs), Math.min(...allLats)], [Math.max(...allLngs), Math.max(...allLats)]],
    { padding: { top: 80, bottom: 380, left: 40, right: 40 }, duration: 700 },
  );
}

function restyleSelectedRoute(map, routes, selectedIndex) {
  for (let i = 0; i < routes.length; i++) {
    const isSel = i === selectedIndex;
    if (map.getLayer(`route-${i}`)) {
      map.setPaintProperty(`route-${i}`, 'line-width', isSel ? 7 : 4);
      map.setPaintProperty(`route-${i}`, 'line-opacity', isSel ? 0.95 : 0.55);
    }
    if (map.getLayer(`route-${i}-casing`)) {
      map.setPaintProperty(`route-${i}-casing`, 'line-width', isSel ? 11 : 6);
      map.setPaintProperty(`route-${i}-casing`, 'line-opacity', isSel ? 0.45 : 0.25);
    }
    if (isSel && map.getLayer(`route-${i}`)) {
      map.moveLayer(`route-${i}-casing`);
      map.moveLayer(`route-${i}`);
    }
  }
}

// ─── Route corridor filter ──────────────────────────────────────────────────
// Keeps only the obstacles within `bufferMeters` of any vertex of any active
// route. Without this filter the city-wide OSM dump (5k+ features) drowns the
// map; with it the user only sees what actually affects their trip.
function filterToRouteCorridor(fc, routes, bufferMeters = 150) {
  if (!routes || routes.length === 0) return fc;

  // Collect all vertices from all routes.
  const verts = [];
  for (const r of routes) {
    for (const c of r.geometry?.coordinates ?? []) verts.push(c);
  }
  if (verts.length === 0) return fc;

  // Convert buffer to lat/lng degrees (cheap; fine for short distances).
  const latBuf = bufferMeters / 111000;
  const cosLat = Math.cos((verts[0][1] * Math.PI) / 180);
  const lngBuf = bufferMeters / (111000 * Math.max(0.1, cosLat));

  const near = (lng, lat) => {
    for (const [vlng, vlat] of verts) {
      if (Math.abs(lat - vlat) <= latBuf && Math.abs(lng - vlng) <= lngBuf) return true;
    }
    return false;
  };

  return {
    type: 'FeatureCollection',
    features: fc.features.filter((f) => {
      const g = f.geometry;
      if (!g) return false;
      if (g.type === 'Point') return near(g.coordinates[0], g.coordinates[1]);
      if (g.type === 'LineString') return g.coordinates.some(([lng, lat]) => near(lng, lat));
      if (g.type === 'Polygon') {
        const ring = g.coordinates[0] ?? [];
        return ring.some(([lng, lat]) => near(lng, lat));
      }
      if (g.type === 'MultiPolygon') {
        return g.coordinates.some((poly) =>
          (poly[0] ?? []).some(([lng, lat]) => near(lng, lat)),
        );
      }
      return false;
    }),
  };
}

// ─── Convert API obstacle payload into Mapbox sources ───────────────────────
function obstaclesToFeatureCollections(payload) {
  const out = {
    osmPoints: { type: 'FeatureCollection', features: [] },
    osmLines: { type: 'FeatureCollection', features: [] },
    construction: { type: 'FeatureCollection', features: [] },
    reports: { type: 'FeatureCollection', features: [] },
  };
  if (payload.osm) {
    for (const layer of Object.values(payload.osm)) {
      for (const el of layer.elements ?? []) {
        if (el.type === 'way' && Array.isArray(el.geometry) && el.geometry.length >= 2) {
          out.osmLines.features.push({
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: el.geometry.map((p) => [p.lon, p.lat]) },
            properties: el.tags ?? {},
          });
        } else if (el.type === 'node' && el.lat != null && el.lon != null) {
          out.osmPoints.features.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [el.lon, el.lat] },
            properties: el.tags ?? {},
          });
        }
      }
    }
  }
  for (const c of payload.construction ?? []) {
    out.construction.features.push({
      type: 'Feature',
      geometry: c.geometry,
      properties: { project_name: c.project_name, type: c.type, start_date: c.start_date, end_date: c.end_date },
    });
  }
  for (const r of payload.reports ?? []) {
    const meta = payload.categories?.[r.category];
    out.reports.features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [r.lng, r.lat] },
      properties: {
        category: r.category,
        label: meta?.label ?? r.category,
        emoji: meta?.emoji ?? '',
        severity: meta?.severity ?? 'medium',
        note: r.note ?? '',
      },
    });
  }
  return out;
}

const OBSTACLE_LAYER_IDS = [
  'obstacles-construction-fill',
  'obstacles-construction-line',
  'obstacles-osm-lines',
  'obstacles-osm-points',
  'obstacles-reports',
];

function clearObstacleLayers(map) {
  for (const id of OBSTACLE_LAYER_IDS) {
    if (map.getLayer(id)) map.removeLayer(id);
  }
  for (const id of ['osm-points', 'osm-lines', 'construction', 'reports']) {
    if (map.getSource(id)) map.removeSource(id);
  }
}

// ─── Mapbox popups for each obstacle layer ──────────────────────────────────
// Registered once on first toggle-on; fire only when their layer exists.
let popupHandlersRegistered = false;
const popupKeptTags = ['name', 'highway', 'surface', 'smoothness', 'wheelchair', 'incline', 'width', 'sidewalk:width', 'kerb', 'kerb:height', 'barrier'];

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function osmPopupHtml(props) {
  const tags = Object.entries(props)
    .filter(([k, v]) => popupKeptTags.includes(k) && v !== null && v !== '')
    .map(([k, v]) => `<div><span style="opacity:.6">${escapeHtml(k)}</span> ${escapeHtml(v)}</div>`)
    .join('');
  return `<div style="font-family:'DM Sans',sans-serif;font-size:12px;color:#0F1F3D;min-width:180px"><div style="font-weight:700;margin-bottom:4px">OSM feature</div>${tags || '<i style="opacity:.5">no relevant tags</i>'}</div>`;
}

function constructionPopupHtml(props) {
  return `<div style="font-family:'DM Sans',sans-serif;font-size:12px;color:#0F1F3D;max-width:260px">
    <div style="font-weight:700;margin-bottom:4px">🏗️ ${escapeHtml(props.project_name || 'Construction')}</div>
    <div style="opacity:.7">${escapeHtml(props.type || '')}</div>
    <div style="opacity:.5;font-size:11px;margin-top:4px">${escapeHtml(props.start_date)} → ${escapeHtml(props.end_date)}</div>
  </div>`;
}

function reportPopupHtml(props) {
  return `<div style="font-family:'DM Sans',sans-serif;font-size:12px;color:#0F1F3D;max-width:240px">
    <div style="font-weight:700;margin-bottom:4px">${props.emoji || ''} ${escapeHtml(props.label || props.category)}</div>
    <div style="opacity:.7">${escapeHtml(props.note || '')}</div>
    <div style="opacity:.5;font-size:11px;margin-top:4px">severity: ${escapeHtml(props.severity)}</div>
  </div>`;
}

function setupObstaclePopups(map) {
  if (popupHandlersRegistered) return;
  popupHandlersRegistered = true;

  const popup = new mapboxgl.Popup({ closeButton: true, closeOnClick: true, maxWidth: '280px' });

  const showAt = (e, html) => {
    popup.setLngLat(e.lngLat).setHTML(html).addTo(map);
  };

  map.on('click', 'obstacles-osm-points',  (e) => showAt(e, osmPopupHtml(e.features[0].properties)));
  map.on('click', 'obstacles-osm-lines',   (e) => showAt(e, osmPopupHtml(e.features[0].properties)));
  map.on('click', 'obstacles-construction-fill', (e) => showAt(e, constructionPopupHtml(e.features[0].properties)));
  map.on('click', 'obstacles-construction-line', (e) => showAt(e, constructionPopupHtml(e.features[0].properties)));
  map.on('click', 'obstacles-reports',     (e) => showAt(e, reportPopupHtml(e.features[0].properties)));

  for (const id of OBSTACLE_LAYER_IDS) {
    map.on('mouseenter', id, () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', id, () => { map.getCanvas().style.cursor = ''; });
  }
}

function addObstacleLayers(map, fcs) {
  map.addSource('construction', { type: 'geojson', data: fcs.construction });
  map.addLayer({
    id: 'obstacles-construction-fill',
    type: 'fill',
    source: 'construction',
    paint: { 'fill-color': COLORS.construction, 'fill-opacity': 0.35 },
  });
  map.addLayer({
    id: 'obstacles-construction-line',
    type: 'line',
    source: 'construction',
    paint: { 'line-color': COLORS.construction, 'line-width': 1.5, 'line-opacity': 0.85 },
  });

  map.addSource('osm-lines', { type: 'geojson', data: fcs.osmLines });
  map.addLayer({
    id: 'obstacles-osm-lines',
    type: 'line',
    source: 'osm-lines',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': COLORS.osm, 'line-width': 3, 'line-opacity': 0.7 },
  });

  map.addSource('osm-points', { type: 'geojson', data: fcs.osmPoints });
  map.addLayer({
    id: 'obstacles-osm-points',
    type: 'circle',
    source: 'osm-points',
    paint: {
      'circle-radius': 4,
      'circle-color': COLORS.osm,
      'circle-stroke-color': '#0F1F3D',
      'circle-stroke-width': 1,
      'circle-opacity': 0.9,
    },
  });

  map.addSource('reports', { type: 'geojson', data: fcs.reports });
  map.addLayer({
    id: 'obstacles-reports',
    type: 'circle',
    source: 'reports',
    paint: {
      'circle-radius': ['match', ['get', 'severity'], 'high', 9, 'medium', 7, 'low', 5, 7],
      'circle-color': COLORS.report,
      'circle-stroke-color': 'white',
      'circle-stroke-width': 2,
      'circle-opacity': 0.95,
    },
  });
}

// ─── Screen component ────────────────────────────────────────────────────────
export default function MapScreen({ onNavigate, routeData }) {
  const { t } = useLanguage();
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const intervalRef = useRef(null);
  const [, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(!MAPBOX_TOKEN);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showObstacles, setShowObstacles] = useState(false);
  const [obstacles, setObstacles] = useState(null);
  const [obstaclesLoading, setObstaclesLoading] = useState(false);

  const routes = routeData?.routes ?? [];
  const liveRoute = routes[selectedIndex] ?? null;
  const liveCoords = liveRoute?.geometry?.coordinates ?? null;

  // Reset selected index when a new route set arrives.
  useEffect(() => {
    setSelectedIndex(0);
  }, [routeData]);

  // Initialise the map once per route-set identity.
  useEffect(() => {
    if (!MAPBOX_TOKEN) return;

    let mounted = true;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    try {
      const center = liveCoords
        ? liveCoords[Math.floor(liveCoords.length / 2)]
        : [4.9041, 52.3676];

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        // traffic-night-v2 = same dark navigation aesthetic + Mapbox live
        // traffic congestion overlay (green / orange / red / dark red).
        style: 'mapbox://styles/mapbox/traffic-night-v2',
        center,
        zoom: 13.5,
        attributionControl: false,
        logoPosition: 'bottom-right',
      });

      mapRef.current = map;

      map.on('load', () => {
        if (!mounted) return;
        if (routes.length > 0) {
          setupLiveRoutes(map, routes, selectedIndex, setSelectedIndex);
        } else {
          setupMockRouteAnimation(map, intervalRef);
        }
        setMapReady(true);
      });

      map.on('error', () => { if (mounted) setMapError(true); });
    } catch {
      setMapError(true);
    }

    return () => {
      mounted = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeData]);

  // Re-style when selection changes (without re-creating the map).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || routes.length === 0) return;
    const apply = () => restyleSelectedRoute(map, routes, selectedIndex);
    if (map.isStyleLoaded()) apply();
    else map.once('idle', apply);
  }, [selectedIndex, routes]);

  // Fetch obstacles once on first toggle-on.
  useEffect(() => {
    if (!showObstacles || obstacles || obstaclesLoading) return;
    setObstaclesLoading(true);
    getObstacles({ osm: true })
      .then(setObstacles)
      .catch(() => setObstacles({ reports: [], construction: [], osm: null, categories: {} }))
      .finally(() => setObstaclesLoading(false));
  }, [showObstacles, obstacles, obstaclesLoading]);

  // Apply obstacle layers when toggle / data / route changes.
  // Filter to the route corridor so the map stays interpretable — only show
  // obstacles within ~150m of any active route polyline.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      clearObstacleLayers(map);
      if (!(showObstacles && obstacles && routes.length > 0)) return;
      const fcs = obstaclesToFeatureCollections(obstacles);
      const filtered = {
        osmPoints: filterToRouteCorridor(fcs.osmPoints, routes),
        osmLines: filterToRouteCorridor(fcs.osmLines, routes),
        construction: filterToRouteCorridor(fcs.construction, routes),
        reports: filterToRouteCorridor(fcs.reports, routes),
      };
      addObstacleLayers(map, filtered);
      setupObstaclePopups(map);
    };
    if (map.isStyleLoaded()) apply();
    else map.once('idle', apply);
  }, [showObstacles, obstacles, routes]);

  const showFallback = mapError || !MAPBOX_TOKEN;
  const fromLabel = routeData?.from?.display_name?.split(',')[0] ?? t('routeFrom');
  const toLabel = routeData?.to?.display_name?.split(',')[0] ?? t('routeTo');

  return (
    <div className="relative w-full h-full bg-[#0F1F3D] overflow-hidden">
      {/* Map */}
      {showFallback ? (
        <SvgMapFallback liveCoords={liveCoords} />
      ) : (
        <div ref={mapContainerRef} className="absolute inset-0" />
      )}

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-start justify-between px-4 pt-12 pb-3 pointer-events-none z-20">
        <motion.button
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => onNavigate('home')}
          className="pointer-events-auto w-11 h-11 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center shadow-card border border-white/10"
          aria-label={t('backToHome')}
        >
          <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" aria-hidden="true">
            <path d="M12 4L6 10l6 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.button>

        <Legend t={t} showObstacles={showObstacles} />
      </div>

      {/* Right-side floating action stack */}
      <div className="absolute right-4 bottom-[420px] z-20 flex flex-col items-center gap-3">
        <motion.button
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.55, duration: 0.4, type: 'spring', stiffness: 200, damping: 18 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowObstacles((v) => !v)}
          aria-pressed={showObstacles}
          aria-label={t('toggleObstructions')}
          className={`w-14 h-14 rounded-full flex items-center justify-center border shadow-[0_4px_20px_rgba(0,0,0,0.55)] transition-colors ${
            showObstacles ? 'bg-white text-navy border-white' : 'bg-navy text-white border-white/20'
          }`}
        >
          {obstaclesLoading ? <SpinnerIcon /> : <LayersIcon />}
        </motion.button>
        <span className="font-body text-xs text-white/65 font-medium -mt-1.5">
          {t('toggleObstructionsShort')}
        </span>

        <motion.button
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7, duration: 0.4, type: 'spring', stiffness: 200, damping: 18 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onNavigate('report')}
          className="w-14 h-14 rounded-full bg-navy shadow-[0_4px_20px_rgba(0,0,0,0.55)] flex items-center justify-center border border-white/20"
          aria-label="Report obstruction"
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" aria-hidden="true">
            <rect x="2" y="7" width="20" height="14" rx="3" stroke="white" strokeWidth="1.8"/>
            <circle cx="12" cy="13.5" r="3.5" stroke="white" strokeWidth="1.8"/>
            <path d="M8 7l1.5-2.5h5L16 7" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.button>
        <span className="font-body text-xs text-white/65 font-medium -mt-1.5">Report</span>
      </div>

      {/* Bottom sheet */}
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="absolute bottom-0 left-0 right-0 z-20"
      >
        <div className="bg-cream rounded-t-3xl px-5 pt-4 pb-8 shadow-[0_-8px_40px_rgba(0,0,0,0.4)]">
          <div className="w-10 h-1 bg-navy/15 rounded-full mx-auto mb-4" aria-hidden="true" />

          {/* Route alternatives selector */}
          {routes.length > 1 && (
            <div className="flex gap-2 mb-3">
              {routes.map((r, i) => {
                const isSel = i === selectedIndex;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedIndex(i)}
                    className={`
                      flex-1 rounded-2xl px-3 py-2.5 text-left transition-all
                      border-2
                      ${isSel ? 'bg-white shadow-card' : 'bg-navy/3 hover:bg-navy/6'}
                    `}
                    style={{
                      borderColor: isSel ? ROUTE_COLORS[i] : 'transparent',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: ROUTE_COLORS[i] }}
                        aria-hidden="true"
                      />
                      <span className="font-display font-bold text-navy text-sm leading-none">
                        {i === 0 ? t('routeBest') : `${t('routeAlt')} ${i}`}
                      </span>
                    </div>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className={`font-display font-bold text-lg leading-none ${
                        r.accessibility_score >= 80 ? 'text-accessible'
                        : r.accessibility_score >= 60 ? 'text-moderate'
                        : 'text-difficult'
                      }`}>
                        {r.accessibility_score}
                      </span>
                      <span className="font-body text-[11px] text-navy/50">
                        · {Math.round(r.distance_m)} m
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* From → To */}
          <div className="flex items-center gap-2 mb-4 overflow-hidden">
            <span className="font-body text-sm text-navy/50 font-medium truncate flex-shrink-0">
              {fromLabel}
            </span>
            <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4 flex-shrink-0" aria-hidden="true">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="#0F1F3D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
            </svg>
            <span className="font-body text-sm text-navy font-semibold truncate">
              {toLabel}
            </span>
          </div>

          <RouteCard liveRoute={liveRoute} />
        </div>
      </motion.div>
    </div>
  );
}

function Legend({ t, showObstacles }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.25 }}
      className="pointer-events-auto flex flex-col items-stretch gap-1.5 bg-black/40 backdrop-blur-md rounded-2xl px-3 py-2.5 shadow-card border border-white/10 max-w-[210px]"
    >
      <p className="font-body text-[10px] text-white/55 uppercase tracking-widest font-semibold">
        {t('legendRouteHeader')}
      </p>
      <LegendDot color="#2ECC71" label={t('legendAccessible')} />
      <LegendDot color="#F39C12" label={t('legendModerate')}   />
      <LegendDot color="#E74C3C" label={t('legendDifficult')}  />

      <AnimatePresence initial={false}>
        {showObstacles && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="w-full h-px bg-white/15 my-1" aria-hidden="true" />
            <LegendDot color={COLORS.osm}          label={t('layerOsm')}          />
            <LegendDot color={COLORS.construction} label={t('layerConstruction')} />
            <LegendDot color={COLORS.report}       label={t('layerReports')}      />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full h-px bg-white/15 my-0.5" aria-hidden="true" />
      <LanguageToggle variant="map" />
    </motion.div>
  );
}

function LegendDot({ color, label }) {
  return (
    <div className="flex items-center gap-2.5 w-full">
      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} aria-hidden="true" />
      <span className="font-body text-xs text-white/85 font-medium">{label}</span>
    </div>
  );
}

function LayersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" aria-hidden="true">
      <path d="M12 3l9 5-9 5-9-5 9-5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M3 13l9 5 9-5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M3 17l9 5 9-5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-6 h-6 animate-spin" aria-hidden="true">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="12 36" opacity="0.85" />
    </svg>
  );
}
