import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import PostCard from './PostCard';

// One post on its own, with its comments open (used when opening a post from a notification).
export default function PostModal({ post, onClose, ...cardProps }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm overflow-y-auto" role="dialog" aria-modal="true"
      aria-label={post.title} onClick={onClose}>
      <div className="min-h-full flex items-start justify-center p-3 sm:p-6">
        <div className="relative w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={onClose} aria-label="Close"
            className="absolute -top-1 right-1 sm:-right-12 sm:top-0 z-10 p-2 rounded-full bg-white/90 sm:bg-white/10 text-slate-700 sm:text-white hover:bg-white sm:hover:bg-white/20 shadow">
            <X className="w-5 h-5" />
          </button>
          <div className="rounded-3xl bg-white">
            <PostCard post={post} initialShowComments {...cardProps} />
          </div>
        </div>
      </div>
    </div>
  );
}
