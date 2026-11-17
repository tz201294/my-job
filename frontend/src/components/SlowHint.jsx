import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { IS_DEMO } from '../api/client';

const WAKE_UP_TEXT = 'Waking up the server… on the free plan this can take up to a minute after a quiet period.';

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
  const slow = useSlow(active);
  if (!slow || IS_DEMO) return null;
  return <p className={`text-xs text-slate-500 ${className}`} role="status">{WAKE_UP_TEXT}</p>;
}

// Full-area loading spinner with the same explanation after a few seconds.
export function Loading({ label = 'Loading', className = 'py-20' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 text-center px-6 ${className}`} role="status" aria-label={label}>
      <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
      <SlowHint active />
    </div>
  );
}
