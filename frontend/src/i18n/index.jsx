// Translations for the app's own text: buttons, menus, settings, messages. What people write (posts, names) is
// never translated.
//
// - English (en.js) is the source: every key lives there first. Other languages load on demand, so English visitors
//   download nothing extra.
// - The language is the device's language if we have it, else a guess from the device's time zone (read locally,
//   nothing is sent anywhere), else English. Choosing a language in Settings or on the login screen overrides that,
//   in this browser and on the account.
// - t('key', { name: 'Sam' }) fills in {name}; t('key', { count: 3 }) picks key_one / key_other (etc.) by the
//   language's plural rules. A missing translation falls back to English, then to the key itself.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import en from './en';

export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'ja', name: '日本語' },
];
const CODES = LANGUAGES.map((l) => l.code);
const RTL = new Set(['he', 'ar']); // ready for Hebrew and Arabic

const loaders = {
  es: () => import('./es'),
  fr: () => import('./fr'),
  de: () => import('./de'),
  ja: () => import('./ja'),
};

const STORAGE_KEY = 'prologue_language';

// Time zones that point to one of our languages, used only when the device's language isn't one we have.
const ZONE_HINTS = [
  [/^Europe\/(Madrid)$|^Atlantic\/Canary$|^America\/(Mexico_City|Bogota|Lima|Santiago|Buenos_Aires|Argentina\/.*|Caracas|Montevideo|Asuncion|La_Paz|Guayaquil|Panama|Costa_Rica|Guatemala|El_Salvador|Tegucigalpa|Managua|Santo_Domingo|Havana|Monterrey|Guadalajara)$/, 'es'],
  [/^Europe\/(Paris|Brussels|Monaco|Luxembourg)$|^Africa\/(Dakar|Abidjan|Casablanca|Tunis|Algiers|Kinshasa|Douala)$|^America\/Montreal$|^Indian\/Reunion$/, 'fr'],
  [/^Europe\/(Berlin|Vienna|Zurich|Busingen|Vaduz)$/, 'de'],
  [/^Asia\/Tokyo$/, 'ja'],
];

export function pickLanguage({ saved, deviceLanguages = [], timeZone = '' } = {}) {
  if (saved && CODES.includes(saved)) return saved;
  for (const tag of deviceLanguages) {
    const base = String(tag || '').toLowerCase().split('-')[0];
    if (CODES.includes(base)) return base;
  }
  for (const [pattern, code] of ZONE_HINTS) if (pattern.test(timeZone)) return code;
  return 'en';
}

function readSaved() {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}
function deviceLanguages() {
  if (typeof navigator === 'undefined') return [];
  return navigator.languages?.length ? navigator.languages : [navigator.language];
}
function deviceTimeZone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { return ''; }
}

export const initialLanguage = () =>
  pickLanguage({ saved: readSaved(), deviceLanguages: deviceLanguages(), timeZone: deviceTimeZone() });

// The current language and the dictionaries loaded so far, readable outside React: api/client.js sends the
// language to the server, and api/mappers.js uses tNow() for defaults such as "Explorer" and "5 min ago".
let current = 'en';
const loaded = { en };
export const currentLanguage = () => current;
export const tNow = (key, vars) => makeT(current, loaded[current])(key, vars);
export const timeAgoNow = (iso) => makeTimeAgo(current)(iso);

function format(text, vars) {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined && vars[k] !== null ? String(vars[k]) : m));
}

export function makeT(lang, dict) {
  const plural = new Intl.PluralRules(lang);
  const lookup = (key) => (dict && dict[key] !== undefined ? dict[key] : en[key]);
  return (key, vars) => {
    let text;
    if (vars && typeof vars.count === 'number') {
      const form = plural.select(vars.count);
      text = lookup(`${key}_${form}`) ?? lookup(`${key}_other`);
    }
    if (text === undefined) text = lookup(key);
    if (text === undefined) return key;
    return format(text, vars && typeof vars.count === 'number'
      ? { ...vars, count: new Intl.NumberFormat(lang).format(vars.count) } : vars);
  };
}

// "5 minutes ago" / "hace 5 minutos" / "5分前".
// The API sends naive UTC timestamps without a zone suffix; they're read as UTC.
export const parseApiDate = (iso) => new Date(/[zZ]$|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`);

export function makeTimeAgo(lang) {
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto', style: 'short' });
  return (iso) => {
    if (!iso) return '';
    const seconds = Math.min(0, (parseApiDate(iso).getTime() - Date.now()) / 1000);
    const steps = [[60, 'second'], [60, 'minute'], [24, 'hour'], [7, 'day'], [4.35, 'week'], [12, 'month'], [Infinity, 'year']];
    let value = seconds;
    for (const [size, unit] of steps) {
      if (Math.abs(value) < size) return Math.abs(value) < 45 && unit === 'second' ? rtf.format(0, 'second') : rtf.format(Math.round(value), unit);
      value /= size;
    }
    return '';
  };
}

const I18nContext = createContext(null);

export function I18nProvider({ children, initial }) {
  const [lang, setLang] = useState(() => initial || initialLanguage());
  const [dicts, setDicts] = useState({ en });

  useEffect(() => {
    current = lang;
    document.documentElement.lang = lang;
    document.documentElement.dir = RTL.has(lang) ? 'rtl' : 'ltr';
    if (!dicts[lang] && loaders[lang]) {
      let live = true;
      loaders[lang]().then((m) => {
        loaded[lang] = m.default;
        if (live) setDicts((d) => ({ ...d, [lang]: m.default }));
      }).catch(() => {});
      return () => { live = false; };
    }
    return undefined;
  }, [lang, dicts]);

  const choose = useCallback((code) => {
    if (!CODES.includes(code)) return;
    try { localStorage.setItem(STORAGE_KEY, code); } catch {}
    setLang(code);
  }, []);

  const value = useMemo(() => {
    const dict = dicts[lang];
    return {
      lang,
      ready: lang === 'en' || !!dict,
      setLanguage: choose,
      t: makeT(lang, dict),
      timeAgo: makeTimeAgo(lang),
      formatNumber: (n) => new Intl.NumberFormat(lang).format(n),
      formatDate: (iso, opts = { dateStyle: 'medium' }) => (iso ? new Intl.DateTimeFormat(lang, opts).format(new Date(iso)) : ''),
    };
  }, [lang, dicts, choose]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

// Inside components: const { t } = useI18n();
export function useI18n() {
  const ctx = useContext(I18nContext);
  if (ctx) return ctx;
  // Outside a provider (some unit tests): English.
  return { lang: 'en', ready: true, setLanguage: () => {}, t: makeT('en', en), timeAgo: makeTimeAgo('en'),
    formatNumber: (n) => String(n), formatDate: (iso) => iso || '' };
}
