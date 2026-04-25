import { useState } from 'react';
import { motion } from 'framer-motion';
import DirectionStep from '../components/DirectionStep';
import LanguageToggle from '../components/LanguageToggle';
import { useLanguage } from '../context/LanguageContext';
import { mockRoute } from '../data/mockRoute';

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

const progressColors = {
  good: 'bg-accessible',
  moderate: 'bg-moderate',
  difficult: 'bg-difficult',
};

export default function DirectionsScreen({ onNavigate }) {
  const { t } = useLanguage();
  const [activeStep, setActiveStep] = useState(0);
  const [navigating, setNavigating] = useState(false);

  const currentStep = mockRoute.steps[activeStep];
  const currentNote = t(`step_${currentStep.id}_note`);

  const handleStartNavigation = () => {
    setNavigating(true);
    const text = `${t('navStartPrefix')} ${currentStep.street}. ${currentNote}. ${t('distanceLabel')} ${currentStep.distance}.`;
    speak(text, t('speechLang'));
  };

  const handleNextStep = () => {
    if (activeStep < mockRoute.steps.length - 1) {
      const next = activeStep + 1;
      setActiveStep(next);
      if (navigating) {
        const step = mockRoute.steps[next];
        speak(`${step.street}. ${t(`step_${step.id}_note`)}`, t('speechLang'));
      }
    }
  };

  return (
    <div className="relative w-full h-full bg-cream flex flex-col overflow-hidden">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex-shrink-0 bg-cream/95 backdrop-blur-sm px-5 pt-12 pb-4 border-b border-navy/6"
      >
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => onNavigate('map')}
            className="w-11 h-11 rounded-full bg-navy/7 flex items-center justify-center flex-shrink-0 hover:bg-navy/12 transition-colors"
            aria-label={t('backToMap')}
          >
            <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" aria-hidden="true">
              <path d="M12 4L6 10l6 6" stroke="#0F1F3D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="font-display font-bold text-navy text-xl leading-tight truncate">
              {t('stepByStep')}
            </h1>
            <p className="font-body text-sm text-navy/50 mt-0.5 truncate">
              {t('routeFromTo')}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <div className="text-right">
              <span className="font-display font-bold text-navy text-lg block">
                {mockRoute.estimatedTime}
              </span>
              <span className="font-body text-xs text-navy/45">{mockRoute.distance}</span>
            </div>
            <LanguageToggle />
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-navy/8 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${((activeStep + 1) / mockRoute.steps.length) * 100}%` }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              className="h-full bg-accessible rounded-full"
            />
          </div>
          <span className="font-body text-xs text-navy/50 font-medium flex-shrink-0">
            {activeStep + 1}/{mockRoute.steps.length}
          </span>
        </div>
      </motion.div>

      {/* Active step highlight */}
      <motion.div
        key={activeStep}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex-shrink-0 bg-navy mx-5 mt-4 rounded-2xl px-4 py-3.5 flex items-center gap-4"
      >
        <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
          <CurrentStepArrow direction={currentStep.direction} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-cream text-base leading-tight truncate">
            {currentStep.street}
          </p>
          <p className="font-body text-cream/65 text-sm mt-0.5 leading-snug line-clamp-1">
            {currentNote}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="font-body text-cream/50 text-xs">{currentStep.distance}</span>
          <div
            className={`w-2.5 h-2.5 rounded-full ${progressColors[currentStep.accessibility]}`}
            aria-label={t(`${currentStep.accessibility === 'good' ? 'good' : currentStep.accessibility === 'moderate' ? 'moderate' : 'difficult'}AccLabel`)}
          />
        </div>
      </motion.div>

      {/* Steps list */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-2.5">
        {mockRoute.steps.map((step, index) => (
          <DirectionStep
            key={step.id}
            step={step}
            note={t(`step_${step.id}_note`)}
            index={index}
            isActive={index === activeStep}
            onClick={() => setActiveStep(index)}
          />
        ))}
      </div>

      {/* Bottom action bar */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className="flex-shrink-0 px-5 pt-3 pb-8 bg-cream border-t border-navy/6 flex gap-3"
      >
        {activeStep < mockRoute.steps.length - 1 && navigating && (
          <button
            onClick={handleNextStep}
            className="h-14 px-5 rounded-2xl bg-navy/8 text-navy font-body font-semibold text-base flex items-center justify-center flex-shrink-0 hover:bg-navy/12 transition-colors"
            aria-label={t('nextStepAriaLabel')}
          >
            <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" aria-hidden="true">
              <path d="M8 4l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={navigating ? handleNextStep : handleStartNavigation}
          className={`
            flex-1 h-14 rounded-2xl font-display font-bold text-base
            flex items-center justify-center gap-2.5 transition-all shadow-card
            ${navigating ? 'bg-accessible text-white' : 'bg-navy text-cream'}
          `}
        >
          {navigating ? (
            <>
              <NavigatingIcon />
              {activeStep < mockRoute.steps.length - 1 ? t('nextInstruction') : t('arrived')}
            </>
          ) : (
            <>
              <PlayIcon />
              {t('startNavigation')}
            </>
          )}
        </motion.button>
      </motion.div>
    </div>
  );
}

function CurrentStepArrow({ direction }) {
  if (direction === 'left') {
    return (
      <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5 text-cream" aria-hidden="true">
        <path d="M10 4L4 10l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (direction === 'right') {
    return (
      <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5 text-cream" aria-hidden="true">
        <path d="M10 4l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 10H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (direction === 'arrive') {
    return (
      <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5 text-cream" aria-hidden="true">
        <path d="M10 2C7.24 2 5 4.24 5 7c0 4.25 5 11 5 11s5-6.75 5-11c0-2.76-2.24-5-5-5z" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="10" cy="7" r="1.5" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5 text-cream" aria-hidden="true">
      <path d="M10 16V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 8l4-4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" aria-hidden="true">
      <path d="M5 3.5l14 6.5-14 6.5V3.5z" fill="currentColor" />
    </svg>
  );
}

function NavigatingIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" aria-hidden="true">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 6v4l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
