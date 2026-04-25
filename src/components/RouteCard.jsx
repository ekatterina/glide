import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { mockRoute } from '../data/mockRoute';
import { useLanguage } from '../context/LanguageContext';

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

export default function RouteCard({ onViewSteps }) {
  const { t } = useLanguage();
  const [whyOpen, setWhyOpen] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const handleSpeak = () => {
    setSpeaking(true);
    speak(t('routeSummary'), t('speechLang'));
    setTimeout(() => setSpeaking(false), 6000);
  };

  const scoreColor =
    mockRoute.accessibilityScore >= 80
      ? 'text-accessible'
      : mockRoute.accessibilityScore >= 60
      ? 'text-moderate'
      : 'text-difficult';

  return (
    <div className="w-full">
      {/* Stats row */}
      <div className="flex items-stretch gap-3 mb-4">
        <div className="flex-1 bg-navy/5 rounded-2xl px-4 py-3 flex flex-col gap-0.5">
          <span className="font-body text-xs text-navy/50 font-medium">
            {t('accessibilityStatLabel')}
          </span>
          <span className={`font-display font-bold text-2xl ${scoreColor}`}>
            {mockRoute.accessibilityScore}%
          </span>
          <span className="font-body text-xs text-navy/50">
            {t('accessibilityStatSuffix').replace('%', '').trim()}
          </span>
        </div>

        <div className="flex-1 bg-navy/5 rounded-2xl px-4 py-3 flex flex-col gap-0.5">
          <span className="font-body text-xs text-navy/50 font-medium">
            {t('timeStatLabel')}
          </span>
          <span className="font-display font-bold text-2xl text-navy">
            {mockRoute.estimatedTime}
          </span>
          <span className="font-body text-xs text-navy/50">{mockRoute.distance}</span>
        </div>

        <div className="flex-1 bg-navy/5 rounded-2xl px-4 py-3 flex flex-col gap-0.5">
          <span className="font-body text-xs text-navy/50 font-medium">
            {t('obstacleStatLabel')}
          </span>
          <span className="font-display font-bold text-2xl text-navy">
            {mockRoute.obstaclesAvoided}
          </span>
          <span className="font-body text-xs text-navy/50">{t('obstacleStatSuffix')}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2.5 mb-3">
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleSpeak}
          className={`
            flex-1 h-12 rounded-xl flex items-center justify-center gap-2
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

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onViewSteps}
          className="flex-1 h-12 rounded-xl bg-navy text-cream font-body font-semibold text-sm flex items-center justify-center gap-2 shadow-card"
        >
          <ListIcon />
          {t('viewSteps')}
        </motion.button>
      </div>

      {/* Why this route — expandable */}
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
                {t('whyThisRouteText')}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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

function ListIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4" aria-hidden="true">
      <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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
