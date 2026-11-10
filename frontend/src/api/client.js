const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

async function request(endpoint, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    if (!res.ok) {
      throw new Error(`API Error: ${res.status} ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    console.warn(`[MyJob API Client] Network request to ${endpoint} failed:`, err.message);
    return null; // Triggers fallback to local state in UI
  }
}

export const api = {
  // Stories
  getStories: () => request('/stories/feed'),
  createStory: (data) => request('/stories', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Posts & Case Studies
  getPosts: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/posts/feed${query ? `?${query}` : ''}`);
  },
  getPostById: (id) => request(`/posts/${id}`),
  createPost: (data) => request('/posts', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  toggleLike: (postId) => request(`/posts/${postId}/like`, {
    method: 'POST',
  }),

  // Discovery & Taxonomy
  getCategories: () => request('/discovery/categories'),
  search: (query) => request(`/discovery/search?q=${encodeURIComponent(query)}`),

  // Community: Challenges
  getChallenges: (category) => request(`/community/challenges${category ? `?category=${category}` : ''}`),
  createChallenge: (data) => request('/community/challenges', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  submitSuggestion: (challengeId, data) => request(`/community/challenges/${challengeId}/suggest`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Community: Q&A AMAs
  getWorkerQA: (workerId) => request(`/community/qa/${workerId}`),
  askQuestion: (workerId, data) => request(`/community/qa/${workerId}/ask`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Community: Reviews & Ratings
  getReviews: (postId) => request(`/community/reviews/${postId}`),
  submitReview: (data) => request('/community/reviews', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};
