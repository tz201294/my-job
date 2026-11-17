import React, { useState } from 'react';
import { 
   Heart, MessageCircle, Bookmark, Star, Wrench, ShieldCheck, 
   ArrowRight, CheckCircle2, ChevronRight, Share2, Layers, AlertTriangle, Sparkles
 } from 'lucide-react';

import OwnerActions from './OwnerActions';
import CommentsSection from './CommentsSection';

const difficultyGradients = {
  expert: 'from-purple-600 via-fuchsia-600 to-pink-600',
  advanced: 'from-amber-500 via-orange-500 to-red-500',
  intermediate: 'from-sky-500 via-blue-600 to-indigo-600',
  beginner: 'from-emerald-500 to-teal-600',
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
}) {
  const [showComments, setShowComments] = useState(false);
  const isCaseStudy = post.postType === 'pro_case_study' || post.postType === 'task_walkthrough';
  const task = post.taskDetails;
  const diffKey = task?.difficulty?.toLowerCase() || 'expert';
  const diffGradient = difficultyGradients[diffKey] || 'from-indigo-600 to-purple-600';

  return (
    <div className="bg-white/95 border border-indigo-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 backdrop-blur-sm card-glow">
      {/* Post Author Bar */}
      <div className="p-4 sm:p-5 flex items-center justify-between">
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => onOpenUserProfile && onOpenUserProfile(post.authorUsername)}
        >
          <div className="p-0.5 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-rose-500 group-hover:scale-105 transition-all shadow-xs">
            <img
              src={post.authorAvatarUrl}
              alt={post.authorFullName}
              className="w-11 h-11 rounded-full object-cover border-2 border-white"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm sm:text-base text-slate-900 group-hover:text-indigo-600 transition-colors">
                {post.authorFullName}
              </span>
              {post.isAuthorVerified && (
                <ShieldCheck className="w-4 h-4 text-sky-500 fill-sky-50" />
              )}
            </div>
            <p className="text-xs text-indigo-700/80 font-bold">
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
              confirmText="Delete this post? Its likes, saves and reviews are removed too. This cannot be undone."
            />
          )}
          {isCaseStudy ? (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-black shadow-sm shadow-indigo-500/20">
              <Layers className="w-3.5 h-3.5" />
              Pro Case Study
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-100 to-rose-100 text-amber-900 text-xs font-extrabold border border-amber-200">
              Milestone
            </span>
          )}
        </div>
      </div>

      {/* Main Image / Media Banner */}
      <div 
        className="relative aspect-[16/10] sm:aspect-[16/9] w-full bg-slate-900 overflow-hidden cursor-pointer group"
        onClick={() => isCaseStudy && onOpenCaseStudy(post)}
      >
        <img
          src={post.mediaUrl}
          alt={post.title}
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 opacity-95 group-hover:opacity-100"
        />
        
        {/* If Case Study: Overlay Banner for Quick Insights */}
        {isCaseStudy && (
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/95 via-slate-950/70 to-transparent p-4 sm:p-5 pt-12 text-white">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`px-2.5 py-0.5 rounded-full bg-gradient-to-r ${diffGradient} text-white text-[10px] font-black uppercase tracking-wider shadow-xs`}>
                {task?.difficulty || 'Professional'}
              </span>
              <span className="text-xs text-white/90 font-bold bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full">
                ⏱️ {task?.estimatedDuration || 'Workflow Guide'}
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
          <div className="mb-4 bg-gradient-to-br from-indigo-50/70 via-purple-50/40 to-slate-50 border border-indigo-100 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-indigo-100">
              <div className="flex items-center gap-1.5 text-xs font-black text-indigo-950">
                <Wrench className="w-4 h-4 text-indigo-600" />
                <span>Tools & Reference Standards</span>
              </div>
              <span className="text-[11px] font-bold text-indigo-600 bg-white px-2 py-0.5 rounded-full border border-indigo-200 shadow-2xs">
                {task.steps?.length || 0} Step Workflow
              </span>
            </div>
            
            {/* Tool Chips */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {task.toolsUsed?.slice(0, 3).map((tool, idx) => (
                <span key={idx} className="px-2.5 py-1 rounded-lg bg-white border border-indigo-200/80 text-[11px] font-bold text-indigo-900 shadow-2xs">
                  {tool}
                </span>
              ))}
              {task.toolsUsed?.length > 3 && (
                <span className="px-2 py-1 rounded-lg bg-indigo-100 text-[11px] font-bold text-indigo-700">
                  +{task.toolsUsed.length - 3} more
                </span>
              )}
            </div>

            {/* Quick Step Teaser */}
            {task.steps && task.steps[0] && (
              <div className="flex items-start gap-2.5 bg-white p-3 rounded-xl border border-indigo-100 text-xs text-slate-700 shadow-2xs">
                <span className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-black flex items-center justify-center flex-shrink-0 text-xs shadow-xs">
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
              className="mt-3.5 w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-500/20 active:scale-[0.99]"
            >
              <span>Explore Full Step-by-Step Execution</span>
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        )}

        {/* Tags with colorful pills */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {post.tags?.map((tag, idx) => (
            <span key={idx} className="text-xs font-bold text-indigo-600 hover:text-purple-600 bg-indigo-50/80 px-2.5 py-0.5 rounded-lg border border-indigo-100 hover:border-indigo-300 transition-colors cursor-pointer">
              #{tag}
            </span>
          ))}
        </div>

        {/* Social Actions & Community Ratings Bar */}
        <div className="pt-3.5 border-t border-indigo-100/70 flex items-center justify-between text-slate-600 text-xs font-bold">
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
              aria-label={`Comments (${post.commentsCount})`}
              className={`flex items-center gap-1.5 transition-colors ${showComments ? 'text-indigo-600' : 'hover:text-indigo-600'}`}
            >
              <MessageCircle className="w-4 h-4" />
              <span>{post.commentsCount}</span>
            </button>

            {/* Rating Indicator (For Case Studies) */}
            {isCaseStudy && (
              <button
                onClick={() => onOpenReviewModal(post)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 border border-amber-300 text-amber-900 transition-colors shadow-2xs"
              >
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                {post.rating != null ? (
                  <>
                    <span className="font-black">{post.rating}</span>
                    <span className="text-[10px] text-amber-800 font-semibold">({post.reviewsCount})</span>
                  </>
                ) : (
                  <span className="font-black text-[11px]">Be the first to review</span>
                )}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onBookmark(post.id)}
              className={`p-2 rounded-xl hover:bg-indigo-50 transition-colors ${
                post.isBookmarked ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${post.isBookmarked ? 'fill-indigo-600' : ''}`} />
            </button>
            <button className="p-2 rounded-xl hover:bg-indigo-50 text-slate-400 hover:text-slate-600 transition-colors">
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
