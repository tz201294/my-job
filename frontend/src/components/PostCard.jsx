import React, { useState } from 'react';
import {
  Heart, MessageCircle, Bookmark, Star, ShieldCheck, ChevronRight, Share2, Layers, ListChecks,
} from 'lucide-react';

import PostMenu from './PostMenu';
import CommentsSection from './CommentsSection';
import { useI18n } from '../i18n';
import { paths } from '../routes';

const difficultyGradients = {
  expert: 'from-slate-700 to-slate-900',
  advanced: 'from-cyan-600 to-sky-700',
  intermediate: 'from-teal-500 to-cyan-600',
  beginner: 'from-emerald-500 to-teal-500',
};

const MAX_TAGS = 3;
const LONG_CAPTION = 160; // characters; longer captions start folded to three lines

// The post's own address, for sharing.
function postUrl(id) {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');
  return new URL(`${base}${paths.post(id)}`, window.location.origin).href;
}

function Caption({ text, full }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  if (!text) return null;
  const long = !full && text.length > LONG_CAPTION;
  return (
    <div className="mb-3">
      <p className={`text-sm text-slate-700 leading-relaxed ${long && !open ? 'line-clamp-3' : ''}`}>{text}</p>
      {long && (
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
          className="mt-0.5 text-xs font-bold text-slate-500 hover:text-teal-700">
          {open ? t('post.less') : t('post.more')}
        </button>
      )}
    </div>
  );
}

export default function PostCard({
  post,
  onLike,
  onBookmark,
  onOpenCaseStudy,
  onOpenReviewModal,
  onOpenUserProfile,
  isOwn = false,
  onEdit,
  onDelete,
  currentUserId,
  onCommentsCountChange,
  initialShowComments = false,
  full = false, // the post's own page: whole caption and every tag
}) {
  const { t } = useI18n();
  const [showComments, setShowComments] = useState(initialShowComments);
  const [copied, setCopied] = useState(false);
  const isCaseStudy = post.postType === 'pro_case_study' || post.postType === 'task_walkthrough';
  const task = post.taskDetails;
  const diffKey = task?.difficulty?.toLowerCase() || 'expert';
  const diffGradient = difficultyGradients[diffKey] || 'from-teal-600 to-cyan-600';
  const stepCount = task?.steps?.length || 0;
  const toolCount = task?.toolsUsed?.length || 0;

  const share = async () => {
    const url = postUrl(post.id);
    try {
      if (navigator.share) {
        await navigator.share({ title: post.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sharing was cancelled, or the clipboard isn't available: nothing to do.
    }
  };

  return (
    <div className="bg-white border border-teal-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 card-glow">
      {/* Author, a small type tag and the ⋯ menu */}
      <div className="px-4 py-3.5 sm:px-5 flex items-center justify-between gap-3">
        <button
          type="button"
          className="flex items-center gap-3 min-w-0 text-left group"
          onClick={() => onOpenUserProfile && onOpenUserProfile(post.authorUsername)}
        >
          <img loading="lazy" decoding="async"
            src={post.authorAvatarUrl}
            alt=""
            className="w-10 h-10 shrink-0 rounded-full object-cover ring-2 ring-teal-100 group-hover:ring-teal-300 transition-all"
          />
          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm text-slate-900 group-hover:text-teal-700 transition-colors truncate">
                {post.authorFullName}
              </span>
              {post.isAuthorVerified && <ShieldCheck className="w-4 h-4 shrink-0 text-sky-500 fill-sky-50" />}
            </span>
            <span className="block text-xs text-slate-500 truncate">
              <span className="font-semibold text-teal-700">{post.authorProfessionTitle}</span> · {post.timeAgo}
            </span>
          </span>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          {isCaseStudy ? (
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 text-[11px] font-bold">
              <Layers className="w-3 h-3" aria-hidden="true" />
              {t('post.caseStudy')}
            </span>
          ) : (
            <span className="hidden sm:inline px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-bold">
              {t('post.milestone')}
            </span>
          )}
          {currentUserId && (
            <PostMenu
              postId={post.id}
              isOwn={isOwn}
              onEdit={() => onEdit(post)}
              onDelete={() => onDelete(post.id)}
              confirmText={t('post.confirmDelete')}
            />
          )}
        </div>
      </div>

      {/* Photo; a case study carries its level, time and title on it */}
      <div
        className={`relative aspect-[16/10] sm:aspect-[16/9] w-full bg-slate-900 overflow-hidden group ${isCaseStudy ? 'cursor-pointer' : ''}`}
        onClick={() => isCaseStudy && onOpenCaseStudy(post)}
      >
        <img loading="lazy" decoding="async"
          src={post.mediaUrl}
          alt={post.title}
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
        />
        {isCaseStudy && (
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-transparent p-4 sm:p-5 pt-12 text-white">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`px-2.5 py-0.5 rounded-full bg-gradient-to-r ${diffGradient} text-white text-[10px] font-black uppercase tracking-wider`}>
                {task?.difficulty ? t(`difficulty.${task.difficulty.toLowerCase()}`) : t('role.professional')}
              </span>
              <span className="text-xs text-white/90 font-bold bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full">
                ⏱️ {task?.estimatedDuration || t('post.workflowGuide')}
              </span>
            </div>
            <h3 className="font-extrabold text-base sm:text-lg text-white leading-snug line-clamp-2 drop-shadow-sm">
              {post.title}
            </h3>
          </div>
        )}
      </div>

      <div className="px-4 pt-3.5 pb-3 sm:px-5">
        {!isCaseStudy && (
          <h3 className="font-extrabold text-base sm:text-lg text-slate-900 mb-1.5">{post.title}</h3>
        )}

        <Caption text={post.caption} full={full} />

        {/* A case study's steps, in one line: the full walkthrough opens on tap */}
        {isCaseStudy && task && (
          <button
            type="button"
            onClick={() => onOpenCaseStudy(post)}
            className="w-full mb-3 flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-teal-50/70 hover:bg-teal-50 border border-teal-100 hover:border-teal-200 text-left transition-colors"
          >
            <span className="flex items-center gap-2 min-w-0 text-xs font-semibold text-slate-700">
              <ListChecks className="w-4 h-4 shrink-0 text-teal-600" aria-hidden="true" />
              <span className="truncate">
                {t('post.steps', { count: stepCount })}
                {toolCount > 0 && ` · ${t('post.toolsCount', { count: toolCount })}`}
              </span>
            </span>
            <span className="shrink-0 inline-flex items-center gap-0.5 text-xs font-extrabold text-teal-700">
              {t('post.seeSteps')} <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </span>
          </button>
        )}

        {post.tags?.length > 0 && (
          <p className="flex flex-wrap gap-x-2.5 gap-y-1 mb-3 text-xs font-semibold text-teal-700">
            {(full ? post.tags : post.tags.slice(0, MAX_TAGS)).map((tag, i) => <span key={`${tag}-${i}`}>#{tag}</span>)}
          </p>
        )}

        {/* Like, comment, rating · save, share */}
        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-slate-600 text-xs font-bold">
          <div className="flex items-center gap-4">
            <button
              onClick={() => onLike(post.id)}
              className={`flex items-center gap-1.5 py-1 transition-all active:scale-125 ${
                post.isLiked ? 'text-rose-600' : 'hover:text-rose-600 text-slate-600'
              }`}
            >
              <Heart key={post.isLiked ? 'liked' : 'not-liked'}
                className={`w-[18px] h-[18px] ${post.isLiked ? 'fill-rose-500 text-rose-500 like-pop' : ''}`} />
              <span>{post.likesCount}</span>
            </button>

            <button
              onClick={() => setShowComments((v) => !v)}
              aria-expanded={showComments}
              aria-label={t('post.commentsLabel', { n: post.commentsCount })}
              className={`flex items-center gap-1.5 py-1 transition-colors ${showComments ? 'text-teal-600' : 'hover:text-teal-600'}`}
            >
              <MessageCircle className="w-[18px] h-[18px]" />
              <span>{post.commentsCount}</span>
            </button>

            {isCaseStudy && (
              <button
                onClick={() => onOpenReviewModal(post)}
                className="flex items-center gap-1 py-1 text-slate-700 hover:text-amber-700 transition-colors"
              >
                <Star className="w-[18px] h-[18px] fill-amber-400 text-amber-500" />
                {post.rating != null ? (
                  <>
                    <span className="font-black">{post.rating}</span>
                    <span className="text-[11px] text-slate-400 font-semibold">({post.reviewsCount})</span>
                  </>
                ) : (
                  <span className="text-[11px] font-semibold text-slate-500">{t('post.firstReview')}</span>
                )}
              </button>
            )}
          </div>

          <div className="flex items-center gap-1">
            {copied && <span role="status" className="text-[11px] font-bold text-teal-700 mr-1">{t('post.linkCopied')}</span>}
            <button
              onClick={() => onBookmark(post.id)}
              aria-label={post.isBookmarked ? t('post.unsave') : t('post.save')}
              aria-pressed={!!post.isBookmarked}
              className={`p-2 rounded-xl hover:bg-teal-50 transition-colors ${
                post.isBookmarked ? 'text-teal-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Bookmark className={`w-[18px] h-[18px] ${post.isBookmarked ? 'fill-teal-600' : ''}`} />
            </button>
            <button
              onClick={share}
              aria-label={t('post.share')}
              className="p-2 rounded-xl hover:bg-teal-50 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <Share2 className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>

        {showComments && (
          <CommentsSection post={post} currentUserId={currentUserId} onCountChange={onCommentsCountChange} />
        )}
      </div>
    </div>
  );
}
