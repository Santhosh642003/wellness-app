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

  // image upload (returns { url })
  uploadImage: (file, onProgress) => {
    return new Promise((resolve, reject) => {
      const token = getToken();
      const formData = new FormData();
      formData.append('image', file);
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${BASE}/images/upload`);
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100)); };
      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) resolve(data);
          else reject(new Error(data.error || `HTTP ${xhr.status}`));
        } catch { reject(new Error('Invalid response')); }
      };
      xhr.onerror = () => reject(new Error('Upload failed'));
      xhr.send(formData);
    });
  },

  // video upload (returns { url })
  uploadVideo: (file, onProgress) => {
    return new Promise((resolve, reject) => {
      const token = getToken();
      const formData = new FormData();
      formData.append('video', file);
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${BASE}/videos/upload`);
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100)); };
      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) resolve(data);
          else reject(new Error(data.error || `HTTP ${xhr.status}`));
        } catch { reject(new Error('Invalid response')); }
      };
      xhr.onerror = () => reject(new Error('Upload failed'));
      xhr.send(formData);
    });
  },
};
