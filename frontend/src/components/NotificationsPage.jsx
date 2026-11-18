import React, { useCallback, useEffect, useState } from 'react';
import {
  Bell, UserPlus, MessageSquareText, CheckCircle2, Star, MessageCircle, Lightbulb, HelpCircle, SmilePlus,
  Loader2, CheckCheck, UserCheck,
} from 'lucide-react';
import { api } from '../api/client';
import { DEFAULT_AVATAR, toNotification } from '../api/mappers';
import { useI18n } from '../i18n';

const PAGE_SIZE = 30;

// What each notification type says and looks like.
const KINDS = {
  follow: { icon: UserPlus, tone: 'bg-teal-100 text-teal-700', text: 'notif.follow' },
  question: { icon: HelpCircle, tone: 'bg-cyan-100 text-cyan-700', text: 'notif.question' },
  answer: { icon: MessageSquareText, tone: 'bg-cyan-100 text-cyan-700', text: 'notif.answer' },
  suggestion: { icon: Lightbulb, tone: 'bg-amber-100 text-amber-700', text: 'notif.suggestion' },
  accepted: { icon: CheckCircle2, tone: 'bg-emerald-100 text-emerald-700', text: 'notif.accepted' },
  review: { icon: Star, tone: 'bg-amber-100 text-amber-700', text: 'notif.review' },
  comment: { icon: MessageCircle, tone: 'bg-teal-100 text-teal-700', text: 'notif.comment' },
  reaction: { icon: SmilePlus, tone: 'bg-rose-100 text-rose-600', text: 'notif.reaction' },
  follow_request: { icon: UserPlus, tone: 'bg-amber-100 text-amber-700', text: 'notif.followRequest' },
  follow_accepted: { icon: UserCheck, tone: 'bg-emerald-100 text-emerald-700', text: 'notif.followAccepted' },
};

// People asking to follow your private account, with Accept / Decline.
function FollowRequests({ onChanged }) {
  const { t } = useI18n();
  const [list, setList] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.getFollowRequests().then(setList).catch(() => setList([]));
  }, []);

  const answer = async (username, accept) => {
    setBusy(username); setError('');
    try {
      await (accept ? api.acceptFollowRequest(username) : api.declineFollowRequest(username));
      setList((l) => l.filter((r) => r.username !== username));
      onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  if (!list?.length) return null;
  return (
    <section aria-labelledby="follow-requests" className="bg-white border border-amber-200 rounded-3xl p-3 sm:p-4 shadow-2xs">
      <h3 id="follow-requests" className="text-sm font-black text-slate-900 mb-2">{t('notif.requestsTitle', { count: list.length })}</h3>
      {error && <p role="alert" className="text-xs font-bold text-rose-600 mb-2">{error}</p>}
      <ul className="divide-y divide-slate-100">
        {list.map((r) => (
          <li key={r.username} className="flex items-center gap-3 py-2">
            <img src={r.avatar_url || DEFAULT_AVATAR} alt="" className="w-10 h-10 rounded-full object-cover" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-extrabold text-slate-900 truncate">{r.full_name}</span>
              <span className="block text-xs text-slate-500 truncate">@{r.username}{r.profession_title ? ` · ${r.profession_title}` : ''}</span>
            </span>
            <button type="button" disabled={busy === r.username} onClick={() => answer(r.username, true)}
              className="btn btn-sm btn-primary">
              {t('notif.accept')}
            </button>
            <button type="button" disabled={busy === r.username} onClick={() => answer(r.username, false)}
              className="btn btn-sm btn-quiet">
              {t('notif.decline')}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function NotificationRow({ n, onOpen }) {
  const { t } = useI18n();
  const kind = KINDS[n.type] || { icon: Bell, tone: 'bg-slate-100 text-slate-600', text: '' };
  const Icon = kind.icon;
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(n)}
        className={`w-full flex items-start gap-3 p-3 sm:p-3.5 rounded-2xl text-left transition-colors ${
          n.read ? 'hover:bg-slate-50' : 'bg-teal-50/70 hover:bg-teal-50'
        }`}
      >
        <div className="relative shrink-0">
          <img loading="lazy" decoding="async" src={n.actorAvatarUrl} alt="" className="w-11 h-11 rounded-full object-cover" />
          <span className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white ${kind.tone}`}>
            <Icon className="w-3 h-3" />
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-800 leading-snug">
            {t(kind.text, { name: '\u0000' }).split('\u0000').map((part, i) => (i ? <React.Fragment key={i}><span className="font-extrabold">{n.actorFullName}</span>{part}</React.Fragment> : part))}
          </p>
          {n.snippet && (
            <p className="mt-0.5 text-xs text-slate-500 line-clamp-2 break-words">“{n.snippet}”</p>
          )}
          <p className={`mt-1 text-[11px] font-semibold ${n.read ? 'text-slate-400' : 'text-teal-700'}`}>{n.timeAgo}</p>
        </div>
        {!n.read && <span className="mt-2 w-2.5 h-2.5 rounded-full bg-teal-500 shrink-0" aria-label={t('notif.unread')} />}
      </button>
    </li>
  );
}

// Your notifications, newest first. Opening the page marks them as read (they stay highlighted until you leave,
// so you can still see which ones were new). `onUnreadChange` keeps the bell's badge in step.
export default function NotificationsPage({ onOpen, onUnreadChange }) {
  const { t } = useI18n();
  const [items, setItems] = useState(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const page = await api.getNotifications({ limit: PAGE_SIZE, offset: 0 });
      setItems(page.notifications.map(toNotification));
      setTotal(page.total);
      if (page.unread_count > 0) {
        const r = await api.markNotificationsRead();
        onUnreadChange?.(r.unread_count);
      } else {
        onUnreadChange?.(0);
      }
    } catch (err) {
      setError(err.message);
    }
  }, [onUnreadChange]);

  useEffect(() => { load(); }, [load]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const page = await api.getNotifications({ limit: PAGE_SIZE, offset: items.length });
      setItems((list) => [...list, ...page.notifications.map(toNotification).filter((n) => !list.some((x) => x.id === n.id))]);
      setTotal(page.total);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMore(false);
    }
  };

  const unreadHere = items?.filter((n) => !n.read).length || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-xl bg-teal-100 text-teal-700"><Bell className="w-5 h-5" /></span>
          <h2 className="font-black text-xl text-slate-900">{t('nav.notifications')}</h2>
        </div>
        {unreadHere > 0 && (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-teal-700">
            <CheckCheck className="w-4 h-4" /> {t('notif.new', { count: unreadHere })}
          </span>
        )}
      </div>

      <FollowRequests onChanged={() => load?.()} />

      <section className="bg-white border border-teal-100 rounded-3xl p-2 sm:p-3 shadow-2xs">
        {error && <p role="alert" className="p-4 text-xs font-bold text-rose-600">{t('notif.loadFailed', { error })}</p>}
        {!error && items === null && (
          <p className="flex items-center gap-1.5 p-4 text-xs text-slate-500"><Loader2 className="w-3.5 h-3.5 animate-spin" /> {t('common.loading')}</p>
        )}
        {items && items.length === 0 && (
          <div className="p-6 text-center">
            <Bell className="w-10 h-10 mx-auto text-teal-200 mb-3" />
            <p className="text-sm font-extrabold text-slate-800">{t('notif.empty')}</p>
            <p className="text-xs text-slate-500 mt-1">
              {t('notif.emptyHint')}
            </p>
          </div>
        )}
        {items && items.length > 0 && (
          <ul className="space-y-1">
            {items.map((n) => <NotificationRow key={n.id} n={n} onOpen={onOpen} />)}
          </ul>
        )}
        {items && items.length < total && (
          <div className="p-2 text-center">
            <button type="button" onClick={loadMore} disabled={loadingMore}
              className="text-xs font-bold text-teal-700 hover:underline disabled:opacity-60">
              {loadingMore ? t('common.loading') : t('notif.older')}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
