import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LanguageProvider } from './context/LanguageContext';
import HomeScreen from './screens/HomeScreen';
import MapScreen from './screens/MapScreen';
import DirectionsScreen from './screens/DirectionsScreen';

const SCREEN_ORDER = ['home', 'map', 'directions'];

const slideVariants = {
  enter: (dir) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir < 0 ? '100%' : '-100%', opacity: 0 }),
};

const slideTransition = { duration: 0.38, ease: [0.4, 0, 0.2, 1] };

export default function App() {
  const [screen, setScreen] = useState('home');
  const [direction, setDirection] = useState(1);

  const navigateTo = (target) => {
    const fromIdx = SCREEN_ORDER.indexOf(screen);
    const toIdx = SCREEN_ORDER.indexOf(target);
    setDirection(toIdx > fromIdx ? 1 : -1);
    setScreen(target);
  };

  const screens = {
    home: <HomeScreen onNavigate={navigateTo} />,
    map: <MapScreen onNavigate={navigateTo} />,
    directions: <DirectionsScreen onNavigate={navigateTo} />,
  };

  return (
    <LanguageProvider>
      <div className="min-h-screen bg-navy flex items-center justify-center">
        <div className="hidden sm:block absolute inset-0 bg-navy" aria-hidden="true" />
        <div className="relative w-full max-w-[390px] h-screen overflow-hidden bg-cream shadow-[0_0_80px_rgba(0,0,0,0.4)]">
          <AnimatePresence custom={direction} mode="wait">
            <motion.div
              key={screen}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={slideTransition}
              className="absolute inset-0"
            >
              {screens[screen]}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </LanguageProvider>
  );
}
