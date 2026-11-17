import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { api } from '../api/client';
import { toComment } from '../api/mappers';
import OwnerActions from './OwnerActions';

const PAGE_SIZE = 20;
const MAX_LENGTH = 2000;

function CommentItem({ comment, canEdit, canDelete, onSave, onDelete }) {
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
      <img src={comment.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 border border-indigo-100" />
      <div className="flex-1 min-w-0">
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl px-3.5 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs leading-snug">
              <span className="font-extrabold text-slate-900">{comment.fullName}</span>
              {comment.professionTitle && (
                <span className="text-[10px] text-indigo-700 font-bold"> · {comment.professionTitle}</span>
              )}
            </p>
            {(canEdit || canDelete) && !editing && (
              <OwnerActions
                label="comment"
                onEdit={canEdit ? () => { setText(comment.body); setEditing(true); } : undefined}
                onDelete={canDelete ? () => onDelete(comment.id) : undefined}
                confirmText="Delete this comment?"
              />
            )}
          </div>
          {editing ? (
            <form onSubmit={save} className="mt-1.5 space-y-1.5">
              <label htmlFor={`comment-edit-${comment.id}`} className="sr-only">Edit your comment</label>
              <textarea
                id={`comment-edit-${comment.id}`}
                rows={2}
                maxLength={MAX_LENGTH}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs text-slate-800 outline-none focus:border-indigo-500 resize-y"
              />
              <div className="flex items-center justify-end gap-2">
                <span role="alert" className="mr-auto text-[11px] font-bold text-rose-600">{error}</span>
                <button type="button" onClick={() => setEditing(false)} disabled={busy}
                  className="px-3 py-1 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-200">
                  Cancel
                </button>
                <button type="submit" disabled={busy || !text.trim()}
                  className="px-3 py-1 rounded-lg text-[11px] font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60">
                  {busy ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          ) : (
            <p className="mt-0.5 text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line break-words">
              {comment.body}
            </p>
          )}
        </div>
        <p className="mt-0.5 ml-3 text-[10px] text-slate-400 font-medium">
          {comment.timeAgo}{comment.edited ? ' · edited' : ''}
        </p>
      </div>
    </li>
  );
}

// Comments under a post: oldest first, paged, with a box to add one.
// The commenter can edit/delete their comment; the post's author can delete any comment on it.
// onCountChange(postId, total) keeps the post's comment count in step.
export default function CommentsSection({ post, currentUserId, onCountChange }) {
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

  const remove = async (commentId) => {
    try {
      await api.deleteComment(post.id, commentId);
    } catch (err) {
      setPostError(`Couldn't delete the comment: ${err.message}`);
      return;
    }
    setComments((cs) => cs.filter((c) => c.id !== commentId));
    applyTotal(Math.max(0, total - 1));
  };

  return (
    <section aria-label="Comments" className="pt-3.5 mt-3.5 border-t border-indigo-100/70 space-y-3">
      {state === 'loading' && (
        <p className="flex items-center gap-1.5 text-xs text-slate-500"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading comments…</p>
      )}
      {state === 'error' && (
        <p role="alert" className="text-xs font-bold text-rose-600">Couldn't load comments: {loadError}</p>
      )}
      {state === 'ready' && comments.length === 0 && (
        <p className="text-xs text-slate-500">No comments yet. Start the conversation.</p>
      )}

      {comments.length > 0 && (
        <ul className="space-y-2.5">
          {comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              canEdit={c.userId === currentUserId}
              canDelete={c.userId === currentUserId || isPostAuthor}
              onSave={saveEdit}
              onDelete={remove}
            />
          ))}
        </ul>
      )}

      {state === 'ready' && comments.length < total && (
        <button onClick={loadMore} disabled={loadingMore}
          className="text-xs font-bold text-indigo-700 hover:underline disabled:opacity-60">
          {loadingMore ? 'Loading…' : `Show more comments (${total - comments.length})`}
        </button>
      )}

      <form onSubmit={submit} className="flex items-end gap-2">
        <label htmlFor={`comment-new-${post.id}`} className="sr-only">Add a comment</label>
        <textarea
          id={`comment-new-${post.id}`}
          rows={1}
          maxLength={MAX_LENGTH}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) submit(e); }}
          placeholder="Add a comment…"
          className="flex-1 min-w-0 px-3.5 py-2 bg-white border border-indigo-200 rounded-2xl text-xs sm:text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none"
        />
        <button type="submit" disabled={posting || !draft.trim()} aria-label="Post comment"
          className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white">
          {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
      {postError && <p role="alert" className="text-xs font-bold text-rose-600">{postError}</p>}
    </section>
  );
}
