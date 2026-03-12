const BASE_URL = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('wellness_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

// Auth
export const auth = {
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/auth/me'),
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
