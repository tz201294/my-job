import React, { useEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { useI18n } from '../i18n';

// A "⋯" button opening a small menu of less-used actions (edit, delete, block, report).
// items: [{ key, label, icon, onSelect, danger }]. Clicks don't reach the parent card.
export default function MoreMenu({ items, label, className = '' }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    ref.current?.querySelector('[role="menuitem"]')?.focus();
    const onDown = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!items.length) return null;
  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        aria-label={label || t('post.menu')}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
      >
        <MoreHorizontal className="w-5 h-5" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full mt-1 z-20 min-w-[11rem] bg-white rounded-xl border border-slate-200 shadow-lg py-1">
          {items.map(({ key, label: text, icon: Icon, onSelect, danger }) => (
            <button
              key={key}
              type="button"
              role="menuitem"
              onClick={(e) => { e.stopPropagation(); setOpen(false); onSelect(); }}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-sm font-semibold hover:bg-slate-50 focus:bg-slate-50 outline-none ${
                danger ? 'text-rose-600' : 'text-slate-700'}`}
            >
              {Icon && <Icon className="w-4 h-4" aria-hidden="true" />} {text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
