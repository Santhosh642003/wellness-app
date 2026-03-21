import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardNav from "../components/DashboardNav";
import Toast from "../components/Toast";
import Footer from "../components/Footer";
import { useAuth } from "../contexts/AuthContext";
import { modules as modulesApi } from "../lib/api";

function mapModule(m) {
  return {
    id: m.id,
    slug: m.slug,
    title: m.title,
    desc: m.description,
    mins: parseInt(m.duration) || 10,
    points: m.pointsValue,
    progress: m.userProgress ? m.userProgress.watchedPercent / 100 : 0,
    locked: m.locked,
    completed: m.userProgress?.completed ?? false,
    category: m.category,
  };
}

export default function Modules() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [modules, setModules] = useState([]);
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  const loadModules = useCallback(async () => {
    try {
      const mods = await modulesApi.list();
      setModules((mods || []).map(mapModule));
    } catch (err) {
      console.error("Failed to load modules", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadModules(); }, [loadModules]);

  const stats = useMemo(() => {
    const total = modules.length;
    const completed = modules.filter((m) => m.completed).length;
    const inProgress = modules.filter((m) => !m.completed && !m.locked && m.progress > 0).length;
    const locked = modules.filter((m) => m.locked).length;
    const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, inProgress, locked, pct };
  }, [modules]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-page)" }}>
        <div className="text-[var(--text-muted)] animate-pulse">Loading modules…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-page)" }}>
      <DashboardNav points={points} streakDays={0} initials={user?.initials || "?"} />

      <main className="flex-grow max-w-7xl mx-auto px-6 py-10 space-y-8 w-full">
        <header>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">Learning Modules</h1>
          <p className="text-slate-500 dark:text-gray-400 mt-2">Complete modules to earn points and unlock rewards</p>
        </header>

        {/* Progress Card */}
        <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Your Progress</h2>
              <p className="text-slate-500 dark:text-gray-400 text-sm mt-1">Keep going! You're doing great</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-700 dark:text-gray-300">
                <span className="font-semibold">{stats.completed}</span>/{stats.total}
              </div>
              <div className="text-xs text-slate-400 dark:text-gray-500">Modules Completed</div>
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between text-xs text-slate-400 dark:text-gray-500 mb-2">
              <span>Progress</span><span>{stats.pct}%</span>
            </div>
            <div className="h-2 w-full bg-slate-100 dark:bg-[#0f0f0f] border border-slate-200 dark:border-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${stats.pct}%` }} />
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-400 dark:text-gray-400">
              <span><span className="text-slate-700 dark:text-gray-200 font-semibold">{stats.completed}</span> completed</span>
              <span><span className="text-slate-700 dark:text-gray-200 font-semibold">{stats.inProgress}</span> in progress</span>
              <span><span className="text-slate-700 dark:text-gray-200 font-semibold">{stats.locked}</span> locked</span>
            </div>
          </div>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {modules.map((m) => {
            const pct = Math.round((m.progress ?? 0) * 100);
            const status = m.completed ? "completed" : m.locked ? "locked" : pct > 0 ? "progress" : "start";

            return (
              <div
                key={m.id}
                className={`bg-white dark:bg-[#121212] border border-slate-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm ${m.locked ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-lg ${
                      m.completed ? "bg-emerald-400/10 border border-emerald-400/20"
                        : m.locked ? "bg-slate-100 dark:bg-gray-800 border border-slate-200 dark:border-gray-700"
                        : "bg-blue-400/10 border border-blue-400/20"
                    }`}>
                      {m.completed ? "✅" : m.locked ? "🔒" : "📘"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-900 dark:text-white">{m.title}</h3>
                        {m.category && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-gray-800 text-slate-500 dark:text-gray-500">
                            {m.category}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 dark:text-gray-400 text-xs mt-1">{m.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-gray-800 text-slate-600 dark:text-gray-300">{m.mins} min</span>
                    <span className="text-xs px-3 py-1 rounded-full bg-yellow-300/10 border border-yellow-300/20 text-yellow-600 dark:text-yellow-300 font-semibold">+{m.points}</span>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="h-2 w-full bg-slate-100 dark:bg-[#0f0f0f] border border-slate-200 dark:border-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 dark:text-gray-500 mt-2">
                    <span>{status === "completed" ? "Completed" : status === "locked" ? "Locked" : "Progress"}</span>
                    <span>{status === "completed" ? "100%" : `${pct}%`}</span>
                  </div>
                </div>

                <button
                  disabled={m.locked || m.completed}
                  onClick={() => navigate(`/modules/${m.id}`)}
                  className={`mt-5 w-full px-5 py-3 rounded-xl font-semibold transition
                    ${m.completed ? "bg-emerald-400/15 text-emerald-600 dark:text-emerald-300 border border-emerald-400/20 cursor-not-allowed"
                      : m.locked ? "bg-slate-100 dark:bg-[#1a1a1a] text-slate-400 dark:text-gray-400 cursor-not-allowed border border-slate-200 dark:border-gray-800"
                      : "bg-blue-500 text-white hover:bg-blue-600"
                    }`}
                >
                  {m.completed ? "Completed" : m.locked ? "Locked" : status === "progress" ? "Continue Module" : "Start Module"}
                </button>
              </div>
            );
          })}
        </div>
      </main>

      <Toast message={toast} />
      <Footer />
    </div>
  );
}
