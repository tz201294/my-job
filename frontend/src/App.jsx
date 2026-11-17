import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AuthScreen from './components/AuthScreen';
import { api, onUnauthorized, tokenStore } from './api/client';
import {
  toCategories, toChallenge, toChallengePayload, toPost, toPostPayload, toPostUpdatePayload, toProfileUser,
  toQuestion,
  toReviewPayload, toStories, toStory, toStoryPayload, toSuggestion,
} from './api/mappers';
import Header from './components/Header';
import StoryTray from './components/StoryTray';
import StoryViewerModal from './components/StoryViewerModal';
import PostCard from './components/PostCard';
import CaseStudyDetailModal from './components/CaseStudyDetailModal';
import ReviewRatingModal from './components/ReviewRatingModal';
import ProfessionDiscovery from './components/ProfessionDiscovery';
import ChallengesHub from './components/ChallengesHub';
import QAHub from './components/QAHub';
import ReelsHub from './components/ReelsHub';
import CreatePostModal from './components/CreatePostModal';
import UserProfile from './components/UserProfile';

import { INITIAL_REELS } from './data/mockData';

import {
  Layers, Puzzle, HelpCircle, Film, Loader2, AlertTriangle
} from 'lucide-react';

const EMPTY_CATEGORIES = [{ id: 'cat_all', name: 'All Professions', slug: 'all', icon: 'briefcase' }];

// Applies fn to the item with the given id, leaving the rest untouched.
const mapById = (list, id, fn) => list.map((x) => (x.id === id ? fn(x) : x));

export default function App() {
  // Auth: undefined = checking stored token, null = signed out, object = signed-in account
  const [currentUser, setCurrentUser] = useState(tokenStore.get() ? undefined : null);

  const [activeTab, setActiveTab] = useState('feed'); // 'feed' | 'reels' | 'challenges' | 'qa'
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Server data
  const [posts, setPosts] = useState([]);
  // 'all' = everything, 'following' = people I follow, 'saved' = my bookmarks
  const [feedView, setFeedView] = useState('all');
  const [feedPosts, setFeedPosts] = useState([]);
  const [feedState, setFeedState] = useState('ready'); // 'loading' | 'ready' | 'error'
  const [stories, setStories] = useState([]);
  const [categories, setCategories] = useState(EMPTY_CATEGORIES);
  const [challenges, setChallenges] = useState([]);
  const [qaItems, setQaItems] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  // Reels have no backend yet; they stay sample data (clearly labelled in the UI).
  const [reels, setReels] = useState(INITIAL_REELS);

  const [loadState, setLoadState] = useState('idle'); // 'idle' | 'loading' | 'ready' | 'error'
  const [loadError, setLoadError] = useState('');
  const [toast, setToast] = useState('');

  // Profile view (null = main feed)
  const [viewingUser, setViewingUser] = useState(null);
  const [viewingPosts, setViewingPosts] = useState([]);

  // Modals
  const [activeStoryIdx, setActiveStoryIdx] = useState(null);
  const [selectedCaseStudy, setSelectedCaseStudy] = useState(null);
  const [reviewModalPost, setReviewModalPost] = useState(null);
  const [reviewsVersion, setReviewsVersion] = useState(0);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null); // a post open in the editor

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  }, []);

  const clearSession = useCallback(() => {
    tokenStore.clear();
    setCurrentUser(null);
    setViewingUser(null);
    setPosts([]); setStories([]); setChallenges([]); setQaItems([]); setProfessionals([]);
    setFeedPosts([]); setFeedView('all');
    setLoadState('idle');
  }, []);

  // Any 401 from a token-bearing call means the session expired.
  useEffect(() => { onUnauthorized(clearSession); }, [clearSession]);

  useEffect(() => {
    if (!tokenStore.get()) return;
    api.getMe()
      .then(setCurrentUser)
      .catch((err) => {
        // Only an invalid/expired token should sign the user out; keep it on transient errors.
        if (err.status === 401) tokenStore.clear();
        setCurrentUser(null);
      });
  }, []);

  const loadAll = useCallback(async () => {
    setLoadState('loading');
    setLoadError('');
    try {
      const [p, s, c, ch, qa, pros] = await Promise.all([
        api.getPosts({ limit: 50 }),
        api.getStories(),
        api.getCategories(),
        api.getChallenges(),
        api.getQuestions(),
        api.getProfessionals(),
      ]);
      setPosts(p.map(toPost));
      setStories(toStories(s));
      setCategories(toCategories(c));
      setChallenges(ch.map(toChallenge));
      setQaItems(qa.map(toQuestion));
      setProfessionals(pros.map(toProfileUser));
      setLoadState('ready');
    } catch (err) {
      setLoadError(err.message);
      setLoadState('error');
    }
  }, []);

  const userId = currentUser?.id;
  useEffect(() => {
    if (userId) loadAll();
  }, [userId, loadAll]);

  const handleLogout = clearSession;

  // The "following" and "saved" lists are fetched when selected (and again after sign-in changes).
  const loadFeedView = useCallback(async (view) => {
    if (view === 'all') return;
    setFeedState('loading');
    try {
      const list = view === 'following' ? await api.getPosts({ following: true, limit: 50 }) : await api.getBookmarks();
      setFeedPosts(list.map(toPost));
      setFeedState('ready');
    } catch (err) {
      setFeedState('error');
      showToast(`Couldn't load this feed: ${err.message}`);
    }
  }, [showToast]);

  useEffect(() => {
    if (loadState === 'ready') loadFeedView(feedView);
  }, [feedView, loadState, loadFeedView]);

  // ---------- Actions: optimistic where it is a toggle, wait-for-server where the server assigns data ----------

  // A post can appear in the main feed, the following/saved list and a profile; keep them all in sync.
  const updatePost = (postId, fn) => {
    setPosts((ps) => mapById(ps, postId, fn));
    setFeedPosts((ps) => mapById(ps, postId, fn));
    setViewingPosts((ps) => mapById(ps, postId, fn));
  };

  const handleLikePost = async (postId) => {
    const flip = (p) => ({ ...p, isLiked: !p.isLiked, likesCount: p.likesCount + (p.isLiked ? -1 : 1) });
    updatePost(postId, flip);
    try {
      const r = await api.toggleLike(postId);
      // Settle on the server's truth in case of races.
      updatePost(postId, (p) => ({ ...p, isLiked: r.is_liked, likesCount: r.likes_count }));
    } catch (err) {
      updatePost(postId, flip); // undo the optimistic flip
      showToast(`Couldn't update like: ${err.message}`);
    }
  };

  const handleBookmarkPost = async (postId) => {
    const flip = (p) => ({ ...p, isBookmarked: !p.isBookmarked });
    updatePost(postId, flip);
    try {
      const r = await api.toggleBookmark(postId);
      updatePost(postId, (p) => ({ ...p, isBookmarked: r.is_bookmarked }));
      // Un-saving from the Saved list removes the card straight away.
      if (!r.is_bookmarked && feedView === 'saved') setFeedPosts((ps) => ps.filter((p) => p.id !== postId));
    } catch (err) {
      updatePost(postId, flip);
      showToast(`Couldn't update saved posts: ${err.message}`);
    }
  };

  const handleToggleFollow = async (username) => {
    const was = viewingUser?.isFollowing;
    const apply = (isFollowing, followersCount) =>
      setViewingUser((u) => (u && u.username === username ? { ...u, isFollowing, followersCount } : u));
    apply(!was, viewingUser.followersCount + (was ? -1 : 1));
    try {
      const r = was ? await api.unfollowUser(username) : await api.followUser(username);
      apply(r.is_following, r.followers_count);
      // The "following" list is now stale; reload it next time it is shown.
      if (feedView === 'following') loadFeedView('following');
    } catch (err) {
      apply(was, viewingUser.followersCount);
      showToast(`Couldn't ${was ? 'unfollow' : 'follow'}: ${err.message}`);
    }
  };

  const handleLikeReel = (reelId) => {
    setReels((rs) => mapById(rs, reelId, (r) => ({
      ...r, isLiked: !r.isLiked, likesCount: r.isLiked ? r.likesCount - 1 : r.likesCount + 1,
    })));
  };

  const handleBookmarkReel = (reelId) => {
    setReels((rs) => mapById(rs, reelId, (r) => ({ ...r, isBookmarked: !r.isBookmarked })));
  };

  const handleAddReview = async (reviewData) => {
    await api.submitReview(toReviewPayload(reviewData));
    // The server recomputes the rating; refresh the post so the card shows the real value.
    const fresh = await api.getPostById(reviewData.postId);
    const updated = toPost(fresh);
    const replace = (ps) => mapById(ps, updated.id, () => updated);
    setPosts(replace);
    setFeedPosts(replace);
    setViewingPosts(replace);
    setSelectedCaseStudy((cs) => (cs && cs.id === updated.id ? updated : cs));
    setReviewsVersion((v) => v + 1);
  };

  // ---------- Edit & delete your own content ----------
  // Mutations that the server assigns data to throw, so the form that sent them can show the error.
  // Deletes report problems in a toast.

  const replacePost = (updated) => {
    const replace = (ps) => mapById(ps, updated.id, () => updated);
    setPosts(replace);
    setFeedPosts(replace);
    setViewingPosts(replace);
    setSelectedCaseStudy((cs) => (cs && cs.id === updated.id ? updated : cs));
  };

  const handleUpdatePost = async (postId, draft) => {
    replacePost(toPost(await api.updatePost(postId, toPostUpdatePayload(draft))));
  };

  const handleDeletePost = async (postId) => {
    try {
      await api.deletePost(postId);
    } catch (err) {
      showToast(`Couldn't delete the post: ${err.message}`);
      return;
    }
    const drop = (ps) => ps.filter((p) => p.id !== postId);
    setPosts(drop);
    setFeedPosts(drop);
    setViewingPosts(drop);
    setSelectedCaseStudy((cs) => (cs && cs.id === postId ? null : cs));
    setViewingUser((u) => (u && u.id === currentUser.id ? { ...u, postsCount: Math.max(0, (u.postsCount || 1) - 1) } : u));
    showToast('Post deleted');
  };

  const handleDeleteStory = async (storyId) => {
    try {
      await api.deleteStory(storyId);
    } catch (err) {
      showToast(`Couldn't delete the story: ${err.message}`);
      return;
    }
    setStories((ss) => ss.filter((s) => s.id !== storyId));
    setActiveStoryIdx(null);
    showToast('Story deleted');
  };

  const handleUpdateChallenge = async (challengeId, draft) => {
    const updated = toChallenge(
      await api.updateChallenge(challengeId, {
        title: draft.title.trim(),
        scenario_description: draft.scenarioDescription.trim(),
        profession_category: draft.category,
      })
    );
    setChallenges((cs) => mapById(cs, challengeId, () => updated));
  };

  const handleDeleteChallenge = async (challengeId) => {
    try {
      await api.deleteChallenge(challengeId);
    } catch (err) {
      showToast(`Couldn't delete the challenge: ${err.message}`);
      return;
    }
    setChallenges((cs) => cs.filter((c) => c.id !== challengeId));
    showToast('Challenge deleted');
  };

  const handleUpdateSuggestion = async (challengeId, suggestionId, draft) => {
    const updated = toSuggestion(
      await api.updateSuggestion(suggestionId, {
        suggestion_text: draft.suggestionText.trim(),
        suggested_tool_or_reference: draft.suggestedTool?.trim() || null,
      })
    );
    setChallenges((cs) => mapById(cs, challengeId, (c) => ({
      ...c, suggestions: mapById(c.suggestions, suggestionId, () => updated),
    })));
  };

  const handleDeleteSuggestion = async (challengeId, suggestion) => {
    try {
      await api.deleteSuggestion(suggestion.id);
    } catch (err) {
      showToast(`Couldn't delete the idea: ${err.message}`);
      return;
    }
    setChallenges((cs) => mapById(cs, challengeId, (c) => ({
      ...c,
      // Removing the accepted idea reopens the challenge, as on the server.
      isSolved: suggestion.isAccepted ? false : c.isSolved,
      suggestions: c.suggestions.filter((s) => s.id !== suggestion.id),
    })));
  };

  const handleUpdateQuestion = async (qaId, draft) => {
    const updated = toQuestion(
      await api.updateQuestion(qaId, { question_text: draft.questionText.trim(), topic_tag: draft.topicTag })
    );
    setQaItems((qs) => mapById(qs, qaId, () => updated));
    return updated;
  };

  // Returns true when deleted, so callers holding their own copy of the list can drop it too.
  const handleDeleteQuestion = async (qaId) => {
    try {
      await api.deleteQuestion(qaId);
    } catch (err) {
      showToast(`Couldn't delete the question: ${err.message}`);
      return false;
    }
    setQaItems((qs) => qs.filter((q) => q.id !== qaId));
    return true;
  };

  const handleAddPost = async (draft) => {
    const created = toPost(await api.createPost(toPostPayload(draft)));
    setPosts((ps) => [created, ...ps]);
    if (feedView === 'following') setFeedPosts((ps) => [created, ...ps]); // your own posts are part of that feed
    if (viewingUser && viewingUser.username === created.authorUsername) {
      setViewingPosts((ps) => [created, ...ps]);
    }
    setActiveTab('feed');
  };

  const handleAddStory = async (draft) => {
    const created = toStory(await api.createStory(toStoryPayload(draft)));
    setStories((ss) => [created, ...ss]);
  };

  const handleAddChallenge = async (draft) => {
    const created = toChallenge(await api.createChallenge(toChallengePayload(draft)));
    setChallenges((cs) => [created, ...cs]);
    setActiveTab('challenges');
  };

  const handleAddSuggestion = async (challengeId, draft) => {
    const created = toSuggestion(
      await api.submitSuggestion(challengeId, {
        suggestion_text: draft.suggestionText,
        suggested_tool_or_reference: draft.suggestedTool || null,
      })
    );
    setChallenges((cs) => mapById(cs, challengeId, (c) => ({ ...c, suggestions: [created, ...c.suggestions] })));
  };

  // The challenge owner accepts a suggestion as the solution (or withdraws it). The server returns the
  // whole challenge, since accepting one suggestion un-accepts any other.
  const handleAcceptSuggestion = async (challengeId, suggestionId, accept) => {
    try {
      const updated = toChallenge(
        accept ? await api.acceptSuggestion(suggestionId) : await api.unacceptSuggestion(suggestionId)
      );
      setChallenges((cs) => mapById(cs, challengeId, () => updated));
    } catch (err) {
      showToast(`Couldn't ${accept ? 'accept' : 'withdraw'} the solution: ${err.message}`);
    }
  };

  const handleUpvoteSuggestion = async (challengeId, suggestionId) => {
    const apply = (fn) => setChallenges((cs) => mapById(cs, challengeId, (c) => ({
      ...c, suggestions: mapById(c.suggestions, suggestionId, fn),
    })));
    const flip = (s) => ({ ...s, upvotedByMe: !s.upvotedByMe, upvotes: s.upvotes + (s.upvotedByMe ? -1 : 1) });
    apply(flip);
    try {
      const r = await api.upvoteSuggestion(suggestionId);
      apply((s) => ({ ...s, upvotedByMe: r.upvoted, upvotes: r.upvotes_count }));
    } catch (err) {
      apply(flip);
      showToast(`Couldn't update upvote: ${err.message}`);
    }
  };

  const handleAskQuestion = async (workerId, draft) => {
    const created = toQuestion(
      await api.askQuestion(workerId, { question_text: draft.questionText, topic_tag: draft.topicTag })
    );
    setQaItems((qs) => [created, ...qs]);
  };

  // Only the worker who was asked can answer; sending again edits the answer. Returns the updated question.
  const handleAnswerQuestion = async (qaId, draft) => {
    const updated = toQuestion(
      await api.answerQuestion(qaId, {
        answer_text: draft.answerText,
        video_response_url: draft.videoResponseUrl || null,
      })
    );
    setQaItems((qs) => mapById(qs, qaId, () => updated));
    return updated;
  };

  const handleUpvoteQA = async (qaId) => {
    const flip = (q) => ({ ...q, upvotedByMe: !q.upvotedByMe, upvotes: q.upvotes + (q.upvotedByMe ? -1 : 1) });
    setQaItems((qs) => mapById(qs, qaId, flip));
    try {
      const r = await api.upvoteQuestion(qaId);
      setQaItems((qs) => mapById(qs, qaId, (q) => ({ ...q, upvotedByMe: r.upvoted, upvotes: r.upvotes_count })));
    } catch (err) {
      setQaItems((qs) => mapById(qs, qaId, flip));
      showToast(`Couldn't update upvote: ${err.message}`);
    }
  };

  const openProfile = async (username) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      const [u, theirPosts] = await Promise.all([api.getUserProfile(username), api.getPostsByAuthor(username)]);
      setViewingUser(toProfileUser(u));
      setViewingPosts(theirPosts.map(toPost));
    } catch (err) {
      showToast(err.status === 404 ? `No profile found for @${username}` : `Couldn't open profile: ${err.message}`);
    }
  };

  const handleOpenUserProfile = (username) => openProfile(username);
  const handleOpenMyProfile = () => openProfile(currentUser.username);

  const handleSelectHighlight = (highlight) => {
    const highlightStory = {
      id: highlight.id,
      userId: viewingUser.id,
      username: viewingUser.username,
      fullName: viewingUser.fullName,
      avatarUrl: viewingUser.avatarUrl,
      professionTitle: viewingUser.professionTitle,
      mediaUrl: highlight.cover,
      caption: `Pinned Highlight: ${highlight.title}`,
      timeAgo: 'Pinned',
      professionTag: viewingUser.industry.split(' ')[0],
    };
    setStories([highlightStory, ...stories]);
    setActiveStoryIdx(0);
  };

  const selectedCategoryName = categories.find((c) => c.slug === selectedCategory)?.name;

  const sourcePosts = feedView === 'all' ? posts : feedPosts;

  const filteredPosts = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return sourcePosts.filter((post) => {
      const matchesSearch =
        !q ||
        post.title.toLowerCase().includes(q) ||
        post.caption.toLowerCase().includes(q) ||
        post.authorProfessionTitle.toLowerCase().includes(q) ||
        post.tags.some((t) => t.toLowerCase().includes(q)) ||
        post.taskDetails?.toolsUsed?.some((tool) => tool.toLowerCase().includes(q));

      const matchesCategory = selectedCategory === 'all' || post.authorIndustry === selectedCategoryName;
      return matchesSearch && matchesCategory;
    });
  }, [sourcePosts, searchTerm, selectedCategory, selectedCategoryName]);

  if (currentUser === undefined) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center" role="status" aria-label="Loading">
        <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (currentUser === null) {
    return <AuthScreen onAuthenticated={setCurrentUser} />;
  }

  const me = toProfileUser(currentUser);

  const tabClass = (tab) =>
    `flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all ${
      activeTab === tab ? 'bg-white text-slate-900 shadow-sm font-extrabold' : 'text-slate-600 hover:text-slate-900'
    }`;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Universal Instagram-Style Header */}
      <Header
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenCreate={() => setIsCreateOpen(true)}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setViewingUser(null);
          setActiveTab(tab);
        }}
        onOpenMyProfile={handleOpenMyProfile}
      />

      {toast && (
        <div role="alert" className="fixed top-16 inset-x-0 z-[60] flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-2 bg-rose-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg">
            <AlertTriangle className="w-4 h-4" />
            <span>{toast}</span>
          </div>
        </div>
      )}

      {/* Main App Container */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {loadState === 'loading' || loadState === 'idle' ? (
          <div className="flex justify-center py-20" role="status" aria-label="Loading">
            <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
          </div>
        ) : loadState === 'error' ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200" role="alert">
            <p className="text-sm font-bold text-slate-700">Couldn't load MyJob</p>
            <p className="text-xs text-slate-500 mt-1">{loadError}</p>
            <button
              onClick={loadAll}
              className="mt-4 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold"
            >
              Try again
            </button>
          </div>
        ) : viewingUser ? (
          /* VIEWING PROFILE VIEW */
          <UserProfile
            user={viewingUser}
            posts={viewingPosts}
            qaItems={qaItems}
            challenges={challenges}
            isOwnProfile={viewingUser.id === currentUser.id}
            onToggleFollow={handleToggleFollow}
            onBack={() => setViewingUser(null)}
            onOpenCaseStudy={setSelectedCaseStudy}
            onOpenReviewModal={setReviewModalPost}
            onAskQuestion={handleAskQuestion}
            onSelectHighlight={handleSelectHighlight}
            onEditPost={setEditingPost}
            onDeletePost={handleDeletePost}
          />
        ) : (
          /* MAIN FEED & TABS VIEW */
          <>
            {/* 24h Worklife Story Tray */}
            <StoryTray
              stories={stories}
              onSelectStory={(_, idx) => setActiveStoryIdx(idx)}
              onOpenAddStory={() => setIsCreateOpen(true)}
            />

            {/* Profession Discovery & Taxonomy Slider */}
            <ProfessionDiscovery
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              onSelectRole={(role) => setSearchTerm(role)}
            />

            {/* Main Feed Navigation Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-2xl mb-5 text-xs font-bold border border-slate-300/60">
              <button onClick={() => setActiveTab('feed')} className={tabClass('feed')}>
                <Layers className="w-3.5 h-3.5 text-brand-600" />
                <span className="hidden sm:inline">Feed & Guides</span>
                <span className="sm:hidden">Feed</span>
              </button>

              <button onClick={() => setActiveTab('reels')} className={tabClass('reels')}>
                <Film className="w-3.5 h-3.5 text-rose-600" />
                <span>Reels (sample)</span>
              </button>

              <button onClick={() => setActiveTab('challenges')} className={tabClass('challenges')}>
                <Puzzle className="w-3.5 h-3.5 text-indigo-600" />
                <span>Dilemmas</span>
              </button>

              <button onClick={() => setActiveTab('qa')} className={tabClass('qa')}>
                <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>AMAs</span>
              </button>
            </div>

            {/* FEED TAB CONTENT */}
            {activeTab === 'feed' && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-xs font-bold" role="tablist" aria-label="Feed filter">
                  {[['all', 'For you'], ['following', 'Following'], ['saved', 'Saved']].map(([view, label]) => (
                    <button
                      key={view}
                      role="tab"
                      aria-selected={feedView === view}
                      onClick={() => setFeedView(view)}
                      className={`px-4 py-1.5 rounded-full border transition-colors ${
                        feedView === view
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-300 hover:border-slate-500'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {feedView !== 'all' && feedState === 'loading' ? (
                  <div className="flex justify-center py-10" role="status" aria-label="Loading">
                    <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                  </div>
                ) : filteredPosts.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                    <p className="text-sm font-bold text-slate-600">
                      {sourcePosts.length > 0
                        ? 'No posts matched your search filters.'
                        : feedView === 'following'
                          ? 'Nothing here yet — follow some professionals to fill this feed.'
                          : feedView === 'saved'
                            ? 'You haven\'t saved anything yet. Tap the bookmark on a post.'
                            : 'No posts yet — publish the first one.'}
                    </p>
                    {sourcePosts.length > 0 && (
                      <button
                        onClick={() => { setSearchTerm(''); setSelectedCategory('all'); }}
                        className="mt-2 text-xs font-bold text-brand-600 hover:underline"
                      >
                        Clear all filters
                      </button>
                    )}
                  </div>
                ) : (
                  filteredPosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onLike={handleLikePost}
                      onBookmark={handleBookmarkPost}
                      onOpenCaseStudy={setSelectedCaseStudy}
                      onOpenReviewModal={setReviewModalPost}
                      onOpenUserProfile={handleOpenUserProfile}
                      isOwn={post.authorId === me.id}
                      onEdit={setEditingPost}
                      onDelete={handleDeletePost}
                    />
                  ))
                )}
              </div>
            )}

            {/* REELS TAB CONTENT (sample data) */}
            {activeTab === 'reels' && (
              <>
                <p className="text-center text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3">
                  Reels are sample content for now — video posting isn't available yet.
                </p>
                <ReelsHub
                  reels={reels}
                  onLikeReel={handleLikeReel}
                  onBookmarkReel={handleBookmarkReel}
                  onOpenUserProfile={handleOpenUserProfile}
                />
              </>
            )}

            {/* CHALLENGES TAB CONTENT */}
            {activeTab === 'challenges' && (
              <ChallengesHub
                challenges={challenges}
                onAddSuggestion={handleAddSuggestion}
                onUpvoteSuggestion={handleUpvoteSuggestion}
                onAcceptSuggestion={handleAcceptSuggestion}
                onUpdateChallenge={handleUpdateChallenge}
                onDeleteChallenge={handleDeleteChallenge}
                onUpdateSuggestion={handleUpdateSuggestion}
                onDeleteSuggestion={handleDeleteSuggestion}
                categories={categories}
                currentUserId={me.id}
                onOpenCreateChallenge={() => setIsCreateOpen(true)}
              />
            )}

            {/* QA AMAs TAB CONTENT */}
            {activeTab === 'qa' && (
              <QAHub
                qaItems={qaItems}
                professionals={professionals}
                currentUserId={me.id}
                onAskQuestion={handleAskQuestion}
                onAnswerQuestion={handleAnswerQuestion}
                onUpdateQuestion={handleUpdateQuestion}
                onDeleteQuestion={handleDeleteQuestion}
                onUpvoteQA={handleUpvoteQA}
              />
            )}
          </>
        )}
      </main>

      {/* Story Viewer Modal */}
      {activeStoryIdx !== null && (
        <StoryViewerModal
          stories={stories}
          initialIndex={activeStoryIdx}
          currentUserId={me.id}
          onDeleteStory={handleDeleteStory}
          onClose={() => setActiveStoryIdx(null)}
        />
      )}

      {/* Case Study Deep-Dive Walkthrough Modal */}
      {selectedCaseStudy && (
        <CaseStudyDetailModal
          post={selectedCaseStudy}
          reviewsVersion={reviewsVersion}
          onClose={() => setSelectedCaseStudy(null)}
          onOpenReviewModal={(post) => {
            setSelectedCaseStudy(null);
            setReviewModalPost(post);
          }}
        />
      )}

      {/* Review & Technique Rating Modal */}
      {reviewModalPost && (
        <ReviewRatingModal
          post={reviewModalPost}
          onClose={() => setReviewModalPost(null)}
          onSubmitReview={handleAddReview}
        />
      )}

      {/* Post/Story/Challenge Creator Studio Modal */}
      {(isCreateOpen || editingPost) && (
        <CreatePostModal
          key={editingPost?.id || 'new'}
          currentUser={me}
          categories={categories}
          editPost={editingPost}
          onUpdatePost={handleUpdatePost}
          onClose={() => { setIsCreateOpen(false); setEditingPost(null); }}
          onCreatePost={handleAddPost}
          onCreateStory={handleAddStory}
          onCreateChallenge={handleAddChallenge}
        />
      )}
    </div>
  );
}
