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
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  google: (credential) => request('/auth/google', { method: 'POST', body: JSON.stringify({ credential }) }),
  me: () => request('/auth/me'),
};

// Transcription
export const transcribe = async (audioBlob) => {
  const token = getToken();
  const formData = new FormData();
  formData.append('audio', audioBlob, 'audio.webm');
  const res = await fetch(`${BASE_URL}/transcribe`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
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
};

// Modules
export const modules = {
  list: () => request('/modules'),
  get: (moduleId) => request(`/modules/${moduleId}`),
};

// Rewards
export const rewards = {
  list: () => request('/rewards'),
  redeem: (userId, rewardId) => request('/rewards/redeem', { method: 'POST', body: JSON.stringify({ userId, rewardId }) }),
  history: (userId) => request(`/rewards/history/${userId}`),
};

// Leaderboard
export const leaderboard = {
  list: () => request('/leaderboard'),
};
