const BASE = '/api/admin';

function getToken() {
  return localStorage.getItem('admin_token');
}

async function req(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(data.error || `HTTP ${res.status}`); e.status = res.status; throw e; }
  return data;
}

export const api = {
  login: (body) => req('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  stats: () => req('/stats'),
  users: () => req('/users'),
  user: (id) => req(`/users/${id}`),
  // modules
  modules: () => req('/modules'),
  createModule: (body) => req('/modules', { method: 'POST', body: JSON.stringify(body) }),
  updateModule: (id, body) => req(`/modules/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteModule: (id) => req(`/modules/${id}`, { method: 'DELETE' }),
  // quizzes
  quizzes: () => req('/quizzes'),
  createQuiz: (body) => req('/quizzes', { method: 'POST', body: JSON.stringify(body) }),
  updateQuiz: (id, body) => req(`/quizzes/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteQuiz: (id) => req(`/quizzes/${id}`, { method: 'DELETE' }),
  questions: (quizId) => req(`/quizzes/${quizId}/questions`),
  createQuestion: (body) => req('/quiz-questions', { method: 'POST', body: JSON.stringify(body) }),
  updateQuestion: (id, body) => req(`/quiz-questions/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteQuestion: (id) => req(`/quiz-questions/${id}`, { method: 'DELETE' }),
  // rewards
  rewards: () => req('/rewards'),
  createReward: (body) => req('/rewards', { method: 'POST', body: JSON.stringify(body) }),
  updateReward: (id, body) => req(`/rewards/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteReward: (id) => req(`/rewards/${id}`, { method: 'DELETE' }),
  // redemptions
  redemptions: () => req('/redemptions'),
};
