import React, { useId, useState } from 'react';
import { Check, X } from 'lucide-react';
import { searchProfessions, useCatalog } from '../catalog';
import { fieldName } from '../api/mappers';
import { useI18n } from '../i18n';

// "Your profession": type freely, or pick one from the built-in catalog (which links you to its page and sets the
// field). onChange({ title, slug, field }) — slug and field only when a catalog profession is picked.
export default function ProfessionPicker({ id, title, slug, onChange, inputClassName, placeholder }) {
  const { t } = useI18n();
  const { professions, bySlug } = useCatalog();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const matches = title.trim() ? searchProfessions(professions, title, fieldName).slice(0, 6) : [];
  const linked = slug && bySlug[slug];

  const pick = (p) => {
    onChange({ title: p.name, slug: p.slug, field: p.field });
    setOpen(false);
  };

  const type = (value) => {
    // Still the picked profession only while the text is its name.
    onChange({ title: value, slug: linked && linked.name === value ? slug : null });
    setOpen(true);
    setActive(0);
  };

  const onKeyDown = (e) => {
    if (!open || !matches.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => (i + 1) % matches.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => (i - 1 + matches.length) % matches.length); }
    else if (e.key === 'Enter') { e.preventDefault(); pick(matches[active]); }
    else if (e.key === 'Escape') setOpen(false);
  };

  const showList = open && matches.length > 0 && !(linked && linked.name === title);

  return (
    <div className="relative">
      <input
        id={id}
        className={inputClassName}
        value={title}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        onChange={(e) => type(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {showList && (
        <ul id={listId} role="listbox" className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          {matches.map((p, i) => (
            <li key={p.slug} role="option" aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); pick(p); }}
              onMouseEnter={() => setActive(i)}
              className={`px-3 py-2 cursor-pointer text-sm ${i === active ? 'bg-teal-50 text-teal-900' : 'text-slate-800'}`}>
              <span className="font-bold">{p.name}</span>
              <span className="text-xs text-slate-500"> · {fieldName(p.field)}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[11px] mt-1 text-slate-500">
        {linked ? (
          <span className="inline-flex items-center gap-1 text-teal-700 font-semibold">
            <Check className="w-3 h-3" /> {t('catalog.linked', { name: linked.name })}
            <button type="button" onClick={() => onChange({ title, slug: null })} aria-label={t('catalog.unlink')}
              className="p-0.5 rounded hover:bg-teal-50"><X className="w-3 h-3" /></button>
          </span>
        ) : title.trim() && !matches.length ? t('catalog.notListed') : t('catalog.pickHint')}
      </p>
    </div>
  );
}
