import React, { useState } from 'react';
import { Pencil, Trash2, Loader2 } from 'lucide-react';

// Small Edit / Delete buttons shown on content the signed-in user owns.
// onDelete may return a promise; the delete button shows a spinner until it settles.
// `confirmText` is asked before deleting. Clicks don't reach the parent (cards are often clickable).
export default function OwnerActions({
  onEdit,
  onDelete,
  confirmText = 'Delete this? This cannot be undone.',
  label = 'item',
  tone = 'light', // 'light' on white cards, 'dark' on photos/dark backgrounds
  className = '',
}) {
  const [deleting, setDeleting] = useState(false);

  const stop = (fn) => async (e) => {
    e.stopPropagation();
    e.preventDefault();
    await fn();
  };

  const handleDelete = async () => {
    if (!window.confirm(confirmText)) return;
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  };

  const btn = tone === 'dark'
    ? 'bg-black/40 hover:bg-black/60 text-white'
    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900';

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {onEdit && (
        <button
          type="button"
          onClick={stop(onEdit)}
          aria-label={`Edit ${label}`}
          title={`Edit ${label}`}
          className={`p-1.5 rounded-lg transition-colors ${btn}`}
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={stop(handleDelete)}
          disabled={deleting}
          aria-label={`Delete ${label}`}
          title={`Delete ${label}`}
          className={`p-1.5 rounded-lg transition-colors disabled:opacity-60 ${
            tone === 'dark' ? btn : 'bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700'
          }`}
        >
          {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  );
}
