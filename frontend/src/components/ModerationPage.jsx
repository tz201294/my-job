import React, { useCallback, useEffect, useState } from 'react';
import { ShieldAlert, Loader2, Trash2, Ban, Check, ExternalLink, RotateCcw } from 'lucide-react';
import { api } from '../api/client';
import { REPORT_REASONS } from './ReportButton';
import { Loading } from './SlowHint';
import { paths } from '../routes';

const REASON_TEXT = Object.fromEntries(REPORT_REASONS);
const TYPE_TEXT = {
  post: 'Post', comment: 'Comment', question: 'Question', challenge: 'Challenge', suggestion: 'Idea', user: 'Account',
};

// Where to look at the reported thing in the app.
function openPath(group) {
  const p = group.preview || {};
  if (group.target_type === 'user') return group.author ? paths.profile(group.author.username) : null;
  if (p.post_id) return paths.post(p.post_id);
  if (p.challenge_id) return paths.challenge(p.challenge_id);
  if (group.target_type === 'question') return paths.qa;
  return null;
}

function ReportGroup({ group, onResolve, onOpen }) {
  const [busy, setBusy] = useState('');
  const act = async (action, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(action);
    try {
      await onResolve(group, action);
    } finally {
      setBusy('');
    }
  };
  const author = group.author;
  const where = group.exists ? openPath(group) : null;
  const preview = group.preview || {};

  return (
    <li className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-black uppercase tracking-wide">
          {TYPE_TEXT[group.target_type]}
        </span>
        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[11px] font-black">
          {group.reports_count} report{group.reports_count === 1 ? '' : 's'}
        </span>
        {Object.entries(group.reasons).map(([reason, n]) => (
          <span key={reason} className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200 text-[11px] font-bold">
            {REASON_TEXT[reason] || reason}{n > 1 ? ` ×${n}` : ''}
          </span>
        ))}
        {!group.exists && (
          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-bold">Already deleted</span>
        )}
      </div>

      {group.exists && (
        <blockquote className="border-l-4 border-slate-200 pl-3 text-sm text-slate-700">
          {preview.title && <p className="font-extrabold text-slate-900">{preview.title}</p>}
          {preview.text && <p className="line-clamp-4 whitespace-pre-line">{preview.text}</p>}
        </blockquote>
      )}

      <p className="text-xs text-slate-500">
        By {author ? <strong className="text-slate-800">@{author.username}</strong> : 'a deleted account'}
        {author && !author.is_active && <span className="ml-1 text-rose-700 font-bold">(suspended)</span>}
        {' · '}reported by {group.reporters.map((r) => `@${r}`).join(', ')}
      </p>

      {group.details.length > 0 && (
        <ul className="space-y-1">
          {group.details.map((d, i) => (
            <li key={i} className="text-xs text-slate-600 bg-slate-50 rounded-lg px-2.5 py-1.5">“{d}”</li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        {where && (
          <button type="button" onClick={() => onOpen(where)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700">
            <ExternalLink className="w-3.5 h-3.5" /> Open
          </button>
        )}
        {group.target_type !== 'user' && group.exists && (
          <button type="button" disabled={!!busy}
            onClick={() => act('remove', `Remove this ${TYPE_TEXT[group.target_type].toLowerCase()}? This cannot be undone.`)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-60">
            {busy === 'remove' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Remove
          </button>
        )}
        {author?.is_active && (
          <button type="button" disabled={!!busy}
            onClick={() => act('suspend', `Suspend @${author.username}? They can't log in, and all their content is hidden until you lift it.`)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-black text-white disabled:opacity-60">
            {busy === 'suspend' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />} Suspend @{author.username}
          </button>
        )}
        <button type="button" disabled={!!busy} onClick={() => act('dismiss')}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 disabled:opacity-60">
          {busy === 'dismiss' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Nothing wrong
        </button>
      </div>
    </li>
  );
}

export default function ModerationPage({ onOpen, onChanged }) {
  const [tab, setTab] = useState('open'); // 'open' | 'suspended'
  const [reports, setReports] = useState(null);
  const [suspended, setSuspended] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [r, s] = await Promise.all([api.getReports('open'), api.getSuspended()]);
      setReports(r);
      setSuspended(s);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const resolve = async (group, action) => {
    try {
      await api.resolveReports(group.target_type, group.target_id, action);
      await load(); // the list is current before the message shows, so nothing on it is stale
      setNotice({ dismiss: 'Reports dismissed.', remove: 'Removed.', suspend: 'Account suspended.' }[action]);
      if (action !== 'dismiss') onChanged?.();
    } catch (err) {
      setNotice('');
      setError(err.message);
    }
  };

  const unsuspend = async (username) => {
    try {
      await api.unsuspendUser(username);
      await load();
      setNotice(`@${username} can use Prologue again.`);
      onChanged?.();
    } catch (err) {
      setError(err.message);
    }
  };

  const tabs = [['open', `Reports${reports ? ` (${reports.length})` : ''}`], ['suspended', `Suspended${suspended ? ` (${suspended.length})` : ''}`]];

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center"><ShieldAlert className="w-5 h-5" /></span>
        <div>
          <h2 className="text-xl font-black text-slate-900">Moderation</h2>
          <p className="text-xs text-slate-500">Only moderators see this page. Reporters stay anonymous to the people they report.</p>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit text-xs font-bold" role="tablist">
        {tabs.map(([key, text]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg ${tab === key ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}>
            {text}
          </button>
        ))}
      </div>

      {error && <p role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">{error}</p>}
      {notice && !error && <p role="status" className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">{notice}</p>}

      {reports === null && !error ? <Loading /> : tab === 'open' ? (
        reports?.length ? (
          <ul className="space-y-3">
            {reports.map((g) => (
              <ReportGroup key={`${g.target_type}:${g.target_id}`} group={g} onResolve={resolve} onOpen={onOpen} />
            ))}
          </ul>
        ) : (
          <p className="p-6 text-center text-sm text-slate-500 bg-white border border-slate-200 rounded-2xl">No open reports. All clear!</p>
        )
      ) : suspended?.length ? (
        <ul className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
          {suspended.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-3 p-3">
              <span className="text-sm"><strong>{u.full_name}</strong> <span className="text-slate-500">@{u.username}</span></span>
              <button type="button" onClick={() => unsuspend(u.username)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white">
                <RotateCcw className="w-3.5 h-3.5" /> Lift suspension
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="p-6 text-center text-sm text-slate-500 bg-white border border-slate-200 rounded-2xl">No suspended accounts.</p>
      )}
    </div>
  );
}
