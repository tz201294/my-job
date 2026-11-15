import {
  INITIAL_USERS,
  INITIAL_POSTS,
  INITIAL_STORIES,
  INITIAL_CATEGORIES,
  INITIAL_CHALLENGES,
  INITIAL_QA_ITEMS
} from '../data/mockData';

// Dev server (vite) and real deployments proxy /api. A built copy opened from a plain static
// server on some other port (e.g. GitHub Pages or file previewer) falls back gracefully to client-side demo state.
const isGitHubPages = typeof window !== 'undefined' && window.location.hostname.endsWith('github.io');
const API_BASE =
  import.meta.env.VITE_API_URL ||
  (isGitHubPages
    ? null
    : import.meta.env.DEV || !window.location.port
    ? '/api/v1'
    : `${window.location.protocol}//${window.location.hostname}:8000/api/v1`);

const TOKEN_KEY = 'myjob_token';
const USER_KEY = 'myjob_current_user';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
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

// Helper to get or mock stored user
function getMockUser() {
  try {
    const stored = localStorage.getItem(USER_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return INITIAL_USERS['sarah_plumber'];
}

function setMockUser(u) {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(u));
  } catch {}
}

// Surfaces server errors or handles static demo fallback (GitHub Pages)
async function request(endpoint, options = {}) {
  if (!API_BASE) {
    return handleMockRequest(endpoint, options);
  }
  let res;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...authHeaders(), ...options.headers },
    });
  } catch {
    return handleMockRequest(endpoint, options);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    // If backend returns 404/405/502 on static hosting, use mock fallback
    if (res.status === 404 || res.status === 405 || res.status === 502) {
      return handleMockRequest(endpoint, options);
    }
    if (res.status === 401 && tokenStore.get() && unauthorizedHandler && !endpoint.startsWith('/auth/login')) {
      unauthorizedHandler();
    }
    const err = new Error(errorMessage(body, `Request failed (${res.status})`));
    err.status = res.status;
    throw err;
  }
  return body;
}

function handleMockRequest(endpoint, options = {}) {
  const method = options.method || 'GET';
  let body = null;
  if (options.body) {
    try { body = JSON.parse(options.body); } catch {}
  }

  // Auth endpoints
  if (endpoint === '/auth/signup-options') {
    return {
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
  }

  if (endpoint === '/auth/login' && method === 'POST') {
    const rawId = (body?.username_or_email || 'sarah_plumber').toLowerCase().trim();
    const matched =
      INITIAL_USERS[rawId] ||
      Object.values(INITIAL_USERS).find((u) => u.username.toLowerCase() === rawId || u.id === rawId) ||
      {
        id: `usr_${Date.now()}`,
        username: rawId || 'demo_user',
        fullName: rawId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
        professionTitle: 'Professional Explorer',
        industry: 'Trades & Craftsmanship',
        yearsExp: 3,
        isVerified: true,
        followersCount: 120,
        followingCount: 45,
        postsCount: 1,
      };
    setMockUser(matched);
    tokenStore.set('mock_demo_token');
    return { access_token: 'mock_demo_token', user: matched };
  }

  if (endpoint === '/auth/register' && method === 'POST') {
    const newUser = {
      id: `usr_${Date.now()}`,
      username: body.username,
      fullName: body.full_name || body.username,
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
      professionTitle: body.profession?.title || 'Professional Explorer',
      industry: body.profession?.industry || 'Technology & Engineering',
      specialization: body.profession?.specialization || '',
      yearsExp: body.profession?.years_of_experience || 1,
      isVerified: true,
      followersCount: 1,
      followingCount: 0,
      postsCount: 0,
    };
    setMockUser(newUser);
    tokenStore.set('mock_demo_token');
    return { access_token: 'mock_demo_token', user: newUser };
  }

  if (endpoint === '/auth/me') {
    return getMockUser();
  }

  if (endpoint === '/auth/professionals') {
    return Object.values(INITIAL_USERS);
  }

  if (endpoint.startsWith('/auth/users/')) {
    const username = decodeURIComponent(endpoint.replace('/auth/users/', '').split('/')[0]);
    const u = INITIAL_USERS[username] || Object.values(INITIAL_USERS).find((x) => x.username === username) || getMockUser();
    return u;
  }

  // Stories
  if (endpoint === '/stories/feed') {
    return INITIAL_STORIES;
  }

  // Posts
  if (endpoint.startsWith('/posts/feed') || endpoint === '/posts/bookmarks') {
    return INITIAL_POSTS;
  }

  // Categories
  if (endpoint === '/discovery/categories') {
    return INITIAL_CATEGORIES;
  }

  // Challenges
  if (endpoint === '/community/challenges') {
    return INITIAL_CHALLENGES;
  }

  // Q&A
  if (endpoint === '/community/qa') {
    return INITIAL_QA_ITEMS;
  }

  // Community reviews
  if (endpoint.startsWith('/community/reviews/')) {
    return [];
  }

  // Generic mutations
  return { ok: true, id: `mock_${Date.now()}` };
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

  // Community: Q&A AMAs
  getQuestions: () => request('/community/qa'),
  askQuestion: (workerId, data) => post(`/community/qa/${workerId}/ask`, data),
  upvoteQuestion: (questionId) => post(`/community/qa/questions/${questionId}/upvote`),

  // Community: Reviews & Ratings
  getReviews: (postId) => request(`/community/reviews/${postId}`),
  submitReview: (data) => post('/community/reviews', data),
};
