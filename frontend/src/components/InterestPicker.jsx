import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import { fieldName } from '../api/mappers';
import { FIELD_ORDER, searchProfessions, useCatalog } from '../catalog';
import { useI18n } from '../i18n';

export const MAX_INTERESTS = 20;

// Pick the professions you'd like to see more of: search, or browse them by field.
// value: catalog slugs. The chosen ones stay on top, each with a remove button.
export default function InterestPicker({ id = 'interests', value, onChange }) {
  const { t } = useI18n();
  const { professions, bySlug } = useCatalog();
  const [query, setQuery] = useState('');
  const full = value.length >= MAX_INTERESTS;

  const toggle = (slug) => onChange(value.includes(slug) ? value.filter((s) => s !== slug) : full ? value : [...value, slug]);
  const shown = searchProfessions(professions, query, fieldName);
  const byField = FIELD_ORDER.map((field) => [field, shown.filter((p) => p.field === field)]).filter(([, list]) => list.length);

  return (
    <div className="space-y-2.5">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label={t('interests.chosen')}>
          {value.map((slug) => (
            <li key={slug}>
              <button type="button" onClick={() => toggle(slug)} className="chip chip-on"
                aria-label={t('interests.remove', { name: bySlug[slug]?.name || slug })}>
                {bySlug[slug]?.name || slug} <X className="w-3 h-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative">
        <Search className="w-4 h-4 text-teal-500 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
        <label htmlFor={`${id}-search`} className="sr-only">{t('catalog.search')}</label>
        <input id={`${id}-search`} type="search" value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder={t('catalog.searchPlaceholder')}
          className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
      </div>

      <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-3">
        {byField.length === 0 && <p className="text-xs text-slate-500">{t('catalog.noMatches')}</p>}
        {byField.map(([field, list]) => (
          <div key={field}>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">{fieldName(field)}</p>
            <div className="flex flex-wrap gap-1.5">
              {list.map((p) => {
                const on = value.includes(p.slug);
                return (
                  <button key={p.slug} type="button" aria-pressed={on} disabled={!on && full} onClick={() => toggle(p.slug)}
                    className={`chip ${on ? 'chip-on' : ''} disabled:opacity-40 disabled:cursor-not-allowed`}>
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-slate-500" aria-live="polite">
        {full ? t('interests.full', { max: MAX_INTERESTS }) : t('interests.count', { n: value.length, max: MAX_INTERESTS })}
      </p>
    </div>
  );
}
