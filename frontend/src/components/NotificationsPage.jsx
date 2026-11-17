import React, { useCallback, useEffect, useState } from 'react';
import {
  Bell, UserPlus, MessageSquareText, CheckCircle2, Star, MessageCircle, Lightbulb, HelpCircle, SmilePlus,
  Loader2, CheckCheck,
} from 'lucide-react';
import { api } from '../api/client';
import { toNotification } from '../api/mappers';

const PAGE_SIZE = 30;

// What each notification type says and looks like.
const KINDS = {
  follow: { icon: UserPlus, tone: 'bg-teal-100 text-teal-700', text: 'started following you' },
  question: { icon: HelpCircle, tone: 'bg-cyan-100 text-cyan-700', text: 'asked you a question' },
  answer: { icon: MessageSquareText, tone: 'bg-cyan-100 text-cyan-700', text: 'answered your question' },
  suggestion: { icon: Lightbulb, tone: 'bg-amber-100 text-amber-700', text: 'suggested an idea on your challenge' },
  accepted: { icon: CheckCircle2, tone: 'bg-emerald-100 text-emerald-700', text: 'accepted your idea as the solution' },
  review: { icon: Star, tone: 'bg-amber-100 text-amber-700', text: 'reviewed your post' },
  comment: { icon: MessageCircle, tone: 'bg-teal-100 text-teal-700', text: 'commented on your post' },
  reaction: { icon: SmilePlus, tone: 'bg-rose-100 text-rose-600', text: 'reacted to your comment' },
};

function NotificationRow({ n, onOpen }) {
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
          <img src={n.actorAvatarUrl} alt="" className="w-11 h-11 rounded-full object-cover" />
          <span className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white ${kind.tone}`}>
            <Icon className="w-3 h-3" />
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-800 leading-snug">
            <span className="font-extrabold">{n.actorFullName}</span> {kind.text}
          </p>
          {n.snippet && (
            <p className="mt-0.5 text-xs text-slate-500 line-clamp-2 break-words">“{n.snippet}”</p>
          )}
          <p className={`mt-1 text-[11px] font-semibold ${n.read ? 'text-slate-400' : 'text-teal-700'}`}>{n.timeAgo}</p>
        </div>
        {!n.read && <span className="mt-2 w-2.5 h-2.5 rounded-full bg-teal-500 shrink-0" aria-label="Unread" />}
      </button>
    </li>
  );
}

// Your notifications, newest first. Opening the page marks them as read (they stay highlighted until you leave,
// so you can still see which ones were new). `onUnreadChange` keeps the bell's badge in step.
export default function NotificationsPage({ onOpen, onUnreadChange }) {
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
          <h2 className="font-black text-xl text-slate-900">Notifications</h2>
        </div>
        {unreadHere > 0 && (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-teal-700">
            <CheckCheck className="w-4 h-4" /> {unreadHere} new
          </span>
        )}
      </div>

      <section className="bg-white border border-teal-100 rounded-3xl p-2 sm:p-3 shadow-2xs">
        {error && <p role="alert" className="p-4 text-xs font-bold text-rose-600">Couldn't load notifications: {error}</p>}
        {!error && items === null && (
          <p className="flex items-center gap-1.5 p-4 text-xs text-slate-500"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…</p>
        )}
        {items && items.length === 0 && (
          <div className="p-6 text-center">
            <Bell className="w-10 h-10 mx-auto text-teal-200 mb-3" />
            <p className="text-sm font-extrabold text-slate-800">No notifications yet</p>
            <p className="text-xs text-slate-500 mt-1">
              You'll see here when someone follows you, asks or answers a question, reviews or comments on your
              posts, reacts to your comments, or responds to your live work.
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
              {loadingMore ? 'Loading…' : 'Show older notifications'}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
