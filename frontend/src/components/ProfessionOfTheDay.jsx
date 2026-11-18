import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, X } from 'lucide-react';
import { useCatalog } from '../catalog';
import { useI18n } from '../i18n';
import { paths } from '../routes';

const HIDDEN_KEY = 'myjob_pod_hidden'; // the day it was hidden on this device

// The same profession for everyone on a given day (by the calendar day), a different one tomorrow.
export function professionIndexFor(date, count) {
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  return ((day * 7) % count + count) % count; // a step of 7 spreads consecutive days across the fields
}

const dayKey = (date) => `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

function hiddenToday(date) {
  try {
    return localStorage.getItem(HIDDEN_KEY) === dayKey(date);
  } catch {
    return false;
  }
}

// A slim banner in the feed; "×" hides it until tomorrow.
export default function ProfessionOfTheDay({ date = new Date() }) {
  const { t } = useI18n();
  const { professions } = useCatalog();
  const [hidden, setHidden] = useState(() => hiddenToday(date));
  const p = professions[professionIndexFor(date, professions.length)];
  if (!p || hidden) return null;

  const hide = () => {
    setHidden(true);
    try {
      localStorage.setItem(HIDDEN_KEY, dayKey(date));
    } catch {
      // Storage blocked (private window): it's hidden for this visit only.
    }
  };

  return (
    <div className="relative rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-sm">
      <Link to={paths.profession(p.slug)} className="group flex items-center gap-3 p-3.5 pr-12">
        <span className="shrink-0 w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
          <Sparkles className="w-5 h-5" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-white/75">{t('pod.label')}</span>
          <span className="flex items-center gap-1.5 text-sm font-extrabold">
            <span className="truncate">{p.name}</span>
            <span className="shrink-0 inline-flex items-center gap-1 font-semibold text-white/85 group-hover:gap-1.5 transition-all">
              · {t('pod.cta')} <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
          </span>
        </span>
      </Link>
      <button type="button" onClick={hide} aria-label={t('pod.hide')} title={t('pod.hide')}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
