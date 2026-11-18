import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Send, SmilePlus } from 'lucide-react';
import { api } from '../api/client';
import { REACTION_EMOJIS, toComment } from '../api/mappers';
import OwnerActions from './OwnerActions';
import ReportButton from './ReportButton';
import { useI18n } from '../i18n';

const PAGE_SIZE = 20;
const MAX_LENGTH = 2000;

// Reaction counts under a comment, plus a picker. Tapping your current emoji removes it; another one replaces it.
function Reactions({ comment, onReact }) {
  const { t } = useI18n();
  const [picking, setPicking] = useState(false);
  const boxRef = useRef(null);

  // Close the picker on a tap outside it or on Escape.
  useEffect(() => {
    if (!picking) return undefined;
    const onDown = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setPicking(false); };
    const onKey = (e) => { if (e.key === 'Escape') setPicking(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [picking]);
  const counts = Object.entries(comment.reactions || {}).filter(([, n]) => n > 0)
    .sort((a, b) => REACTION_EMOJIS.indexOf(a[0]) - REACTION_EMOJIS.indexOf(b[0]));
  const choose = (emoji) => {
    setPicking(false);
    onReact(comment.id, emoji);
  };
  return (
    <div ref={boxRef} className="relative flex flex-wrap items-center gap-1">
      {counts.map(([emoji, n]) => (
        <button key={emoji} type="button" onClick={() => choose(emoji)}
          aria-pressed={comment.myReaction === emoji}
          aria-label={`${emoji} ${n}${comment.myReaction === emoji ? ', your reaction' : ''}`}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border transition-colors ${
            comment.myReaction === emoji
              ? 'bg-teal-50 border-teal-400 text-teal-800'
              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
          }`}>
          <span className="text-sm leading-none">{emoji}</span>{n}
        </button>
      ))}
      <button type="button" onClick={() => setPicking((v) => !v)} aria-expanded={picking}
        aria-label={t('comments.react')}
        className="inline-flex items-center justify-center w-7 h-6 rounded-full text-slate-400 hover:text-teal-700 hover:bg-teal-50">
        <SmilePlus className="w-4 h-4" />
      </button>
      {picking && (
        <div role="menu" aria-label={t('comments.pickReaction')}
          className="absolute z-20 bottom-full mb-1 left-0 flex gap-0.5 p-1 bg-white border border-slate-200 rounded-full shadow-lg">
          {REACTION_EMOJIS.map((emoji) => (
            <button key={emoji} type="button" role="menuitemradio" aria-checked={comment.myReaction === emoji}
              aria-label={t('comments.reactWith', { emoji })} onClick={() => choose(emoji)}
              className={`w-8 h-8 rounded-full text-lg leading-none hover:scale-125 hover:bg-slate-100 transition-transform ${
                comment.myReaction === emoji ? 'bg-teal-50 ring-2 ring-teal-300' : ''
              }`}>
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CommentItem({ comment, canEdit, canDelete, canReact, canReport, onSave, onDelete, onReact }) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(comment.body);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError('');
    try {
      await onSave(comment.id, text.trim());
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="flex gap-2.5">
      <img loading="lazy" decoding="async" src={comment.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 border border-teal-100" />
      <div className="flex-1 min-w-0">
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl px-3.5 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs leading-snug">
              <span className="font-extrabold text-slate-900">{comment.fullName}</span>
              {comment.professionTitle && (
                <span className="text-[10px] text-teal-700 font-bold"> · {comment.professionTitle}</span>
              )}
            </p>
            {(canEdit || canDelete) && !editing && (
              <OwnerActions
                label="comment"
                onEdit={canEdit ? () => { setText(comment.body); setEditing(true); } : undefined}
                onDelete={canDelete ? () => onDelete(comment.id) : undefined}
                confirmText={t('comments.confirmDelete')}
              />
            )}
            {canReport && !editing && <ReportButton targetType="comment" targetId={comment.id} label="comment" />}
          </div>
          {editing ? (
            <form onSubmit={save} className="mt-1.5 space-y-1.5">
              <label htmlFor={`comment-edit-${comment.id}`} className="sr-only">{t('comments.editLabel')}</label>
              <textarea
                id={`comment-edit-${comment.id}`}
                rows={2}
                maxLength={MAX_LENGTH}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-teal-200 rounded-xl text-xs text-slate-800 outline-none focus:border-teal-500 resize-y"
              />
              <div className="flex items-center justify-end gap-2">
                <span role="alert" className="mr-auto text-[11px] font-bold text-rose-600">{error}</span>
                <button type="button" onClick={() => setEditing(false)} disabled={busy}
                  className="px-3 py-1 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-200">
                  {t('common.cancel')}
                </button>
                <button type="submit" disabled={busy || !text.trim()}
                  className="px-3 py-1 rounded-lg text-[11px] font-extrabold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-60">
                  {busy ? t('common.saving') : t('common.save')}
                </button>
              </div>
            </form>
          ) : (
            <p className="mt-0.5 text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line break-words">
              {comment.body}
            </p>
          )}
        </div>
        <div className="mt-0.5 ml-3 flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-[10px] text-slate-400 font-medium">
            {comment.timeAgo}{comment.edited ? ' · edited' : ''}
          </p>
          {canReact && <Reactions comment={comment} onReact={onReact} />}
        </div>
      </div>
    </li>
  );
}

// Comments under a post: oldest first, paged, with a box to add one.
// The commenter can edit/delete their comment; the post's author can delete any comment on it.
// onCountChange(postId, total) keeps the post's comment count in step.
export default function CommentsSection({ post, currentUserId, onCountChange }) {
  const { t } = useI18n();
  const [comments, setComments] = useState([]);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [loadError, setLoadError] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState('');

  const isPostAuthor = !!currentUserId && post.authorId === currentUserId;

  const applyTotal = useCallback((n) => {
    setTotal(n);
    onCountChange?.(post.id, n);
  }, [onCountChange, post.id]);

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    api.getComments(post.id, { limit: PAGE_SIZE, offset: 0 })
      .then((page) => {
        if (cancelled) return;
        setComments(page.comments.map(toComment));
        applyTotal(page.total);
        setState('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err.message);
        setState('error');
      });
    return () => { cancelled = true; };
  }, [post.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const page = await api.getComments(post.id, { limit: PAGE_SIZE, offset: comments.length });
      setComments((cs) => {
        const seen = new Set(cs.map((c) => c.id));
        return [...cs, ...page.comments.map(toComment).filter((c) => !seen.has(c.id))];
      });
      applyTotal(page.total);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoadingMore(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setPosting(true);
    setPostError('');
    try {
      const created = toComment(await api.addComment(post.id, { body }));
      setComments((cs) => [...cs, created]);
      applyTotal(total + 1);
      setDraft('');
    } catch (err) {
      setPostError(err.message);
    } finally {
      setPosting(false);
    }
  };

  const saveEdit = async (commentId, body) => {
    const updated = toComment(await api.updateComment(post.id, commentId, { body }));
    setComments((cs) => cs.map((c) => (c.id === commentId ? updated : c)));
  };

  // Optimistic: the chip updates at once, then settles on what the server says.
  const react = async (commentId, emoji) => {
    const c = comments.find((x) => x.id === commentId);
    if (!c) return;
    const removing = c.myReaction === emoji;
    const optimistic = { ...c.reactions };
    if (c.myReaction) optimistic[c.myReaction] = Math.max(0, (optimistic[c.myReaction] || 1) - 1);
    if (!removing) optimistic[emoji] = (optimistic[emoji] || 0) + 1;
    const set = (reactions, myReaction) =>
      setComments((cs) => cs.map((x) => (x.id === commentId ? { ...x, reactions, myReaction } : x)));
    set(optimistic, removing ? null : emoji);
    try {
      const r = removing
        ? await api.removeReaction(post.id, commentId)
        : await api.reactToComment(post.id, commentId, emoji);
      set(r.reactions, r.my_reaction ?? r.myReaction ?? null);
    } catch (err) {
      set(c.reactions, c.myReaction);
      setPostError(t('comments.reactFailed', { error: err.message }));
    }
  };

  const remove = async (commentId) => {
    try {
      await api.deleteComment(post.id, commentId);
    } catch (err) {
      setPostError(t('comments.deleteFailed', { error: err.message }));
      return;
    }
    setComments((cs) => cs.filter((c) => c.id !== commentId));
    applyTotal(Math.max(0, total - 1));
  };

  return (
    <section aria-label={t('comments.title')} className="pt-3.5 mt-3.5 border-t border-teal-100/70 space-y-3">
      {state === 'loading' && (
        <p className="flex items-center gap-1.5 text-xs text-slate-500"><Loader2 className="w-3.5 h-3.5 animate-spin" /> {t('comments.loading')}</p>
      )}
      {state === 'error' && (
        <p role="alert" className="text-xs font-bold text-rose-600">Couldn't load comments: {loadError}</p>
      )}
      {state === 'ready' && comments.length === 0 && (
        <p className="text-xs text-slate-500">{t('comments.empty')}</p>
      )}

      {comments.length > 0 && (
        <ul className="space-y-2.5">
          {comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              canEdit={c.userId === currentUserId}
              canDelete={c.userId === currentUserId || isPostAuthor}
              canReact={!!currentUserId}
              canReport={!!currentUserId && c.userId !== currentUserId}
              onSave={saveEdit}
              onDelete={remove}
              onReact={react}
            />
          ))}
        </ul>
      )}

      {state === 'ready' && comments.length < total && (
        <button onClick={loadMore} disabled={loadingMore}
          className="text-xs font-bold text-teal-700 hover:underline disabled:opacity-60">
          {loadingMore ? t('common.loading') : t('comments.showMore', { n: total - comments.length })}
        </button>
      )}

      <form onSubmit={submit} className="flex items-end gap-2">
        <label htmlFor={`comment-new-${post.id}`} className="sr-only">{t('comments.add')}</label>
        <textarea
          id={`comment-new-${post.id}`}
          rows={1}
          maxLength={MAX_LENGTH}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) submit(e); }}
          placeholder={t('comments.addPlaceholder')}
          className="flex-1 min-w-0 px-3.5 py-2 bg-white border border-teal-200 rounded-2xl text-xs sm:text-sm text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 resize-none"
        />
        <button type="submit" disabled={posting || !draft.trim()} aria-label={t('comments.post')}
          className="p-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white">
          {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
      {postError && <p role="alert" className="text-xs font-bold text-rose-600">{postError}</p>}
    </section>
  );
}
