import React, { useState } from 'react';
import { 
  Puzzle, Lightbulb, CheckCircle2, ShieldCheck, ArrowUp, 
  MessageSquare, PlusCircle, Sparkles, Send, Wrench
} from 'lucide-react';

export default function ChallengesHub({ 
  challenges, 
  onAddSuggestion, 
  onUpvoteSuggestion,
  currentRole,
  onOpenCreateChallenge 
}) {
  const [activeChallengeId, setActiveChallengeId] = useState(challenges[0]?.id);
  const [suggestionInput, setSuggestionInput] = useState('');
  const [toolInput, setToolInput] = useState('');

  const activeChallenge = challenges.find((c) => c.id === activeChallengeId) || challenges[0];

  const handleSuggestionSubmit = (e) => {
    e.preventDefault();
    if (!suggestionInput.trim()) return;

    onAddSuggestion(activeChallenge.id, {
      id: `sug_${Date.now()}`,
      suggesterId: "usr_current",
      suggesterUsername: "curious_peer",
      suggesterProfession: currentRole === 'worker' ? "Peer Practitioner" : "Community Explorer",
      suggestionText: suggestionInput,
      suggestedTool: toolInput.trim() || undefined,
      upvotes: 0,
      isAccepted: false
    });

    setSuggestionInput('');
    setToolInput('');
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
      {/* Top Banner */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Puzzle className="w-5 h-5 text-indigo-400" />
            <h3 className="font-extrabold text-base sm:text-lg">Live Work Challenges & Brainstorming</h3>
          </div>
          <p className="text-xs text-slate-300">
            Real workers posting tricky dilemmas — contribute insights, tools, and hypothesis solutions!
          </p>
        </div>

        {currentRole === 'worker' && (
          <button
            onClick={onOpenCreateChallenge}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Post Challenge</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        {/* Left Sidebar: Challenges List */}
        <div className="lg:col-span-5 p-3 space-y-2 bg-slate-50/50">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 px-2 block mb-1">
            Active Work Dilemmas
          </span>
          {challenges.map((chal) => {
            const isSelected = chal.id === activeChallenge?.id;
            return (
              <div
                key={chal.id}
                onClick={() => setActiveChallengeId(chal.id)}
                className={`p-3.5 rounded-xl cursor-pointer transition-all border ${
                  isSelected
                    ? 'bg-white border-brand-500 shadow-sm ring-1 ring-brand-500/20'
                    : 'bg-white hover:bg-slate-100/80 border-slate-200/80'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-100 text-brand-800">
                    {chal.category}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">{chal.timeAgo}</span>
                </div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-2 leading-snug mb-1">
                  {chal.title}
                </h4>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>By {chal.workerFullName}</span>
                  <span className="font-semibold text-brand-600">
                    💡 {chal.suggestions?.length || 0} Ideas
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Detail Pane */}
        {activeChallenge && (
          <div className="lg:col-span-7 p-4 sm:p-6 space-y-5">
            {/* Worker Context */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={activeChallenge.workerAvatarUrl}
                  alt={activeChallenge.workerFullName}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-slate-900">{activeChallenge.workerFullName}</span>
                    <ShieldCheck className="w-4 h-4 text-brand-600" />
                  </div>
                  <p className="text-xs text-slate-500">{activeChallenge.workerProfessionTitle}</p>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
                Status: {activeChallenge.urgencyLevel}
              </span>
            </div>

            {/* Dilemma Description */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                The Practical Challenge
              </h4>
              <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                {activeChallenge.scenarioDescription}
              </p>
            </div>

            {/* Community Suggestions Stream */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  Crowdsourced Solution Hypotheses ({activeChallenge.suggestions?.length || 0})
                </h4>
              </div>

              <div className="space-y-3 mb-4">
                {activeChallenge.suggestions?.map((sug) => (
                  <div
                    key={sug.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      sug.isAccepted
                        ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-400/30'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">{sug.suggesterUsername}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                            {sug.suggesterProfession}
                          </span>
                          {sug.isAccepted && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Accepted Solution
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Upvote button */}
                      <button
                        onClick={() => onUpvoteSuggestion(activeChallenge.id, sug.id)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-brand-50 border border-slate-200 hover:border-brand-300 text-slate-700 hover:text-brand-700 text-xs font-bold transition-colors"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                        <span>{sug.upvotes}</span>
                      </button>
                    </div>

                    <p className="text-xs text-slate-800 leading-relaxed font-medium mb-2">
                      {sug.suggestionText}
                    </p>

                    {sug.suggestedTool && (
                      <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                        <Wrench className="w-3 h-3 text-slate-500" />
                        <span>Suggested: {sug.suggestedTool}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Submit Suggestion Form */}
              <form onSubmit={handleSuggestionSubmit} className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 space-y-2.5">
                <span className="text-xs font-bold text-slate-800 block">
                  Contribute your solution or tool idea:
                </span>
                <textarea
                  rows={2}
                  placeholder="Describe your hypothesis, precedent, or diagnostic test..."
                  value={suggestionInput}
                  onChange={(e) => setSuggestionInput(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-brand-500 transition-all"
                  required
                />
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Optional tool/standard reference (e.g. 1/4-inch arrestor, FRCP Rule 45)..."
                    value={toolInput}
                    onChange={(e) => setToolInput(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-brand-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Idea</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
