import React, { useState } from 'react';
import { 
  HelpCircle, MessageCircle, Send, ShieldCheck, ArrowUp, 
  Sparkles, Video, UserCheck, CheckCircle2 
} from 'lucide-react';

export default function QAHub({ qaItems, onAskQuestion, onUpvoteQA }) {
  const [questionText, setQuestionText] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('Daily Routine & Worklife');
  const [targetWorker, setTargetWorker] = useState('usr_103'); // Elena Vance

  const handleAsk = (e) => {
    e.preventDefault();
    if (!questionText.trim()) return;

    onAskQuestion({
      id: `qa_${Date.now()}`,
      workerId: targetWorker,
      workerUsername: targetWorker === 'usr_103' ? 'elena_lawyer' : 'sarah_plumber',
      workerFullName: targetWorker === 'usr_103' ? 'Elena Vance, Esq.' : 'Sarah Jenkins',
      workerProfessionTitle: targetWorker === 'usr_103' ? 'Commercial Litigation Attorney' : 'Master Plumber',
      workerAvatarUrl: targetWorker === 'usr_103' 
        ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'
        : 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
      askerUsername: 'curious_explorer',
      askerAvatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
      questionText: questionText,
      topicTag: selectedTopic,
      answerText: null, // Unanswered for worker to respond later
      upvotes: 1,
      timeAgo: 'Just now'
    });

    setQuestionText('');
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-extrabold text-base sm:text-lg text-slate-900 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-brand-600" />
            Worker Q&A AMAs (Ask Me Anything)
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Directly ask verified professionals about day-to-day realities, salaries, tools, and career paths
          </p>
        </div>
      </div>

      {/* Ask a Question Box */}
      <form onSubmit={handleAsk} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-xs font-bold text-slate-800">
            Ask a Verified Practitioner:
          </span>
          <div className="flex items-center gap-2">
            <select
              value={targetWorker}
              onChange={(e) => setTargetWorker(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-brand-500"
            >
              <option value="usr_103">Elena Vance (Litigation Attorney)</option>
              <option value="usr_101">Sarah Jenkins (Master Plumber)</option>
              <option value="usr_102">Alex Rivera (Transit Bus Operator)</option>
            </select>

            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-brand-500"
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
            className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-brand-500 transition-all"
            required
          />
          <button
            type="submit"
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Ask Pro</span>
          </button>
        </div>
      </form>

      {/* Answered Questions Stream */}
      <div className="space-y-4">
        {qaItems.map((qa) => (
          <div key={qa.id} className="border border-slate-200 rounded-2xl p-4 sm:p-5 bg-white hover:border-slate-300 transition-all">
            {/* Question Header */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80 font-bold">
                  {qa.topicTag}
                </span>
                <span className="text-xs text-slate-400 font-medium">Asked {qa.timeAgo}</span>
              </div>

              <button
                onClick={() => onUpvoteQA(qa.id)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-brand-50 border border-slate-200 text-slate-700 hover:text-brand-700 text-xs font-bold transition-colors"
              >
                <ArrowUp className="w-3.5 h-3.5" />
                <span>{qa.upvotes}</span>
              </button>
            </div>

            {/* Question Text */}
            <h4 className="font-bold text-sm sm:text-base text-slate-900 mb-3 leading-snug">
              "{qa.questionText}"
            </h4>

            {/* Worker Response Box */}
            {qa.answerText ? (
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2.5">
                  <img
                    src={qa.workerAvatarUrl}
                    alt={qa.workerFullName}
                    className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200"
                  />
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-xs text-slate-900">{qa.workerFullName}</span>
                      <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
                      <span className="text-[10px] text-slate-500 font-medium">({qa.workerProfessionTitle})</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                  {qa.answerText}
                </p>
              </div>
            ) : (
              <div className="bg-amber-50/50 border border-amber-200/60 rounded-xl p-3 text-xs text-amber-800 font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                <span>Question queued for {qa.workerFullName}'s next Q&A response shift!</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
