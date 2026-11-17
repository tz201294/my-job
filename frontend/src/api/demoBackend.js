// In-browser stand-in for the API, used only in demo mode (static hosting such as GitHub Pages).
// It keeps state for this browser (saved to localStorage) and returns the same response shapes as
// the real backend for every endpoint the app calls, so the rest of the app behaves identically.
import {
  INITIAL_CATEGORIES,
  INITIAL_COMMENTS,
  INITIAL_CHALLENGES,
  INITIAL_POSTS,
  INITIAL_QA_ITEMS,
  INITIAL_STORIES,
  INITIAL_USERS,
} from '../data/mockData';
import {
  DEFAULT_AVATAR, PLACEHOLDER_IMAGE, toChallenge, toComment, toPost, toQuestion, toStory, toSuggestion,
} from './mappers';

export const DEMO_PASSWORD = 'demo1234';
export const DEMO_TOKEN = 'demo_token';

// Bump the version when the sample data changes so returning visitors get the new data.
const STORE_KEY = 'myjob_demo_store_v4';
// undefined (a 204 No Content reply) becomes null, like an empty response body.
const clone = (x) => (x === undefined ? null : JSON.parse(JSON.stringify(x)));

const SIGNUP_OPTIONS = {
  industries: [
    'Trades & Craftsmanship', 'Transportation & Logistics', 'Legal & Finance', 'Technology & Engineering',
    'Healthcare & Medicine', 'Education & Training', 'Food & Hospitality', 'Arts, Media & Design',
    'Science & Research', 'Public Service & Safety', 'Other',
  ],
  interests: [
    'Trades & Craftsmanship', 'Transportation & Logistics', 'Legal & Finance', 'Technology & Engineering',
    'Healthcare & Medicine', 'Education & Training', 'Food & Hospitality', 'Arts, Media & Design',
    'Science & Research', 'Public Service & Safety',
  ],
  genders: ['female', 'male', 'non_binary', 'prefer_not_to_say'],
  non_working_statuses: ['student', 'unemployed', 'retired', 'other'],
  education_levels: ['high_school', 'vocational', 'bachelors', 'masters', 'doctorate', 'other'],
};

function freshStore() {
  return {
    // Every account, in the API's user shape (snake_case), keyed by username.
    users: Object.fromEntries(Object.values(INITIAL_USERS).map((u) => [u.username, uiUserToApi(u)])),
    passwords: {}, // username -> password, for accounts registered in this browser
    meUsername: null,
    following: [], // usernames the signed-in user follows
    posts: clone(INITIAL_POSTS),
    stories: clone(INITIAL_STORIES),
    challenges: clone(INITIAL_CHALLENGES),
    questions: clone(INITIAL_QA_ITEMS),
    reviews: [], // API shape, as CaseStudyDetailModal renders them directly
    comments: clone(INITIAL_COMMENTS), // UI shape, oldest first
  };
}

let store = null;

function load() {
  if (store) return store;
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY));
    if (saved && saved.users && saved.posts) store = saved;
  } catch {}
  if (!store) store = freshStore();
  return store;
}

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {}
}

function uiUserToApi(u) {
  return {
    id: u.id,
    username: u.username,
    full_name: u.fullName,
    avatar_url: u.avatarUrl,
    bio: u.bio || null,
    profession: u.professionTitle
      ? {
          title: u.professionTitle,
          industry: u.industry,
          specialization: u.specialization || null,
          years_of_experience: u.yearsExp ?? null,
          is_verified_pro: !!u.isVerified,
          company_or_freelance: null,
          key_tools: u.keyTools || [],
        }
      : null,
    followers_count: u.followersCount ?? 0,
    following_count: u.followingCount ?? 0,
    posts_count: u.postsCount ?? 0,
    rating: u.rating ?? null,
    is_following: false,
  };
}

class DemoError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const fail = (status, message) => { throw new DemoError(status, message); };

function me() {
  const s = load();
  const u = s.meUsername && s.users[s.meUsername];
  if (!u) fail(401, 'Not authenticated');
  return u;
}

const byId = (list, id) => list.find((x) => x.id === id);
const nowIso = () => new Date().toISOString();
const newId = (prefix) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function publicUser(u) {
  const s = load();
  const posts = s.posts.filter((p) => p.authorUsername === u.username).length;
  return {
    ...u,
    is_following: s.following.includes(u.username),
    posts_count: Math.max(u.posts_count || 0, posts),
  };
}

function authResult(u) {
  const s = load();
  s.meUsername = u.username;
  save();
  return { access_token: DEMO_TOKEN, token_type: 'bearer', user: publicUser(u) };
}

// ---------- endpoint handlers ----------

function login(body) {
  const s = load();
  const ident = String(body?.username_or_email || '').trim().toLowerCase();
  const u = s.users[ident];
  const expected = s.passwords[ident] ?? DEMO_PASSWORD;
  if (!u || body?.password !== expected) fail(401, 'Invalid username or password');
  return authResult(u);
}

function register(body) {
  const s = load();
  const username = String(body?.username || '').trim().toLowerCase();
  if (!username) fail(422, 'username: Field required');
  if (s.users[username]) fail(409, 'Username already taken');
  const p = body.profession;
  const u = {
    id: newId('usr'),
    username,
    full_name: body.full_name || username,
    avatar_url: DEFAULT_AVATAR,
    bio: null,
    profession: p
      ? {
          title: p.title,
          industry: p.industry,
          specialization: p.specialization || null,
          years_of_experience: p.years_of_experience ?? null,
          is_verified_pro: false,
          company_or_freelance: p.company_or_freelance || null,
          key_tools: [],
        }
      : null,
    followers_count: 0,
    following_count: 0,
    posts_count: 0,
    rating: null,
    is_following: false,
  };
  s.users[username] = u;
  s.passwords[username] = body.password;
  return authResult(u);
}

function setFollow(username, follow) {
  const s = load();
  const self = me();
  const target = s.users[username];
  if (!target) fail(404, 'User not found');
  if (target.username === self.username) fail(400, "You can't follow yourself");
  const was = s.following.includes(username);
  if (follow && !was) {
    s.following.push(username);
    target.followers_count += 1;
    self.following_count += 1;
  } else if (!follow && was) {
    s.following = s.following.filter((x) => x !== username);
    target.followers_count = Math.max(0, target.followers_count - 1);
    self.following_count = Math.max(0, self.following_count - 1);
  }
  save();
  return { username, is_following: follow, followers_count: target.followers_count };
}

function feed(params) {
  const s = load();
  let posts = s.posts;
  if (params.get('following') === 'true') {
    const self = me();
    posts = posts.filter((p) => p.authorUsername === self.username || s.following.includes(p.authorUsername));
  }
  const author = params.get('author_username');
  if (author) posts = posts.filter((p) => p.authorUsername === author.toLowerCase());
  const type = params.get('post_type');
  if (type) posts = posts.filter((p) => p.postType === type);
  const limit = Number(params.get('limit')) || 20;
  const offset = Number(params.get('offset')) || 0;
  return posts.slice(offset, offset + limit);
}

function authorFields(u) {
  return {
    author_id: u.id,
    author_username: u.username,
    author_full_name: u.full_name,
    author_avatar_url: u.avatar_url,
    author_profession_title: u.profession?.title || null,
    author_industry: u.profession?.industry || null,
    is_author_verified: !!u.profession?.is_verified_pro,
  };
}

function createPost(body) {
  const s = load();
  const u = me();
  const post = toPost({
    ...body,
    ...authorFields(u),
    id: newId('post'),
    likes_count: 0,
    comments_count: 0,
    is_liked_by_me: false,
    is_bookmarked_by_me: false,
    rating: null,
    reviews_count: 0,
    created_at: nowIso(),
  });
  s.posts.unshift(post);
  save();
  return post;
}

function toggleLike(postId) {
  me();
  const p = byId(load().posts, postId) || fail(404, 'Post not found');
  p.isLiked = !p.isLiked;
  p.likesCount = Math.max(0, (p.likesCount || 0) + (p.isLiked ? 1 : -1));
  save();
  return { post_id: postId, is_liked: p.isLiked, likes_count: p.likesCount };
}

function toggleBookmark(postId) {
  me();
  const p = byId(load().posts, postId) || fail(404, 'Post not found');
  p.isBookmarked = !p.isBookmarked;
  save();
  return { post_id: postId, is_bookmarked: p.isBookmarked };
}

function createStory(body) {
  const s = load();
  const u = me();
  const story = toStory({
    id: newId('story'),
    user_id: u.id,
    author_username: u.username,
    author_full_name: u.full_name,
    author_avatar_url: u.avatar_url,
    author_profession_title: u.profession?.title || null,
    media_url: body.media_url,
    caption: body.caption,
    profession_tag: body.profession_tag,
    created_at: nowIso(),
  });
  s.stories.unshift(story);
  save();
  return story;
}

function createChallenge(body) {
  const s = load();
  const u = me();
  const chal = toChallenge({
    ...body,
    id: newId('chal'),
    worker_id: u.id,
    worker_username: u.username,
    worker_full_name: u.full_name,
    worker_profession_title: u.profession?.title || null,
    worker_avatar_url: u.avatar_url,
    is_solved: false,
    suggestions: [],
    created_at: nowIso(),
  });
  s.challenges.unshift(chal);
  save();
  return chal;
}

function suggest(challengeId, body) {
  const u = me();
  const chal = byId(load().challenges, challengeId) || fail(404, 'Challenge not found');
  const sug = toSuggestion({
    ...body,
    id: newId('sug'),
    suggester_id: u.id,
    suggester_username: u.username,
    suggester_profession: u.profession?.title || null,
    upvotes_count: 0,
    upvoted_by_me: false,
    is_accepted_by_worker: false,
  });
  chal.suggestions.unshift(sug);
  save();
  return sug;
}

function setAccepted(suggestionId, accept) {
  const u = me();
  const chal = load().challenges.find((c) => c.suggestions.some((x) => x.id === suggestionId));
  if (!chal) fail(404, 'Suggestion not found');
  if (chal.workerId !== u.id) fail(403, 'Only the person who posted this challenge can accept a solution');
  const sug = chal.suggestions.find((x) => x.id === suggestionId);
  if (accept) {
    chal.suggestions.forEach((x) => { x.isAccepted = x.id === suggestionId; });
    chal.isSolved = true;
  } else if (sug.isAccepted) {
    sug.isAccepted = false;
    chal.isSolved = false;
  }
  save();
  return chal;
}

function toggleUpvote(item, notFound) {
  me();
  if (!item) fail(404, notFound);
  item.upvotedByMe = !item.upvotedByMe;
  item.upvotes = Math.max(0, (item.upvotes || 0) + (item.upvotedByMe ? 1 : -1));
  save();
  return { id: item.id, upvoted: item.upvotedByMe, upvotes_count: item.upvotes };
}

function listQuestions(params) {
  let qs = load().questions;
  const workerId = params.get('worker_id');
  if (workerId) qs = qs.filter((q) => q.workerId === workerId);
  const answered = params.get('answered');
  if (answered === 'true') qs = qs.filter((q) => !!q.answerText);
  if (answered === 'false') qs = qs.filter((q) => !q.answerText);
  const limit = Number(params.get('limit')) || 50;
  return qs.slice(0, limit);
}

function answerQuestion(questionId, body) {
  const u = me();
  const q = byId(load().questions, questionId) || fail(404, 'Question not found');
  if (q.workerId !== u.id) fail(403, 'Only the professional who was asked can answer this question');
  const text = String(body?.answer_text || '').trim();
  if (!text) fail(422, 'answer_text: String should have at least 1 character');
  if (text.length > 5000) fail(422, 'answer_text: String should have at most 5000 characters');
  const video = body?.video_response_url ? String(body.video_response_url).trim() : null;
  if (video && !/^https?:\/\/[^/\s]+/i.test(video)) {
    fail(422, 'video_response_url: must be a link starting with http:// or https://');
  }
  q.answerText = text;
  q.videoResponseUrl = video;
  if (!q.answeredTimeAgo) q.answeredTimeAgo = 'Just now';
  save();
  return q;
}

function askQuestion(workerId, body) {
  const s = load();
  const u = me();
  const worker = Object.values(s.users).find((x) => x.id === workerId) || fail(404, 'Worker not found');
  const q = toQuestion({
    ...body,
    topic_tag: body.topic_tag || 'General Inquiry',
    id: newId('qa'),
    worker_id: worker.id,
    worker_username: worker.username,
    worker_full_name: worker.full_name,
    worker_profession_title: worker.profession?.title || null,
    worker_avatar_url: worker.avatar_url,
    asker_id: u.id,
    asker_username: u.username,
    asker_avatar_url: u.avatar_url,
    answer_text: null,
    upvotes_count: 0,
    upvoted_by_me: false,
    created_at: nowIso(),
  });
  s.questions.unshift(q);
  save();
  return q;
}

function submitReview(body) {
  const s = load();
  const u = me();
  const post = byId(s.posts, body.post_id) || fail(404, 'Post not found');
  if (post.authorUsername === u.username) fail(400, "You can't review your own post");
  if (s.reviews.some((r) => r.post_id === post.id && r.username === u.username)) {
    fail(409, 'You already reviewed this post');
  }
  const review = {
    id: newId('rev'),
    post_id: post.id,
    user_id: u.id,
    username: u.username,
    user_avatar_url: u.avatar_url,
    is_peer_verified: !!u.profession?.is_verified_pro,
    reviewer_profession: body.reviewer_profession,
    clarity_score: body.clarity_score,
    accuracy_score: body.accuracy_score,
    feedback_text: body.feedback_text,
    created_at: nowIso(),
  };
  s.reviews.unshift(review);
  // Fold the new score into the post's average, as the server does.
  const score = (body.clarity_score + body.accuracy_score) / 2;
  const n = post.reviewsCount || 0;
  post.rating = Math.round((((post.rating || 0) * n + score) / (n + 1)) * 10) / 10;
  post.reviewsCount = n + 1;
  save();
  return review;
}

// ---------- edit & delete (same rules as the server) ----------

const isHttpUrl = (v) => /^https?:\/\/[^/\s]+/i.test(String(v || '').trim());

function requiredText(body, field, max) {
  if (!(field in body)) return undefined;
  const v = String(body[field] ?? '').trim();
  if (!v) fail(422, `${field}: can't be empty`);
  if (v.length > max) fail(422, `${field}: String should have at most ${max} characters`);
  return v;
}

function optionalText(body, field, max) {
  const v = String(body[field] ?? '').trim();
  if (v.length > max) fail(422, `${field}: String should have at most ${max} characters`);
  return v || null;
}

function updatePost(postId, body) {
  const u = me();
  const p = byId(load().posts, postId) || fail(404, 'Post not found');
  if (p.authorUsername !== u.username) fail(403, 'You can only change your own posts');
  const title = requiredText(body, 'title', 255);
  const caption = requiredText(body, 'caption', 20000);
  if ('media' in body && (body.media || []).some((m) => !isHttpUrl(m.url))) {
    fail(422, 'media: must be a link starting with http:// or https://');
  }
  const steps = body.task_details?.steps || [];
  if (steps.some((s) => s.image_url && !isHttpUrl(s.image_url))) {
    fail(422, 'image_url: must be a link starting with http:// or https://');
  }
  if (title !== undefined) p.title = title;
  if (caption !== undefined) p.caption = caption;
  if ('tags' in body) p.tags = body.tags || [];
  if ('media' in body) p.mediaUrl = body.media?.[0]?.url?.trim() || PLACEHOLDER_IMAGE;
  if ('task_details' in body) {
    p.taskDetails = body.task_details ? toPost({ task_details: body.task_details }).taskDetails : undefined;
  }
  save();
  return p;
}

function deletePost(postId) {
  const s = load();
  const u = me();
  const p = byId(s.posts, postId) || fail(404, 'Post not found');
  if (p.authorUsername !== u.username) fail(403, 'You can only change your own posts');
  s.posts = s.posts.filter((x) => x.id !== postId);
  s.reviews = s.reviews.filter((r) => r.post_id !== postId);
  s.comments = s.comments.filter((c) => c.postId !== postId);
  save();
}

function deleteStory(storyId) {
  const s = load();
  const u = me();
  const story = byId(s.stories, storyId) || fail(404, 'Story not found');
  if (story.userId !== u.id) fail(403, 'You can only delete your own stories');
  s.stories = s.stories.filter((x) => x.id !== storyId);
  save();
}

function updateQuestion(questionId, body) {
  const u = me();
  const q = byId(load().questions, questionId) || fail(404, 'Question not found');
  if (q.askerId !== u.id) fail(403, 'You can only edit your own questions');
  if (q.answerText) fail(409, "This question has been answered, so it can't be edited");
  const text = requiredText(body, 'question_text', 2000);
  if (text !== undefined) q.questionText = text;
  if ('topic_tag' in body) q.topicTag = optionalText(body, 'topic_tag', 64) || 'General Inquiry';
  save();
  return q;
}

function deleteQuestion(questionId) {
  const s = load();
  const u = me();
  const q = byId(s.questions, questionId) || fail(404, 'Question not found');
  if (u.id !== q.askerId && u.id !== q.workerId) {
    fail(403, 'Only the asker or the professional asked can delete this question');
  }
  s.questions = s.questions.filter((x) => x.id !== questionId);
  save();
}

function ownChallenge(challengeId) {
  const u = me();
  const c = byId(load().challenges, challengeId) || fail(404, 'Challenge not found');
  if (c.workerId !== u.id) fail(403, 'You can only change your own challenges');
  return c;
}

function updateChallenge(challengeId, body) {
  const c = ownChallenge(challengeId);
  const title = requiredText(body, 'title', 255);
  const description = requiredText(body, 'scenario_description', 5000);
  const category = requiredText(body, 'profession_category', 128);
  if (title !== undefined) c.title = title;
  if (description !== undefined) c.scenarioDescription = description;
  if (category !== undefined) c.category = category;
  save();
  return c;
}

function deleteChallenge(challengeId) {
  ownChallenge(challengeId);
  const s = load();
  s.challenges = s.challenges.filter((x) => x.id !== challengeId);
  save();
}

function findSuggestion(suggestionId) {
  for (const c of load().challenges) {
    const sug = c.suggestions.find((x) => x.id === suggestionId);
    if (sug) return [c, sug];
  }
  return fail(404, 'Suggestion not found');
}

function updateSuggestion(suggestionId, body) {
  const u = me();
  const [, sug] = findSuggestion(suggestionId);
  if (sug.suggesterId !== u.id) fail(403, 'You can only edit your own ideas');
  if (sug.isAccepted) fail(409, "This idea was accepted as the solution, so it can't be edited");
  const text = requiredText(body, 'suggestion_text', 2000);
  if (text !== undefined) sug.suggestionText = text;
  if ('suggested_tool_or_reference' in body) {
    sug.suggestedTool = optionalText(body, 'suggested_tool_or_reference', 255) || undefined;
  }
  save();
  return sug;
}

function deleteSuggestion(suggestionId) {
  const u = me();
  const [chal, sug] = findSuggestion(suggestionId);
  if (u.id !== sug.suggesterId && u.id !== chal.workerId) {
    fail(403, 'Only the author or the challenge owner can delete this idea');
  }
  if (sug.isAccepted) chal.isSolved = false;
  chal.suggestions = chal.suggestions.filter((x) => x.id !== suggestionId);
  save();
}

// ---------- comments ----------

function postComments(postId) {
  return load().comments.filter((c) => c.postId === postId);
}

function syncCommentsCount(post) {
  post.commentsCount = postComments(post.id).length;
}

function listComments(postId, params) {
  byId(load().posts, postId) || fail(404, 'Post not found');
  const all = postComments(postId);
  const limit = Number(params.get('limit')) || 50;
  const offset = Number(params.get('offset')) || 0;
  return { total: all.length, comments: all.slice(offset, offset + limit) };
}

function commentBody(body) {
  const text = String(body?.body ?? '').trim();
  if (!text) fail(422, "body: can't be empty");
  if (text.length > 2000) fail(422, 'body: String should have at most 2000 characters');
  return text;
}

function addComment(postId, body) {
  const s = load();
  const u = me();
  const post = byId(s.posts, postId) || fail(404, 'Post not found');
  const c = toComment({
    id: newId('cmt'),
    post_id: postId,
    user_id: u.id,
    username: u.username,
    full_name: u.full_name,
    avatar_url: u.avatar_url,
    profession_title: u.profession?.title || null,
    body: commentBody(body),
    created_at: nowIso(),
  });
  s.comments.push(c);
  syncCommentsCount(post);
  save();
  return c;
}

function findComment(postId, commentId) {
  const s = load();
  const post = byId(s.posts, postId) || fail(404, 'Post not found');
  const c = s.comments.find((x) => x.id === commentId && x.postId === postId) || fail(404, 'Comment not found');
  return [post, c];
}

function updateComment(postId, commentId, body) {
  const u = me();
  const [, c] = findComment(postId, commentId);
  if (c.userId !== u.id) fail(403, 'You can only edit your own comments');
  c.body = commentBody(body);
  c.edited = true;
  save();
  return c;
}

function deleteComment(postId, commentId) {
  const s = load();
  const u = me();
  const [post, c] = findComment(postId, commentId);
  if (u.id !== c.userId && u.id !== post.authorId) {
    fail(403, "Only the commenter or the post's author can delete this comment");
  }
  s.comments = s.comments.filter((x) => x.id !== commentId);
  syncCommentsCount(post);
  save();
}

// ---------- router ----------

// Returns a copy, like a network response would, so callers never share objects with the store.
export async function demoRequest(endpoint, options = {}) {
  return clone(handle(endpoint, options));
}

function handle(endpoint, options) {
  const method = (options.method || 'GET').toUpperCase();
  let body = null;
  if (options.body) {
    try { body = JSON.parse(options.body); } catch {}
  }
  const url = new URL(endpoint, 'http://demo.local');
  const path = url.pathname.replace(/\/+$/, '');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  const s = load();
  const route = `${method} ${path}`;

  // Auth
  if (route === 'GET /auth/signup-options') return SIGNUP_OPTIONS;
  if (route === 'POST /auth/login') return login(body);
  if (route === 'POST /auth/register') return register(body);
  if (route === 'GET /auth/me') return publicUser(me());
  if (route === 'GET /auth/professionals') {
    return Object.values(s.users).filter((u) => u.profession).map(publicUser);
  }
  if (parts[0] === 'auth' && parts[1] === 'users' && parts[2]) {
    const username = parts[2].toLowerCase();
    if (parts[3] === 'follow' && method === 'POST') return setFollow(username, true);
    if (parts[3] === 'follow' && method === 'DELETE') return setFollow(username, false);
    if (!parts[3] && method === 'GET') {
      const u = s.users[username] || fail(404, 'User not found');
      return publicUser(u);
    }
  }

  // Stories
  if (route === 'GET /stories/feed') return s.stories;
  if (route === 'POST /stories') return createStory(body);
  if (parts[0] === 'stories' && parts[1] && !parts[2] && method === 'DELETE') return deleteStory(parts[1]);

  // Posts
  if (route === 'GET /posts/feed') return feed(url.searchParams);
  if (route === 'GET /posts/bookmarks') { me(); return s.posts.filter((p) => p.isBookmarked); }
  if (route === 'POST /posts') return createPost(body);
  if (parts[0] === 'posts' && parts[1]) {
    if (parts[2] === 'like' && method === 'POST') return toggleLike(parts[1]);
    if (parts[2] === 'bookmark' && method === 'POST') return toggleBookmark(parts[1]);
    if (!parts[2] && method === 'GET') return byId(s.posts, parts[1]) || fail(404, 'Post not found');
    if (!parts[2] && method === 'PATCH') return updatePost(parts[1], body || {});
    if (parts[2] === 'comments' && !parts[3] && method === 'GET') return listComments(parts[1], url.searchParams);
    if (parts[2] === 'comments' && !parts[3] && method === 'POST') return addComment(parts[1], body);
    if (parts[2] === 'comments' && parts[3] && method === 'PATCH') return updateComment(parts[1], parts[3], body);
    if (parts[2] === 'comments' && parts[3] && method === 'DELETE') return deleteComment(parts[1], parts[3]);
    if (!parts[2] && method === 'DELETE') return deletePost(parts[1]);
  }

  // Discovery
  if (route === 'GET /discovery/categories') return INITIAL_CATEGORIES;

  // Community
  if (route === 'GET /community/challenges') return s.challenges;
  if (route === 'POST /community/challenges') return createChallenge(body);
  if (parts[0] === 'community') {
    if (parts[1] === 'challenges' && parts[2] && !parts[3] && method === 'PATCH') return updateChallenge(parts[2], body || {});
    if (parts[1] === 'challenges' && parts[2] && !parts[3] && method === 'DELETE') return deleteChallenge(parts[2]);
    if (parts[1] === 'suggestions' && parts[2] && !parts[3] && method === 'PATCH') return updateSuggestion(parts[2], body || {});
    if (parts[1] === 'suggestions' && parts[2] && !parts[3] && method === 'DELETE') return deleteSuggestion(parts[2]);
    if (parts[1] === 'qa' && parts[2] === 'questions' && parts[3] && !parts[4] && method === 'PATCH') {
      return updateQuestion(parts[3], body || {});
    }
    if (parts[1] === 'qa' && parts[2] === 'questions' && parts[3] && !parts[4] && method === 'DELETE') {
      return deleteQuestion(parts[3]);
    }
    if (parts[1] === 'challenges' && parts[3] === 'suggest' && method === 'POST') return suggest(parts[2], body);
    if (parts[1] === 'suggestions' && parts[3] === 'accept' && method === 'POST') return setAccepted(parts[2], true);
    if (parts[1] === 'suggestions' && parts[3] === 'accept' && method === 'DELETE') return setAccepted(parts[2], false);
    if (parts[1] === 'suggestions' && parts[3] === 'upvote' && method === 'POST') {
      const sug = s.challenges.flatMap((c) => c.suggestions).find((x) => x.id === parts[2]);
      return toggleUpvote(sug, 'Suggestion not found');
    }
    if (route === 'GET /community/qa') return listQuestions(url.searchParams);
    if (parts[1] === 'qa' && parts[2] === 'questions' && parts[4] === 'answer' && method === 'POST') {
      return answerQuestion(parts[3], body);
    }
    if (parts[1] === 'qa' && parts[2] === 'questions' && parts[4] === 'upvote' && method === 'POST') {
      return toggleUpvote(byId(s.questions, parts[3]), 'Question not found');
    }
    if (parts[1] === 'qa' && parts[3] === 'ask' && method === 'POST') return askQuestion(parts[2], body);
    if (parts[1] === 'reviews' && parts[2] && method === 'GET') return s.reviews.filter((r) => r.post_id === parts[2]);
    if (route === 'POST /community/reviews') return submitReview(body);
  }

  fail(404, `Not available in the demo: ${method} ${path}`);
}

// Throws away everything done in this browser's demo and starts again from the sample data.
export function resetDemoData() {
  try {
    localStorage.removeItem(STORE_KEY);
  } catch {}
  store = null;
}

// Signing out ends the demo session but keeps this browser's demo content.
export function demoSignOut() {
  const s = load();
  s.meUsername = null;
  save();
}
