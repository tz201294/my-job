import React, { useState } from 'react';
import { 
  HelpCircle, MessageCircle, Send, ShieldCheck, ArrowUp, 
  Sparkles, Video, UserCheck, CheckCircle2, MessageSquareText 
} from 'lucide-react';

export default function QAHub({ qaItems, professionals = [], onAskQuestion, onUpvoteQA }) {
  const [questionText, setQuestionText] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('Daily Routine & Worklife');
  const [targetWorker, setTargetWorker] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const workerId = targetWorker || professionals[0]?.id || '';

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!questionText.trim() || !workerId) return;
    setError('');
    setBusy(true);
    try {
      await onAskQuestion(workerId, { questionText: questionText.trim(), topicTag: selectedTopic });
      setQuestionText('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white/95 border border-indigo-100 rounded-3xl p-5 sm:p-6 shadow-sm mb-6 backdrop-blur-sm card-glow">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-xl bg-indigo-100 text-indigo-700">
              <MessageSquareText className="w-5 h-5" />
            </span>
            <h3 className="font-black text-lg sm:text-xl text-slate-900 tracking-tight">
              Worker Q&A AMAs (Ask Me Anything)
            </h3>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Ask verified professionals about day-to-day work routines, salary realities, tools, and career paths
          </p>
        </div>
      </div>

      {/* Ask a Question Box with Vibrant Gradient */}
      <form onSubmit={handleAsk} className="bg-gradient-to-br from-indigo-50/80 via-purple-50/50 to-slate-50 border border-indigo-100 rounded-3xl p-4 sm:p-5 mb-6 space-y-3.5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-xs font-black text-indigo-950">
            Ask a Verified Practitioner:
          </span>
          <div className="flex items-center gap-2">
            <select
              value={workerId}
              onChange={(e) => setTargetWorker(e.target.value)}
              className="px-3 py-1.5 bg-white border border-indigo-200 rounded-xl text-xs font-bold text-indigo-900 outline-none focus:border-indigo-500 shadow-2xs"
            >
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>{p.fullName} ({p.professionTitle})</option>
              ))}
            </select>

            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="px-3 py-1.5 bg-white border border-indigo-200 rounded-xl text-xs font-bold text-indigo-900 outline-none focus:border-indigo-500 shadow-2xs"
            >
              <option value="Daily Routine & Worklife">Daily Routine & Worklife</option>
              <option value="Career & Salary Advice">Career & Salary Advice</option>
              <option value="Tools & Software">Tools & Tech Used</option>
              <option value="DIY Pitfalls & Solutions">Job Pitfalls & Tips</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. What is the hardest part of managing depositions? How do you handle 40-ton buses in snow?"
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            className="flex-1 px-4 py-2.5 bg-white border border-indigo-200 rounded-2xl text-xs text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
            required
          />
          <button
            type="submit"
            disabled={busy || !workerId}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-600 hover:from-indigo-700 hover:to-rose-700 disabled:opacity-60 text-white rounded-2xl text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-indigo-500/20 transition-all active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Ask Pro</span>
          </button>
        </div>
        {error && <p role="alert" className="text-xs font-bold text-rose-600">{error}</p>}
      </form>

      {qaItems.length === 0 && (
        <p className="text-center text-xs font-medium text-slate-500 py-6">No questions yet — ask the first one.</p>
      )}

      {/* Answered Questions Stream */}
      <div className="space-y-4">
        {qaItems.map((qa) => (
          <div key={qa.id} className="border border-indigo-100 rounded-3xl p-4 sm:p-5 bg-white hover:border-indigo-200 transition-all shadow-2xs">
            {/* Question Header */}
            <div className="flex items-start justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-3 py-0.5 rounded-full bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-800 border border-indigo-200 font-extrabold shadow-2xs">
                  {qa.topicTag}
                </span>
                <span className="text-xs text-slate-400 font-medium">Asked {qa.timeAgo}</span>
              </div>

              <button
                onClick={() => onUpvoteQA(qa.id)}
                aria-pressed={qa.upvotedByMe}
                className={`flex items-center gap-1 px-3 py-1 rounded-xl border text-xs font-black transition-colors ${
                  qa.upvotedByMe
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-800'
                }`}
              >
                <ArrowUp className="w-3.5 h-3.5" />
                <span>{qa.upvotes}</span>
              </button>
            </div>

            {/* Question Text */}
            <h4 className="font-extrabold text-sm sm:text-base text-slate-900 mb-3 leading-snug">
              "{qa.questionText}"
            </h4>

            {/* Worker Response Box */}
            {qa.answerText ? (
              <div className="bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 border border-indigo-100 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-0.5 rounded-full bg-gradient-to-tr from-indigo-500 to-rose-500">
                    <img
                      src={qa.workerAvatarUrl}
                      alt={qa.workerFullName}
                      className="w-7 h-7 rounded-full object-cover border border-white"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="font-extrabold text-xs text-slate-900">{qa.workerFullName}</span>
                      <ShieldCheck className="w-3.5 h-3.5 text-sky-500" />
                      <span className="text-[10px] text-indigo-700 font-bold">({qa.workerProfessionTitle})</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                  {qa.answerText}
                </p>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-900 font-bold flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                <span>Question queued for {qa.workerFullName}'s next Q&A response shift!</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
