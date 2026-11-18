import React, { useEffect, useState } from 'react';
import {
  X, ChevronLeft, ChevronRight, Wrench, ShieldAlert, Lightbulb, Star, ShieldCheck,
} from 'lucide-react';
import { api } from '../api/client';
import { timeAgo } from '../api/mappers';
import { useI18n } from '../i18n';

export default function CaseStudyDetailModal({ post, reviewsVersion = 0, onClose, onOpenReviewModal }) {
  const { t } = useI18n();
  const [activeStepIdx, setActiveStepIdx] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([0]);
  const [reviews, setReviews] = useState(null); // null = loading
  const [reviewsError, setReviewsError] = useState('');

  // Reload when a review is submitted (reviewsVersion bumps) so the list stays current.
  const postId = post?.id;
  useEffect(() => {
    if (!postId) return undefined;
    let cancelled = false;
    api.getReviews(postId)
      .then((r) => { if (!cancelled) { setReviews(r); setReviewsError(''); } })
      .catch((err) => { if (!cancelled) setReviewsError(err.message); });
    return () => { cancelled = true; };
  }, [postId, reviewsVersion]);

  if (!post || !post.taskDetails) return null;
  const task = post.taskDetails;
  const steps = task.steps || [];
  const currentStep = steps[activeStepIdx];

  const handleStepSelect = (idx) => {
    setActiveStepIdx(idx);
    if (!completedSteps.includes(idx)) {
      setCompletedSteps([...completedSteps, idx]);
    }
  };

  const handleNextStep = () => {
    if (activeStepIdx < steps.length - 1) {
      handleStepSelect(activeStepIdx + 1);
    }
  };

  const handlePrevStep = () => {
    if (activeStepIdx > 0) {
      setActiveStepIdx(activeStepIdx - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header bar */}
        <div className="p-4 sm:px-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <img loading="lazy" decoding="async"
              src={post.authorAvatarUrl}
              alt={post.authorFullName}
              className="w-10 h-10 rounded-full object-cover border border-white/20"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm sm:text-base">{post.authorFullName}</span>
                <ShieldCheck className="w-4 h-4 text-sky-400" />
                <span className="tag tag-dark">
                  {task.category}
                </span>
              </div>
              <p className="text-xs text-slate-400">{post.authorProfessionTitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenReviewModal(post)}
              className="hidden sm:inline-flex btn btn-sm bg-amber-500/20 hover:bg-amber-500/30 text-amber-300"
            >
              <Star className="w-3.5 h-3.5 fill-amber-300" />
              <span>{t('case.rate')}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Title & Metadata */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="tag tag-success">
                {t('case.difficulty', { level: task.difficulty ? t(`difficulty.${task.difficulty.toLowerCase()}`) : '' })}
              </span>
              {task.estimatedDuration && (
                <span className="tag tag-brand">
                  {t('case.duration', { time: task.estimatedDuration })}
                </span>
              )}
              <span className="tag tag-brand">
                {post.rating != null ? `⭐ ${post.rating} / 5.0 (${t('case.reviews', { count: post.reviewsCount })})` : t('case.notReviewed')}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug">
              {post.title}
            </h2>
          </div>

          {/* Problem Statement Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-600"></span>
              {t('case.problem')}
            </h4>
            <p className="text-sm text-slate-800 leading-relaxed font-medium">
              {task.problemStatement}
            </p>
          </div>

          {/* Tools & References Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tools Used */}
            <div className="bg-brand-50/50 border border-brand-100 rounded-2xl p-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-brand-900 mb-2.5 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-brand-600" />
                {t('case.tools')}
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {task.toolsUsed?.map((tool, idx) => (
                  <span key={idx} className="tag text-xs px-2.5 py-1">
                    {tool}
                  </span>
                ))}
              </div>
            </div>

            {/* Safety & Compliance Warnings */}
            {task.safetyWarnings && (
              <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-900 mb-2.5 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  {t('case.safety')}
                </h4>
                <p className="text-xs text-amber-900 leading-relaxed font-medium">
                  {task.safetyWarnings}
                </p>
              </div>
            )}
          </div>

          {/* Step-by-Step Interactive Workflow */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
            <div className="p-4 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  {t('case.steps')}
                </span>
                <span className="tag tag-brand">
                  {t('case.stepOf', { n: activeStepIdx + 1, total: steps.length })}
                </span>
              </div>

              {/* Progress pills */}
              <div className="flex items-center gap-1.5">
                {steps.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleStepSelect(idx)}
                    className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
                      idx === activeStepIdx
                        ? 'bg-brand-600 text-white shadow-sm scale-110'
                        : completedSteps.includes(idx)
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {completedSteps.includes(idx) && idx !== activeStepIdx ? '✓' : idx + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Step Content */}
            {currentStep && (
              <div className="p-4 sm:p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {t('case.stepTitle', { n: currentStep.stepNumber, title: currentStep.title })}
                    </h3>
                    <p className="text-sm text-slate-700 mt-2 leading-relaxed">
                      {currentStep.description}
                    </p>
                  </div>
                </div>

                {/* Step Image */}
                {currentStep.imageUrl && (
                  <div className="rounded-2xl overflow-hidden aspect-video max-h-72 w-full bg-slate-900">
                    <img loading="lazy" decoding="async"
                      src={currentStep.imageUrl}
                      alt={currentStep.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Pro Tip Box */}
                {currentStep.tip && (
                  <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200/80 rounded-xl p-3.5 text-xs text-emerald-900">
                    <Lightbulb className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">{t('case.tip')} </span>
                      <span>{currentStep.tip}</span>
                    </div>
                  </div>
                )}

                {/* Step Navigation Controls */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={handlePrevStep}
                    disabled={activeStepIdx === 0}
                    className="flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>{t('case.previous')}</span>
                  </button>

                  <button
                    onClick={handleNextStep}
                    disabled={activeStepIdx === steps.length - 1}
                    className="flex items-center gap-1 px-5 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <span>{activeStepIdx === steps.length - 1 ? t('case.completed') : t('case.next')}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Community Ratings & Peer Discussion */}
          <div className="border-t border-slate-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-base font-bold text-slate-900">{t('case.reviewsTitle')}</h4>
                <p className="text-xs text-slate-500">{t('case.reviewsSubtitle')}</p>
              </div>
              <button
                onClick={() => onOpenReviewModal(post)}
                className="btn btn-sm btn-quiet"
              >
                + Write Review
              </button>
            </div>

            {/* Reviews List */}
            <div className="space-y-3 mb-4">
              {reviewsError && <p role="alert" className="text-xs font-bold text-rose-600">{reviewsError}</p>}
              {reviews === null && !reviewsError && <p className="text-xs text-slate-500">{t('case.loadingReviews')}</p>}
              {reviews?.length === 0 && (
                <p className="text-xs text-slate-500">{t('case.noReviews')}</p>
              )}
              {reviews?.map((rv) => (
                <div key={rv.id} className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">{rv.username}</span>
                      {rv.reviewer_profession && (
                        <span className="tag">
                          {rv.reviewer_profession}
                        </span>
                      )}
                      {rv.is_peer_verified && <ShieldCheck className="w-3.5 h-3.5 text-sky-500" />}
                      <span className="text-[10px] text-slate-400">{timeAgo(rv.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
                      <Star className="w-3 h-3 fill-amber-400" />
                      <span>{((rv.clarity_score + rv.accuracy_score) / 2).toFixed(1)}</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">{rv.feedback_text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
