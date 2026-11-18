import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { IS_DEMO } from '../api/client';
import { useI18n } from '../i18n';

// True once `active` has stayed true for `delay` ms.
export function useSlow(active, delay = 4000) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!active) {
      setSlow(false);
      return undefined;
    }
    const t = setTimeout(() => setSlow(true), delay);
    return () => clearTimeout(t);
  }, [active, delay]);
  return slow;
}

// Explains a long wait (the free server sleeps when idle). Never shown in the in-browser demo.
export function SlowHint({ active, className = '' }) {
  const { t } = useI18n();
  const slow = useSlow(active);
  if (!slow || IS_DEMO) return null;
  return <p className={`text-xs text-slate-500 ${className}`} role="status">{t('slow.wakingUp')}</p>;
}

// Full-area loading spinner with the same explanation after a few seconds.
export function Loading({ label, className = 'py-20' }) {
  const { t } = useI18n();
  return (
    <div className={`flex flex-col items-center justify-center gap-3 text-center px-6 ${className}`} role="status" aria-label={label || t('common.loading')}>
      <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
      <SlowHint active />
    </div>
  );
}
