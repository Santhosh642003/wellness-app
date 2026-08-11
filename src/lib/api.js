const BASE_URL = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('wellness_token');
}

// Set from AuthContext so api.js can trigger logout on 401 without a circular dep
let _onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  _onUnauthorized = fn;
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;

    // Auto-logout on expired / invalid token (but not on login/register)
    if (res.status === 401 && !path.startsWith('/auth/')) {
      localStorage.removeItem('wellness_token');
      localStorage.removeItem('wellness_logged_in');
      _onUnauthorized?.();
    }

    throw err;
  }

  return data;
}

// Auth
export const auth = {
  sendOtp: (body) => request('/auth/send-otp', { method: 'POST', body: JSON.stringify(body) }),
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  google: (credential) => request('/auth/google', { method: 'POST', body: JSON.stringify({ credential }) }),
  me: () => request('/auth/me'),
  forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token, password) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),
};

// Users
export const users = {
  get: (userId) => request(`/users/${userId}`),
  updateProfile: (userId, body) => request(`/users/${userId}/profile`, { method: 'PATCH', body: JSON.stringify(body) }),
  dailyClaim: (userId) => request(`/users/${userId}/daily-claim`, { method: 'POST' }),
  getModuleProgress: (userId) => request(`/users/${userId}/module-progress`),
  updateModuleProgress: (userId, moduleId, body) =>
    request(`/users/${userId}/module-progress/${moduleId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  submitQuiz: (userId, body) => request(`/users/${userId}/quiz`, { method: 'POST', body: JSON.stringify(body) }),
  activity: (userId) => request(`/users/${userId}/activity`),
  pointsSummary: (userId) => request(`/users/${userId}/points-summary`),
  referrals: (userId) => request(`/users/${userId}/referrals`),
};

// Modules
export const modules = {
  list: () => request('/modules'),
  get: (moduleId) => request(`/modules/${moduleId}`),
};

// Rewards
export const rewards = {
  list: () => request('/rewards'),
  redeem: (userId, rewardId, idempotencyKey) => request('/rewards/redeem', {
    method: 'POST',
    body: JSON.stringify({ userId, rewardId }),
    headers: { 'Idempotency-Key': idempotencyKey },
  }),
  poolStatus: () => request('/rewards/pool-status'),
  history: (userId) => request(`/rewards/history/${userId}`),
};

// Leaderboard
export const leaderboard = {
  list: (period = 'all') => request(`/leaderboard?period=${period}`),
};

// Notifications
export const notifications = {
  list: () => request('/notifications'),
};

// Bookmarks
export const bookmarks = {
  list: (userId) => request(`/users/${userId}/bookmarks`),
  add: (userId, moduleId) => request(`/users/${userId}/bookmarks/${moduleId}`, { method: 'POST' }),
  remove: (userId, moduleId) => request(`/users/${userId}/bookmarks/${moduleId}`, { method: 'DELETE' }),
};

// Events
export const events = {
  list: () => request('/events'),
  checkin: (eventId, code) => request(`/events/${eventId}/checkin`, { method: 'POST', body: JSON.stringify({ code }) }),
};

// Comments
export const comments = {
  list: (moduleId) => request(`/modules/${moduleId}/comments`),
  add: (moduleId, body) => request(`/modules/${moduleId}/comments`, { method: 'POST', body: JSON.stringify({ body }) }),
  delete: (moduleId, commentId) => request(`/modules/${moduleId}/comments/${commentId}`, { method: 'DELETE' }),
};
