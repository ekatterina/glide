import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';

const optionDefs = [
  {
    id: 'rolstoel',
    labelKey: 'mobilityWheelchair',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden="true">
        <circle cx="12" cy="4.5" r="1.5" fill="currentColor" />
        <path d="M10 8h4l1.5 5H9.5L10 8z" fill="currentColor" stroke="currentColor" strokeWidth="0.5" strokeLinejoin="round" />
        <path d="M9.5 13H7l-1 3h9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="10" cy="19" r="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <circle cx="16" cy="19" r="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
      </svg>
    ),
  },
  {
    id: 'scootmobiel',
    labelKey: 'mobilityScooter',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden="true">
        <path d="M4 16h14l2-6H9L7 7H4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="7" cy="19" r="2" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="17" cy="19" r="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M13 10v-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'loopframe',
    labelKey: 'mobilityWalker',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden="true">
        <circle cx="12" cy="4" r="1.5" fill="currentColor" />
        <path d="M12 6v5l-2 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 11l2 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M8 9h3M13 9h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M10 15l-1 4M14 15l1 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function MobilityToggle({ selected, onChange }) {
  const { t } = useLanguage();

  return (
    <div className="flex gap-2.5 w-full" role="group" aria-label={t('mobilityLabel')}>
      {optionDefs.map((opt) => {
        const isSelected = selected === opt.id;
        return (
          <motion.button
            key={opt.id}
            whileTap={{ scale: 0.94 }}
            onClick={() => onChange(opt.id)}
            aria-pressed={isSelected}
            className={`
              flex-1 flex flex-col items-center justify-center gap-1.5
              py-3.5 rounded-2xl border-2 transition-all duration-200
              min-h-[72px] font-body font-semibold text-xs tracking-wide
              ${isSelected
                ? 'bg-navy text-cream border-navy shadow-card'
                : 'bg-white text-navy/70 border-navy/10 hover:border-navy/30 hover:text-navy'
              }
            `}
          >
            <span className={isSelected ? 'text-cream' : 'text-navy/60'}>{opt.icon}</span>
            {t(opt.labelKey)}
          </motion.button>
        );
      })}
    </div>
  );
}
