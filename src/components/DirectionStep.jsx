import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';

const dotColors = {
  good: 'bg-accessible',
  moderate: 'bg-moderate',
  difficult: 'bg-difficult',
};

const dotRing = {
  good: 'ring-accessible/25',
  moderate: 'ring-moderate/25',
  difficult: 'ring-difficult/25',
};

const accLabelKey = {
  good: 'goodAccLabel',
  moderate: 'moderateAccLabel',
  difficult: 'difficultAccLabel',
};

export default function DirectionStep({ step, note, isActive, onClick, index }) {
  const { t } = useLanguage();

  return (
    <motion.button
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.07, duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      onClick={onClick}
      aria-current={isActive ? 'step' : undefined}
      className={`
        w-full text-left flex items-start gap-4 p-4 rounded-2xl
        min-h-[80px] transition-all duration-200 cursor-pointer
        ${isActive
          ? 'bg-navy text-cream shadow-card'
          : 'bg-white text-navy hover:bg-navy/4 shadow-soft'
        }
      `}
    >
      {/* Direction icon */}
      <div
        className={`
          flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center mt-0.5
          ${isActive ? 'bg-white/15' : 'bg-navy/6'}
        `}
      >
        <DirectionIcon
          direction={step.direction}
          className={`w-5 h-5 ${isActive ? 'text-cream' : 'text-navy'}`}
        />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <span className={`font-display font-bold text-base leading-tight ${isActive ? 'text-cream' : 'text-navy'}`}>
            {step.street}
          </span>
          <span className={`font-body text-xs flex-shrink-0 mt-0.5 ${isActive ? 'text-cream/60' : 'text-navy/40'}`}>
            {step.distance}
          </span>
        </div>
        <p className={`font-body text-sm mt-1 leading-snug ${isActive ? 'text-cream/75' : 'text-navy/55'}`}>
          {note}
        </p>
      </div>

      {/* Accessibility dot */}
      <div
        className={`flex-shrink-0 mt-1 w-3 h-3 rounded-full ring-4 ${dotColors[step.accessibility]} ${dotRing[step.accessibility]}`}
        aria-label={t(accLabelKey[step.accessibility])}
      />
    </motion.button>
  );
}

function DirectionIcon({ direction, className }) {
  if (direction === 'left') {
    return (
      <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
        <path d="M10 4L4 10l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (direction === 'right') {
    return (
      <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
        <path d="M10 4l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 10H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (direction === 'arrive') {
    return (
      <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
        <path d="M10 2C7.24 2 5 4.24 5 7c0 4.25 5 11 5 11s5-6.75 5-11c0-2.76-2.24-5-5-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx="10" cy="7" r="1.5" fill="currentColor" />
      </svg>
    );
  }
  // straight (default)
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M10 16V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 8l4-4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
