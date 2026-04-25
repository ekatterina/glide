import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import mapboxgl from 'mapbox-gl';
import DirectionsScreen from './DirectionsScreen';
import 'mapbox-gl/dist/mapbox-gl.css';
import RouteCard from '../components/RouteCard';
import LanguageToggle from '../components/LanguageToggle';
import { useLanguage } from '../context/LanguageContext';
import { routeSegments, fullRouteCoordinates } from '../data/mockRoute';
import { scoreToColor } from '../lib/api';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

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
      {!liveCoords && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-navy/80 backdrop-blur-sm text-cream text-xs font-body font-medium px-3 py-1.5 rounded-full pointer-events-none whitespace-nowrap">
          {t('demoNotice')}
        </div>
      )}
    </div>
  );
}

// ─── Mapbox route setup (mock-data demo path, kept for offline preview) ─────
function setupMockRouteAnimation(map, intervalRef) {
  routeSegments.features.forEach((feat, i) => {
    map.addSource(`seg-${i}`, { type: 'geojson', data: feat });
    map.addLayer({
      id: `seg-${i}`,
      type: 'line',
      source: `seg-${i}`,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': feat.properties.color, 'line-width': 8, 'line-opacity': 0.95 },
    });
  });

  map.addSource('route-draw', {
    type: 'geojson',
    data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [fullRouteCoordinates[0]] } },
  });
  map.addLayer({
    id: 'route-draw',
    type: 'line',
    source: 'route-draw',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#ffffff', 'line-width': 3, 'line-opacity': 0.7 },
  });

  let step = 1;
  intervalRef.current = setInterval(() => {
    if (step >= fullRouteCoordinates.length) {
      clearInterval(intervalRef.current);
      setTimeout(() => {
        if (map.getLayer('route-draw')) map.setPaintProperty('route-draw', 'line-opacity', 0);
      }, 600);
      return;
    }
    map.getSource('route-draw').setData({
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

// ─── Mapbox route setup (live data from glide-backend) ──────────────────────
function setupLiveRouteAnimation(map, intervalRef, route) {
  const coords = route.geometry.coordinates;
  const color = scoreToColor(route.accessibility_score);

  map.addSource('live-route', { type: 'geojson', data: route.geometry });
  map.addLayer({
    id: 'live-route',
    type: 'line',
    source: 'live-route',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': color, 'line-width': 8, 'line-opacity': 0.95 },
  });

  map.addSource('route-draw', {
    type: 'geojson',
    data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [coords[0]] } },
  });
  map.addLayer({
    id: 'route-draw',
    type: 'line',
    source: 'route-draw',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#ffffff', 'line-width': 3, 'line-opacity': 0.7 },
  });

  let step = 1;
  intervalRef.current = setInterval(() => {
    if (step >= coords.length) {
      clearInterval(intervalRef.current);
      setTimeout(() => {
        if (map.getLayer('route-draw')) map.setPaintProperty('route-draw', 'line-opacity', 0);
      }, 600);
      return;
    }
    map.getSource('route-draw').setData({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: coords.slice(0, step + 1) },
    });
    step++;
  }, 70);

  const mkEl = (bg) => {
    const el = document.createElement('div');
    el.style.cssText = `width:14px;height:14px;border-radius:50%;background:${bg};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.5)`;
    return el;
  };
  new mapboxgl.Marker({ element: mkEl('#0F1F3D') }).setLngLat(coords[0]).addTo(map);
  new mapboxgl.Marker({ element: mkEl('#2ECC71') }).setLngLat(coords[coords.length - 1]).addTo(map);

  // Fit bounds to the route with a little padding for the bottom sheet.
  const lngs = coords.map((c) => c[0]);
  const lats = coords.map((c) => c[1]);
  map.fitBounds(
    [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
    { padding: { top: 80, bottom: 360, left: 40, right: 40 }, duration: 700 },
  );
}

// ─── Screen component ────────────────────────────────────────────────────────
export default function MapScreen({ onNavigate, routeData }) {
  const { t } = useLanguage();
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const intervalRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(!MAPBOX_TOKEN);
  const [showDirections, setShowDirections] = useState(false);

  const liveRoute = routeData?.routes?.[0] ?? null;
  const liveCoords = liveRoute?.geometry?.coordinates ?? null;

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
        style: 'mapbox://styles/mapbox/navigation-night-v1',
        center,
        zoom: 13.5,
        attributionControl: false,
        logoPosition: 'bottom-right',
      });

      mapRef.current = map;

      map.on('load', () => {
        if (!mounted) return;
        if (liveRoute) {
          setupLiveRouteAnimation(map, intervalRef, liveRoute);
        } else {
          setupMockRouteAnimation(map, intervalRef);
        }
        setMapReady(true);
      });

      map.on('error', () => {
        if (mounted) setMapError(true);
      });
    } catch {
      setMapError(true);
    }

    return () => {
      mounted = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveRoute]);

  const showFallback = mapError || !MAPBOX_TOKEN;

  // From / To labels in the bottom sheet — prefer real geocoded names.
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
        {/* Back button */}
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

        {/* Legend + language toggle */}
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25 }}
          className="pointer-events-auto flex flex-col items-stretch gap-1.5 bg-black/40 backdrop-blur-md rounded-2xl px-3 py-2.5 shadow-card border border-white/10"
        >
          {/* Live indicator */}
          <div className="flex items-center gap-1.5">
            <div className="relative w-2 h-2 flex-shrink-0">
              <div className="absolute inset-0 rounded-full bg-accessible animate-ping opacity-75" />
              <div className="w-2 h-2 rounded-full bg-accessible relative" />
            </div>
            <span className="font-body text-xs text-white/85 font-semibold tracking-wide">Live</span>
          </div>
          <div className="w-full h-px bg-white/15" aria-hidden="true" />
          <LegendRow color="bg-accessible" label={t('legendAccessible')} />
          <LegendRow color="bg-moderate"   label={t('legendModerate')}   />
          <LegendRow color="bg-difficult"  label={t('legendDifficult')}  />
          <div className="w-full h-px bg-white/15 my-0.5" aria-hidden="true" />
          <LanguageToggle variant="map" />
        </motion.div>
      </div>

      {/* Route card — slides up from bottom */}
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="absolute bottom-0 left-0 right-0 z-20"
      >
        <div className="bg-cream rounded-t-3xl px-5 pt-4 pb-8 shadow-[0_-8px_40px_rgba(0,0,0,0.4)]">
          <div className="w-10 h-1 bg-navy/15 rounded-full mx-auto mb-4" aria-hidden="true" />

          {/* Origin → Destination */}
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

          <RouteCard onViewSteps={() => setShowDirections(true)} liveRoute={liveRoute} />
        </div>
      </motion.div>

      {/* Report button — floats above route card */}
      {!showDirections && (
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7, duration: 0.4, type: 'spring', stiffness: 200, damping: 18 }}
          className="absolute bottom-[340px] right-4 z-20 flex flex-col items-center gap-1.5"
        >
          <motion.button
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
          <span className="font-body text-xs text-white/65 font-medium">Report</span>
        </motion.div>
      )}

      {/* Directions bottom sheet */}
      <AnimatePresence>
        {showDirections && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-x-0 bottom-0 z-30 h-[92%] rounded-t-3xl overflow-hidden shadow-[0_-8px_48px_rgba(0,0,0,0.55)]"
          >
            <DirectionsScreen
              onNavigate={(target) => {
                if (target === 'map') setShowDirections(false);
                else onNavigate(target);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LegendRow({ color, label }) {
  return (
    <div className="flex items-center gap-2.5 w-full">
      <div className={`w-3 h-3 rounded-full ${color} flex-shrink-0`} aria-hidden="true" />
      <span className="font-body text-xs text-white/85 font-medium">{label}</span>
    </div>
  );
}
