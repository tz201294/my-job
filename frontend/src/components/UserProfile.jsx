import React, { useState } from 'react';
import {
  ShieldCheck, Star, Wrench, Layers, Image as ImageIcon, HelpCircle, ArrowLeft, UserPlus, Check, MessageSquare, Send, Heart,
  Ban,
} from 'lucide-react';

import OwnerActions from './OwnerActions';
import ReportButton from './ReportButton';

export default function UserProfile({
  user,
  posts,
  qaItems,
  isOwnProfile = false,
  onToggleFollow,
  onToggleBlock,
  onBack,
  onOpenCaseStudy,
  onAskQuestion,
  onSelectHighlight,
  onEditPost,
  onDeletePost,
}) {
  // Edit/delete buttons on your own profile's cards.
  const ownerActions = (post, tone) => isOwnProfile && onEditPost && (
    <OwnerActions
      label="post"
      tone={tone}
      onEdit={() => onEditPost(post)}
      onDelete={() => onDeletePost(post.id)}
      confirmText="Delete this post? Its likes, saves and reviews are removed too. This cannot be undone."
    />
  );

  const [profileTab, setProfileTab] = useState('case_studies'); // 'case_studies' | 'posts' | 'qa' | 'challenges'
  const isFollowing = user.isFollowing;
  const followersCount = user.followersCount || 0;
  const [questionText, setQuestionText] = useState('');
  const [sentNotice, setSentNotice] = useState(false);
  const [askError, setAskError] = useState('');

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

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!questionText.trim()) return;
    setAskError('');
    try {
      await onAskQuestion(user.id, { questionText: questionText.trim(), topicTag: 'Profile Inquiry' });
      setQuestionText('');
      setSentNotice(true);
      setTimeout(() => setSentNotice(false), 3000);
    } catch (err) {
      setAskError(err.message);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Back Nav Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-slate-100 border border-teal-200 text-xs font-black text-teal-950 transition-all shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <span className="text-xs font-black text-teal-500 uppercase tracking-wider">
          @{user.username}
        </span>
      </div>

      {/* Main Profile Card Header with Radiant Backdrop */}
      <div className="bg-white/95 border border-teal-100 rounded-3xl p-5 sm:p-7 shadow-sm backdrop-blur-sm card-glow relative overflow-hidden">
        {/* Subtle decorative gradient glow at the top */}
        <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-600" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-7">
          {/* Avatar with Radiant Glowing Ring */}
          <div className="relative p-1 rounded-full story-ring-gradient flex-shrink-0">
            <div className="p-1 bg-white rounded-full">
              <img loading="lazy" decoding="async"
                src={user.avatarUrl}
                alt={user.fullName}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover"
              />
            </div>
            {user.isVerified && (
              <div className="absolute bottom-1 right-1 bg-sky-500 text-white p-1 rounded-full border-2 border-white shadow-xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
            )}
          </div>

          {/* User Info & Bio */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {user.fullName}
                  </h2>
                  <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200/60">
                    @{user.username}
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-extrabold text-teal-700 flex items-center gap-1.5 mt-0.5">
                  <span>{user.professionTitle}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-500 font-medium">{user.yearsExp} yrs experience</span>
                </p>
              </div>

              {/* Follow & Message Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {!isOwnProfile && !user.isBlocked && (
                  <button
                    onClick={() => onToggleFollow(user.username)}
                    aria-pressed={isFollowing}
                    className={`flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-black transition-all shadow-md active:scale-95 ${
                      isFollowing
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                        : 'bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white shadow-teal-500/25'
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
                )}

                {!user.isBlocked && (
                <button
                  onClick={() => setProfileTab('qa')}
                  className="px-4 py-2.5 rounded-full bg-gradient-to-r from-teal-50 to-cyan-50 hover:from-teal-100 hover:to-cyan-100 text-teal-900 border border-teal-200 text-xs font-black transition-all shadow-2xs"
                >
                  Ask AMA
                </button>
                )}

                {!isOwnProfile && onToggleBlock && (
                  <>
                    <button type="button" onClick={() => onToggleBlock(user.username)}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold ${
                        user.isBlocked ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700'}`}>
                      <Ban className="w-3.5 h-3.5" /> {user.isBlocked ? 'Unblock' : 'Block'}
                    </button>
                    {!user.isBlocked && <ReportButton targetType="user" targetId={user.id} label="account" withText />}
                  </>
                )}
              </div>
            </div>

            {user.isBlocked && (
              <p role="status" className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                You blocked @{user.username}. You don't see each other's posts, comments or stories, and neither of you
                can follow, comment on, ask or notify the other.
              </p>
            )}

            {/* Bio */}
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-semibold">
              {user.bio}
            </p>

            {/* Key Tools Chips */}
            {user.keyTools && (
              <div className="pt-2 flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-black text-teal-400 uppercase tracking-wider flex items-center gap-1">
                  <Wrench className="w-3.5 h-3.5" /> Tools:
                </span>
                {user.keyTools.map((tool, idx) => (
                  <span key={idx} className="px-2.5 py-0.5 rounded-md bg-teal-50 text-teal-900 text-[11px] font-bold border border-teal-200/80 shadow-2xs">
                    {tool}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stats Strip with Vibrant Backgrounds */}
        <div className="mt-6 pt-5 border-t border-teal-100 grid grid-cols-4 gap-2.5 text-center">
          <div className="p-2.5 rounded-2xl bg-gradient-to-b from-teal-50/70 to-slate-50 border border-teal-100">
            <span className="block font-black text-base sm:text-lg text-slate-900">
              {userCaseStudies.length + userGeneralPosts.length}
            </span>
            <span className="text-[11px] text-teal-600 font-bold">Posts</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-gradient-to-b from-teal-50/70 to-slate-50 border border-teal-100">
            <span className="block font-black text-base sm:text-lg text-slate-900">
              {followersCount >= 1000 ? `${(followersCount / 1000).toFixed(1)}k` : followersCount}
            </span>
            <span className="text-[11px] text-teal-600 font-bold">Followers</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-gradient-to-b from-teal-50/70 to-slate-50 border border-teal-100">
            <span className="block font-black text-base sm:text-lg text-slate-900">
              {user.followingCount || 0}
            </span>
            <span className="text-[11px] text-teal-600 font-bold">Following</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-300 shadow-2xs">
            <span className="font-black text-base sm:text-lg text-amber-900 flex items-center justify-center gap-1">
              <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
              {user.rating != null ? user.rating : 'New'}
            </span>
            <span className="text-[11px] text-amber-800 font-extrabold">Pro Rating</span>
          </div>
        </div>

        {/* Pinned Story Highlights Tray */}
        {user.highlights && user.highlights.length > 0 && (
          <div className="mt-6 pt-5 border-t border-teal-100">
            <span className="text-xs font-black uppercase tracking-wider text-teal-400 block mb-3 px-1">
              Pinned Workflow Highlights
            </span>
            <div className="flex items-center gap-4 overflow-x-auto no-scrollbar pb-1">
              {user.highlights.map((hl) => (
                <div 
                  key={hl.id} 
                  onClick={() => onSelectHighlight(hl)}
                  className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group"
                >
                  <div className="w-16 h-16 rounded-full p-[2.5px] story-ring-gradient group-hover:scale-105 transition-transform shadow-xs">
                    <img loading="lazy" decoding="async"
                      src={hl.cover}
                      alt={hl.title}
                      className="w-full h-full rounded-full object-cover border-2 border-white"
                    />
                  </div>
                  <span className="text-xs font-extrabold text-slate-800 max-w-[76px] truncate text-center">
                    {hl.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Profile Tabs Navigation */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-200/70 rounded-2xl text-xs font-black border border-slate-300/60 shadow-2xs">
        <button
          onClick={() => setProfileTab('case_studies')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all ${
            profileTab === 'case_studies'
              ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-md font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Case Studies ({userCaseStudies.length})</span>
        </button>

        <button
          onClick={() => setProfileTab('posts')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all ${
            profileTab === 'posts'
              ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-md font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Photos & Milestones ({userGeneralPosts.length})</span>
        </button>

        <button
          onClick={() => setProfileTab('qa')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all ${
            profileTab === 'qa'
              ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-md font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>AMAs ({userQAs.length})</span>
        </button>
      </div>

      {/* TAB CONTENT: CASE STUDIES GRID */}
      {profileTab === 'case_studies' && (
        <div className="space-y-4">
          {userCaseStudies.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-teal-100 text-xs text-slate-500 font-medium">
              No published case studies yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {userCaseStudies.map((post) => (
                <div
                  key={post.id}
                  onClick={() => onOpenCaseStudy(post)}
                  className="bg-white/95 border border-teal-100 rounded-3xl overflow-hidden shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between card-glow"
                >
                  <div className="aspect-[16/10] w-full bg-slate-900 overflow-hidden relative">
                    <img loading="lazy" decoding="async"
                      src={post.mediaUrl}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md text-white text-[10px] font-black uppercase">
                        {post.taskDetails?.difficulty || 'Guide'}
                      </span>
                    </div>
                    <div className="absolute top-3 right-3">{ownerActions(post, 'dark')}</div>
                  </div>

                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-extrabold text-sm sm:text-base text-slate-900 line-clamp-2 leading-snug mb-1.5 group-hover:text-teal-600 transition-colors">
                        {post.title}
                      </h4>
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3 font-medium">
                        {post.taskDetails?.problemStatement || post.caption}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-teal-100 flex items-center justify-between text-xs text-slate-600 font-bold">
                      <span className="text-[11px] text-teal-600 bg-teal-50 px-2.5 py-0.5 rounded-md">
                        {post.taskDetails?.steps?.length || 0} Step Workflow
                      </span>
                      <div className="flex items-center gap-1 text-amber-600 font-black">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                        <span>{post.rating != null ? post.rating : 'New'}</span>
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
            <div className="bg-white rounded-3xl p-8 text-center border border-teal-100 text-xs text-slate-500 font-medium">
              No milestone posts yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {userGeneralPosts.map((post) => (
                <div key={post.id} className="relative bg-white/95 border border-teal-100 rounded-3xl overflow-hidden shadow-2xs card-glow">
                  <img loading="lazy" decoding="async" src={post.mediaUrl} alt={post.title} className="aspect-[16/10] w-full object-cover" />
                  <div className="absolute top-3 right-3">{ownerActions(post, 'dark')}</div>
                  <div className="p-4 sm:p-5">
                    <h4 className="font-extrabold text-sm sm:text-base text-slate-900 mb-1">{post.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed mb-3 font-medium">{post.caption}</p>
                    <div className="flex items-center gap-4 text-xs font-bold text-slate-600">
                      <span className="flex items-center gap-1 text-rose-500">
                        <Heart className="w-4 h-4 fill-rose-500" />
                        {post.likesCount}
                      </span>
                      <span className="flex items-center gap-1 text-teal-600">
                        <MessageSquare className="w-4 h-4" />
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
        <div className="bg-white/95 border border-teal-100 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5 backdrop-blur-sm card-glow">
          {/* Ask this worker form */}
          <form onSubmit={handleAsk} className="bg-gradient-to-br from-teal-50/80 via-cyan-50/50 to-slate-50 border border-teal-100 rounded-3xl p-4 sm:p-5 space-y-3">
            <span className="text-xs font-black text-teal-950 block">
              Ask {user.fullName.split(' ')[0]} about {user.professionTitle} routine & cases:
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={`e.g. What is the most challenging part of your ${user.professionTitle} routine?`}
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-white border border-teal-200 rounded-2xl text-xs outline-none focus:border-teal-500 font-medium"
                required
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white rounded-2xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-teal-500/20 transition-all active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Ask</span>
              </button>
            </div>
            {askError && <p role="alert" className="text-xs font-bold text-rose-600">{askError}</p>}
            {sentNotice && (
              <p className="text-xs font-bold text-emerald-600 animate-fade-in">
                ✓ Question submitted to {user.fullName}'s AMA inbox!
              </p>
            )}
          </form>

          {/* List of answered Q&As */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-teal-400">
              Answered Inquiries ({userQAs.length})
            </h4>
            {userQAs.length === 0 ? (
              <p className="text-xs text-slate-500">No answered questions yet.</p>
            ) : (
              userQAs.map((qa) => (
                <div key={qa.id} className="p-4 border border-teal-100 rounded-2xl space-y-2 bg-slate-50/60">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-extrabold text-teal-800 bg-teal-100 px-2.5 py-0.5 rounded-full">
                      {qa.topicTag}
                    </span>
                    <span className="font-medium">{qa.timeAgo}</span>
                  </div>
                  <h5 className="font-extrabold text-xs sm:text-sm text-slate-900">"{qa.questionText}"</h5>
                  {qa.answerText && (
                    <div className="p-3.5 bg-white rounded-xl text-xs text-slate-700 leading-relaxed font-semibold border border-teal-100/70 shadow-2xs">
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
