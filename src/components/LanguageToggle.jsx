import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';

/**
 * variant="light"  — cream-background screens (Home, Directions)
 * variant="map"    — sits inside the white legend card on the map
 */
export default function LanguageToggle({ variant = 'light' }) {
  const { lang, setLang } = useLanguage();

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={() => setLang(lang === 'en' ? 'nl' : 'en')}
      aria-label={lang === 'en' ? 'Switch to Dutch' : 'Schakel naar Engels'}
      className={`
        flex items-center h-8 px-3 rounded-full
        font-body text-xs font-bold tracking-wider
        transition-colors select-none
        ${variant === 'map'
          ? 'bg-white/10 text-white hover:bg-white/20'
          : 'bg-navy/8 text-navy border border-navy/10 hover:bg-navy/14'
        }
      `}
    >
      <span className={lang === 'en' ? 'opacity-100' : 'opacity-30'}>EN</span>
      <span className="mx-1.5 opacity-20 font-light">|</span>
      <span className={lang === 'nl' ? 'opacity-100' : 'opacity-30'}>NL</span>
    </motion.button>
  );
}
