import { useState } from 'react';
import { X } from 'lucide-react';
import { MAX_TAGS, normalizeTag } from '../api/tags';
import { useI18n } from '../i18n';

// Tags as chips. Enter or a comma adds what you typed; Backspace in an empty box removes the last one.
// `onPendingChange` lets the form include a tag that was typed but not yet confirmed when it is submitted.
export default function TagInput({ id, tags, onChange, pending, onPendingChange }) {
  const { t } = useI18n();
  const [error, setError] = useState('');

  const add = (raw) => {
    const parts = String(raw).split(',');
    let next = [...tags];
    for (const part of parts) {
      const { tag, error: err } = normalizeTag(part);
      if (err) {
        setError(err);
        return false;
      }
      if (tag && !next.includes(tag)) next = [...next, tag];
    }
    if (next.length > MAX_TAGS) {
      setError(t('tags.tooMany', { max: MAX_TAGS }));
      return false;
    }
    setError('');
    onChange(next);
    onPendingChange('');
    return true;
  };

  const onKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && pending.trim()) {
      e.preventDefault();
      add(pending);
    } else if (e.key === 'Enter') {
      e.preventDefault(); // don't submit the whole form from the tags box
    } else if (e.key === 'Backspace' && !pending && tags.length) {
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus-within:border-brand-500">
        {tags.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-lg bg-teal-50 border border-teal-200 text-xs font-bold text-teal-800">
            #{tag}
            <button type="button" onClick={() => onChange(tags.filter((x) => x !== tag))} aria-label={t('tags.remove', { tag })}
              className="p-0.5 rounded hover:bg-teal-100">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {tags.length < MAX_TAGS && (
          <input
            id={id}
            value={pending}
            onChange={(e) => {
              const v = e.target.value;
              if (v.endsWith(',')) add(v.slice(0, -1));
              else onPendingChange(v);
            }}
            onKeyDown={onKeyDown}
            onBlur={() => { if (pending.trim()) add(pending); }}
            placeholder={tags.length ? t('tags.addAnother') : t('tags.placeholder')}
            className="flex-1 min-w-[8rem] bg-transparent text-xs outline-none py-0.5"
          />
        )}
      </div>
      <p className={`mt-1 text-[11px] ${error ? 'text-rose-600 font-semibold' : 'text-slate-400'}`} role={error ? 'alert' : undefined}>
        {error || t('tags.hint', { n: tags.length, max: MAX_TAGS })}
      </p>
    </div>
  );
}
