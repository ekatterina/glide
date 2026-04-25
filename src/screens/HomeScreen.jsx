import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import mapboxgl from 'mapbox-gl';
import LanguageToggle from '../components/LanguageToggle';
import GlideLogo from '../components/GlideLogo';
import { useLanguage } from '../context/LanguageContext';
import { routeSegments } from '../data/mockRoute';
import { searchRoute, ApiError } from '../lib/api';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const COMMUNITY_PINS = [
  [4.8985, 52.3745],
  [4.9018, 52.3714],
  [4.9068, 52.3681],
  [4.8912, 52.3752],
];

function makePinEl() {
  const el = document.createElement('div');
  el.style.cssText =
    'width:30px;height:30px;border-radius:50%;background:#FF6B4A;border:2.5px solid white;' +
    'box-shadow:0 2px 10px rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;cursor:pointer;';
  el.innerHTML =
    '<svg width="14" height="13" viewBox="0 0 14 13" fill="none">' +
    '<path d="M7 1L13 12H1L7 1Z" fill="white" stroke="white" stroke-width="0.5" stroke-linejoin="round"/>' +
    '<line x1="7" y1="5" x2="7" y2="8.5" stroke="#FF6B4A" stroke-width="1.6" stroke-linecap="round"/>' +
    '<circle cx="7" cy="10.5" r="0.7" fill="#FF6B4A"/>' +
    '</svg>';
  return el;
}

export default function HomeScreen({ onNavigate, onRoutePlanned, existingRoute }) {
  const { t } = useLanguage();
  const [from, setFrom] = useState(existingRoute?.from?.display_name ?? 'Albert Cuypstraat 67, Amsterdam');
  const [to, setTo] = useState(existingRoute?.to?.display_name ?? 'Vondelpark, Amsterdam');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!MAPBOX_TOKEN || !mapContainerRef.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/traffic-night-v2',
      center: [4.9020, 52.3710],
      zoom: 13.6,
      interactive: false,
      attributionControl: false,
      logoPosition: 'bottom-left',
    });
    mapRef.current = map;

    map.on('load', () => {
      routeSegments.features.forEach((feat, i) => {
        map.addSource(`hs-seg-${i}`, { type: 'geojson', data: feat });
        map.addLayer({
          id: `hs-seg-${i}`,
          type: 'line',
          source: `hs-seg-${i}`,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': feat.properties.color, 'line-width': 6, 'line-opacity': 0.95 },
        });
      });

      COMMUNITY_PINS.forEach((lngLat) => {
        new mapboxgl.Marker({ element: makePinEl() }).setLngLat(lngLat).addTo(map);
      });
    });

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const data = await searchRoute(from, to);
      onRoutePlanned(data);
      onNavigate('map');
    } catch (err) {
      const msg = err instanceof ApiError
        ? (err.status === 404 ? t('errAddressNotFound') : err.message || t('errRouting'))
        : t('errNetwork');
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Map background */}
      {MAPBOX_TOKEN ? (
        <div ref={mapContainerRef} className="absolute inset-0" />
      ) : (
        <div className="absolute inset-0 bg-navy" />
      )}

      {/* Navy overlay */}
      <div className="absolute inset-0 bg-navy/35 pointer-events-none z-10" />

      {/* Headline floating on map */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="absolute top-16 left-5 right-5 z-20 pointer-events-none"
      >
        <h1 className="font-display font-extrabold text-cream leading-[1.05] tracking-tight drop-shadow-lg">
          <span className="text-[2.6rem]">{t('headline1')}</span>
          <br />
          <span className="text-[2.6rem]">{t('headline2')}</span>
        </h1>
        <p className="mt-2 font-body text-cream/65 text-base leading-relaxed max-w-[280px]">
          {t('subline')}
        </p>
      </motion.div>

      {/* Input card overlay */}
      <motion.form
        onSubmit={handleSubmit}
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="absolute bottom-0 left-0 right-0 z-20 bg-cream rounded-t-3xl px-5 pt-4 pb-8 shadow-[0_-12px_48px_rgba(0,0,0,0.35)]"
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-navy/15 rounded-full mx-auto mb-4" aria-hidden="true" />

        {/* Brand + language */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <GlideLogo size={30} />
            <span className="font-display font-extrabold text-navy text-lg tracking-tight">Glide</span>
          </div>
          <LanguageToggle />
        </div>

        {/* From */}
        <label htmlFor="hs-from" className="block font-body text-xs font-semibold text-navy/45 uppercase tracking-widest mb-2">
          {t('fromLabel')}
        </label>
        <div className="relative mb-2">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true">
            <PinStart />
          </span>
          <input
            id="hs-from"
            type="text"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder={t('fromPlaceholder')}
            disabled={loading}
            className="w-full h-14 pl-12 pr-4 rounded-2xl bg-white border-2 border-navy/8 focus:border-navy/60 font-body text-navy text-sm placeholder:text-navy/30 outline-none transition-colors shadow-soft disabled:opacity-60"
          />
        </div>

        {/* Connector */}
        <div className="px-5 -my-0.5 pointer-events-none" aria-hidden="true">
          <div className="w-[1.5px] h-4 bg-navy/12 ml-[9px]" />
        </div>

        {/* To */}
        <div className="relative mt-2 mb-4">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true">
            <PinEnd />
          </span>
          <input
            id="hs-to"
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder={t('toPlaceholder')}
            disabled={loading}
            className="w-full h-14 pl-12 pr-4 rounded-2xl bg-white border-2 border-navy/8 focus:border-navy/60 font-body text-navy text-sm placeholder:text-navy/30 outline-none transition-colors shadow-soft disabled:opacity-60"
          />
        </div>

        {/* Inline error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -4, height: 0 }}
              className="overflow-hidden mb-3"
            >
              <div className="px-4 py-2.5 rounded-xl bg-difficult/10 border border-difficult/30 font-body text-xs text-difficult">
                {error}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CTA */}
        <motion.button
          type="submit"
          whileTap={{ scale: loading ? 1 : 0.97 }}
          disabled={loading}
          className="w-full h-14 rounded-2xl bg-navy text-cream font-display font-bold text-base flex items-center justify-center gap-2.5 shadow-card active:shadow-none transition-shadow disabled:opacity-80"
        >
          {loading ? (
            <>
              <SpinnerIcon />
              {t('searching')}
            </>
          ) : (
            <>
              <SearchIcon />
              {t('ctaButton')}
            </>
          )}
        </motion.button>
      </motion.form>
    </div>
  );
}

function PinStart() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" aria-hidden="true">
      <circle cx="10" cy="10" r="3" fill="#0F1F3D" opacity="0.4"/>
      <circle cx="10" cy="10" r="6" stroke="#0F1F3D" strokeWidth="1.5" strokeOpacity="0.2"/>
    </svg>
  );
}

function PinEnd() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" aria-hidden="true">
      <path d="M10 2C7.24 2 5 4.24 5 7c0 4.25 5 11 5 11s5-6.75 5-11c0-2.76-2.24-5-5-5z" fill="#2ECC71" opacity="0.85"/>
      <circle cx="10" cy="7" r="1.5" fill="white"/>
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" aria-hidden="true">
      <circle cx="9" cy="9" r="5" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M13 13l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5 animate-spin" aria-hidden="true">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="12 36" opacity="0.85" />
    </svg>
  );
}
