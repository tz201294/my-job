import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useCatalog } from '../catalog';
import { fieldName } from '../api/mappers';
import { useI18n } from '../i18n';
import { paths } from '../routes';

// The same profession for everyone on a given day (by the calendar day), a different one tomorrow.
export function professionIndexFor(date, count) {
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  return ((day * 7) % count + count) % count; // a step of 7 spreads consecutive days across the fields
}

export default function ProfessionOfTheDay({ date = new Date() }) {
  const { t } = useI18n();
  const { professions } = useCatalog();
  const p = professions[professionIndexFor(date, professions.length)];
  if (!p) return null;
  return (
    <Link to={paths.profession(p.slug)}
      className="group block rounded-3xl p-[1.5px] bg-gradient-to-br from-teal-400 via-cyan-400 to-teal-600 shadow-sm hover:shadow-md transition-shadow">
      <span className="flex items-start gap-4 rounded-[calc(1.5rem-1.5px)] bg-white p-4 sm:p-5">
        <span className="hidden sm:flex shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-600 text-white items-center justify-center">
          <Sparkles className="w-6 h-6" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block text-[10px] font-black uppercase tracking-wider text-teal-600">
            {t('pod.label')} · {fieldName(p.field)}
          </span>
          <span className="block mt-0.5 text-lg font-black text-slate-900">{p.name}</span>
          <span className="block mt-1 text-sm text-slate-600 line-clamp-2">{p.description}</span>
          <span className="mt-2 inline-flex items-center gap-1 text-xs font-extrabold text-teal-700 group-hover:gap-2 transition-all">
            {t('pod.cta')} <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </span>
        </span>
      </span>
    </Link>
  );
}
