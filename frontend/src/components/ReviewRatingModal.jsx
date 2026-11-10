import React, { useState } from 'react';
import { X, Star, ShieldCheck, Check } from 'lucide-react';

export default function ReviewRatingModal({ post, onClose, onSubmitReview }) {
  const [clarity, setClarity] = useState(5);
  const [accuracy, setAccuracy] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [role, setRole] = useState('Explorer / Student');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    
    onSubmitReview({
      postId: post.id,
      clarityScore: clarity,
      accuracyScore: accuracy,
      feedbackText: feedback,
      reviewerRole: role
    });
    setSubmitted(true);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base">Rate Technique & Peer Review</h3>
            <p className="text-xs text-slate-400 truncate max-w-sm">{post.title}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <h4 className="font-bold text-lg text-slate-900">Review Submitted!</h4>
            <p className="text-xs text-slate-500">Thank you for contributing to professional clarity on MyJob.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
            {/* Clarity Score */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-800">
                  Explanation Clarity & Structure
                </label>
                <span className="text-xs font-extrabold text-amber-600">{clarity} / 5 Stars</span>
              </div>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setClarity(star)}
                    className="p-2 rounded-xl bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 transition-colors"
                  >
                    <Star className={`w-5 h-5 ${star <= clarity ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                  </button>
                ))}
              </div>
            </div>

            {/* Technical Accuracy Score */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-800">
                  Technical Accuracy & Best Practices
                </label>
                <span className="text-xs font-extrabold text-brand-600">{accuracy} / 5 Stars</span>
              </div>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setAccuracy(star)}
                    className="p-2 rounded-xl bg-slate-50 hover:bg-brand-50 border border-slate-200 hover:border-brand-300 transition-colors"
                  >
                    <Star className={`w-5 h-5 ${star <= accuracy ? 'fill-brand-500 text-brand-500' : 'text-slate-300'}`} />
                  </button>
                ))}
              </div>
            </div>

            {/* Reviewer Persona */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Your Background / Perspective
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-brand-500"
              >
                <option value="Explorer / Student">Explorer / Student (Curious Learner)</option>
                <option value="Peer Practitioner (Verified)">Peer Practitioner in this Industry</option>
                <option value="Apprentice / Junior">Apprentice / Junior in Field</option>
                <option value="Client / Customer">Client / Customer of this Service</option>
              </select>
            </div>

            {/* Feedback textarea */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Feedback & Observations
              </label>
              <textarea
                rows={3}
                placeholder="What made this workflow useful or what nuances would you add from your experience?"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-brand-500 transition-all"
                required
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition-all"
              >
                Publish Review
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
