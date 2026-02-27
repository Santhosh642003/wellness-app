import { useEffect, useState } from "react";
import DashboardNav from "../components/DashboardNav";
import Footer from "../components/Footer";

const API_BASE = "http://localhost:4000/api";

async function fetchJson(path, options) {
  const response = await fetch(`${API_BASE}${path}`, options);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || "Request failed");
  }

  return response.json();
}

export default function Admin() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [users, setUsers] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [progress, setProgress] = useState([]);

  const [userForm, setUserForm] = useState({ name: "", email: "", password: "" });
  const [quizForm, setQuizForm] = useState({ title: "", quiz_type: "biweekly" });
  const [rewardForm, setRewardForm] = useState({ name: "", points_required: 100, stock: 10 });

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [usersPayload, quizzesPayload, rewardsPayload, progressPayload] = await Promise.all([
        fetchJson("/admin/users"),
        fetchJson("/admin/quizzes"),
        fetchJson("/admin/rewards"),
        fetchJson("/admin/progress"),
      ]);

      setUsers(usersPayload.users || []);
      setQuizzes(quizzesPayload.quizzes || []);
      setRewards(rewardsPayload.rewards || []);
      setProgress(progressPayload.progressByUser || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const submitUser = async (event) => {
    event.preventDefault();
    await fetchJson("/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userForm),
    });
    setUserForm({ name: "", email: "", password: "" });
    await loadData();
  };

  const submitQuiz = async (event) => {
    event.preventDefault();
    await fetchJson("/admin/quizzes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...quizForm, is_active: 1 }),
    });
    setQuizForm({ title: "", quiz_type: "biweekly" });
    await loadData();
  };

  const submitReward = async (event) => {
    event.preventDefault();
    await fetchJson("/admin/rewards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rewardForm),
    });
    setRewardForm({ name: "", points_required: 100, stock: 10 });
    await loadData();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0b0b] text-white">
      <DashboardNav points={0} streakDays={0} initials="AD" />
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Control Panel</h1>
          <p className="text-gray-400 mt-1">Manage quizzes, rewards, users, and track overall progress.</p>
        </div>

        {error && <div className="bg-red-900/20 border border-red-600 text-red-200 rounded-xl px-4 py-3">{error}</div>}
        {loading && <div className="text-gray-400">Loading admin data...</div>}

        <section className="grid lg:grid-cols-3 gap-4">
          <form onSubmit={submitUser} className="bg-[#121212] border border-gray-800 rounded-2xl p-4 space-y-3">
            <h2 className="font-semibold">Add User</h2>
            <input className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2" placeholder="Name" value={userForm.name} onChange={(e) => setUserForm((p) => ({ ...p, name: e.target.value }))} required />
            <input className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2" placeholder="Email" type="email" value={userForm.email} onChange={(e) => setUserForm((p) => ({ ...p, email: e.target.value }))} required />
            <input className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2" placeholder="Password" value={userForm.password} onChange={(e) => setUserForm((p) => ({ ...p, password: e.target.value }))} required />
            <button className="w-full bg-blue-600 hover:bg-blue-500 rounded-lg py-2">Create User</button>
          </form>

          <form onSubmit={submitQuiz} className="bg-[#121212] border border-gray-800 rounded-2xl p-4 space-y-3">
            <h2 className="font-semibold">Add Quiz</h2>
            <input className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2" placeholder="Quiz title" value={quizForm.title} onChange={(e) => setQuizForm((p) => ({ ...p, title: e.target.value }))} required />
            <select className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2" value={quizForm.quiz_type} onChange={(e) => setQuizForm((p) => ({ ...p, quiz_type: e.target.value }))}>
              <option value="biweekly">Biweekly</option>
              <option value="module">Module</option>
            </select>
            <button className="w-full bg-blue-600 hover:bg-blue-500 rounded-lg py-2">Create Quiz</button>
          </form>

          <form onSubmit={submitReward} className="bg-[#121212] border border-gray-800 rounded-2xl p-4 space-y-3">
            <h2 className="font-semibold">Add Reward</h2>
            <input className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2" placeholder="Reward name" value={rewardForm.name} onChange={(e) => setRewardForm((p) => ({ ...p, name: e.target.value }))} required />
            <input className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2" type="number" min="1" value={rewardForm.points_required} onChange={(e) => setRewardForm((p) => ({ ...p, points_required: Number(e.target.value) }))} required />
            <input className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2" type="number" min="0" value={rewardForm.stock} onChange={(e) => setRewardForm((p) => ({ ...p, stock: Number(e.target.value) }))} required />
            <button className="w-full bg-blue-600 hover:bg-blue-500 rounded-lg py-2">Create Reward</button>
          </form>
        </section>

        <section className="grid lg:grid-cols-2 gap-4">
          <Panel title="Users" rows={users} columns={["id", "name", "email", "role", "points", "streak_days"]} />
          <Panel title="Quizzes" rows={quizzes} columns={["id", "title", "quiz_type", "is_active"]} />
          <Panel title="Rewards" rows={rewards} columns={["id", "name", "points_required", "stock"]} />
          <Panel title="Overall Progress" rows={progress} columns={["user_id", "name", "email", "points", "events_count", "total_points_from_events"]} />
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Panel({ title, rows, columns }) {
  return (
    <div className="bg-[#121212] border border-gray-800 rounded-2xl p-4 overflow-auto">
      <h3 className="font-semibold mb-3">{title}</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-400 border-b border-gray-800">
            {columns.map((column) => (
              <th key={column} className="text-left py-2 pr-4">{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${title}-${index}`} className="border-b border-gray-900/70">
              {columns.map((column) => (
                <td key={`${column}-${index}`} className="py-2 pr-4">{String(row[column] ?? "")}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
