import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

async function fetchJson(path, options) {
  const response = await fetch(`${API_BASE}${path}`, options);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.message || 'Request failed');
  return payload;
}

export default function AdminApp() {
  const [users, setUsers] = useState([]);
  const [modules, setModules] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [rewards, setRewards] = useState([]);

  async function load() {
    const [u, m, q, r] = await Promise.all([
      fetchJson('/admin/users'),
      fetchJson('/admin/modules'),
      fetchJson('/admin/quizzes'),
      fetchJson('/admin/rewards'),
    ]);
    setUsers(u.users || []);
    setModules(m.modules || []);
    setQuizzes(q.quizzes || []);
    setRewards(r.rewards || []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  return (
    <main style={{maxWidth:1200,margin:'0 auto',padding:24}}>
      <h1>Wellness Admin (separate website)</h1>
      <p style={{color:'#9CA3AF'}}>Manage users, modules, quizzes, and rewards from a dedicated admin app.</p>
      <Section title="Users" rows={users} />
      <Section title="Modules" rows={modules} />
      <Section title="Quizzes" rows={quizzes} />
      <Section title="Rewards" rows={rewards} />
    </main>
  );
}

function Section({ title, rows }) {
  return (
    <section style={{background:'#121212', border:'1px solid #222', borderRadius:12, padding:16, marginTop:16}}>
      <h2>{title}</h2>
      <pre style={{whiteSpace:'pre-wrap', color:'#D1D5DB'}}>{JSON.stringify(rows, null, 2)}</pre>
    </section>
  );
}
