import React, { useState } from 'react';
import { 
  Zap, Lightbulb, CheckCircle2, ShieldCheck, ArrowUp, 
  PlusCircle, Sparkles, Send, Wrench, Radio, Flame
} from 'lucide-react';

import OwnerActions from './OwnerActions';

const inputCls = 'w-full px-3.5 py-2 bg-white border border-indigo-200 rounded-xl text-xs sm:text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium';

function FormButtons({ busy, disabled, error, onCancel }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span role="alert" className="text-[11px] font-bold text-rose-600">{error}</span>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} disabled={busy}
          className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100">
          Cancel
        </button>
        <button type="submit" disabled={busy || disabled}
          className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-60">
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

// Runs `save`; on success calls onDone, on failure shows the server's message.
function useSave(save, onDone) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await save();
      onDone();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };
  return { busy, error, run };
}

function ChallengeEditForm({ challenge, categoryNames, onSave, onCancel }) {
  const [title, setTitle] = useState(challenge.title);
  const [description, setDescription] = useState(challenge.scenarioDescription);
  const [category, setCategory] = useState(challenge.category);
  const options = categoryNames.includes(category) ? categoryNames : [category, ...categoryNames];
  const { busy, error, run } = useSave(
    () => onSave({ title, scenarioDescription: description, category }),
    onCancel,
  );
  return (
    <form onSubmit={run} className="bg-orange-50/60 border border-orange-200 rounded-2xl p-4 space-y-2.5">
      <label className="block text-xs font-black text-orange-900" htmlFor={`chal-title-${challenge.id}`}>Title</label>
      <input id={`chal-title-${challenge.id}`} className={inputCls} required maxLength={255}
        value={title} onChange={(e) => setTitle(e.target.value)} />
      <label className="block text-xs font-black text-orange-900" htmlFor={`chal-desc-${challenge.id}`}>What's happening</label>
      <textarea id={`chal-desc-${challenge.id}`} className={inputCls} rows={4} required maxLength={5000}
        value={description} onChange={(e) => setDescription(e.target.value)} />
      <label className="block text-xs font-black text-orange-900" htmlFor={`chal-cat-${challenge.id}`}>Field</label>
      <select id={`chal-cat-${challenge.id}`} className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
        {options.map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
      <FormButtons busy={busy} error={error} onCancel={onCancel} disabled={!title.trim() || !description.trim()} />
    </form>
  );
}

function SuggestionEditForm({ suggestion, onSave, onCancel }) {
  const [text, setText] = useState(suggestion.suggestionText);
  const [tool, setTool] = useState(suggestion.suggestedTool || '');
  const { busy, error, run } = useSave(() => onSave({ suggestionText: text, suggestedTool: tool }), onCancel);
  return (
    <form onSubmit={run} className="space-y-2 mb-2.5">
      <label className="sr-only" htmlFor={`sug-text-${suggestion.id}`}>Your idea</label>
      <textarea id={`sug-text-${suggestion.id}`} className={inputCls} rows={3} required maxLength={2000}
        value={text} onChange={(e) => setText(e.target.value)} />
      <label className="sr-only" htmlFor={`sug-tool-${suggestion.id}`}>Tool or reference (optional)</label>
      <input id={`sug-tool-${suggestion.id}`} className={inputCls} maxLength={255}
        placeholder="Optional tool/standard reference" value={tool} onChange={(e) => setTool(e.target.value)} />
      <FormButtons busy={busy} error={error} onCancel={onCancel} disabled={!text.trim()} />
    </form>
  );
}

export default function ChallengesHub({
  challenges,
  currentUserId,
  onAddSuggestion,
  onUpvoteSuggestion,
  onAcceptSuggestion,
  onUpdateChallenge,
  onDeleteChallenge,
  onUpdateSuggestion,
  onDeleteSuggestion,
  categories = [],
  initialChallengeId = null,
  onOpenCreateChallenge
}) {
  const [activeChallengeId, setActiveChallengeId] = useState(initialChallengeId || challenges[0]?.id);
  const [suggestionInput, setSuggestionInput] = useState('');
  const [toolInput, setToolInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [acceptingId, setAcceptingId] = useState(null);
  const [editingChallengeId, setEditingChallengeId] = useState(null);
  const [editingSuggestionId, setEditingSuggestionId] = useState(null);
  const categoryNames = categories.filter((c) => c.slug !== 'all').map((c) => c.name);

  const activeChallenge = challenges.find((c) => c.id === activeChallengeId) || challenges[0];
  const isOwner = !!activeChallenge && !!currentUserId && activeChallenge.workerId === currentUserId;
  // The accepted solution is shown first; the rest keep their order.
  const suggestions = [...(activeChallenge?.suggestions || [])].sort(
    (a, b) => Number(!!b.isAccepted) - Number(!!a.isAccepted)
  );

  const handleAccept = async (sug) => {
    setAcceptingId(sug.id);
    try {
      await onAcceptSuggestion(activeChallenge.id, sug.id, !sug.isAccepted);
    } finally {
      setAcceptingId(null);
    }
  };

  const handleSuggestionSubmit = async (e) => {
    e.preventDefault();
    if (!suggestionInput.trim()) return;
    setError('');
    setBusy(true);
    try {
      await onAddSuggestion(activeChallenge.id, {
        suggestionText: suggestionInput.trim(),
        suggestedTool: toolInput.trim() || undefined,
      });
      setSuggestionInput('');
      setToolInput('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white/95 border border-indigo-100 rounded-3xl overflow-hidden shadow-sm backdrop-blur-sm card-glow">
      {/* Top Banner with Vibrant Flame / Amber Gradient */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-xl bg-white/20 backdrop-blur-md text-amber-100">
              <Zap className="w-5 h-5 fill-amber-300 text-amber-200" />
            </span>
            <h3 className="font-black text-lg sm:text-xl tracking-tight">Live Work Hub</h3>
            <span className="flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-white text-rose-600 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span> Live Shifts
            </span>
          </div>
          <p className="text-xs text-amber-100/90 font-medium max-w-lg">
            Real workers posting live challenges & real-time job scenarios — contribute hypotheses and tools!
          </p>
        </div>

        <button
          onClick={onOpenCreateChallenge}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-amber-50 text-orange-700 text-xs font-black transition-all shadow-md active:scale-95 flex-shrink-0"
        >
          <PlusCircle className="w-4 h-4 stroke-[2.5]" />
          <span>Post Live Work</span>
        </button>
      </div>

      {challenges.length === 0 && (
        <p className="text-center text-xs font-medium text-slate-500 py-10">No live work posted yet — be the first.</p>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-indigo-100">
        {/* Left Sidebar: Live Work List */}
        <div className="lg:col-span-5 p-3 space-y-2.5 bg-gradient-to-b from-indigo-50/40 to-slate-50">
          <span className="text-[11px] font-black uppercase tracking-wider text-indigo-400 px-2 block mb-1">
            Active Work Shifts
          </span>
          {challenges.map((chal) => {
            const isSelected = chal.id === activeChallenge?.id;
            return (
              <div
                key={chal.id}
                onClick={() => setActiveChallengeId(chal.id)}
                className={`p-4 rounded-2xl cursor-pointer transition-all border ${
                  isSelected
                    ? 'bg-white border-orange-500 shadow-md ring-2 ring-orange-500/20 scale-[1.01]'
                    : 'bg-white hover:bg-orange-50/50 border-slate-200/90 hover:border-orange-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-2xs">
                      {chal.category}
                    </span>
                    {chal.isSolved && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        Solved
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">{chal.timeAgo}</span>
                </div>
                <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 line-clamp-2 leading-snug mb-1.5">
                  {chal.title}
                </h4>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-600 font-medium">By {chal.workerFullName}</span>
                  <span className="font-extrabold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200/60">
                    💡 {chal.suggestions?.length || 0} Ideas
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Detail Pane */}
        {activeChallenge && (
          <div className="lg:col-span-7 p-4 sm:p-6 space-y-5 bg-white">
            {/* Worker Context */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-0.5 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500">
                  <img
                    src={activeChallenge.workerAvatarUrl}
                    alt={activeChallenge.workerFullName}
                    className="w-10 h-10 rounded-full object-cover border-2 border-white"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-sm text-slate-900">{activeChallenge.workerFullName}</span>
                    <ShieldCheck className="w-4 h-4 text-sky-500" />
                  </div>
                  <p className="text-xs text-orange-700 font-bold">{activeChallenge.workerProfessionTitle}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
              {isOwner && (
                <OwnerActions
                  label="challenge"
                  onEdit={() => setEditingChallengeId(activeChallenge.id)}
                  onDelete={() => onDeleteChallenge(activeChallenge.id)}
                  confirmText="Delete this challenge and all its ideas? This cannot be undone."
                />
              )}
              {activeChallenge.isSolved ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Solved
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 text-orange-900 text-xs font-black border border-orange-200">
                  🔴 {activeChallenge.urgencyLevel}
                </span>
              )}
              </div>
            </div>

            {/* Live Scenario Description (or the owner's edit form) */}
            {editingChallengeId === activeChallenge.id ? (
              <ChallengeEditForm
                challenge={activeChallenge}
                categoryNames={categoryNames}
                onSave={(draft) => onUpdateChallenge(activeChallenge.id, draft)}
                onCancel={() => setEditingChallengeId(null)}
              />
            ) : (
            <div className="bg-gradient-to-br from-amber-50/70 via-orange-50/40 to-slate-50 border border-orange-200/80 rounded-2xl p-4 sm:p-5">
              <h4 className="text-xs font-black uppercase tracking-wider text-orange-800 mb-2 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-orange-600" />
                <span>The Live Work Challenge</span>
              </h4>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 mb-1.5 leading-snug">
                {activeChallenge.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-semibold whitespace-pre-line">
                {activeChallenge.scenarioDescription}
              </p>
            </div>
            )}

            {/* Community Suggestions Stream */}
            <div>
              <div className="flex items-center justify-between mb-3.5">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  Crowdsourced Solution Hypotheses ({activeChallenge.suggestions?.length || 0})
                </h4>
              </div>

              {isOwner && suggestions.length > 0 && (
                <p className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 mb-3">
                  This is your challenge. When an idea solves it, mark it as the solution so others can learn from it.
                </p>
              )}

              <div className="space-y-3 mb-4">
                {suggestions.map((sug) => (
                  <div
                    key={sug.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      sug.isAccepted
                        ? 'bg-gradient-to-r from-emerald-50/90 to-teal-50/90 border-emerald-300 ring-2 ring-emerald-400/20 shadow-xs'
                        : 'bg-white border-indigo-100 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs text-slate-900">{sug.suggesterUsername}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold">
                            {sug.suggesterProfession}
                          </span>
                          {sug.isAccepted && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-800 bg-emerald-200/80 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                              Accepted Solution
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                      {/* The author can edit (until accepted) and delete; the challenge owner can delete. */}
                      {currentUserId && (sug.suggesterId === currentUserId || isOwner) && editingSuggestionId !== sug.id && (
                        <OwnerActions
                          label="idea"
                          onEdit={sug.suggesterId === currentUserId && !sug.isAccepted
                            ? () => setEditingSuggestionId(sug.id) : undefined}
                          onDelete={() => onDeleteSuggestion(activeChallenge.id, sug)}
                          confirmText={sug.isAccepted
                            ? 'Delete this idea? It is the accepted solution, so the challenge will be reopened.'
                            : 'Delete this idea? This cannot be undone.'}
                        />
                      )}
                      {/* Upvote button */}
                      <button
                        onClick={() => onUpvoteSuggestion(activeChallenge.id, sug.id)}
                        aria-pressed={sug.upvotedByMe}
                        className={`flex items-center gap-1 px-3 py-1 rounded-xl border text-xs font-extrabold transition-all active:scale-95 shadow-2xs ${
                          sug.upvotedByMe
                            ? 'bg-orange-600 border-orange-600 text-white'
                            : 'bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-800'
                        }`}
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                        <span>{sug.upvotes}</span>
                      </button>
                      </div>
                    </div>

                    {editingSuggestionId === sug.id ? (
                      <SuggestionEditForm
                        suggestion={sug}
                        onSave={(draft) => onUpdateSuggestion(activeChallenge.id, sug.id, draft)}
                        onCancel={() => setEditingSuggestionId(null)}
                      />
                    ) : (
                      <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium mb-2.5 whitespace-pre-line">
                        {sug.suggestionText}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {sug.suggestedTool ? (
                        <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-orange-900 bg-orange-100/70 border border-orange-200 px-2.5 py-1 rounded-lg">
                          <Wrench className="w-3 h-3 text-orange-600" />
                          <span>Recommended: {sug.suggestedTool}</span>
                        </div>
                      ) : <span />}

                      {isOwner && (
                        <button
                          onClick={() => handleAccept(sug)}
                          disabled={acceptingId !== null}
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-[11px] font-extrabold border transition-all disabled:opacity-60 ${
                            sug.isAccepted
                              ? 'bg-white border-emerald-300 text-emerald-800 hover:bg-emerald-50'
                              : 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {acceptingId === sug.id ? 'Saving…' : sug.isAccepted ? 'Undo accept' : 'Accept as solution'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Submit Suggestion Form */}
              <form onSubmit={handleSuggestionSubmit} className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 border border-indigo-100 rounded-2xl p-4 space-y-3">
                <span className="text-xs font-extrabold text-indigo-950 block">
                  Contribute your solution or tool idea to this live shift:
                </span>
                <textarea
                  rows={2}
                  placeholder="Describe your hypothesis, precedent, or diagnostic test..."
                  value={suggestionInput}
                  onChange={(e) => setSuggestionInput(e.target.value)}
                  className="w-full p-3 bg-white border border-indigo-200 rounded-xl text-xs text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
                  required
                />
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Optional tool/standard reference (e.g. 1/4-inch arrestor, FRCP Rule 45)..."
                    value={toolInput}
                    onChange={(e) => setToolInput(e.target.value)}
                    className="flex-1 px-3.5 py-2 bg-white border border-indigo-200 rounded-xl text-xs text-slate-800 outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={busy}
                    className="px-5 py-2 bg-gradient-to-r from-orange-600 to-rose-600 hover:from-orange-700 hover:to-rose-700 disabled:opacity-60 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-orange-500/20 transition-all active:scale-95"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Idea</span>
                  </button>
                </div>
                {error && <p role="alert" className="text-xs font-bold text-rose-600">{error}</p>}
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
