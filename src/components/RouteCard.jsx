import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { mockRoute } from '../data/mockRoute';
import { useLanguage } from '../context/LanguageContext';
import { formatDistance, formatDuration } from '../lib/api';

const WARNING_ICON = {
  cobblestone: '🪨',
  smoothness: '〰️',
  incline: '⛰️',
  wheelchair_limited: '⛔',
  edge_case: '⚠️',
};

// Google Maps URL Directions API caps `waypoints` at 9 (excluding origin/dest).
// Sample up to MAX_WAYPOINTS evenly spaced from the interior of our route so
// Google's planner snaps roughly to the same streets we picked.
const MAX_WAYPOINTS = 8;

function sampleWaypoints(coords) {
  if (!coords || coords.length <= 2) return [];
  const interior = coords.slice(1, -1);
  if (interior.length <= MAX_WAYPOINTS) return interior;
  const step = interior.length / MAX_WAYPOINTS;
  const sampled = [];
  for (let i = 0; i < MAX_WAYPOINTS; i++) {
    sampled.push(interior[Math.floor(i * step)]);
  }
  return sampled;
}

function buildGoogleMapsUrl(coords) {
  // Our coords are GeoJSON [lng, lat]; Google expects "lat,lng" strings.
  const [originLng, originLat] = coords[0];
  const [destLng, destLat] = coords[coords.length - 1];
  const params = new URLSearchParams();
  params.set('api', '1');
  params.set('travelmode', 'walking');
  params.set('origin', `${originLat},${originLng}`);
  params.set('destination', `${destLat},${destLng}`);
  const wps = sampleWaypoints(coords);
  if (wps.length > 0) {
    params.set('waypoints', wps.map(([lng, lat]) => `${lat},${lng}`).join('|'));
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function buildLiveSummary(liveRoute, t) {
  if (!liveRoute) return null;

  const distance = formatDistance(liveRoute.distance_m);
  const duration = formatDuration(liveRoute.duration_s);
  const score = liveRoute.accessibility_score;
  const warnings = liveRoute.warnings ?? [];
  const breakdown = liveRoute.waytype_breakdown ?? {};
  const topWaytype = Object.entries(breakdown)
    .filter(([, v]) => v.pct >= 1)
    .sort(([, a], [, b]) => b.pct - a.pct)[0];

  let summary = `${t('liveRouteScorePrefix')} ${score}/100. ${distance}, ${duration}.`;
  if (topWaytype) {
    summary += ` ${topWaytype[1].pct}% ${t(`wt_${topWaytype[0]}`) || topWaytype[0]}.`;
  }
  if (warnings.length > 0) {
    summary += ` ${warnings.length} ${warnings.length === 1 ? t('warningSingular') : t('warningPlural')}.`;
  } else {
    summary += ` ${t('noIssuesFlagged')}.`;
  }
  return summary;
}

export default function RouteCard({ liveRoute }) {
  const { t } = useLanguage();
  const [whyOpen, setWhyOpen] = useState(false);
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  const stats = liveRoute
    ? {
        score: liveRoute.accessibility_score,
        time: formatDuration(liveRoute.duration_s),
        distance: formatDistance(liveRoute.distance_m),
        obstacles: liveRoute.warnings?.length ?? 0,
      }
    : {
        score: mockRoute.accessibilityScore,
        time: mockRoute.estimatedTime,
        distance: mockRoute.distance,
        obstacles: mockRoute.obstaclesAvoided,
      };

  const why = buildLiveSummary(liveRoute, t) ?? t('whyThisRouteText');

  const handleOpenInGoogleMaps = () => {
    const coords = liveRoute?.geometry?.coordinates;
    if (!coords || coords.length < 2) return;
    const url = buildGoogleMapsUrl(coords);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const scoreColor =
    stats.score >= 80 ? 'text-accessible'
    : stats.score >= 60 ? 'text-moderate'
    : 'text-difficult';

  const waytypes = liveRoute?.waytype_breakdown
    ? Object.entries(liveRoute.waytype_breakdown)
        .filter(([, v]) => v.pct >= 1)
        .sort(([, a], [, b]) => b.pct - a.pct)
        .slice(0, 3)
    : [];

  return (
    <div className="w-full">
      {/* Stats row — 2 cards (warnings are shown as dots on the map) */}
      <div className="flex items-stretch gap-2 mb-2">
        <div className="flex-1 bg-navy/5 rounded-xl px-3 py-2 flex flex-col gap-1 relative">
          <div className="flex items-center justify-between">
            <span className="font-body text-[10px] text-navy/45 uppercase tracking-wide font-semibold">
              {t('accessibilityStatLabel')}
            </span>
            {liveRoute && (
              <button
                type="button"
                onClick={() => setBreakdownOpen((v) => !v)}
                aria-expanded={breakdownOpen}
                aria-label={t('scoreBreakdownAria')}
                className="w-4 h-4 rounded-full bg-navy/8 hover:bg-navy/15 flex items-center justify-center transition-colors"
              >
                <InfoIcon />
              </button>
            )}
          </div>
          <div className="flex items-baseline gap-0.5">
            <span className={`font-display font-bold text-xl leading-none ${scoreColor}`}>
              {stats.score}
            </span>
            <span className="font-body text-[11px] text-navy/40 ml-0.5">
              {liveRoute ? '/100' : '%'}
            </span>
          </div>
        </div>

        <div className="flex-1 bg-navy/5 rounded-xl px-3 py-2 flex flex-col gap-1">
          <span className="font-body text-[10px] text-navy/45 uppercase tracking-wide font-semibold">
            {t('timeStatLabel')}
          </span>
          <span className="font-display font-bold text-xl leading-none text-navy">
            {stats.time}
          </span>
          <span className="font-body text-[10px] text-navy/40 leading-none">{stats.distance}</span>
        </div>
      </div>

      {/* Score breakdown — opens via ⓘ button */}
      <AnimatePresence>
        {breakdownOpen && liveRoute && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden mb-3"
          >
            <div className="px-4 py-3 rounded-2xl bg-navy/5 border border-navy/8">
              <p className="font-body text-xs text-navy/55 uppercase tracking-widest font-semibold mb-2">
                {t('scoreBreakdownTitle')}
              </p>
              <p className="font-body text-sm text-navy/80 leading-relaxed mb-3">
                {t('scoreBreakdownIntro').replace('{score}', String(stats.score))}
              </p>

              {waytypes.length > 0 && (
                <div className="mb-3">
                  <p className="font-body text-[11px] text-navy/45 uppercase tracking-wide font-semibold mb-1.5">
                    {t('scorePathTypeLabel')}
                  </p>
                  <div className="space-y-1">
                    {waytypes.map(([k, v]) => (
                      <div key={k} className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-navy/8 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accessible rounded-full"
                            style={{ width: `${v.pct}%` }}
                          />
                        </div>
                        <span className="font-body text-xs text-navy/70 font-medium tabular-nums w-10 text-right">
                          {v.pct}%
                        </span>
                        <span className="font-body text-xs text-navy/55 w-24 truncate">
                          {t(`wt_${k}`) || k}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {liveRoute.warnings?.length > 0 ? (
                <div>
                  <p className="font-body text-[11px] text-navy/45 uppercase tracking-wide font-semibold mb-1.5">
                    {t('scorePenaltiesLabel')}
                  </p>
                  <ul className="space-y-1">
                    {liveRoute.warnings.slice(0, 5).map((w, i) => (
                      <li key={i} className="flex items-start gap-2 font-body text-xs text-navy/70">
                        <span className="text-sm leading-none mt-0.5">{WARNING_ICON[w.type] ?? '•'}</span>
                        <span>{w.message}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="font-body text-xs text-navy/55 italic">{t('noIssuesFlagged')}.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Open in Google Maps — only when there's a real planned route */}
      {liveRoute && (
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleOpenInGoogleMaps}
          className="w-full h-11 rounded-xl bg-navy text-cream font-body font-semibold text-sm flex items-center justify-center gap-2 mb-2 shadow-card"
        >
          <GoogleMapsIcon />
          {t('openInGoogleMaps')}
          <ExternalIcon />
        </motion.button>
      )}

      {/* Why this route */}
      <button
        onClick={() => setWhyOpen(!whyOpen)}
        className="w-full flex items-center justify-between py-2.5 px-4 rounded-xl bg-navy/5 hover:bg-navy/8 transition-colors min-h-[40px]"
        aria-expanded={whyOpen}
      >
        <span className="font-body font-semibold text-sm text-navy">{t('whyThisRouteTitle')}</span>
        <motion.span
          animate={{ rotate: whyOpen ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="text-navy/40"
        >
          <ChevronIcon />
        </motion.span>
      </button>

      <AnimatePresence>
        {whyOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-2 pb-1 px-4">
              <p className="font-body text-sm text-navy/70 leading-relaxed">
                {why}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="w-3 h-3 text-navy/70" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="8" cy="5" r="0.9" fill="currentColor" />
      <path d="M8 7.5v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function GoogleMapsIcon() {
  // Stylised pin — deliberately not Google's real logo to stay clear of trademark misuse.
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4" aria-hidden="true">
      <path d="M10 2C7 2 4.5 4.4 4.5 7.4c0 4 5.5 10.6 5.5 10.6s5.5-6.6 5.5-10.6C15.5 4.4 13 2 10 2z"
            stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="10" cy="7.5" r="2" fill="currentColor" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-3.5 h-3.5 opacity-70" aria-hidden="true">
      <path d="M11 4h5v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 4l-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M14 11v4a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4" aria-hidden="true">
      <path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
