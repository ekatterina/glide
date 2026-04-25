import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import RouteCard from '../components/RouteCard';
import LanguageToggle from '../components/LanguageToggle';
import { useLanguage } from '../context/LanguageContext';
import { routeSegments, fullRouteCoordinates } from '../data/mockRoute';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

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
  [[4.8930, 52.3750],[4.8928, 52.3730],[4.8930, 52.3710],[4.8938, 52.3693],[4.8950, 52.3680],[4.8972, 52.3673]],
  [[4.8910, 52.3752],[4.8908, 52.3732],[4.8910, 52.3712],[4.8918, 52.3695],[4.8930, 52.3682]],
  [[4.8892, 52.3754],[4.8890, 52.3734],[4.8892, 52.3714],[4.8900, 52.3697]],
  [[4.9005, 52.3755],[4.9006, 52.3730],[4.9007, 52.3710],[4.9008, 52.3690],[4.9009, 52.3670],[4.9010, 52.3650]],
  [[4.9062, 52.3675],[4.9085, 52.3668],[4.9110, 52.3662],[4.9140, 52.3658],[4.9165, 52.3656]],
];

const streets = [
  [[4.888, 52.375],[4.920, 52.375]],
  [[4.888, 52.370],[4.920, 52.370]],
  [[4.888, 52.365],[4.920, 52.365]],
  [[4.893, 52.380],[4.893, 52.360]],
  [[4.900, 52.380],[4.900, 52.360]],
  [[4.910, 52.380],[4.910, 52.360]],
];

function SvgMapFallback() {
  const { t } = useLanguage();
  const [animStep, setAnimStep] = useState(1);

  useEffect(() => {
    if (animStep >= fullRouteCoordinates.length) return;
    const timer = setTimeout(() => setAnimStep((s) => s + 1), 60);
    return () => clearTimeout(timer);
  }, [animStep]);

  const animCoords = fullRouteCoordinates.slice(0, animStep);
  const [startX, startY] = project(fullRouteCoordinates[0]);
  const [endX, endY] = project(fullRouteCoordinates[fullRouteCoordinates.length - 1]);

  return (
    <div className="absolute inset-0 bg-[#EAE6DB]">
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="w-full h-full"
        preserveAspectRatio="xMidYMid slice"
      >
        {streets.map((pts, i) => (
          <polyline key={`st-${i}`} points={coordsToPolyline(pts)}
            stroke="#C8C1B0" strokeWidth="6" fill="none" strokeLinecap="round" />
        ))}
        {canals.map((pts, i) => (
          <polyline key={`canal-${i}`} points={coordsToPolyline(pts)}
            stroke="#A8C4D4" strokeWidth="8" fill="none" strokeLinecap="round" opacity="0.75" />
        ))}
        {routeSegments.features.map((feat, i) => (
          <polyline key={`seg-${i}`} points={coordsToPolyline(feat.geometry.coordinates)}
            stroke={feat.properties.color} strokeWidth="10"
            strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.9" />
        ))}
        {animCoords.length > 1 && (
          <polyline points={coordsToPolyline(animCoords)}
            stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
            fill="none"
            opacity={animStep < fullRouteCoordinates.length ? 0.65 : 0}
            style={{ transition: 'opacity 1s' }} />
        )}
        {/* Start marker */}
        <circle cx={startX} cy={startY} r="10" fill="#0F1F3D" />
        <circle cx={startX} cy={startY} r="5" fill="white" />
        {/* End marker */}
        <circle cx={endX} cy={endY} r="10" fill="#2ECC71" />
        <circle cx={endX} cy={endY} r="5" fill="white" />
        {/* Labels */}
        <text x={startX + 14} y={startY + 5} fontFamily="Syne, sans-serif" fontWeight="700" fontSize="11" fill="#0F1F3D">
          Dam Square
        </text>
        <text x={endX - 58} y={endY - 14} fontFamily="Syne, sans-serif" fontWeight="700" fontSize="11" fill="#0F1F3D">
          Artis Zoo
        </text>
      </svg>

      <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-navy/80 backdrop-blur-sm text-cream text-xs font-body font-medium px-3 py-1.5 rounded-full pointer-events-none whitespace-nowrap">
        {t('demoNotice')}
      </div>
    </div>
  );
}

function setupRouteAnimation(map, intervalRef) {
  routeSegments.features.forEach((feat, i) => {
    map.addSource(`seg-${i}`, { type: 'geojson', data: feat });
    map.addLayer({
      id: `seg-${i}`,
      type: 'line',
      source: `seg-${i}`,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': feat.properties.color, 'line-width': 8, 'line-opacity': 0.92 },
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
    el.style.cssText = `width:14px;height:14px;border-radius:50%;background:${bg};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3)`;
    return el;
  };
  new window.mapboxgl.Marker({ element: mkEl('#0F1F3D') }).setLngLat(fullRouteCoordinates[0]).addTo(map);
  new window.mapboxgl.Marker({ element: mkEl('#2ECC71') }).setLngLat(fullRouteCoordinates[fullRouteCoordinates.length - 1]).addTo(map);
}

export default function MapScreen({ onNavigate }) {
  const { t } = useLanguage();
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const intervalRef = useRef(null);
  const [useMapbox, setUseMapbox] = useState(!!MAPBOX_TOKEN);

  useEffect(() => {
    if (!MAPBOX_TOKEN || !window.mapboxgl) {
      setUseMapbox(false);
      return;
    }

    let mounted = true;
    window.mapboxgl.accessToken = MAPBOX_TOKEN;

    try {
      const map = new window.mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [4.9041, 52.3676],
        zoom: 13.5,
        attributionControl: false,
        logoPosition: 'bottom-right',
      });
      mapRef.current = map;
      map.on('load', () => { if (mounted) setupRouteAnimation(map, intervalRef); });
      map.on('error', () => { if (mounted) setUseMapbox(false); });
    } catch {
      setUseMapbox(false);
    }

    return () => {
      mounted = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  return (
    <div className="relative w-full h-full bg-navy overflow-hidden">
      {useMapbox ? (
        <div ref={mapContainerRef} className="absolute inset-0" />
      ) : (
        <SvgMapFallback />
      )}

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-12 pb-3 pointer-events-none z-20">
        {/* Back button */}
        <motion.button
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => onNavigate('home')}
          className="pointer-events-auto w-11 h-11 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-card"
          aria-label={t('backToHome')}
        >
          <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" aria-hidden="true">
            <path d="M12 4L6 10l6 6" stroke="#0F1F3D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.button>

        {/* Legend + language toggle */}
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25 }}
          className="pointer-events-auto flex flex-col items-end gap-1.5 bg-white/90 backdrop-blur-sm rounded-2xl px-3 py-2.5 shadow-card"
        >
          <LegendRow color="bg-accessible" label={t('legendAccessible')} />
          <LegendRow color="bg-moderate"   label={t('legendModerate')}   />
          <LegendRow color="bg-difficult"  label={t('legendDifficult')}  />
          <div className="w-full h-px bg-navy/10 my-0.5" aria-hidden="true" />
          <LanguageToggle variant="map" />
        </motion.div>
      </div>

      {/* Route card */}
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="absolute bottom-0 left-0 right-0 z-20"
      >
        <div className="bg-cream rounded-t-3xl px-5 pt-4 pb-8 shadow-[0_-8px_40px_rgba(15,31,61,0.18)]">
          <div className="w-10 h-1 bg-navy/15 rounded-full mx-auto mb-4" aria-hidden="true" />

          {/* Origin → Destination */}
          <div className="flex items-center gap-2 mb-4 overflow-hidden">
            <span className="font-body text-sm text-navy/50 font-medium truncate flex-shrink-0">
              {t('routeFrom')}
            </span>
            <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4 flex-shrink-0" aria-hidden="true">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="#0F1F3D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
            </svg>
            <span className="font-body text-sm text-navy font-semibold truncate">
              {t('routeTo')}
            </span>
          </div>

          <RouteCard onViewSteps={() => onNavigate('directions')} />
        </div>
      </motion.div>
    </div>
  );
}

function LegendRow({ color, label }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${color} flex-shrink-0`} aria-hidden="true" />
      <span className="font-body text-xs text-navy/70 font-medium">{label}</span>
    </div>
  );
}
