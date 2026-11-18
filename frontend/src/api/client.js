import { currentLanguage, tNow } from '../i18n';

// The demo backend (and its sample data) is loaded only in demo mode, so the real app doesn't download it.
let demoModule = null;
const demo = () => {
  demoModule = demoModule || import('./demoBackend');
  return demoModule;
};

// Demo mode runs the whole app in the browser with sample data and no backend. It is on for static
// hosting (GitHub Pages) or when built with VITE_DEMO_MODE=true. It is never used as a fallback for a
// failing real backend: that would hide outages and silently drop what users write.
const isGitHubPages = typeof window !== 'undefined' && window.location.hostname.endsWith('github.io');
export const IS_DEMO =
  import.meta.env.VITE_DEMO_MODE === 'true' || (isGitHubPages && !import.meta.env.VITE_API_URL);

// Dev server (vite) and real deployments proxy /api. A built copy served from a plain static server on
// another port talks to the API on :8000 of the same host.
const API_BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV || !window.location.port
    ? '/api/v1'
    : `${window.location.protocol}//${window.location.hostname}:8000/api/v1`);

// The real app and the demo can run on the same site (/my-job/ and /my-job/demo/), which share browser storage;
// separate keys keep a demo login from replacing a real one.
const TOKEN_KEY = IS_DEMO ? 'myjob_demo_token' : 'myjob_token';

// Where the other version lives, when the deploy provides one (see .github/workflows/deploy.yml).
export const DEMO_URL = !IS_DEMO && import.meta.env.VITE_DEMO_PATH
  ? `${import.meta.env.BASE_URL}${import.meta.env.VITE_DEMO_PATH}` : null;
export const REAL_APP_URL = IS_DEMO ? import.meta.env.VITE_REAL_APP_URL || null : null;

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    if (IS_DEMO) demo().then((m) => m.demoSignOut());
  },
};

function authHeaders() {
  const t = tokenStore.get();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// Turns FastAPI error bodies ({detail: "..."} or a 422 list) into a readable message.
function errorMessage(body, fallback) {
  const d = body?.detail;
  if (typeof d === 'string') return d;
  if (Array.isArray(d) && d.length) {
    const first = d[0];
    const field = Array.isArray(first.loc) ? first.loc.filter((p) => p !== 'body').join(' → ') : '';
    const msg = String(first.msg || '').replace(/^Value error, /, '');
    return field ? `${field}: ${msg}` : msg;
  }
  return fallback;
}

let unauthorizedHandler = null;
// App registers a callback that signs the user out when the server rejects the token.
export const onUnauthorized = (fn) => { unauthorizedHandler = fn; };

async function request(endpoint, options = {}) {
  if (IS_DEMO) return (await demo()).demoRequest(endpoint, options);

  let res;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', 'Accept-Language': currentLanguage(), ...authHeaders(), ...options.headers },
    });
  } catch {
    throw new Error(tNow('error.offline'));
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && tokenStore.get() && unauthorizedHandler && !endpoint.startsWith('/auth/login')) {
      unauthorizedHandler();
    }
    const err = new Error(errorMessage(body, tNow('error.requestFailed', { status: res.status })));
    err.status = res.status;
    throw err;
  }
  return body;
}

// File uploads: a multipart form instead of JSON.
async function upload(endpoint, form) {
  let res;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST', body: form, headers: { 'Accept-Language': currentLanguage(), ...authHeaders() },
    });
  } catch {
    throw new Error(tNow('error.offline'));
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && tokenStore.get() && unauthorizedHandler) unauthorizedHandler();
    const err = new Error(errorMessage(body, tNow('error.uploadFailed', { status: res.status })));
    err.status = res.status;
    throw err;
  }
  return body;
}

const post = (endpoint, data) => request(endpoint, { method: 'POST', ...(data ? { body: JSON.stringify(data) } : {}) });
const patch = (endpoint, data) => request(endpoint, { method: 'PATCH', body: JSON.stringify(data) });
const del = (endpoint) => request(endpoint, { method: 'DELETE' });

export const api = {
  // Auth
  getSignupOptions: () => request('/auth/signup-options'),
  register: (data) => post('/auth/register', data),
  login: (data) => post('/auth/login', data),
  getMe: () => request('/auth/me'),
  updateMe: (data) => patch('/auth/me', data),
  changePassword: (data) => post('/auth/me/password', data),
  deleteMe: (data) => post('/auth/me/delete', data),
  forgotPassword: (usernameOrEmail) => post('/auth/password/forgot', { username_or_email: usernameOrEmail }),
  resetPassword: (token, newPassword) => post('/auth/password/reset', { token, new_password: newPassword }),
  verifyEmail: (token) => post('/auth/email/verify', { token }),
  resendVerification: () => post('/auth/email/resend'),

  // Reports, blocking, moderation
  report: (targetType, targetId, reason, details) =>
    post('/moderation/reports', { target_type: targetType, target_id: targetId, reason, details }),
  blockUser: (username) => post(`/auth/users/${encodeURIComponent(username)}/block`),
  unblockUser: (username) => del(`/auth/users/${encodeURIComponent(username)}/block`),
  getBlocked: () => request('/auth/me/blocked'),
  getFollowRequests: () => request('/auth/me/follow-requests'),
  acceptFollowRequest: (username) => post(`/auth/me/follow-requests/${encodeURIComponent(username)}/accept`),
  declineFollowRequest: (username) => post(`/auth/me/follow-requests/${encodeURIComponent(username)}/decline`),
  exportMyData: () => request('/auth/me/export'),

  // Photos: uploads one and answers { url, width, height }.
  getUploadStatus: () => request('/uploads/status'),
  uploadImage: async (file, purpose = 'post') => {
    if (IS_DEMO) return (await demo()).demoUploadImage(file, purpose);
    const form = new FormData();
    form.append('file', file);
    form.append('purpose', purpose);
    return upload('/uploads/images', form);
  },
  getReports: (status = 'open') => request(`/moderation/reports?status=${encodeURIComponent(status)}`),
  resolveReports: (targetType, targetId, action) =>
    post('/moderation/reports/resolve', { target_type: targetType, target_id: targetId, action }),
  getSuspended: () => request('/moderation/suspended'),
  suspendUser: (username) => post(`/moderation/users/${encodeURIComponent(username)}/suspend`),
  unsuspendUser: (username) => post(`/moderation/users/${encodeURIComponent(username)}/unsuspend`),
  getUserProfile: (username) => request(`/auth/users/${encodeURIComponent(username)}`),
  getProfessionals: () => request('/auth/professionals'),
  followUser: (username) => post(`/auth/users/${encodeURIComponent(username)}/follow`),
  unfollowUser: (username) => request(`/auth/users/${encodeURIComponent(username)}/follow`, { method: 'DELETE' }),

  // Stories
  getStories: () => request('/stories/feed'),
  createStory: (data) => post('/stories', data),
  deleteStory: (id) => del(`/stories/${id}`),

  // Posts & Case Studies
  getPosts: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/posts/feed${query ? `?${query}` : ''}`);
  },
  getPostsByProfession: (slug) => request(`/posts/feed?profession=${encodeURIComponent(slug)}&limit=50`),
  getCatalog: () => request('/professions'),
  getProfessionPeople: (slug) => request(`/professions/${encodeURIComponent(slug)}/people`),
  getPostsByAuthor: (username) => request(`/posts/feed?author_username=${encodeURIComponent(username)}&limit=100`),
  getPostById: (id) => request(`/posts/${id}`),
  createPost: (data) => post('/posts', data),
  updatePost: (id, data) => patch(`/posts/${id}`, data),
  deletePost: (id) => del(`/posts/${id}`),
  toggleLike: (postId) => post(`/posts/${postId}/like`),
  toggleBookmark: (postId) => post(`/posts/${postId}/bookmark`),
  getBookmarks: () => request('/posts/bookmarks?limit=100'),
  getComments: (postId, { limit = 20, offset = 0 } = {}) =>
    request(`/posts/${postId}/comments?limit=${limit}&offset=${offset}`),
  addComment: (postId, data) => post(`/posts/${postId}/comments`, data),
  updateComment: (postId, commentId, data) => patch(`/posts/${postId}/comments/${commentId}`, data),
  deleteComment: (postId, commentId) => del(`/posts/${postId}/comments/${commentId}`),
  reactToComment: (postId, commentId, emoji) =>
    request(`/posts/${postId}/comments/${commentId}/reaction`, { method: 'PUT', body: JSON.stringify({ emoji }) }),
  removeReaction: (postId, commentId) => del(`/posts/${postId}/comments/${commentId}/reaction`),

  // Discovery & Taxonomy
  getCategories: () => request('/discovery/categories'),

  // Community: Challenges
  getChallenges: () => request('/community/challenges'),
  createChallenge: (data) => post('/community/challenges', data),
  updateChallenge: (id, data) => patch(`/community/challenges/${id}`, data),
  deleteChallenge: (id) => del(`/community/challenges/${id}`),
  updateSuggestion: (id, data) => patch(`/community/suggestions/${id}`, data),
  deleteSuggestion: (id) => del(`/community/suggestions/${id}`),
  submitSuggestion: (challengeId, data) => post(`/community/challenges/${challengeId}/suggest`, data),
  upvoteSuggestion: (suggestionId) => post(`/community/suggestions/${suggestionId}/upvote`),
  acceptSuggestion: (suggestionId) => post(`/community/suggestions/${suggestionId}/accept`),
  unacceptSuggestion: (suggestionId) =>
    request(`/community/suggestions/${suggestionId}/accept`, { method: 'DELETE' }),

  // Community: Q&A AMAs
  getQuestions: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/community/qa${query ? `?${query}` : ''}`);
  },
  askQuestion: (workerId, data) => post(`/community/qa/${workerId}/ask`, data),
  updateQuestion: (id, data) => patch(`/community/qa/questions/${id}`, data),
  deleteQuestion: (id) => del(`/community/qa/questions/${id}`),
  upvoteQuestion: (questionId) => post(`/community/qa/questions/${questionId}/upvote`),
  answerQuestion: (questionId, data) => post(`/community/qa/questions/${questionId}/answer`, data),

  // Community: Reviews & Ratings
  getReviews: (postId) => request(`/community/reviews/${postId}`),
  submitReview: (data) => post('/community/reviews', data),

  // Notifications
  getNotifications: ({ limit = 30, offset = 0 } = {}) => request(`/notifications?limit=${limit}&offset=${offset}`),
  getUnreadCount: () => request('/notifications/unread-count'),
  markNotificationsRead: (ids = null) => post('/notifications/read', { ids }),
};
