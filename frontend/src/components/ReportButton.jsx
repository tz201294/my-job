import React, { useEffect, useRef, useState } from 'react';
import { Flag, Loader2, X } from 'lucide-react';
import { api } from '../api/client';
import { useI18n } from '../i18n';

export const REPORT_REASONS = [
  ['spam', 'report.spam'],
  ['harassment', 'report.harassment'],
  ['hate', 'report.hate'],
  ['sexual', 'report.sexual'],
  ['violence', 'report.violence'],
  ['misinformation', 'report.misinformation'],
  ['other', 'report.other'],
];

// A small flag button on other people's content, opening a dialog to report it to the moderators.
// targetType: post | comment | question | challenge | suggestion | user. Clicks don't reach the parent card.
export default function ReportButton({ targetType, targetId, label = targetType, tone = 'light', className = '', withText = false }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  const btn = tone === 'dark'
    ? 'bg-black/40 hover:bg-black/60 text-white'
    : 'bg-slate-100 hover:bg-amber-100 text-slate-500 hover:text-amber-800';

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOpen(true); }}
        aria-label={t('report.button', { item: t(`item.${label}`) })}
        title={t('report.button', { item: t(`item.${label}`) })}
        className={`inline-flex items-center gap-1.5 p-1.5 rounded-lg transition-colors ${btn} ${withText ? 'px-3 py-2 rounded-xl text-xs font-bold' : ''} ${className}`}
      >
        <Flag className="w-3.5 h-3.5" />
        {withText && t('report.short')}
      </button>
      {open && <ReportDialog targetType={targetType} targetId={targetId} label={label} onClose={() => setOpen(false)} />}
    </>
  );
}

function ReportDialog({ targetType, targetId, label, onClose }) {
  const { t } = useI18n();
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const first = useRef(null);

  useEffect(() => {
    first.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async (e) => {
    e.preventDefault();
    if (!reason) return setError(t('report.chooseReason'));
    setBusy(true); setError('');
    try {
      const r = await api.report(targetType, targetId, reason, details.trim() || null);
      setDone(r.detail);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-slate-900/50 flex items-center justify-center p-4"
      onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="report-title"
        className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-5 text-left cursor-default"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 id="report-title" className="text-base font-black text-slate-900">{t('report.button', { item: t(`item.${label}`) })}</h2>
          <button type="button" onClick={onClose} aria-label={t('common.close')} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>
        {done ? (
          <div className="space-y-4">
            <p role="status" className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-semibold">{done}</p>
            <p className="text-xs text-slate-500">{t('report.anonymous')}</p>
            <button type="button" onClick={onClose} ref={first}
              className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-extrabold">{t('common.done')}</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <fieldset>
              <legend className="text-xs font-bold text-slate-700 mb-2">{t('report.whatsWrong')}</legend>
              <div className="space-y-1.5">
                {REPORT_REASONS.map(([value, text], i) => (
                  <label key={value} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-sm cursor-pointer ${
                    reason === value ? 'border-teal-500 bg-teal-50 text-teal-900 font-semibold' : 'border-slate-200 text-slate-700 hover:border-slate-300'}`}>
                    <input type="radio" name="report-reason" value={value} checked={reason === value}
                      ref={i === 0 ? first : undefined}
                      onChange={() => setReason(value)} className="accent-teal-600" />
                    {t(text)}
                  </label>
                ))}
              </div>
            </fieldset>
            <div>
              <label htmlFor="report-details" className="block text-xs font-bold text-slate-700 mb-1">{t('report.details')}</label>
              <textarea id="report-details" rows={2} maxLength={1000} value={details} onChange={(e) => setDetails(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
            </div>
            {error && <p role="alert" className="text-xs font-bold text-rose-600">{error}</p>}
            <button type="submit" disabled={busy}
              className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-sm font-extrabold inline-flex items-center justify-center gap-2">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />} {t('report.send')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
