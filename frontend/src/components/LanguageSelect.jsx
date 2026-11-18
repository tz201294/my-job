import React from 'react';
import { Globe } from 'lucide-react';
import { LANGUAGES, useI18n } from '../i18n';

// Choose the app's language. Each language is listed in its own name, so anyone can find theirs.
// onChange (optional) also gets the new code, e.g. to save it on the account.
export default function LanguageSelect({ compact = false, onChange, id = 'language-select' }) {
  const { lang, setLanguage, t } = useI18n();
  const choose = (e) => {
    setLanguage(e.target.value);
    onChange?.(e.target.value);
  };
  return (
    <span className={`inline-flex items-center gap-1 ${compact ? '' : 'gap-2'}`}>
      <Globe className={compact ? 'w-3 h-3' : 'w-4 h-4 text-teal-600'} aria-hidden="true" />
      <label htmlFor={id} className="sr-only">{t('language.label')}</label>
      <select id={id} value={lang} onChange={choose}
        className={compact
          ? 'bg-transparent text-xs text-slate-500 hover:text-slate-800 outline-none cursor-pointer'
          : 'px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 outline-none focus:border-teal-500'}>
        {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
      </select>
    </span>
  );
}
