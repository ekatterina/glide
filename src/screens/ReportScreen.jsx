import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { classifyPhoto, saveReport, fileToBase64, getLocation, ApiError } from '../lib/api';

const DEMO_PHOTO = (
  <svg viewBox="0 0 300 220" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <rect width="300" height="220" fill="#7A8A94"/>
    <rect y="130" width="300" height="90" fill="#9A9080"/>
    <rect y="124" width="300" height="12" fill="#B8AE98"/>
    <line x1="0" y1="155" x2="300" y2="155" stroke="#8A8070" strokeWidth="1" opacity="0.6"/>
    <line x1="0" y1="180" x2="300" y2="180" stroke="#8A8070" strokeWidth="1" opacity="0.6"/>
    <line x1="80" y1="130" x2="80" y2="220" stroke="#8A8070" strokeWidth="1" opacity="0.5"/>
    <line x1="160" y1="130" x2="160" y2="220" stroke="#8A8070" strokeWidth="1" opacity="0.5"/>
    <line x1="240" y1="130" x2="240" y2="220" stroke="#8A8070" strokeWidth="1" opacity="0.5"/>
    <polygon points="148,68 133,124 163,124" fill="#FF6B4A"/>
    <rect x="130" y="124" width="40" height="7" rx="2" fill="#D95A32"/>
    <line x1="137" y1="86" x2="159" y2="86" stroke="white" strokeWidth="3" opacity="0.9"/>
    <line x1="134" y1="100" x2="162" y2="100" stroke="white" strokeWidth="3" opacity="0.9"/>
    <line x1="131" y1="114" x2="165" y2="114" stroke="white" strokeWidth="3" opacity="0.9"/>
    <rect x="60" y="124" width="80" height="6" rx="1" fill="#C8392B" opacity="0.8"/>
    <rect x="60" y="127" width="80" height="3" fill="#E74C3C" opacity="0.6"/>
    <rect x="0" y="20" width="80" height="110" fill="#6A7880"/>
    <rect x="90" y="40" width="60" height="90" fill="#728090"/>
    <rect x="200" y="10" width="100" height="120" fill="#687078"/>
    <rect x="10" y="35" width="16" height="12" rx="1" fill="#9ABACC" opacity="0.7"/>
    <rect x="32" y="35" width="16" height="12" rx="1" fill="#9ABACC" opacity="0.7"/>
    <rect x="10" y="55" width="16" height="12" rx="1" fill="#9ABACC" opacity="0.5"/>
    <rect x="32" y="55" width="16" height="12" rx="1" fill="#9ABACC" opacity="0.7"/>
    <rect y="190" width="300" height="30" fill="rgba(0,0,0,0.45)"/>
    <text x="10" y="210" fontFamily="sans-serif" fontSize="10" fill="white" opacity="0.85">Demo image — Claude classifies a real photo from the API</text>
  </svg>
);

export default function ReportScreen({ onNavigate }) {
  const { t } = useLanguage();
  const [step, setStep] = useState('camera');
  const [usedDemo, setUsedDemo] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [classification, setClassification] = useState(null);
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  // Try to grab location early, in the background, so it's ready by confirm time.
  useEffect(() => {
    getLocation().then(setLocation);
  }, []);

  const startAnalysis = async ({ demo = false, file = null } = {}) => {
    setStep('analyzing');
    setError(null);
    setClassification(null);
    try {
      let result;
      if (demo) {
        result = await classifyPhoto({ demo: true });
      } else {
        const { base64, mediaType } = await fileToBase64(file);
        result = await classifyPhoto({ base64, mediaType });
      }
      setClassification(result);
      setStep('result');
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Unknown error',
      );
      setStep('error');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(URL.createObjectURL(file));
    setUsedDemo(false);
    startAnalysis({ file });
  };

  const handleTakePhoto = () => {
    fileRef.current?.click();
  };

  const handleDemo = () => {
    setUsedDemo(true);
    setPhotoFile(null);
    startAnalysis({ demo: true });
  };

  const handleConfirm = async () => {
    if (!classification) return;
    setSaving(true);
    setError(null);
    try {
      const loc = location ?? (await getLocation());
      await saveReport({
        classification,
        lat: loc.lat,
        lng: loc.lng,
      });
      setStep('success');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save report.');
      setSaving(false);
    }
  };

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
        {step === 'result' && classification && (
          <ResultStep
            key="result"
            photoFile={photoFile}
            usedDemo={usedDemo}
            classification={classification}
            location={location}
            saving={saving}
            error={error}
            onConfirm={handleConfirm}
            onCancel={() => onNavigate('map')}
            t={t}
          />
        )}
        {step === 'error' && (
          <ErrorStep
            key="error"
            error={error}
            onRetry={() => setStep('camera')}
            onBack={() => onNavigate('map')}
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

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="relative w-full" style={{ aspectRatio: '4/3' }}>
          <div className="absolute inset-0 rounded-2xl" style={{ background: 'rgba(0,0,0,0.25)' }} />
          <div className="absolute inset-0 rounded-2xl border border-white/20" />
          <div className="absolute top-3 left-3 w-7 h-7 border-t-2 border-l-2 border-cream rounded-tl-lg" />
          <div className="absolute top-3 right-3 w-7 h-7 border-t-2 border-r-2 border-cream rounded-tr-lg" />
          <div className="absolute bottom-3 left-3 w-7 h-7 border-b-2 border-l-2 border-cream rounded-bl-lg" />
          <div className="absolute bottom-3 right-3 w-7 h-7 border-b-2 border-r-2 border-cream rounded-br-lg" />
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="font-body text-cream/40 text-sm text-center px-8">{t('reportPrompt')}</p>
          </div>
          <motion.div
            className="absolute left-3 right-3 h-[1.5px] rounded-full"
            style={{ background: 'linear-gradient(90deg, transparent, #2ECC71, transparent)' }}
            animate={{ top: ['12px', 'calc(100% - 12px)', '12px'] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      </div>

      <div className="flex-shrink-0 safe-bottom flex flex-col items-center gap-4 pt-4">
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

      <div className="text-center">
        <p className="font-display font-bold text-cream text-xl mb-2">{t('reportAnalyzing')}</p>
        <ProgressDots />
        <p className="font-body text-cream/45 text-xs mt-3">{t('reportAnalyzingHint')}</p>
      </div>

      <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-accessible rounded-full"
          initial={{ width: '0%' }}
          animate={{ width: '90%' }}
          transition={{ duration: 6, ease: 'easeOut' }}
        />
      </div>
    </motion.div>
  );
}

const SEVERITY_BADGE = {
  high: { color: '#E74C3C', bgClass: 'bg-difficult/20', textClass: 'text-difficult' },
  medium: { color: '#F39C12', bgClass: 'bg-moderate/20', textClass: 'text-moderate' },
  low: { color: '#2ECC71', bgClass: 'bg-accessible/20', textClass: 'text-accessible' },
};

const CATEGORY_EMOJI = {
  broken_pavement: '🕳️',
  scaffolding: '🏗️',
  temp_fence: '🚧',
  missing_kerb_ramp: '⛔',
  narrow_passage: '↔️',
  parked_car: '🚗',
  parked_bikes: '🚲',
  flood: '💧',
  trash: '🗑️',
  street_furniture: '🪑',
  misc: '❓',
};

function prettyCategory(c) {
  return c.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

function ResultStep({ photoFile, usedDemo, classification, location, saving, error, onConfirm, onCancel, t }) {
  const sev = SEVERITY_BADGE[classification.severity] ?? SEVERITY_BADGE.medium;
  const emoji = CATEGORY_EMOJI[classification.category] ?? '❓';
  const confidencePct = Math.round(classification.confidence * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col h-full px-5 pt-14 safe-bottom"
    >
      <h1 className="font-display font-bold text-cream text-xl mb-5">{t('reportVerdictLabel')}</h1>

      <div className="w-full rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)] mb-5" style={{ aspectRatio: '16/9' }}>
        {photoFile ? (
          <img src={photoFile} className="w-full h-full object-cover" alt="Captured obstruction" />
        ) : (
          usedDemo ? DEMO_PHOTO : <div className="w-full h-full bg-navy/60" />
        )}
      </div>

      <div className="bg-white/8 rounded-2xl p-4 border border-white/12 mb-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5 text-xl">
            {emoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-cream text-base leading-tight mb-1">
              {prettyCategory(classification.category)}
            </p>
            <p className="font-body text-cream/70 text-sm leading-snug">
              {classification.description}
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Stat label={t('reportStatSeverity')} value={
            <span className={`${sev.textClass} font-semibold`}>
              {t(`severity_${classification.severity}`)}
            </span>
          } />
          <Stat label={t('reportStatConfidence')} value={`${confidencePct}%`} />
          <Stat label={t('reportStatLocation')} value={
            location?.source === 'gps' ? t('reportLocationGps') : t('reportLocationApprox')
          } />
        </div>
      </div>

      {error && (
        <div className="mb-3 px-4 py-2.5 rounded-xl bg-difficult/15 border border-difficult/40 font-body text-xs text-difficult">
          {error}
        </div>
      )}

      <div className="flex-1" />

      <div className="flex gap-3">
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onCancel}
          disabled={saving}
          className="flex-1 h-14 rounded-2xl border-2 border-white/20 text-cream font-body font-semibold text-base flex items-center justify-center disabled:opacity-50"
        >
          {t('reportCancel')}
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onConfirm}
          disabled={saving}
          className="flex-[2] h-14 rounded-2xl bg-navy text-cream font-display font-bold text-base flex items-center justify-center gap-2 shadow-card border border-white/10 disabled:opacity-70"
        >
          {saving ? (
            <SpinnerIcon />
          ) : (
            <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4" aria-hidden="true">
              <path d="M4 10l4 4 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
          {saving ? t('reportSaving') : t('reportConfirm')}
        </motion.button>
      </div>
    </motion.div>
  );
}

function ErrorStep({ error, onRetry, onBack, t }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col h-full items-center justify-center px-8 gap-6 text-center"
    >
      <div className="w-16 h-16 rounded-full bg-difficult/20 border-2 border-difficult flex items-center justify-center">
        <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-difficult" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
          <path d="M12 7v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="16.5" r="1" fill="currentColor" />
        </svg>
      </div>
      <div>
        <p className="font-display font-bold text-cream text-xl mb-2">
          {t('reportErrorTitle')}
        </p>
        <p className="font-body text-cream/65 text-sm leading-relaxed max-w-xs">
          {error || t('reportErrorGeneric')}
        </p>
      </div>
      <div className="flex gap-3 w-full max-w-xs">
        <button
          onClick={onBack}
          className="flex-1 h-12 rounded-xl border-2 border-white/20 text-cream font-body font-semibold text-sm"
        >
          {t('reportCancel')}
        </button>
        <button
          onClick={onRetry}
          className="flex-1 h-12 rounded-xl bg-navy text-cream font-body font-semibold text-sm border border-white/15"
        >
          {t('reportRetry')}
        </button>
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
        <span className="font-body text-cream/50 text-xs">{t('reportSuccessReturning')}</span>
      </motion.div>
    </motion.div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-white/6 rounded-xl py-2 px-1">
      <p className="font-body text-cream/45 text-[10px] uppercase tracking-wide truncate">{label}</p>
      <p className="font-body text-cream text-xs font-semibold mt-0.5 truncate">{value}</p>
    </div>
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

function SpinnerIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5 animate-spin" aria-hidden="true">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="12 36" opacity="0.85" />
    </svg>
  );
}
