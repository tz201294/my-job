import React, { useEffect, useRef, useState } from 'react';
import { Flag, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { ReportDialog } from './ReportButton';
import { useI18n } from '../i18n';

// The "⋯" menu on a post: Edit / Delete on your own, Report on other people's.
// Keeps the card header calm; the actions are one tap away.
export default function PostMenu({ postId, isOwn, onEdit, onDelete, confirmText }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
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

  const pick = (fn) => (e) => {
    e.stopPropagation();
    setOpen(false);
    fn();
  };
  const item = 'w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-sm font-semibold hover:bg-slate-50 focus:bg-slate-50 outline-none';
  const what = t('item.post');

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={t('post.menu')}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
      >
        <MoreHorizontal className="w-5 h-5" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full mt-1 z-20 min-w-[11rem] bg-white rounded-xl border border-slate-200 shadow-lg py-1">
          {isOwn ? (
            <>
              <button type="button" role="menuitem" onClick={pick(onEdit)} className={`${item} text-slate-700`}>
                <Pencil className="w-4 h-4" /> {t('owner.edit', { item: what })}
              </button>
              <button type="button" role="menuitem"
                onClick={pick(() => { if (window.confirm(confirmText || t('owner.confirmDelete'))) onDelete(); })}
                className={`${item} text-rose-600`}>
                <Trash2 className="w-4 h-4" /> {t('owner.delete', { item: what })}
              </button>
            </>
          ) : (
            <button type="button" role="menuitem" onClick={pick(() => setReporting(true))} className={`${item} text-slate-700`}>
              <Flag className="w-4 h-4" /> {t('report.button', { item: what })}
            </button>
          )}
        </div>
      )}
      {reporting && <ReportDialog targetType="post" targetId={postId} label="post" onClose={() => setReporting(false)} />}
    </div>
  );
}
