import React, { useState } from 'react';
import {
  X, Plus, Trash2,
} from 'lucide-react';
import { PLACEHOLDER_IMAGE } from '../api/mappers';

const DIFFICULTIES = ['beginner', 'intermediate', 'advanced', 'expert'];

const EMPTY_STEP = { stepNumber: 1, title: '', description: '', imageUrl: '', tip: '' };

// onCreatePost / onCreateStory / onCreateChallenge receive a plain draft and return a promise
// that rejects with a readable error if the server refused it.
// With `editPost`, the modal edits that post instead (its type is fixed) and saves via onUpdatePost(id, draft).
export default function CreatePostModal({
  currentUser, categories = [], editPost = null, onClose, onCreatePost, onUpdatePost, onCreateStory, onCreateChallenge,
}) {
  const td = editPost?.taskDetails;
  const isEditing = !!editPost;
  const [contentType, setContentType] = useState(
    isEditing ? (td ? 'pro_case_study' : 'general_post') : 'pro_case_study'
  ); // 'pro_case_study' | 'general_post' | 'story' | 'challenge'
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const categoryNames = categories.filter((c) => c.slug !== 'all').map((c) => c.name);
  // Keep an edited post's category selectable even if it isn't in today's list.
  if (td?.category && !categoryNames.includes(td.category)) categoryNames.unshift(td.category);

  // General & Case Study Fields
  const [title, setTitle] = useState(editPost?.title || '');
  const [caption, setCaption] = useState(editPost?.caption || '');
  const [mediaUrl, setMediaUrl] = useState(
    editPost?.mediaUrl && editPost.mediaUrl !== PLACEHOLDER_IMAGE ? editPost.mediaUrl : ''
  );
  const [tags] = useState((editPost?.tags || []).join(', '));

  // Case Study Specific Fields
  const [category, setCategory] = useState(
    td?.category || (categoryNames.includes(currentUser.industry) ? currentUser.industry : categoryNames[0] || '')
  );
  const [difficulty, setDifficulty] = useState(td?.difficulty ? td.difficulty.toLowerCase() : 'intermediate');
  const [minutes, setMinutes] = useState(td?.estimatedMins ? String(td.estimatedMins) : '');
  const [problemStatement, setProblemStatement] = useState(td?.problemStatement || '');
  const [toolsString, setToolsString] = useState((td?.toolsUsed || []).join(', '));
  const [safetyWarnings, setSafetyWarnings] = useState(td?.safetyWarnings || '');
  const [steps, setSteps] = useState(
    td?.steps?.length
      ? td.steps.map((s, i) => ({
          stepNumber: i + 1, title: s.title || '', description: s.description || '',
          imageUrl: s.imageUrl || '', tip: s.tip || '',
        }))
      : [EMPTY_STEP]
  );

  // Story Fields
  const [storyCaption, setStoryCaption] = useState('');
  const [storyMedia, setStoryMedia] = useState('');

  // Challenge Fields
  const [challengeTitle, setChallengeTitle] = useState('');
  const [challengeDesc, setChallengeDesc] = useState('');

  const handleAddStep = () => {
    setSteps([
      ...steps,
      {
        stepNumber: steps.length + 1,
        title: '',
        description: '',
        imageUrl: '',
        tip: ''
      }
    ]);
  };

  const handleRemoveStep = (idx) => {
    if (steps.length <= 1) return;
    const updated = steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, stepNumber: i + 1 }));
    setSteps(updated);
  };

  const handleStepChange = (idx, field, val) => {
    setSteps(steps.map((s, i) => (i === idx ? { ...s, [field]: val } : s)));
  };

  const splitList = (s) => s.split(',').map((t) => t.trim()).filter(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (contentType === 'story') {
        await onCreateStory({ mediaUrl: storyMedia.trim(), caption: storyCaption, professionTag: currentUser.industry });
      } else if (contentType === 'challenge') {
        await onCreateChallenge({ title: challengeTitle, scenarioDescription: challengeDesc, category });
      } else {
        await (isEditing ? (draft) => onUpdatePost(editPost.id, draft) : onCreatePost)({
          postType: contentType,
          title,
          caption,
          mediaUrl: mediaUrl.trim(),
          tags: splitList(tags),
          taskDetails: contentType === 'pro_case_study' ? {
            problemStatement,
            category,
            difficulty,
            estimatedMins: parseInt(minutes, 10) || null,
            toolsUsed: splitList(toolsString),
            safetyWarnings,
            steps,
          } : undefined,
        });
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Could not publish. Please try again.');
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div>
            <h3 className="font-extrabold text-base sm:text-lg">{isEditing ? 'Edit post' : 'Publishing Studio'}</h3>
            <p className="text-xs text-slate-400">
              {isEditing ? 'Change the text, photo, tags or steps of your post' : 'Upload media or document step-by-step profession techniques'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Type Selector (fixed when editing) */}
        <div className={`p-3 bg-slate-100 border-b border-slate-200 ${isEditing ? 'hidden' : 'grid'} grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs font-bold`}>
          <button
            type="button"
            onClick={() => setContentType('pro_case_study')}
            className={`py-2 px-2 rounded-xl transition-all ${
              contentType === 'pro_case_study'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-200'
            }`}
          >
            📑 Pro Case Study
          </button>
          <button
            type="button"
            onClick={() => setContentType('general_post')}
            className={`py-2 px-2 rounded-xl transition-all ${
              contentType === 'general_post'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-200'
            }`}
          >
            🏆 General Post
          </button>
          <button
            type="button"
            onClick={() => setContentType('story')}
            className={`py-2 px-2 rounded-xl transition-all ${
              contentType === 'story'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-200'
            }`}
          >
            ☕ 24h Daily Story
          </button>
          <button
            type="button"
            onClick={() => setContentType('challenge')}
            className={`py-2 px-2 rounded-xl transition-all ${
              contentType === 'challenge'
                ? 'bg-gradient-to-r from-cyan-600 to-cyan-600 text-white shadow-sm font-black'
                : 'bg-white text-slate-700 hover:bg-slate-200 font-bold'
            }`}
          >
            ⚡ Live Work
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* STORY FORM */}
          {contentType === 'story' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Story Photo URL
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={storyMedia}
                  onChange={(e) => setStoryMedia(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-brand-500"
                  required
                />
                <p className="mt-1 text-[11px] text-slate-400">Direct file uploads are not available yet — paste a link to an image.</p>
                {storyMedia && (
                  <div className="mt-3 relative w-32 h-44 rounded-xl overflow-hidden border border-slate-200 shadow-2xs">
                    <img loading="lazy" decoding="async" src={storyMedia} alt="Preview" className="w-full h-full object-cover" />
                    <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">Preview</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Daily Worklife Moment (Caption)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Grabbing coffee before the deposition... / Setting up the pipe pressure tester..."
                  value={storyCaption}
                  onChange={(e) => setStoryCaption(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-brand-500"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-400">
                ⏳ This story will appear in the top story tray and automatically expire in 24 hours.
              </p>
            </div>
          )}

          {/* CHALLENGE FORM */}
          {contentType === 'challenge' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-800 mb-1">
                  Live Work Scenario Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Live shift: Rare HVAC error code on inverter unit / Conflicting statutory timeline"
                  value={challengeTitle}
                  onChange={(e) => setChallengeTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-teal-200 rounded-xl text-xs outline-none focus:border-cyan-500 font-medium"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-800 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                >
                  {categoryNames.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-800 mb-1">
                  Detailed Scenario & What You've Tested So Far
                </label>
                <textarea
                  rows={4}
                  placeholder="Explain the problem, tools already used, and what hypothesis you're asking the community to brainstorm..."
                  value={challengeDesc}
                  onChange={(e) => setChallengeDesc(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-brand-500"
                  required
                />
              </div>
            </div>
          )}

          {/* GENERAL POST OR PRO CASE STUDY */}
          {(contentType === 'pro_case_study' || contentType === 'general_post') && (
            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  {contentType === 'pro_case_study' ? 'Case Study Title (e.g. How I Solved X)' : 'Post Headline / Milestone'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Drafting and Serving a Subpoena Duces Tecum / 5-Year Bar Anniversary"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-brand-500"
                  required
                />
              </div>

              {/* Caption */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Summary & Context
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief overview of the case, project, or milestone..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-brand-500"
                  required
                />
              </div>

              {/* Cover media (URL only until file uploads exist) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Cover Photo / Diagram URL (optional)
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-brand-500"
                />
                <p className="mt-1 text-[11px] text-slate-400">Direct file uploads are not available yet — paste a link to an image.</p>
                {mediaUrl && (
                  <div className="mt-2 w-full aspect-video max-h-40 rounded-xl overflow-hidden border border-slate-200">
                    <img loading="lazy" decoding="async" src={mediaUrl} alt="Cover Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {/* PRO CASE STUDY DEEP DIVE FIELDS */}
              {contentType === 'pro_case_study' && (
                <div className="space-y-4 pt-3 border-t border-slate-200">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Category
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                      >
                        {categoryNames.map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Difficulty
                      </label>
                      <select
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                      >
                        {DIFFICULTIES.map((d) => (
                          <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Estimated Time (minutes)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10080"
                        placeholder="e.g. 90"
                        value={minutes}
                        onChange={(e) => setMinutes(e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                      />
                    </div>
                  </div>

                  {/* Problem Statement */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Problem Context (The Real Challenge)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="What was broken, disputed, or required solving?"
                      value={problemStatement}
                      onChange={(e) => setProblemStatement(e.target.value)}
                      required
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-brand-500"
                    />
                  </div>

                  {/* Tools & Safety */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Tools / Standard References (comma separated)
                      </label>
                      <input
                        type="text"
                        value={toolsString}
                        onChange={(e) => setToolsString(e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Compliance / Safety Warning
                      </label>
                      <input
                        type="text"
                        value={safetyWarnings}
                        onChange={(e) => setSafetyWarnings(e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                      />
                    </div>
                  </div>

                  {/* Step by Step Builder */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                        Workflow Steps ({steps.length})
                      </span>
                      <button
                        type="button"
                        onClick={handleAddStep}
                        className="flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Step</span>
                      </button>
                    </div>

                    {steps.map((st, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-brand-700">
                            Step {st.stepNumber}
                          </span>
                          {steps.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveStep(idx)}
                              className="text-slate-400 hover:text-rose-600 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          placeholder="Step Title (e.g. Isolate supply lines)"
                          value={st.title}
                          onChange={(e) => handleStepChange(idx, 'title', e.target.value)}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                          required
                        />
                        <textarea
                          rows={2}
                          placeholder="Step execution details..."
                          value={st.description}
                          onChange={(e) => handleStepChange(idx, 'description', e.target.value)}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                          required
                        />

                        {/* Step image (URL only until file uploads exist) */}
                        <input
                          type="url"
                          placeholder="Image URL (optional) https://..."
                          value={st.imageUrl || ''}
                          onChange={(e) => handleStepChange(idx, 'imageUrl', e.target.value)}
                          className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[11px] outline-none"
                        />

                        {st.imageUrl && (
                          <div className="w-24 h-16 rounded-lg overflow-hidden border border-slate-200">
                            <img loading="lazy" decoding="async" src={st.imageUrl} alt="Step preview" className="w-full h-full object-cover" />
                          </div>
                        )}

                        <input
                          type="text"
                          placeholder="Pro tip for this step..."
                          value={st.tip}
                          onChange={(e) => handleStepChange(idx, 'tip', e.target.value)}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <p role="alert" className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          {/* Form Actions Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-6 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white shadow-sm transition-all"
            >
              {isEditing ? (busy ? 'Saving…' : 'Save changes') : (busy ? 'Publishing…' : 'Publish to MyJob')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
