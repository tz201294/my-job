import React, { useState } from 'react';
import {
  Heart, MessageCircle, Bookmark, Star, Wrench, ShieldCheck, ChevronRight, Share2, Layers,
} from 'lucide-react';

import OwnerActions from './OwnerActions';
import ReportButton from './ReportButton';
import CommentsSection from './CommentsSection';
import { useI18n } from '../i18n';

const difficultyGradients = {
  expert: 'from-slate-700 to-slate-900',
  advanced: 'from-cyan-600 to-sky-700',
  intermediate: 'from-teal-500 to-cyan-600',
  beginner: 'from-emerald-500 to-teal-500',
};

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
}) {
  const { t } = useI18n();
  const [showComments, setShowComments] = useState(initialShowComments);
  const isCaseStudy = post.postType === 'pro_case_study' || post.postType === 'task_walkthrough';
  const task = post.taskDetails;
  const diffKey = task?.difficulty?.toLowerCase() || 'expert';
  const diffGradient = difficultyGradients[diffKey] || 'from-teal-600 to-cyan-600';

  return (
    <div className="bg-white/95 border border-teal-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 backdrop-blur-sm card-glow">
      {/* Post Author Bar */}
      <div className="p-4 sm:p-5 flex items-center justify-between">
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => onOpenUserProfile && onOpenUserProfile(post.authorUsername)}
        >
          <div className="p-0.5 rounded-full bg-gradient-to-tr from-teal-500 to-cyan-400 group-hover:scale-105 transition-all shadow-xs">
            <img loading="lazy" decoding="async"
              src={post.authorAvatarUrl}
              alt={post.authorFullName}
              className="w-11 h-11 rounded-full object-cover border-2 border-white"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm sm:text-base text-slate-900 group-hover:text-teal-600 transition-colors">
                {post.authorFullName}
              </span>
              {post.isAuthorVerified && (
                <ShieldCheck className="w-4 h-4 text-sky-500 fill-sky-50" />
              )}
            </div>
            <p className="text-xs text-teal-700/80 font-bold">
              {post.authorProfessionTitle} • <span className="text-slate-400 font-medium">{post.timeAgo}</span>
            </p>
          </div>
        </div>

        {/* Content Type Badge (+ edit/delete on your own posts) */}
        <div className="flex items-center gap-2">
          {isOwn && (
            <OwnerActions
              label="post"
              onEdit={() => onEdit(post)}
              onDelete={() => onDelete(post.id)}
              confirmText={t('post.confirmDelete')}
            />
          )}
          {!isOwn && currentUserId && <ReportButton targetType="post" targetId={post.id} label="post" />}
          {isCaseStudy ? (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-teal-600 to-cyan-600 text-white text-xs font-black shadow-sm shadow-teal-500/20">
              <Layers className="w-3.5 h-3.5" />
              {t('post.caseStudy')}
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full bg-gradient-to-r from-teal-50 to-cyan-50 text-teal-900 text-xs font-extrabold border border-teal-200">
              {t('post.milestone')}
            </span>
          )}
        </div>
      </div>

      {/* Main Image / Media Banner */}
      <div 
        className="relative aspect-[16/10] sm:aspect-[16/9] w-full bg-slate-900 overflow-hidden cursor-pointer group"
        onClick={() => isCaseStudy && onOpenCaseStudy(post)}
      >
        <img loading="lazy" decoding="async"
          src={post.mediaUrl}
          alt={post.title}
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 opacity-95 group-hover:opacity-100"
        />
        
        {/* If Case Study: Overlay Banner for Quick Insights */}
        {isCaseStudy && (
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/95 via-slate-950/70 to-transparent p-4 sm:p-5 pt-12 text-white">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`px-2.5 py-0.5 rounded-full bg-gradient-to-r ${diffGradient} text-white text-[10px] font-black uppercase tracking-wider shadow-xs`}>
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

      {/* Post Body & Context */}
      <div className="p-4 sm:p-5">
        {!isCaseStudy && (
          <h3 className="font-extrabold text-base sm:text-lg text-slate-900 mb-2">
            {post.title}
          </h3>
        )}

        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed mb-3.5 font-medium">
          {post.caption}
        </p>

        {/* Structured Task Mini-Preview (For Case Studies) */}
        {isCaseStudy && task && (
          <div className="mb-4 bg-gradient-to-br from-teal-50/70 via-cyan-50/40 to-slate-50 border border-teal-100 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-teal-100">
              <div className="flex items-center gap-1.5 text-xs font-black text-teal-950">
                <Wrench className="w-4 h-4 text-teal-600" />
                <span>{t('post.tools')}</span>
              </div>
              <span className="text-[11px] font-bold text-teal-600 bg-white px-2 py-0.5 rounded-full border border-teal-200 shadow-2xs">
                {task.steps?.length || 0} Step Workflow
              </span>
            </div>
            
            {/* Tool Chips */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {task.toolsUsed?.slice(0, 3).map((tool, idx) => (
                <span key={idx} className="px-2.5 py-1 rounded-lg bg-white border border-teal-200/80 text-[11px] font-bold text-teal-900 shadow-2xs">
                  {tool}
                </span>
              ))}
              {task.toolsUsed?.length > 3 && (
                <span className="px-2 py-1 rounded-lg bg-teal-100 text-[11px] font-bold text-teal-700">
                  +{task.toolsUsed.length - 3} more
                </span>
              )}
            </div>

            {/* Quick Step Teaser */}
            {task.steps && task.steps[0] && (
              <div className="flex items-start gap-2.5 bg-white p-3 rounded-xl border border-teal-100 text-xs text-slate-700 shadow-2xs">
                <span className="w-6 h-6 rounded-full bg-gradient-to-tr from-teal-600 to-cyan-600 text-white font-black flex items-center justify-center flex-shrink-0 text-xs shadow-xs">
                  1
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-slate-900 truncate">{task.steps[0].title}</p>
                  <p className="text-[11px] text-slate-500 truncate">{task.steps[0].description}</p>
                </div>
              </div>
            )}

            {/* CTA to Open Full Workflow */}
            <button
              onClick={() => onOpenCaseStudy(post)}
              className="mt-3.5 w-full py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-teal-500/20 active:scale-[0.99]"
            >
              <span>{t('post.exploreSteps')}</span>
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        )}

        {/* Tags with colorful pills */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {post.tags?.map((tag, idx) => (
            <span key={idx} className="text-xs font-bold text-teal-600 hover:text-cyan-600 bg-teal-50/80 px-2.5 py-0.5 rounded-lg border border-teal-100 hover:border-teal-300 transition-colors cursor-pointer">
              #{tag}
            </span>
          ))}
        </div>

        {/* Social Actions & Community Ratings Bar */}
        <div className="pt-3.5 border-t border-teal-100/70 flex items-center justify-between text-slate-600 text-xs font-bold">
          <div className="flex items-center gap-4">
            {/* Like */}
            <button
              onClick={() => onLike(post.id)}
              className={`flex items-center gap-1.5 transition-all active:scale-125 ${
                post.isLiked ? 'text-rose-600' : 'hover:text-rose-600 text-slate-600'
              }`}
            >
              <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
              <span>{post.likesCount}</span>
            </button>

            {/* Comments */}
            <button
              onClick={() => setShowComments((v) => !v)}
              aria-expanded={showComments}
              aria-label={t('post.commentsLabel', { n: post.commentsCount })}
              className={`flex items-center gap-1.5 transition-colors ${showComments ? 'text-teal-600' : 'hover:text-teal-600'}`}
            >
              <MessageCircle className="w-4 h-4" />
              <span>{post.commentsCount}</span>
            </button>

            {/* Rating Indicator (For Case Studies) */}
            {isCaseStudy && (
              <button
                onClick={() => onOpenReviewModal(post)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 transition-colors shadow-2xs"
              >
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                {post.rating != null ? (
                  <>
                    <span className="font-black">{post.rating}</span>
                    <span className="text-[10px] text-amber-800 font-semibold">({post.reviewsCount})</span>
                  </>
                ) : (
                  <span className="font-black text-[11px]">{t('post.firstReview')}</span>
                )}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onBookmark(post.id)}
              className={`p-2 rounded-xl hover:bg-teal-50 transition-colors ${
                post.isBookmarked ? 'text-teal-600 bg-teal-50' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${post.isBookmarked ? 'fill-teal-600' : ''}`} />
            </button>
            <button className="p-2 rounded-xl hover:bg-teal-50 text-slate-400 hover:text-slate-600 transition-colors">
              <Share2 className="w-4 h-4" />
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
