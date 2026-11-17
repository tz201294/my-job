import { demoRequest, demoSignOut } from './demoBackend';

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

const TOKEN_KEY = 'myjob_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    if (IS_DEMO) demoSignOut();
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
  if (IS_DEMO) return demoRequest(endpoint, options);

  let res;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...authHeaders(), ...options.headers },
    });
  } catch {
    throw new Error("Can't reach the MyJob server. Check your connection and try again.");
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && tokenStore.get() && unauthorizedHandler && !endpoint.startsWith('/auth/login')) {
      unauthorizedHandler();
    }
    const err = new Error(errorMessage(body, `Request failed (${res.status})`));
    err.status = res.status;
    throw err;
  }
  return body;
}

const post = (endpoint, data) => request(endpoint, { method: 'POST', ...(data ? { body: JSON.stringify(data) } : {}) });

export const api = {
  // Auth
  getSignupOptions: () => request('/auth/signup-options'),
  register: (data) => post('/auth/register', data),
  login: (data) => post('/auth/login', data),
  getMe: () => request('/auth/me'),
  getUserProfile: (username) => request(`/auth/users/${encodeURIComponent(username)}`),
  getProfessionals: () => request('/auth/professionals'),
  followUser: (username) => post(`/auth/users/${encodeURIComponent(username)}/follow`),
  unfollowUser: (username) => request(`/auth/users/${encodeURIComponent(username)}/follow`, { method: 'DELETE' }),

  // Stories
  getStories: () => request('/stories/feed'),
  createStory: (data) => post('/stories', data),

  // Posts & Case Studies
  getPosts: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/posts/feed${query ? `?${query}` : ''}`);
  },
  getPostsByAuthor: (username) => request(`/posts/feed?author_username=${encodeURIComponent(username)}&limit=100`),
  getPostById: (id) => request(`/posts/${id}`),
  createPost: (data) => post('/posts', data),
  toggleLike: (postId) => post(`/posts/${postId}/like`),
  toggleBookmark: (postId) => post(`/posts/${postId}/bookmark`),
  getBookmarks: () => request('/posts/bookmarks?limit=100'),

  // Discovery & Taxonomy
  getCategories: () => request('/discovery/categories'),

  // Community: Challenges
  getChallenges: () => request('/community/challenges'),
  createChallenge: (data) => post('/community/challenges', data),
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
  upvoteQuestion: (questionId) => post(`/community/qa/questions/${questionId}/upvote`),
  answerQuestion: (questionId, data) => post(`/community/qa/questions/${questionId}/answer`, data),

  // Community: Reviews & Ratings
  getReviews: (postId) => request(`/community/reviews/${postId}`),
  submitReview: (data) => post('/community/reviews', data),
};
