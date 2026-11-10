import React, { useState } from 'react';
import { 
  Heart, MessageCircle, Bookmark, Star, Wrench, ShieldCheck, 
  ArrowRight, CheckCircle2, ChevronRight, Share2, Layers, AlertTriangle
} from 'lucide-react';

export default function PostCard({ 
  post, 
  onLike, 
  onBookmark, 
  onOpenCaseStudy, 
  onOpenReviewModal 
}) {
  const isCaseStudy = post.postType === 'pro_case_study' || post.postType === 'task_walkthrough';
  const task = post.taskDetails;

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
      {/* Post Author Bar */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={post.authorAvatarUrl}
            alt={post.authorFullName}
            className="w-11 h-11 rounded-full object-cover ring-2 ring-slate-100"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-slate-900">{post.authorFullName}</span>
              {post.isAuthorVerified && (
                <ShieldCheck className="w-4 h-4 text-brand-600 fill-brand-50" />
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {post.authorProfessionTitle} • <span className="text-slate-400">{post.timeAgo}</span>
            </p>
          </div>
        </div>

        {/* Content Type Badge */}
        <div>
          {isCaseStudy ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-brand-50 to-indigo-50 border border-brand-200 text-brand-700 text-xs font-bold shadow-sm">
              <Layers className="w-3.5 h-3.5 text-brand-600" />
              Pro Case Study
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
              Milestone Update
            </span>
          )}
        </div>
      </div>

      {/* Main Image / Media Banner */}
      <div 
        className="relative aspect-[16/10] sm:aspect-[16/9] w-full bg-slate-100 overflow-hidden cursor-pointer group"
        onClick={() => isCaseStudy && onOpenCaseStudy(post)}
      >
        <img
          src={post.mediaUrl}
          alt={post.title}
          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
        />
        
        {/* If Case Study: Overlay Banner for Quick Insights */}
        {isCaseStudy && (
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/90 via-slate-950/60 to-transparent p-4 pt-10 text-white">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/90 text-white text-[10px] font-bold uppercase tracking-wider">
                {task?.difficulty || 'Professional'}
              </span>
              <span className="text-xs text-white/80 font-medium">
                ⏱️ {task?.estimatedDuration || 'Workflow Guide'}
              </span>
            </div>
            <h3 className="font-bold text-base sm:text-lg text-white leading-snug line-clamp-2">
              {post.title}
            </h3>
          </div>
        )}
      </div>

      {/* Post Body & Context */}
      <div className="p-4 sm:p-5">
        {!isCaseStudy && (
          <h3 className="font-bold text-base text-slate-900 mb-2">
            {post.title}
          </h3>
        )}

        <p className="text-sm text-slate-700 leading-relaxed mb-3">
          {post.caption}
        </p>

        {/* Structured Task Mini-Preview (For Case Studies) */}
        {isCaseStudy && task && (
          <div className="mb-4 bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200/60">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Wrench className="w-3.5 h-3.5 text-brand-600" />
                <span>Tools & Reference Standards</span>
              </div>
              <span className="text-[11px] font-medium text-slate-500">
                {task.steps?.length || 0} Step Workflow
              </span>
            </div>
            
            {/* Tool Chips */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {task.toolsUsed?.slice(0, 3).map((tool, idx) => (
                <span key={idx} className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 shadow-2xs">
                  {tool}
                </span>
              ))}
              {task.toolsUsed?.length > 3 && (
                <span className="px-2 py-0.5 rounded-md bg-slate-200/70 text-[11px] font-semibold text-slate-600">
                  +{task.toolsUsed.length - 3} more
                </span>
              )}
            </div>

            {/* Quick Step Teaser */}
            {task.steps && task.steps[0] && (
              <div className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-slate-200/70 text-xs text-slate-600">
                <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 font-extrabold flex items-center justify-center flex-shrink-0 text-[10px]">
                  1
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 truncate">{task.steps[0].title}</p>
                  <p className="text-[11px] text-slate-500 truncate">{task.steps[0].description}</p>
                </div>
              </div>
            )}

            {/* CTA to Open Full Workflow */}
            <button
              onClick={() => onOpenCaseStudy(post)}
              className="mt-3 w-full py-2 bg-white hover:bg-brand-50 border border-brand-200 text-brand-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
            >
              <span>Explore Full Step-by-Step Execution</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {post.tags?.map((tag, idx) => (
            <span key={idx} className="text-xs font-semibold text-brand-700 hover:underline cursor-pointer">
              #{tag}
            </span>
          ))}
        </div>

        {/* Social Actions & Community Ratings Bar */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-slate-600 text-xs font-semibold">
          <div className="flex items-center gap-4">
            {/* Like */}
            <button
              onClick={() => onLike(post.id)}
              className={`flex items-center gap-1.5 transition-colors ${
                post.isLiked ? 'text-rose-600' : 'hover:text-rose-600'
              }`}
            >
              <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-rose-600 text-rose-600' : ''}`} />
              <span>{post.likesCount}</span>
            </button>

            {/* Comments */}
            <button 
              onClick={() => onOpenCaseStudy(post)}
              className="flex items-center gap-1.5 hover:text-brand-600 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{post.commentsCount}</span>
            </button>

            {/* Rating Indicator (For Case Studies) */}
            {isCaseStudy && (
              <button
                onClick={() => onOpenReviewModal(post)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-200/80 text-amber-800 transition-colors"
              >
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                <span className="font-bold">{post.rating || '4.9'}</span>
                <span className="text-[10px] text-amber-700/80">({post.reviewsCount || 12} reviews)</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onBookmark(post.id)}
              className={`p-1.5 rounded-lg hover:bg-slate-100 transition-colors ${
                post.isBookmarked ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${post.isBookmarked ? 'fill-brand-600' : ''}`} />
            </button>
            <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
