import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { mockRoute } from '../data/mockRoute';
import { useLanguage } from '../context/LanguageContext';
import { formatDistance, formatDuration } from '../lib/api';

function speak(text, lang) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.88;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }
}

const WARNING_ICON = {
  cobblestone: '🪨',
  smoothness: '〰️',
  incline: '⛰️',
  wheelchair_limited: '⛔',
  edge_case: '⚠️',
};

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
  const [speaking, setSpeaking] = useState(false);

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

  const summary = buildLiveSummary(liveRoute, t) ?? t('routeSummary');
  const why = buildLiveSummary(liveRoute, t) ?? t('whyThisRouteText');

  const handleSpeak = () => {
    setSpeaking(true);
    speak(summary, t('speechLang'));
    setTimeout(() => setSpeaking(false), 6000);
  };

  const scoreColor =
    stats.score >= 80 ? 'text-accessible'
    : stats.score >= 60 ? 'text-moderate'
    : 'text-difficult';

  // Top 3 waytype slices for the breakdown panel.
  const waytypes = liveRoute?.waytype_breakdown
    ? Object.entries(liveRoute.waytype_breakdown)
        .filter(([, v]) => v.pct >= 1)
        .sort(([, a], [, b]) => b.pct - a.pct)
        .slice(0, 3)
    : [];

  return (
    <div className="w-full">
      {/* Stats row */}
      <div className="flex items-stretch gap-3 mb-3">
        <div className="flex-1 bg-navy/5 rounded-2xl px-4 py-3 flex flex-col gap-0.5 relative">
          <div className="flex items-center justify-between">
            <span className="font-body text-xs text-navy/50 font-medium">
              {t('accessibilityStatLabel')}
            </span>
            {liveRoute && (
              <button
                type="button"
                onClick={() => setBreakdownOpen((v) => !v)}
                aria-expanded={breakdownOpen}
                aria-label={t('scoreBreakdownAria')}
                className="w-5 h-5 rounded-full bg-navy/8 hover:bg-navy/15 flex items-center justify-center transition-colors -mr-1"
              >
                <InfoIcon />
              </button>
            )}
          </div>
          <span className={`font-display font-bold text-2xl ${scoreColor}`}>
            {stats.score}{liveRoute ? '' : '%'}
          </span>
          <span className="font-body text-xs text-navy/50">
            {liveRoute ? t('accessibilityStatLiveSuffix') : t('accessibilityStatSuffix').replace('%', '').trim()}
          </span>
        </div>

        <div className="flex-1 bg-navy/5 rounded-2xl px-4 py-3 flex flex-col gap-0.5">
          <span className="font-body text-xs text-navy/50 font-medium">
            {t('timeStatLabel')}
          </span>
          <span className="font-display font-bold text-2xl text-navy">
            {stats.time}
          </span>
          <span className="font-body text-xs text-navy/50">{stats.distance}</span>
        </div>

        <div className="flex-1 bg-navy/5 rounded-2xl px-4 py-3 flex flex-col gap-0.5">
          <span className="font-body text-xs text-navy/50 font-medium">
            {liveRoute ? t('warningStatLabel') : t('obstacleStatLabel')}
          </span>
          <span className="font-display font-bold text-2xl text-navy">
            {stats.obstacles}
          </span>
          <span className="font-body text-xs text-navy/50">
            {liveRoute ? t('warningStatSuffix') : t('obstacleStatSuffix')}
          </span>
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

      {/* Hear-route */}
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={handleSpeak}
        className={`
          w-full h-12 rounded-xl flex items-center justify-center gap-2 mb-3
          font-body font-semibold text-sm border-2 transition-all duration-200
          ${speaking
            ? 'bg-navy text-cream border-navy'
            : 'bg-transparent text-navy border-navy/20 hover:border-navy/50'
          }
        `}
        aria-label={t('hearRoute')}
      >
        <MicIcon speaking={speaking} />
        {t('hearRoute')}
      </motion.button>

      {/* Why this route */}
      <button
        onClick={() => setWhyOpen(!whyOpen)}
        className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-navy/5 hover:bg-navy/8 transition-colors min-h-[48px]"
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

function MicIcon({ speaking }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4" aria-hidden="true">
      <rect
        x="7" y="2" width="6" height="9" rx="3"
        stroke="currentColor" strokeWidth="1.5"
        className={speaking ? 'animate-pulse' : ''}
      />
      <path d="M4 10a6 6 0 0012 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10 16v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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
