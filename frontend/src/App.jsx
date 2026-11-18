import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { STANDALONE_PAGES, menuKeyForRoute, parseRoute, pathForMenuKey, paths, titleForRoute } from './routes';
import { useI18n } from './i18n';
import AuthScreen from './components/AuthScreen';
import { api, IS_DEMO, onUnauthorized, tokenStore } from './api/client';
import {
  DEFAULT_AVATAR, toCategories, toChallenge, toChallengePayload, toPost, toPostPayload, toPostUpdatePayload,
  toProfileUser,
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
import { MenuDrawer } from './components/SideMenu';
import BottomNav from './components/BottomNav';
import ActivityPage from './components/ActivityPage';
import SettingsPage from './components/SettingsPage';
import ModerationPage from './components/ModerationPage';
import { ProfessionPage, ProfessionsPage } from './components/ProfessionPages';
import ProfessionOfTheDay from './components/ProfessionOfTheDay';
import NotificationsPage from './components/NotificationsPage';
import NotFoundPage from './components/NotFoundPage';
import { ResetPasswordPage, VerifyEmailPage } from './components/EmailLinkPages';
import { PrivacyPage, TermsPage } from './components/LegalPages';
import { Loading } from './components/SlowHint';

import { INITIAL_REELS } from './data/sampleReels';

import {
  Loader2, Info, ArrowLeft
} from 'lucide-react';

const EMPTY_CATEGORIES = [{ id: 'cat_all', name: 'All Professions', slug: 'all', icon: 'briefcase' }];

// Applies fn to the item with the given id, leaving the rest untouched.
const mapById = (list, id, fn) => list.map((x) => (x.id === id ? fn(x) : x));

export default function App() {
  const { t, lang, setLanguage } = useI18n();
  // Auth: undefined = checking stored token, null = signed out, object = signed-in account
  const [currentUser, setCurrentUser] = useState(tokenStore.get() ? undefined : null);

  // The address decides which page is shown (see routes.js).
  const location = useLocation();
  const go = useNavigate();
  const route = useMemo(() => parseRoute(location.pathname), [location.pathname]);
  const activeTab = route.page;
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Server data
  const [posts, setPosts] = useState([]);
  // 'all' = everything, 'following' = people I follow, 'saved' = my bookmarks (from the address)
  const feedView = route.page === 'feed' ? route.feedView : 'all';
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

  // Profile page (/u/<username>), loaded from the address
  const [viewingUser, setViewingUser] = useState(null);
  const [viewingPosts, setViewingPosts] = useState([]);
  const [profileState, setProfileState] = useState('idle'); // 'loading' | 'ready' | 'notfound' | 'error'
  // Single post page (/p/<id>)
  const [pagePost, setPagePost] = useState(null);
  const [postState, setPostState] = useState('idle'); // 'loading' | 'ready' | 'notfound' | 'error'

  // Modals
  const [activeStoryIdx, setActiveStoryIdx] = useState(null);
  const [selectedCaseStudy, setSelectedCaseStudy] = useState(null);
  const [reviewModalPost, setReviewModalPost] = useState(null);
  const [reviewsVersion, setReviewsVersion] = useState(0);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null); // a post open in the editor
  const [unreadCount, setUnreadCount] = useState(0);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  }, []);

  const clearSession = useCallback(() => {
    tokenStore.clear();
    setCurrentUser(null);
    setViewingUser(null);
    setPosts([]); setStories([]); setChallenges([]); setQaItems([]); setProfessionals([]);
    setFeedPosts([]);
    setLoadState('idle');
    setMenuOpen(false); setPagePost(null);
    setSearchTerm(''); setSelectedCategory('all');
    setSelectedCaseStudy(null); setReviewModalPost(null); setEditingPost(null); setIsCreateOpen(false);
    setActiveStoryIdx(null); setToast('');
    setUnreadCount(0);
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

  const loadAll = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) {
      setLoadState('loading');
      setLoadError('');
    }
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
      if (quiet) return;
      setLoadError(err.message);
      setLoadState('error');
    }
  }, []);

  const userId = currentUser?.id;
  useEffect(() => {
    if (userId) loadAll();
  }, [userId, loadAll]);

  // Times ("5 min ago") and defaults ("Explorer") are worded when data loads, so a new language reloads it.
  const shownLanguage = useRef(lang);
  useEffect(() => {
    if (lang === shownLanguage.current) return;
    shownLanguage.current = lang;
    if (userId) loadAll({ quiet: true });
  }, [lang, userId, loadAll]);

  // Choosing a language in Settings also saves it on the account (emails then use it too).
  const handleLanguageChange = (code) => {
    api.updateMe({ language: code }).then(setCurrentUser).catch(() => {});
  };

  // The language saved on the account wins over this device's guess (e.g. on a new phone).
  const accountLanguage = currentUser?.language;
  useEffect(() => {
    if (accountLanguage && accountLanguage !== lang) setLanguage(accountLanguage);
    // Only when the account's choice changes, not on every language switch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountLanguage]);

  // Signing out (as opposed to a session expiring) returns to the home address, so whoever signs in next
  // starts on Home. An expired session keeps the address and comes back to it after signing in again.
  const handleLogout = () => {
    clearSession();
    go(paths.home, { replace: true });
  };

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
      showToast(t('toast.feedFailed', { error: err.message }));
    }
  }, [showToast, t]);

  useEffect(() => {
    if (loadState === 'ready') loadFeedView(feedView);
  }, [feedView, loadState, loadFeedView]);

  // ---------- Actions: optimistic where it is a toggle, wait-for-server where the server assigns data ----------

  // A post can appear in the main feed, the following/saved list and a profile; keep them all in sync.
  const updatePost = (postId, fn) => {
    setPosts((ps) => mapById(ps, postId, fn));
    setFeedPosts((ps) => mapById(ps, postId, fn));
    setViewingPosts((ps) => mapById(ps, postId, fn));
    setPagePost((p) => (p && p.id === postId ? fn(p) : p));
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
      showToast(t('toast.likeFailed', { error: err.message }));
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
      showToast(t('toast.saveFailed', { error: err.message }));
    }
  };

  // Blocking hides both people's content from each other, so everything on screen is refreshed.
  const handleToggleBlock = async (username) => {
    const was = viewingUser?.isBlocked;
    if (!was && !window.confirm(t('block.confirm', { username }))) return;
    try {
      const r = was ? await api.unblockUser(username) : await api.blockUser(username);
      setViewingUser((u) => (u && u.username === username
        ? { ...u, isBlocked: r.is_blocked, isFollowing: false,
            followersCount: Math.max(0, (u.followersCount || 0) - (!was && u.isFollowing ? 1 : 0)) }
        : u));
      setViewingPosts(was ? (await api.getPostsByAuthor(username)).map(toPost) : []);
      showToast(was ? t('block.unblocked', { username }) : t('block.blocked', { username }));
      loadAll({ quiet: true });
      if (feedView !== 'all') loadFeedView(feedView);
    } catch (err) {
      showToast(t(was ? 'block.unblockFailed' : 'block.blockFailed', { error: err.message }));
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
      showToast(t(was ? 'toast.unfollowFailed' : 'toast.followFailed', { error: err.message }));
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
    setPagePost((p) => (p && p.id === updated.id ? updated : p));
  };

  // The comments panel reports the real total after loading or changing comments.
  const handleCommentsCountChange = useCallback((postId, total) => {
    const set = (ps) => ps.map((p) => (p.id === postId && p.commentsCount !== total ? { ...p, commentsCount: total } : p));
    setPosts(set);
    setFeedPosts(set);
    setViewingPosts(set);
    setPagePost((p) => (p && p.id === postId && p.commentsCount !== total ? { ...p, commentsCount: total } : p));
  }, []);

  const handleUpdatePost = async (postId, draft) => {
    replacePost(toPost(await api.updatePost(postId, toPostUpdatePayload(draft))));
  };

  const handleDeletePost = async (postId) => {
    try {
      await api.deletePost(postId);
    } catch (err) {
      showToast(t('toast.deletePostFailed', { error: err.message }));
      return;
    }
    const drop = (ps) => ps.filter((p) => p.id !== postId);
    setPosts(drop);
    setFeedPosts(drop);
    setViewingPosts(drop);
    setSelectedCaseStudy((cs) => (cs && cs.id === postId ? null : cs));
    if (route.page === 'post' && route.postId === postId) go(paths.home, { replace: true });
    setViewingUser((u) => (u && u.id === currentUser.id ? { ...u, postsCount: Math.max(0, (u.postsCount || 1) - 1) } : u));
    showToast(t('toast.postDeleted'));
  };

  const handleDeleteStory = async (storyId) => {
    try {
      await api.deleteStory(storyId);
    } catch (err) {
      showToast(t('toast.deleteStoryFailed', { error: err.message }));
      return;
    }
    setStories((ss) => ss.filter((s) => s.id !== storyId));
    setActiveStoryIdx(null);
    showToast(t('toast.storyDeleted'));
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
      showToast(t('toast.deleteChallengeFailed', { error: err.message }));
      return;
    }
    setChallenges((cs) => cs.filter((c) => c.id !== challengeId));
    showToast(t('toast.challengeDeleted'));
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
      showToast(t('toast.deleteIdeaFailed', { error: err.message }));
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
      showToast(t('toast.deleteQuestionFailed', { error: err.message }));
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
    if (route.page !== 'feed') go(paths.home);
  };

  const handleAddStory = async (draft) => {
    const created = toStory(await api.createStory(toStoryPayload(draft)));
    setStories((ss) => [created, ...ss]);
  };

  const handleAddChallenge = async (draft) => {
    const created = toChallenge(await api.createChallenge(toChallengePayload(draft)));
    setChallenges((cs) => [created, ...cs]);
    go(paths.challenge(created.id));
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
      showToast(t(accept ? 'toast.acceptFailed' : 'toast.withdrawFailed', { error: err.message }));
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
      showToast(t('toast.upvoteFailed', { error: err.message }));
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
      showToast(t('toast.upvoteFailed', { error: err.message }));
    }
  };

  // Load the profile named in the address (/u/<username>).
  const profileUsername = route.page === 'profile' ? route.username : null;
  useEffect(() => {
    if (!profileUsername || !userId) return undefined;
    let cancelled = false;
    setProfileState('loading');
    Promise.all([api.getUserProfile(profileUsername), api.getPostsByAuthor(profileUsername)])
      .then(([u, theirPosts]) => {
        if (cancelled) return;
        setViewingUser(toProfileUser(u));
        setViewingPosts(theirPosts.map(toPost));
        setProfileState('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        setViewingUser(null);
        setProfileState(err.status === 404 ? 'notfound' : 'error');
      });
    return () => { cancelled = true; };
  }, [profileUsername, userId]);

  // Load the post named in the address (/p/<id>).
  const pagePostId = route.page === 'post' ? route.postId : null;
  useEffect(() => {
    if (!pagePostId || !userId) return undefined;
    let cancelled = false;
    setPostState('loading');
    api.getPostById(pagePostId)
      .then((p) => {
        if (cancelled) return;
        setPagePost(toPost(p));
        setPostState('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        setPagePost(null);
        setPostState(err.status === 404 ? 'notfound' : 'error');
      });
    return () => { cancelled = true; };
  }, [pagePostId, userId]);

  // Each page starts at the top, and the browser tab says where you are.
  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);
  useEffect(() => {
    if (currentUser === null) {
      document.title = `${t('auth.login')} · Prologue`;
      return;
    }
    const extra = route.page === 'profile' && viewingUser?.username === route.username
      ? `${viewingUser.fullName} (@${viewingUser.username})`
      : route.page === 'post' && pagePost?.id === route.postId ? pagePost.title : null;
    document.title = titleForRoute(route, extra);
  }, [route, viewingUser, pagePost, currentUser, t]);

  const handleOpenUserProfile = (username) => go(paths.profile(username));

  // One place for menu navigation: the sidebar, the phone menu, the bottom bar and the header.
  const navigate = (key) => go(pathForMenuKey(key, currentUser.username));
  const goToChallenge = (challengeId) => go(paths.challenge(challengeId));
  const goToQA = (view) => go(view === 'inbox' ? paths.qaInbox : paths.qa);

  const openPostFromActivity = (post) => {
    if (post.taskDetails) setSelectedCaseStudy(post);
    else go(paths.post(post.id));
  };

  // Typing a search shows the feed, where search applies.
  const handleSearchChange = (value) => {
    setSearchTerm(value);
    if (value && route.page !== 'feed') go(paths.home);
  };

  // ---------- Settings ----------

  // After a profile edit, show the new name/photo/profession on everything already loaded.
  const applyMyProfile = (u) => {
    const name = u.full_name;
    const avatar = u.avatar_url || DEFAULT_AVATAR;
    const title = u.profession?.title || t('role.explorer');
    const fixPost = (p) => (p.authorId === u.id ? {
      ...p, authorFullName: name, authorAvatarUrl: avatar, authorProfessionTitle: title,
      authorIndustry: u.profession?.industry || null, isAuthorVerified: !!u.profession?.is_verified_pro,
    } : p);
    setPosts((ps) => ps.map(fixPost));
    setFeedPosts((ps) => ps.map(fixPost));
    setViewingPosts((ps) => ps.map(fixPost));
    setStories((ss) => ss.map((s) => (s.userId === u.id ? { ...s, fullName: name, avatarUrl: avatar, professionTitle: title } : s)));
    setChallenges((cs) => cs.map((c) => (c.workerId === u.id
      ? { ...c, workerFullName: name, workerAvatarUrl: avatar, workerProfessionTitle: title } : c)));
    setQaItems((qs) => qs.map((q) => (q.workerId === u.id
      ? { ...q, workerFullName: name, workerAvatarUrl: avatar, workerProfessionTitle: title } : q)));
    // You can be asked questions only while you have a profession.
    setProfessionals((ps) => {
      const others = ps.filter((p) => p.id !== u.id);
      return u.profession ? [...others, toProfileUser(u)] : others;
    });
  };

  const handleSaveProfile = async (data) => {
    const updated = await api.updateMe(data);
    setCurrentUser(updated);
    applyMyProfile(updated);
  };

  // Other sessions are signed out by the server; this one continues with the new token.
  const handleChangePassword = async (data) => {
    const r = await api.changePassword(data);
    tokenStore.set(r.access_token);
    setCurrentUser(r.user);
  };

  // A password reset from an email link: whoever was logged in on this device is replaced by that account.
  const handlePasswordReset = (data) => {
    clearSession();
    tokenStore.set(data.access_token);
    setCurrentUser(data.user);
    go(paths.home, { replace: true });
    showToast(t('toast.passwordReset'));
  };

  // After confirming an email address, refresh the account if this device is logged in.
  const handleEmailVerified = useCallback(() => {
    if (tokenStore.get()) api.getMe().then(setCurrentUser).catch(() => {});
  }, []);

  const handleDeleteAccount = async (data) => {
    await api.deleteMe(data);
    clearSession();
    go(paths.home, { replace: true });
    showToast(t('toast.accountDeleted'));
  };

  // ---------- Notifications ----------

  const refreshUnread = useCallback(async () => {
    try {
      setUnreadCount((await api.getUnreadCount()).unread_count);
    } catch {
      // A missed poll is harmless; the next one (or a 401 sign-out) takes care of it.
    }
  }, []);

  // Poll for the bell badge every minute, and right away when you come back to the tab.
  useEffect(() => {
    if (!currentUser?.id) return undefined;
    refreshUnread();
    const timer = setInterval(refreshUnread, 60000);
    const onVisible = () => { if (document.visibilityState === 'visible') refreshUnread(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [currentUser?.id, refreshUnread]);

  // A review opens the case study it is about (over the current page); anything else opens the post's page.
  const openReviewedPost = async (postId) => {
    try {
      const p = toPost(await api.getPostById(postId));
      if (p.taskDetails) setSelectedCaseStudy(p);
      else go(paths.post(postId));
    } catch (err) {
      showToast(err.status === 404 ? t('toast.postGone') : t('toast.openPostFailed', { error: err.message }));
    }
  };

  // Takes you to whatever the notification is about.
  const handleOpenNotification = (n) => {
    switch (n.type) {
      case 'follow':
        handleOpenUserProfile(n.actorUsername);
        break;
      case 'question':
        goToQA('inbox');
        break;
      case 'answer':
        goToQA('all');
        break;
      case 'suggestion':
      case 'accepted':
        if (challenges.some((c) => c.id === n.challengeId)) goToChallenge(n.challengeId);
        else showToast(t('toast.challengeGone'));
        break;
      case 'review':
        if (n.postId) openReviewedPost(n.postId);
        break;
      default: // comment, reaction
        if (n.postId) go(paths.post(n.postId));
    }
  };

  const handleResetDemo = async () => {
    if (!window.confirm(t('demo.resetConfirm'))) return;
    const { resetDemoData } = await import('./api/demoBackend');
    resetDemoData();
    clearSession();
    go(paths.home, { replace: true });
  };

  const handleSelectHighlight = (highlight) => {
    const highlightStory = {
      id: highlight.id,
      userId: viewingUser.id,
      username: viewingUser.username,
      fullName: viewingUser.fullName,
      avatarUrl: viewingUser.avatarUrl,
      professionTitle: viewingUser.professionTitle,
      mediaUrl: highlight.cover,
      caption: t('profile.pinnedHighlight', { title: highlight.title }),
      timeAgo: t('profile.pinned'),
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

  if (STANDALONE_PAGES.includes(route.page)) {
    const leave = () => go(paths.home, { replace: true });
    if (route.page === 'privacy') return <PrivacyPage />;
    if (route.page === 'terms') return <TermsPage />;
    return route.page === 'resetPassword'
      ? <ResetPasswordPage onReset={handlePasswordReset} onCancel={leave} />
      : <VerifyEmailPage onVerified={handleEmailVerified} onContinue={leave} />;
  }

  if (currentUser === undefined) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loading className="" />
      </div>
    );
  }

  if (currentUser === null) {
    return <AuthScreen onAuthenticated={setCurrentUser} notice={toast} />;
  }

  const me = toProfileUser(currentUser);

  // What the menus highlight as the current page.
  const activeKey = menuKeyForRoute(route, currentUser.username);

  const menuProps = {
    me, activeKey, onNavigate: navigate, onLogout: handleLogout, unreadCount, isAdmin: !!currentUser.is_admin,
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header
        currentUser={currentUser}
        onOpenCreate={() => setIsCreateOpen(true)}
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        onGoHome={() => go(paths.home)}
        onOpenMenu={() => setMenuOpen(true)}
        onOpenNotifications={() => navigate('notifications')}
        onOpenMyProfile={() => navigate('profile')}
        notificationsActive={activeKey === 'notifications'}
        unreadCount={unreadCount}
      />
      <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} {...menuProps} />

      {toast && (
        <div role="alert" className="fixed top-16 inset-x-0 z-[60] flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-2 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg">
            <Info className="w-4 h-4 text-cyan-300" />
            <span>{toast}</span>
          </div>
        </div>
      )}

      {/* Sidebar (wide screens) + page */}
      <div className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-4 flex gap-8">
      <main className="flex-1 min-w-0 max-w-2xl mx-auto py-4 sm:py-6 pb-24 lg:pb-8">
        {loadState === 'loading' || loadState === 'idle' ? (
          <Loading />
        ) : loadState === 'error' ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200" role="alert">
            <p className="text-sm font-bold text-slate-700">{t('app.loadFailed')}</p>
            <p className="text-xs text-slate-500 mt-1">{loadError}</p>
            <button
              onClick={loadAll}
              className="mt-4 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold"
            >
              {t('common.tryAgain')}
            </button>
          </div>
        ) : route.page === 'notFound' ? (
          <NotFoundPage />
        ) : route.page === 'profile' && (profileState === 'notfound' || profileState === 'error') ? (
          <NotFoundPage
            title={profileState === 'notfound' ? t('profile.notFound') : t('profile.loadFailed')}
            message={profileState === 'notfound'
              ? t('profile.notFoundText', { username: route.username })
              : t('common.checkConnection')}
          />
        ) : route.page === 'profile' && viewingUser?.username !== route.username ? (
          <Loading />
        ) : route.page === 'profile' ? (
          <UserProfile
            key={viewingUser.username}
            user={viewingUser}
            posts={viewingPosts}
            qaItems={qaItems}
            isOwnProfile={viewingUser.id === currentUser.id}
            onToggleFollow={handleToggleFollow}
            onToggleBlock={handleToggleBlock}
            onBack={() => (location.key !== 'default' ? go(-1) : go(paths.home))}
            onOpenCaseStudy={setSelectedCaseStudy}
            onAskQuestion={handleAskQuestion}
            onSelectHighlight={handleSelectHighlight}
            onEditPost={setEditingPost}
            onDeletePost={handleDeletePost}
          />
        ) : route.page === 'post' ? (
          postState === 'notfound' || postState === 'error' ? (
            <NotFoundPage
              title={postState === 'notfound' ? t('post.notFound') : t('post.loadFailed')}
              message={postState === 'notfound'
                ? t('post.notFoundText')
                : t('common.checkConnection')}
            />
          ) : pagePost?.id !== route.postId ? (
            <Loading />
          ) : (
            <div className="space-y-3">
              <button type="button" onClick={() => (location.key !== 'default' ? go(-1) : go(paths.home))}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-teal-700">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <PostCard
                key={pagePost.id}
                post={pagePost}
                initialShowComments
                onLike={handleLikePost}
                onBookmark={handleBookmarkPost}
                onOpenCaseStudy={setSelectedCaseStudy}
                onOpenReviewModal={setReviewModalPost}
                onOpenUserProfile={handleOpenUserProfile}
                isOwn={pagePost.authorId === me.id}
                currentUserId={me.id}
                onCommentsCountChange={handleCommentsCountChange}
                onEdit={setEditingPost}
                onDelete={handleDeletePost}
              />
            </div>
          )
        ) : activeTab === 'activity' ? (
          <ActivityPage
            me={me}
            qaItems={qaItems}
            challenges={challenges}
            onOpenPost={openPostFromActivity}
            onGoToQA={goToQA}
            onGoToChallenge={goToChallenge}
          />
        ) : activeTab === 'notifications' ? (
          <NotificationsPage onOpen={handleOpenNotification} onUnreadChange={setUnreadCount} />
        ) : activeTab === 'settings' ? (
          <SettingsPage
            account={currentUser}
            me={me}
            isDemo={IS_DEMO}
            onSaveProfile={handleSaveProfile}
            onChangePassword={handleChangePassword}
            onDeleteAccount={handleDeleteAccount}
            onLogout={handleLogout}
            onResetDemo={handleResetDemo}
            onBlockChange={() => loadAll({ quiet: true })}
            onLanguageChange={handleLanguageChange}
          />
        ) : route.page === 'professions' ? (
          <ProfessionsPage />
        ) : route.page === 'profession' ? (
          <ProfessionPage slug={route.slug} />
        ) : activeTab === 'moderation' ? (
          currentUser.is_admin
            ? <ModerationPage onOpen={(path) => go(path)} onChanged={() => loadAll({ quiet: true })} />
            : <NotFoundPage />
        ) : (
          /* MAIN SECTIONS */
          <>
            {activeTab === 'feed' && (
            <>
            {/* 24h Worklife Story Tray */}
            <StoryTray
              stories={stories}
              myAvatarUrl={me.avatarUrl}
              onSelectStory={(_, idx) => setActiveStoryIdx(idx)}
              onOpenAddStory={() => setIsCreateOpen(true)}
            />

            {/* Profession Discovery & Taxonomy Slider */}
            <ProfessionDiscovery
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              onSelectRole={(role) => setSearchTerm(role)}
              onOpenProfession={(slug) => go(paths.profession(slug))}
            />
            </>
            )}

            {/* FEED TAB CONTENT */}
            {activeTab === 'feed' && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-xs font-bold" role="tablist" aria-label={t('feed.filter')}>
                  {[['all', t('feed.forYou')], ['following', t('feed.following')], ['saved', t('feed.saved')]].map(([view, label]) => (
                    <button
                      key={view}
                      role="tab"
                      aria-selected={feedView === view}
                      onClick={() => go(view === 'all' ? paths.home : view === 'following' ? paths.following : paths.saved)}
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

                {feedView === 'all' && !searchTerm && selectedCategory === 'all' && <ProfessionOfTheDay />}

                {feedView !== 'all' && feedState === 'loading' ? (
                  <div className="flex justify-center py-10" role="status" aria-label={t('common.loading')}>
                    <Loader2 className="w-5 h-5 text-teal-600 animate-spin" />
                  </div>
                ) : filteredPosts.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                    <p className="text-sm font-bold text-slate-600">
                      {sourcePosts.length > 0
                        ? t('feed.noMatches')
                        : feedView === 'following'
                          ? t('feed.emptyFollowing')
                          : feedView === 'saved'
                            ? t('feed.emptySaved')
                            : t('feed.empty')}
                    </p>
                    {sourcePosts.length > 0 && (
                      <button
                        onClick={() => { setSearchTerm(''); setSelectedCategory('all'); }}
                        className="mt-2 text-xs font-bold text-brand-600 hover:underline"
                      >
                        {t('feed.clearFilters')}
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
                      currentUserId={me.id}
                      onCommentsCountChange={handleCommentsCountChange}
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
                  {t('reels.sampleNotice')}
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
                selectedChallengeId={route.challengeId}
                onSelectChallenge={(id) => go(paths.challenge(id), { replace: true })}
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
                key={route.qaView}
                initialView={route.qaView}
                onViewChange={(v) => go(v === 'inbox' ? paths.qaInbox : paths.qa, { replace: true })}
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
      </div>

      <BottomNav me={me} activeKey={activeKey} onNavigate={navigate} onOpenCreate={() => setIsCreateOpen(true)} />

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
