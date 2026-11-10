import React, { useState } from 'react';
import { 
  ShieldCheck, Star, Wrench, Layers, Image as ImageIcon, 
  HelpCircle, Puzzle, ArrowLeft, UserPlus, Check, MessageSquare, 
  Send, ExternalLink, Bookmark, Heart, ChevronRight
} from 'lucide-react';

export default function UserProfile({ 
  user, 
  posts, 
  qaItems, 
  challenges,
  onBack, 
  onOpenCaseStudy, 
  onOpenReviewModal,
  onAskQuestion,
  onSelectHighlight
}) {
  const [profileTab, setProfileTab] = useState('case_studies'); // 'case_studies' | 'posts' | 'qa' | 'challenges'
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(user.followersCount || 1000);
  const [questionText, setQuestionText] = useState('');
  const [sentNotice, setSentNotice] = useState(false);

  // Filter posts created by this user
  const userCaseStudies = posts.filter(
    (p) => (p.authorUsername === user.username || p.authorId === user.id) &&
           (p.postType === 'pro_case_study' || p.postType === 'task_walkthrough')
  );
  const userGeneralPosts = posts.filter(
    (p) => (p.authorUsername === user.username || p.authorId === user.id) &&
           p.postType === 'general_post'
  );
  const userQAs = qaItems.filter(
    (q) => q.workerUsername === user.username || q.workerId === user.id
  );
  const userChallenges = challenges.filter(
    (c) => c.workerUsername === user.username || c.workerId === user.id
  );

  const handleFollowToggle = () => {
    setIsFollowing(!isFollowing);
    setFollowersCount(isFollowing ? followersCount - 1 : followersCount + 1);
  };

  const handleAsk = (e) => {
    e.preventDefault();
    if (!questionText.trim()) return;

    onAskQuestion({
      id: `qa_${Date.now()}`,
      workerId: user.id,
      workerUsername: user.username,
      workerFullName: user.fullName,
      workerProfessionTitle: user.professionTitle,
      workerAvatarUrl: user.avatarUrl,
      askerUsername: 'curious_explorer',
      askerAvatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
      questionText: questionText,
      topicTag: 'Profile Inquiry',
      answerText: null,
      upvotes: 1,
      timeAgo: 'Just now'
    });

    setQuestionText('');
    setSentNotice(true);
    setTimeout(() => setSentNotice(false), 3000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Back Nav Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition-all shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Feed</span>
        </button>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          @{user.username}
        </span>
      </div>

      {/* Main Profile Card Header */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-7 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-7">
          {/* Avatar with Gradient Ring */}
          <div className="relative p-1 rounded-full story-ring-gradient flex-shrink-0">
            <div className="p-1 bg-white rounded-full">
              <img
                src={user.avatarUrl}
                alt={user.fullName}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover"
              />
            </div>
            {user.isVerified && (
              <div className="absolute bottom-1 right-1 bg-brand-600 text-white p-1 rounded-full border-2 border-white shadow-xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
            )}
          </div>

          {/* User Info & Bio */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                    {user.fullName}
                  </h2>
                  <span className="text-xs font-semibold text-slate-500">
                    @{user.username}
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-bold text-brand-700 flex items-center gap-1.5 mt-0.5">
                  <span>{user.professionTitle}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-500 font-medium">{user.yearsExp} yrs exp</span>
                </p>
              </div>

              {/* Follow & Message Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleFollowToggle}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all shadow-2xs ${
                    isFollowing
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                      : 'bg-brand-600 hover:bg-brand-700 text-white shadow-sm'
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Following</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Follow</span>
                    </>
                  )}
                </button>

                <button 
                  onClick={() => setProfileTab('qa')}
                  className="px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                >
                  Ask AMA
                </button>
              </div>
            </div>

            {/* Bio */}
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
              {user.bio}
            </p>

            {/* Key Tools Chips */}
            {user.keyTools && (
              <div className="pt-2 flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Wrench className="w-3 h-3" /> Tools:
                </span>
                {user.keyTools.map((tool, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200/60">
                    {tool}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stats Strip */}
        <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-4 gap-2 text-center">
          <div className="p-2 rounded-xl bg-slate-50">
            <span className="block font-extrabold text-sm sm:text-base text-slate-900">
              {userCaseStudies.length + userGeneralPosts.length}
            </span>
            <span className="text-[11px] text-slate-500 font-semibold">Posts</span>
          </div>

          <div className="p-2 rounded-xl bg-slate-50">
            <span className="block font-extrabold text-sm sm:text-base text-slate-900">
              {followersCount >= 1000 ? `${(followersCount / 1000).toFixed(1)}k` : followersCount}
            </span>
            <span className="text-[11px] text-slate-500 font-semibold">Followers</span>
          </div>

          <div className="p-2 rounded-xl bg-slate-50">
            <span className="block font-extrabold text-sm sm:text-base text-slate-900">
              {user.followingCount || 150}
            </span>
            <span className="text-[11px] text-slate-500 font-semibold">Following</span>
          </div>

          <div className="p-2 rounded-xl bg-amber-50/70 border border-amber-200/60">
            <span className="font-extrabold text-sm sm:text-base text-amber-700 flex items-center justify-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
              {user.rating || '4.9'}
            </span>
            <span className="text-[11px] text-amber-800 font-semibold">Pro Rating</span>
          </div>
        </div>

        {/* Pinned Story Highlights Tray */}
        {user.highlights && user.highlights.length > 0 && (
          <div className="mt-6 pt-5 border-t border-slate-100">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 block mb-3 px-1">
              Pinned Workflow Highlights
            </span>
            <div className="flex items-center gap-4 overflow-x-auto no-scrollbar pb-1">
              {user.highlights.map((hl) => (
                <div 
                  key={hl.id} 
                  onClick={() => onSelectHighlight(hl)}
                  className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group"
                >
                  <div className="w-15 h-15 rounded-full p-0.5 border-2 border-slate-300 group-hover:border-brand-500 transition-colors">
                    <img
                      src={hl.cover}
                      alt={hl.title}
                      className="w-full h-full rounded-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <span className="text-[11px] font-bold text-slate-700 max-w-[70px] truncate text-center">
                    {hl.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Profile Tabs Navigation */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-2xl text-xs font-bold border border-slate-300/60">
        <button
          onClick={() => setProfileTab('case_studies')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all ${
            profileTab === 'case_studies'
              ? 'bg-white text-slate-900 shadow-sm font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-brand-600" />
          <span>Case Studies ({userCaseStudies.length})</span>
        </button>

        <button
          onClick={() => setProfileTab('posts')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all ${
            profileTab === 'posts'
              ? 'bg-white text-slate-900 shadow-sm font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
          <span>Photos & Milestones ({userGeneralPosts.length})</span>
        </button>

        <button
          onClick={() => setProfileTab('qa')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all ${
            profileTab === 'qa'
              ? 'bg-white text-slate-900 shadow-sm font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
          <span>AMAs ({userQAs.length})</span>
        </button>
      </div>

      {/* TAB CONTENT: CASE STUDIES GRID */}
      {profileTab === 'case_studies' && (
        <div className="space-y-4">
          {userCaseStudies.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-xs text-slate-500 font-medium">
              No published case studies yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {userCaseStudies.map((post) => (
                <div
                  key={post.id}
                  onClick={() => onOpenCaseStudy(post)}
                  className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="aspect-[16/10] w-full bg-slate-100 overflow-hidden relative">
                    <img
                      src={post.mediaUrl}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold uppercase">
                        {post.taskDetails?.difficulty || 'Expert'}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 line-clamp-2 leading-snug mb-1.5 group-hover:text-brand-600 transition-colors">
                        {post.title}
                      </h4>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">
                        {post.taskDetails?.problemStatement || post.caption}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-semibold">
                      <span className="text-[11px] text-slate-400">
                        {post.taskDetails?.steps?.length || 3} Step Workflow
                      </span>
                      <div className="flex items-center gap-1 text-amber-600">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                        <span>{post.rating || '4.9'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: GENERAL POSTS / PHOTO GRID */}
      {profileTab === 'posts' && (
        <div className="space-y-4">
          {userGeneralPosts.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-xs text-slate-500 font-medium">
              No milestone posts yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {userGeneralPosts.map((post) => (
                <div key={post.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                  <img src={post.mediaUrl} alt={post.title} className="aspect-[16/10] w-full object-cover" />
                  <div className="p-4">
                    <h4 className="font-bold text-sm text-slate-900 mb-1">{post.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed mb-3">{post.caption}</p>
                    <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                        {post.likesCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" />
                        {post.commentsCount}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Q&A AMAs */}
      {profileTab === 'qa' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm space-y-5">
          {/* Ask this worker form */}
          <form onSubmit={handleAsk} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
            <span className="text-xs font-bold text-slate-800 block">
              Ask {user.fullName.split(' ')[0]} about {user.professionTitle} routine & cases:
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={`e.g. What is the most challenging part of your ${user.professionTitle} routine?`}
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                className="flex-1 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-brand-500"
                required
              />
              <button
                type="submit"
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Ask</span>
              </button>
            </div>
            {sentNotice && (
              <p className="text-xs font-semibold text-emerald-600 animate-fade-in">
                ✓ Question submitted to {user.fullName}'s AMA inbox!
              </p>
            )}
          </form>

          {/* List of answered Q&As */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Answered Inquiries ({userQAs.length})
            </h4>
            {userQAs.length === 0 ? (
              <p className="text-xs text-slate-500">No answered questions yet.</p>
            ) : (
              userQAs.map((qa) => (
                <div key={qa.id} className="p-4 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                      {qa.topicTag}
                    </span>
                    <span>{qa.timeAgo}</span>
                  </div>
                  <h5 className="font-bold text-xs sm:text-sm text-slate-900">"{qa.questionText}"</h5>
                  {qa.answerText && (
                    <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-700 leading-relaxed font-medium">
                      {qa.answerText}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
