import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';

const DEMO_PHOTO = (
  <svg viewBox="0 0 300 220" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <rect width="300" height="220" fill="#7A8A94"/>
    <rect y="130" width="300" height="90" fill="#9A9080"/>
    <rect y="124" width="300" height="12" fill="#B8AE98"/>
    {/* Pavement grid lines */}
    <line x1="0" y1="155" x2="300" y2="155" stroke="#8A8070" strokeWidth="1" opacity="0.6"/>
    <line x1="0" y1="180" x2="300" y2="180" stroke="#8A8070" strokeWidth="1" opacity="0.6"/>
    <line x1="80" y1="130" x2="80" y2="220" stroke="#8A8070" strokeWidth="1" opacity="0.5"/>
    <line x1="160" y1="130" x2="160" y2="220" stroke="#8A8070" strokeWidth="1" opacity="0.5"/>
    <line x1="240" y1="130" x2="240" y2="220" stroke="#8A8070" strokeWidth="1" opacity="0.5"/>
    {/* Orange traffic cone */}
    <polygon points="148,68 133,124 163,124" fill="#FF6B4A"/>
    <rect x="130" y="124" width="40" height="7" rx="2" fill="#D95A32"/>
    <line x1="137" y1="86" x2="159" y2="86" stroke="white" strokeWidth="3" opacity="0.9"/>
    <line x1="134" y1="100" x2="162" y2="100" stroke="white" strokeWidth="3" opacity="0.9"/>
    <line x1="131" y1="114" x2="165" y2="114" stroke="white" strokeWidth="3" opacity="0.9"/>
    {/* Blocked kerb area */}
    <rect x="60" y="124" width="80" height="6" rx="1" fill="#C8392B" opacity="0.8"/>
    <rect x="60" y="127" width="80" height="3" fill="#E74C3C" opacity="0.6"/>
    {/* Buildings background */}
    <rect x="0" y="20" width="80" height="110" fill="#6A7880"/>
    <rect x="90" y="40" width="60" height="90" fill="#728090"/>
    <rect x="200" y="10" width="100" height="120" fill="#687078"/>
    {/* Windows */}
    <rect x="10" y="35" width="16" height="12" rx="1" fill="#9ABACC" opacity="0.7"/>
    <rect x="32" y="35" width="16" height="12" rx="1" fill="#9ABACC" opacity="0.7"/>
    <rect x="10" y="55" width="16" height="12" rx="1" fill="#9ABACC" opacity="0.5"/>
    <rect x="32" y="55" width="16" height="12" rx="1" fill="#9ABACC" opacity="0.7"/>
    {/* Dark overlay at bottom */}
    <rect y="190" width="300" height="30" fill="rgba(0,0,0,0.45)"/>
    <text x="10" y="210" fontFamily="sans-serif" fontSize="10" fill="white" opacity="0.85">Waterlooplein — kerb cut blocked by temporary signage</text>
  </svg>
);

export default function ReportScreen({ onNavigate }) {
  const { t } = useLanguage();
  const [step, setStep] = useState('camera');
  const [usedDemo, setUsedDemo] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const fileRef = useRef(null);

  const startAnalysis = () => {
    setStep('analyzing');
    setTimeout(() => setStep('result'), 2400);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(URL.createObjectURL(file));
    startAnalysis();
  };

  const handleTakePhoto = () => {
    fileRef.current?.click();
  };

  const handleDemo = () => {
    setUsedDemo(true);
    startAnalysis();
  };

  const handleConfirm = () => setStep('success');

  useEffect(() => {
    if (step === 'success') {
      const t = setTimeout(() => onNavigate('map'), 3200);
      return () => clearTimeout(t);
    }
  }, [step, onNavigate]);

  return (
    <div className="relative w-full h-full bg-[#0A1628] overflow-hidden">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      <AnimatePresence mode="wait">
        {step === 'camera' && (
          <CameraStep
            key="camera"
            onTakePhoto={handleTakePhoto}
            onDemo={handleDemo}
            onBack={() => onNavigate('map')}
            t={t}
          />
        )}
        {step === 'analyzing' && (
          <AnalyzingStep key="analyzing" photoFile={photoFile} usedDemo={usedDemo} t={t} />
        )}
        {step === 'result' && (
          <ResultStep
            key="result"
            photoFile={photoFile}
            usedDemo={usedDemo}
            onConfirm={handleConfirm}
            onCancel={() => onNavigate('map')}
            t={t}
          />
        )}
        {step === 'success' && (
          <SuccessStep key="success" t={t} />
        )}
      </AnimatePresence>
    </div>
  );
}

function CameraStep({ onTakePhoto, onDemo, onBack, t }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex items-center px-4 pt-14 pb-3 flex-shrink-0">
        <button
          onClick={onBack}
          className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0"
          aria-label="Back to map"
        >
          <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" aria-hidden="true">
            <path d="M12 4L6 10l6 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="font-display font-bold text-cream text-lg ml-4">{t('reportTitle')}</h1>
      </div>

      {/* Viewfinder */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="relative w-full" style={{ aspectRatio: '4/3' }}>
          {/* Dimmed surround */}
          <div className="absolute inset-0 rounded-2xl" style={{ background: 'rgba(0,0,0,0.25)' }} />
          {/* Frame border */}
          <div className="absolute inset-0 rounded-2xl border border-white/20" />
          {/* Corner brackets */}
          <div className="absolute top-3 left-3 w-7 h-7 border-t-2 border-l-2 border-cream rounded-tl-lg" />
          <div className="absolute top-3 right-3 w-7 h-7 border-t-2 border-r-2 border-cream rounded-tr-lg" />
          <div className="absolute bottom-3 left-3 w-7 h-7 border-b-2 border-l-2 border-cream rounded-bl-lg" />
          <div className="absolute bottom-3 right-3 w-7 h-7 border-b-2 border-r-2 border-cream rounded-br-lg" />
          {/* Centre hint */}
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="font-body text-cream/40 text-sm text-center px-8">{t('reportPrompt')}</p>
          </div>
          {/* Scan line animation */}
          <motion.div
            className="absolute left-3 right-3 h-[1.5px] rounded-full"
            style={{ background: 'linear-gradient(90deg, transparent, #2ECC71, transparent)' }}
            animate={{ top: ['12px', 'calc(100% - 12px)', '12px'] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      </div>

      {/* Bottom controls */}
      <div className="flex-shrink-0 pb-12 flex flex-col items-center gap-4">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onTakePhoto}
          className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-[0_4px_24px_rgba(0,0,0,0.5)]"
          aria-label={t('reportCaptureBtn')}
        >
          <div className="w-[68px] h-[68px] rounded-full border-[3px] border-[#0A1628] flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8" aria-hidden="true">
              <rect x="2" y="7" width="20" height="14" rx="3" stroke="#0A1628" strokeWidth="2"/>
              <circle cx="12" cy="13.5" r="3.5" stroke="#0A1628" strokeWidth="2"/>
              <path d="M8 7l1.5-2.5h5L16 7" stroke="#0A1628" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </motion.button>
        <span className="font-body text-cream/70 text-sm font-medium">{t('reportCaptureBtn')}</span>
        <button
          onClick={onDemo}
          className="font-body text-cream/35 text-xs underline underline-offset-2"
        >
          {t('reportDemoBtn')}
        </button>
      </div>
    </motion.div>
  );
}

function AnalyzingStep({ photoFile, usedDemo, t }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col h-full items-center justify-center px-8 gap-8"
    >
      {/* Photo preview (blurred) */}
      <div className="w-48 h-36 rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.6)] relative">
        <div className="w-full h-full blur-sm scale-105">
          {photoFile ? (
            <img src={photoFile} className="w-full h-full object-cover" alt="" />
          ) : (
            usedDemo ? DEMO_PHOTO : <div className="w-full h-full bg-navy/40" />
          )}
        </div>
        <div className="absolute inset-0 bg-navy/30 flex items-center justify-center">
          <svg className="animate-spin w-10 h-10 text-cream/60" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="14 44" />
          </svg>
        </div>
      </div>

      {/* Text */}
      <div className="text-center">
        <p className="font-display font-bold text-cream text-xl mb-2">{t('reportAnalyzing')}</p>
        <ProgressDots />
      </div>

      {/* Animated progress bar */}
      <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-accessible rounded-full"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 2.2, ease: 'easeInOut' }}
        />
      </div>
    </motion.div>
  );
}

function ResultStep({ photoFile, usedDemo, onConfirm, onCancel, t }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col h-full px-5 pt-14 pb-8"
    >
      <h1 className="font-display font-bold text-cream text-xl mb-5">{t('reportVerdictLabel')}</h1>

      {/* Photo thumbnail */}
      <div className="w-full rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)] mb-5" style={{ aspectRatio: '16/9' }}>
        {photoFile ? (
          <img src={photoFile} className="w-full h-full object-cover" alt="Captured obstruction" />
        ) : (
          usedDemo ? DEMO_PHOTO : <div className="w-full h-full bg-navy/60" />
        )}
      </div>

      {/* Verdict card */}
      <div className="bg-white/8 rounded-2xl p-4 border border-white/12 mb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FF6B4A]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" aria-hidden="true">
              <path d="M10 3L18 17H2L10 3Z" fill="#FF6B4A"/>
              <path d="M10 8v4" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
              <circle cx="10" cy="14" r="0.9" fill="white"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-cream text-base leading-tight mb-1">
              {t('reportVerdictTitle')}
            </p>
            <span className="inline-block bg-accessible/20 text-accessible font-body text-xs font-bold px-2.5 py-1 rounded-full">
              {t('reportConfidenceLabel')}
            </span>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {[
            { label: 'Type', value: 'Kerb cut' },
            { label: 'Severity', value: 'High' },
            { label: 'Location', value: 'Verified' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/6 rounded-xl py-2">
              <p className="font-body text-cream/45 text-[10px] uppercase tracking-wide">{label}</p>
              <p className="font-body text-cream text-xs font-semibold mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1" />

      {/* Actions */}
      <div className="flex gap-3">
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onCancel}
          className="flex-1 h-14 rounded-2xl border-2 border-white/20 text-cream font-body font-semibold text-base flex items-center justify-center"
        >
          {t('reportCancel')}
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onConfirm}
          className="flex-[2] h-14 rounded-2xl bg-navy text-cream font-display font-bold text-base flex items-center justify-center gap-2 shadow-card border border-white/10"
        >
          <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4" aria-hidden="true">
            <path d="M4 10l4 4 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {t('reportConfirm')}
        </motion.button>
      </div>
    </motion.div>
  );
}

function SuccessStep({ t }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col h-full items-center justify-center px-8 gap-6"
    >
      {/* Animated checkmark circle */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, duration: 0.5, type: 'spring', stiffness: 200, damping: 18 }}
        className="w-24 h-24 rounded-full bg-accessible/15 border-2 border-accessible flex items-center justify-center"
      >
        <svg viewBox="0 0 48 48" fill="none" className="w-12 h-12" aria-hidden="true">
          <motion.path
            d="M12 24l8 8 16-16"
            stroke="#2ECC71"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.35, duration: 0.55, ease: 'easeOut' }}
          />
        </svg>
      </motion.div>

      {/* Ripple rings */}
      {[0, 1].map((i) => (
        <motion.div
          key={i}
          className="absolute w-24 h-24 rounded-full border border-accessible"
          initial={{ scale: 1, opacity: 0.5 }}
          animate={{ scale: 2.8, opacity: 0 }}
          transition={{ delay: 0.5 + i * 0.35, duration: 1.2, repeat: Infinity, repeatDelay: 0.7 }}
        />
      ))}

      <div className="text-center">
        <p className="font-display font-bold text-cream text-2xl mb-2">{t('reportSuccessTitle')}</p>
        <p className="font-body text-cream/60 text-base leading-relaxed">{t('reportSuccessText')}</p>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="flex items-center gap-2 bg-white/6 rounded-full px-4 py-2 border border-white/10"
      >
        <div className="w-1.5 h-1.5 rounded-full bg-accessible" />
        <span className="font-body text-cream/50 text-xs">Returning to map…</span>
      </motion.div>
    </motion.div>
  );
}

function ProgressDots() {
  return (
    <div className="flex items-center justify-center gap-1.5 mt-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-cream/40"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}
