// The built-in profession catalog: about 50 professions, each with a description, daily tasks, tools and how
// people get into it, in every app language.
//
// professions.json is the list (slug, field, related) and is shared with the server (backend/app/core/
// professions.json is a copy, checked by a test). The words live in text/<lang>.js; English is bundled, the
// others load when needed.
import { useEffect, useMemo, useState } from 'react';
import LIST from './professions.json';
import en from './text/en';
import { useI18n } from '../i18n';

const loaders = {
  es: () => import('./text/es'),
  fr: () => import('./text/fr'),
  de: () => import('./text/de'),
  ja: () => import('./text/ja'),
};
const loaded = { en };

export const PROFESSIONS = LIST;
export const PROFESSION_SLUGS = new Set(LIST.map((p) => p.slug));

// Lower-case and without accents, so "medico" finds "Médico".
export const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function build(text) {
  return LIST.map((p) => ({ ...p, ...en[p.slug], ...(text?.[p.slug] || {}), englishName: en[p.slug].name }));
}

/** The catalog in the current language: { professions, bySlug, ready }. */
export function useCatalog() {
  const { lang } = useI18n();
  const [text, setText] = useState(() => loaded[lang]);

  useEffect(() => {
    if (loaded[lang]) {
      setText(loaded[lang]);
      return undefined;
    }
    let live = true;
    loaders[lang]?.().then((m) => {
      loaded[lang] = m.default;
      if (live) setText(m.default);
    }).catch(() => {});
    return () => { live = false; };
  }, [lang]);

  // Built once per language, so the objects stay the same between renders.
  return useMemo(() => {
    const professions = build(text);
    return { professions, bySlug: Object.fromEntries(professions.map((p) => [p.slug, p])), ready: !!text };
  }, [text]);
}

/** Professions whose name (in this language or in English) or field matches the query, best matches first. */
export function searchProfessions(professions, query, fieldName = (f) => f) {
  const q = fold(query).trim();
  if (!q) return professions;
  const score = (p) => {
    const name = fold(p.name);
    if (name.startsWith(q)) return 0;
    if (name.includes(q) || fold(p.englishName).includes(q)) return 1;
    if (fold(fieldName(p.field)).includes(q)) return 2;
    return 3;
  };
  return professions.map((p) => [score(p), p]).filter(([s]) => s < 3).sort((a, b) => a[0] - b[0]).map(([, p]) => p);
}
