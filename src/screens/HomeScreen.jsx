import { useState } from 'react';
import { motion } from 'framer-motion';
import MobilityToggle from '../components/MobilityToggle';
import LanguageToggle from '../components/LanguageToggle';
import { useLanguage } from '../context/LanguageContext';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } },
};

const item = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

const topoLines = [
  'M-30,60 C50,45 130,75 220,58 S340,40 430,62',
  'M-30,115 C60,98 150,128 240,111 S360,93 430,117',
  'M-30,170 C40,155 140,183 230,166 S350,148 430,172',
  'M-30,225 C55,210 145,238 235,221 S355,203 430,227',
  'M-30,280 C45,265 135,293 225,276 S345,258 430,282',
  'M-30,335 C50,320 140,348 230,331 S350,313 430,337',
  'M-30,390 C60,375 150,403 240,386 S360,368 430,392',
  'M-30,445 C48,430 138,458 228,441 S348,423 430,447',
  'M-30,500 C55,485 145,513 235,496 S355,478 430,502',
  'M-30,555 C52,540 142,568 232,551 S352,533 430,557',
  'M-30,610 C58,595 148,623 238,606 S358,588 430,612',
  'M-30,665 C44,650 134,678 224,661 S344,643 430,667',
  'M-30,720 C62,705 152,733 242,716 S362,698 430,722',
];

export default function HomeScreen({ onNavigate }) {
  const { t } = useLanguage();
  const [from, setFrom] = useState('Dam Square, Amsterdam');
  const [to, setTo] = useState('Artis Royal Zoo');
  const [mobility, setMobility] = useState('rolstoel');
  const [avoidCyclePaths, setAvoidCyclePaths] = useState(false);

  return (
    <div className="relative w-full h-full bg-cream overflow-hidden flex flex-col">
      {/* Animated topographic background */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        animate={{ y: [0, -18, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      >
        <svg
          viewBox="0 0 390 780"
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="xMidYMid slice"
        >
          {topoLines.map((d, i) => (
            <path
              key={i}
              d={d}
              stroke="#0F1F3D"
              strokeOpacity={0.042 + (i % 3) * 0.008}
              strokeWidth="1.2"
              fill="none"
            />
          ))}
        </svg>
      </motion.div>

      {/* Content */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 flex flex-col h-full px-5 pt-14 pb-8 overflow-y-auto gap-5"
      >
        {/* Brand + language toggle */}
        <motion.div variants={item} className="flex items-center justify-between">
          <div className="flex items-baseline gap-2.5">
            <span className="font-display font-extrabold text-navy text-xl tracking-tight">
              {t('brand')}
            </span>
            <span className="font-body text-sm text-navy/40 font-medium">{t('brandCity')}</span>
          </div>
          <LanguageToggle />
        </motion.div>

        {/* Headline */}
        <motion.div variants={item}>
          <h1 className="font-display font-extrabold text-navy leading-[1.08] tracking-tight">
            <span className="text-[2.6rem]">{t('headline1')}</span>
            <br />
            <span className="text-[2.6rem]">{t('headline2')}</span>
          </h1>
          <p className="mt-3 font-body text-navy/55 text-base leading-relaxed max-w-[300px]">
            {t('subline')}
          </p>
        </motion.div>

        {/* From field */}
        <motion.div variants={item}>
          <label
            htmlFor="from-input"
            className="block font-body text-xs font-semibold text-navy/45 uppercase tracking-widest mb-2"
          >
            {t('fromLabel')}
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <PinIconStart />
            </span>
            <input
              id="from-input"
              type="text"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder={t('fromPlaceholder')}
              className="
                w-full h-14 pl-12 pr-4 rounded-2xl
                bg-white border-2 border-navy/8 focus:border-navy/60
                font-body text-navy text-base placeholder:text-navy/30
                outline-none transition-colors shadow-soft
              "
            />
          </div>
        </motion.div>

        {/* Route line connector */}
        <div className="flex items-center gap-4 -my-2 px-5" aria-hidden="true">
          <div className="w-[1.5px] h-5 bg-navy/12 ml-[9px]" />
        </div>

        {/* To field */}
        <motion.div variants={item}>
          <label
            htmlFor="to-input"
            className="block font-body text-xs font-semibold text-navy/45 uppercase tracking-widest mb-2"
          >
            {t('toLabel')}
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <PinIconEnd />
            </span>
            <input
              id="to-input"
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder={t('toPlaceholder')}
              className="
                w-full h-14 pl-12 pr-4 rounded-2xl
                bg-white border-2 border-navy/8 focus:border-navy/60
                font-body text-navy text-base placeholder:text-navy/30
                outline-none transition-colors shadow-soft
              "
            />
          </div>
        </motion.div>

        {/* Mobility type */}
        <motion.div variants={item}>
          <p className="font-body text-xs font-semibold text-navy/45 uppercase tracking-widest mb-3">
            {t('mobilityLabel')}
          </p>
          <MobilityToggle selected={mobility} onChange={setMobility} />
        </motion.div>

        {/* Avoid cycle paths toggle */}
        <motion.div variants={item}>
          <button
            onClick={() => setAvoidCyclePaths(!avoidCyclePaths)}
            aria-pressed={avoidCyclePaths}
            className={`
              w-full min-h-[56px] rounded-2xl border-2 flex items-center gap-3 px-4
              font-body text-base font-medium transition-all duration-200
              ${avoidCyclePaths
                ? 'bg-navy text-cream border-navy shadow-card'
                : 'bg-white text-navy border-navy/8 shadow-soft hover:border-navy/25'
              }
            `}
          >
            <div
              className={`
                w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0
                transition-all duration-200
                ${avoidCyclePaths ? 'bg-cream border-cream' : 'border-navy/30'}
              `}
            >
              {avoidCyclePaths && (
                <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3" aria-hidden="true">
                  <path d="M2 6l3 3 5-5" stroke="#0F1F3D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span>{t('avoidCyclePaths')}</span>
          </button>
        </motion.div>

        {/* CTA Button */}
        <motion.div variants={item} className="mt-1">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => onNavigate('map')}
            className="
              w-full h-16 rounded-2xl bg-navy text-cream
              font-display font-bold text-lg tracking-tight
              flex items-center justify-center gap-2.5
              shadow-card active:shadow-none transition-shadow
            "
          >
            <SearchIcon />
            {t('ctaButton')}
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
}

function PinIconStart() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" aria-hidden="true">
      <circle cx="10" cy="10" r="3" fill="#0F1F3D" opacity="0.4" />
      <circle cx="10" cy="10" r="6" stroke="#0F1F3D" strokeWidth="1.5" strokeOpacity="0.2" />
    </svg>
  );
}

function PinIconEnd() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" aria-hidden="true">
      <path d="M10 2C7.24 2 5 4.24 5 7c0 4.25 5 11 5 11s5-6.75 5-11c0-2.76-2.24-5-5-5z" fill="#2ECC71" opacity="0.85" />
      <circle cx="10" cy="7" r="1.5" fill="white" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" aria-hidden="true">
      <circle cx="9" cy="9" r="5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M13 13l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
