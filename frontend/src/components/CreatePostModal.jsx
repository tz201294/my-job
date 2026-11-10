import React, { useState, useRef } from 'react';
import { 
  X, Layers, Image as ImageIcon, Plus, Trash2, 
  Wrench, ShieldAlert, Sparkles, Check, Clock, Puzzle,
  Upload, Video, Camera
} from 'lucide-react';

export default function CreatePostModal({ onClose, onCreatePost, onCreateStory, onCreateChallenge }) {
  const [contentType, setContentType] = useState('pro_case_study'); // 'pro_case_study' | 'general_post' | 'story' | 'challenge'

  // General & Case Study Fields
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaPreview, setMediaPreview] = useState('');
  const [tags, setTags] = useState('law, litigation, casestudy');

  // Case Study Specific Fields
  const [category, setCategory] = useState('Legal & Regulatory');
  const [difficulty, setDifficulty] = useState('Expert');
  const [duration, setDuration] = useState('2 Hours Prep');
  const [problemStatement, setProblemStatement] = useState('');
  const [toolsString, setToolsString] = useState('Westlaw, FRCP Rule 45, Adobe Redaction');
  const [safetyWarnings, setSafetyWarnings] = useState('Ensure timely notice is served to avoid sanctions.');
  const [steps, setSteps] = useState([
    {
      stepNumber: 1,
      title: 'Analyze Subpoena Scope & Jurisdictional Reach',
      description: 'Review third-party custodian records to verify non-party status.',
      imageUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80',
      tip: 'Check local district rules for specialized deposition forms.'
    }
  ]);

  // Story Fields
  const [storyCaption, setStoryCaption] = useState('');
  const [storyMedia, setStoryMedia] = useState('https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80');
  const [storyPreview, setStoryPreview] = useState('');

  // Challenge Fields
  const [challengeTitle, setChallengeTitle] = useState('');
  const [challengeDesc, setChallengeDesc] = useState('');

  // File Upload Handlers
  const handleCoverFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const blobUrl = URL.createObjectURL(file);
      setMediaPreview(blobUrl);
      setMediaUrl(blobUrl);
    }
  };

  const handleStoryFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const blobUrl = URL.createObjectURL(file);
      setStoryPreview(blobUrl);
      setStoryMedia(blobUrl);
    }
  };

  const handleStepFileUpload = (idx, e) => {
    const file = e.target.files?.[0];
    if (file) {
      const blobUrl = URL.createObjectURL(file);
      handleStepChange(idx, 'imageUrl', blobUrl);
    }
  };

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
    const updated = [...steps];
    updated[idx][field] = val;
    setSteps(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (contentType === 'story') {
      onCreateStory({
        id: `story_${Date.now()}`,
        userId: "usr_103",
        username: "elena_lawyer",
        fullName: "Elena Vance, Esq.",
        avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
        professionTitle: "Litigation Partner",
        mediaUrl: storyMedia || "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80",
        caption: storyCaption,
        timeAgo: "Just now",
        professionTag: "Legal"
      });
      onClose();
      return;
    }

    if (contentType === 'challenge') {
      onCreateChallenge({
        id: `chal_${Date.now()}`,
        workerId: "usr_103",
        workerUsername: "elena_lawyer",
        workerFullName: "Elena Vance, Esq.",
        workerProfessionTitle: "Litigation Partner",
        workerAvatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
        title: challengeTitle,
        scenarioDescription: challengeDesc,
        category: category,
        urgencyLevel: "Brainstorming",
        timeAgo: "Just now",
        isSolved: false,
        suggestions: []
      });
      onClose();
      return;
    }

    // Post or Pro Case Study
    const newPost = {
      id: `post_${Date.now()}`,
      authorId: "usr_103",
      authorUsername: "elena_lawyer",
      authorFullName: "Elena Vance, Esq.",
      authorAvatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
      authorProfessionTitle: "Commercial Litigation Attorney",
      isAuthorVerified: true,
      postType: contentType,
      title: title,
      caption: caption,
      mediaUrl: mediaUrl || "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80",
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      likesCount: 0,
      commentsCount: 0,
      isLiked: false,
      isBookmarked: false,
      rating: 5.0,
      reviewsCount: 0,
      timeAgo: "Just now",
      taskDetails: contentType === 'pro_case_study' ? {
        problemStatement: problemStatement,
        category: category,
        difficulty: difficulty,
        estimatedDuration: duration,
        toolsUsed: toolsString.split(',').map((t) => t.trim()).filter(Boolean),
        safetyWarnings: safetyWarnings,
        steps: steps
      } : undefined
    };

    onCreatePost(newPost);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div>
            <h3 className="font-extrabold text-base sm:text-lg">Publishing Studio</h3>
            <p className="text-xs text-slate-400">Upload media or document step-by-step profession techniques</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Type Selector */}
        <div className="p-3 bg-slate-100 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs font-bold">
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
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-200'
            }`}
          >
            🧩 Live Dilemma
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* STORY FORM */}
          {contentType === 'story' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Select Story Photo or Video
                </label>
                
                {/* Drag and drop upload box */}
                <div className="border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-2xl p-4 bg-slate-50 text-center cursor-pointer transition-colors relative">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleStoryFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Click to upload story media from device</p>
                      <p className="text-[11px] text-slate-400">JPG, PNG, MP4 video up to 50MB</p>
                    </div>
                  </div>
                </div>

                {/* Preview if uploaded */}
                {(storyPreview || storyMedia) && (
                  <div className="mt-3 relative w-32 h-44 rounded-xl overflow-hidden border border-slate-200 shadow-2xs">
                    <img src={storyPreview || storyMedia} alt="Preview" className="w-full h-full object-cover" />
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
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Work Dilemma Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rare HVAC error code on inverter unit / Conflicting statutory timeline"
                  value={challengeTitle}
                  onChange={(e) => setChallengeTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-brand-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
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

              {/* Cover Media Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Cover Photo / Diagram
                </label>
                <div className="border border-dashed border-slate-300 hover:border-brand-500 rounded-xl p-3 bg-slate-50 flex items-center justify-between cursor-pointer relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4 text-brand-600" />
                    <span className="text-xs font-semibold text-slate-700">Choose file from device</span>
                  </div>
                  <span className="text-[11px] text-slate-400">or enter URL below</span>
                </div>

                <input
                  type="url"
                  placeholder="https://... (or leave blank if uploaded above)"
                  value={mediaUrl}
                  onChange={(e) => { setMediaUrl(e.target.value); setMediaPreview(e.target.value); }}
                  className="mt-2 w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-brand-500"
                />

                {mediaPreview && (
                  <div className="mt-2 w-full aspect-video max-h-40 rounded-xl overflow-hidden border border-slate-200">
                    <img src={mediaPreview} alt="Cover Preview" className="w-full h-full object-cover" />
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
                        <option value="Legal & Regulatory">Legal & Regulatory</option>
                        <option value="Trades & Craftsmanship">Trades & Craftsmanship</option>
                        <option value="Transportation & Logistics">Transportation & Logistics</option>
                        <option value="Technology & Engineering">Technology & Engineering</option>
                        <option value="Healthcare & Medicine">Healthcare & Medicine</option>
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
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                        <option value="Expert">Expert</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Estimated Prep Time
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 90 Mins / 3 Hours"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
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

                        {/* Step Image Upload */}
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer">
                            <Upload className="w-3 h-3 text-brand-600" />
                            <span>Step Image</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleStepFileUpload(idx, e)}
                              className="hidden"
                            />
                          </label>
                          <input
                            type="text"
                            placeholder="or Image URL..."
                            value={st.imageUrl || ''}
                            onChange={(e) => handleStepChange(idx, 'imageUrl', e.target.value)}
                            className="flex-1 p-1.5 bg-white border border-slate-200 rounded-lg text-[11px] outline-none"
                          />
                        </div>

                        {st.imageUrl && (
                          <div className="w-24 h-16 rounded-lg overflow-hidden border border-slate-200">
                            <img src={st.imageUrl} alt="Step preview" className="w-full h-full object-cover" />
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
              className="px-6 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition-all"
            >
              Publish to MyJob
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
