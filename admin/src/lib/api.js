const BASE = '/api/admin';

// Called by the app when a 401 is received — redirects to login so the
// admin sees the login form rather than confusing per-operation error messages.
let _on401 = () => { window.location.href = '/'; };
export function set401Handler(fn) { _on401 = fn; }

async function req(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) { _on401(); throw Object.assign(new Error(data.error || 'Session expired'), { status: 401 }); }
  if (!res.ok) { const e = new Error(data.error || `HTTP ${res.status}`); e.status = res.status; throw e; }
  return data;
}

export const api = {
  login: (body) => req('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => req('/auth/logout', { method: 'POST' }),
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
  // user points adjustment
  adjustPoints: (userId, delta, reason) => req(`/users/${userId}/points`, { method: 'PATCH', body: JSON.stringify({ delta, reason }) }),
  // redemptions
  redemptions: () => req('/redemptions'),
  // notifications
  notifications: () => req('/notifications'),
  createNotification: (body) => req('/notifications', { method: 'POST', body: JSON.stringify(body) }),
  updateNotification: (id, body) => req(`/notifications/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteNotification: (id) => req(`/notifications/${id}`, { method: 'DELETE' }),

  // reward pool
  rewardPool: () => req('/reward-pool'),
  createRewardPool: (body) => req('/reward-pool', { method: 'POST', body: JSON.stringify(body) }),
  updateRewardPool: (id, body) => req(`/reward-pool/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  // events
  events: () => req('/events'),
  createEvent: (body) => req('/events', { method: 'POST', body: JSON.stringify(body) }),
  updateEvent: (id, body) => req(`/events/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteEvent: (id) => req(`/events/${id}`, { method: 'DELETE' }),
  rotateEventCode: (id) => req(`/events/${id}/rotate-code`, { method: 'POST' }),
  eventCheckins: (id) => req(`/events/${id}/checkins`),

  // analytics
  analytics: () => req('/stats/analytics'),
  // bulk user actions
  bulkAction: (body) => req('/users/bulk', { method: 'POST', body: JSON.stringify(body) }),

  // document upload (returns { url, size, fileType, originalName })
  uploadDocument: (file, onProgress) => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('document', file);
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${BASE}/documents/upload`);
      xhr.withCredentials = true;
      xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100)); };
      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status === 401) { _on401(); return reject(Object.assign(new Error(data.error || 'Session expired'), { status: 401 })); }
          if (xhr.status >= 200 && xhr.status < 300) resolve(data);
          else reject(new Error(data.error || `HTTP ${xhr.status}`));
        } catch { reject(new Error('Invalid response')); }
      };
      xhr.onerror = () => reject(new Error('Upload failed'));
      xhr.send(formData);
    });
  },

  // image upload (returns { url })
  uploadImage: (file, onProgress) => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('image', file);
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${BASE}/images/upload`);
      xhr.withCredentials = true;
      xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100)); };
      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status === 401) { _on401(); return reject(Object.assign(new Error(data.error || 'Session expired'), { status: 401 })); }
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
      const formData = new FormData();
      formData.append('video', file);
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${BASE}/videos/upload`);
      xhr.withCredentials = true;
      xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100)); };
      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status === 401) { _on401(); return reject(Object.assign(new Error(data.error || 'Session expired'), { status: 401 })); }
          if (xhr.status >= 200 && xhr.status < 300) resolve(data);
          else reject(new Error(data.error || `HTTP ${xhr.status}`));
        } catch { reject(new Error('Invalid response')); }
      };
      xhr.onerror = () => reject(new Error('Upload failed'));
      xhr.send(formData);
    });
  },
};
