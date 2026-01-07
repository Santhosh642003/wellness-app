import { useEffect, useMemo, useState } from "react";
import DashboardNav from "../components/DashboardNav";
import Toast from "../components/Toast";
import Footer from "../components/Footer";
import { INITIAL, safeLoad, safeSave } from "../store/dashboardStore";
import { useNavigate } from "react-router-dom";



export default function Modules() {
  const navigate = useNavigate();
  const [data, setData] = useState(INITIAL);

  // Toast
  const [toast, setToast] = useState("");
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const loaded = safeLoad();
    if (loaded) {
      setData((prev) => ({
        ...prev,
        ...loaded,
        user: { ...prev.user, ...(loaded.user || {}) },
        modules: Array.isArray(loaded.modules) ? loaded.modules : prev.modules,
      }));
    }
  }, []);

  useEffect(() => {
    safeSave(data);
  }, [data]);

  const stats = useMemo(() => {
    const total = data.modules.length;
    const completed = data.modules.filter((m) => m.completed).length;
    const inProgress = data.modules.filter(
      (m) => !m.completed && !m.locked && (m.progress ?? 0) > 0
    ).length;
    const locked = data.modules.filter((m) => m.locked).length;
    const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, inProgress, locked, pct };
  }, [data.modules]);

  const continueModule = (id) => {
    setData((prev) => {
      const modules = prev.modules.map((m) => ({ ...m }));
      const idx = modules.findIndex((m) => m.id === id);
      if (idx === -1) return prev;

      const m = modules[idx];
      if (m.locked || m.completed) return prev;

      const step = 0.15;
      const nextProgress = Math.min(1, Math.round(((m.progress ?? 0) + step) * 100) / 100);
      m.progress = nextProgress;

      let gained = 0;
      let completedNow = false;
      let unlockedNow = false;

      if (m.progress >= 1 && !m.completed) {
        m.completed = true;
        completedNow = true;
        gained += m.points;

        // unlock the first locked module
        const nextLocked = modules.find((x) => x.locked);
        if (nextLocked) {
          nextLocked.locked = false;
          unlockedNow = true;
        }
      }

      if (completedNow) {
        setTimeout(() => setToast("🎉 Module completed! +50 points"), 0);
      }
      if (unlockedNow) {
        setTimeout(() => setToast("🔓 New module unlocked"), 200);
      }

      return { ...prev, points: prev.points + gained, modules };
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0b0b] text-white">
      <DashboardNav
        points={data.points}
        streakDays={data.streakDays}
        initials={data.user.initials}
      />

      <main className="flex-grow max-w-7xl mx-auto px-6 py-10 space-y-8">
        <header>
          <h1 className="text-3xl font-semibold">Learning Modules</h1>
          <p className="text-gray-400 mt-2">
            Complete modules to earn points and unlock rewards
          </p>
        </header>

        {/* Progress Card */}
        <div className="bg-[#121212] border border-gray-800 rounded-2xl p-6 shadow-lg">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h2 className="text-lg font-semibold">Your Progress</h2>
              <p className="text-gray-400 text-sm mt-1">Keep going! You’re doing great</p>
            </div>

            <div className="text-right">
              <div className="text-sm text-gray-300">
                <span className="font-semibold">{stats.completed}</span>/{stats.total}
              </div>
              <div className="text-xs text-gray-500">Modules Completed</div>
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
              <span>Progress</span>
              <span>{stats.pct}%</span>
            </div>
            <div className="h-2 w-full bg-[#0f0f0f] border border-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 transition-all duration-500"
                style={{ width: `${stats.pct}%` }}
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-400">
              <span>
                <span className="text-gray-200 font-semibold">{stats.completed}</span>{" "}
                completed
              </span>
              <span>
                <span className="text-gray-200 font-semibold">{stats.inProgress}</span>{" "}
                in progress
              </span>
              <span>
                <span className="text-gray-200 font-semibold">{stats.locked}</span> locked
              </span>
            </div>
          </div>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {data.modules.map((m) => {
            const pct = Math.round((m.progress ?? 0) * 100);
            const status = m.completed
              ? "completed"
              : m.locked
              ? "locked"
              : pct > 0
              ? "progress"
              : "start";

            return (
              <div
                key={m.id}
                className={`bg-[#121212] border border-gray-800 rounded-2xl p-6 shadow-lg ${
                  m.locked ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center">
                      {m.completed ? "✅" : "📘"}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold">{m.title}</h3>
                      <p className="text-gray-400 text-xs mt-1">{m.desc}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs px-3 py-1 rounded-full bg-white/5 border border-gray-800 text-gray-300">
                      {m.mins} min
                    </span>
                    <span className="text-xs px-3 py-1 rounded-full bg-yellow-300/10 border border-yellow-300/20 text-yellow-300 font-semibold">
                      +{m.points}
                    </span>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="h-2 w-full bg-[#0f0f0f] border border-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>
                      {status === "completed"
                        ? "Completed"
                        : status === "locked"
                        ? "Locked"
                        : "Progress"}
                    </span>
                    <span>{status === "completed" ? "100%" : `${pct}%`}</span>
                  </div>
                </div>

                <button
                  disabled={m.locked || m.completed}
                  onClick={() => navigate(`/modules/${m.id}`)}
                  className={`mt-5 w-full px-5 py-3 rounded-xl font-semibold transition-transform
                    ${
                      m.completed
                        ? "bg-emerald-400/15 text-emerald-300 border border-emerald-400/20 cursor-not-allowed"
                        : m.locked
                        ? "bg-[#1a1a1a] text-gray-400 cursor-not-allowed"
                        : "bg-blue-500 text-white hover:scale-[1.01]"
                    }`}
                >
                  {m.completed
                    ? "Completed"
                    : m.locked
                    ? "Locked"
                    : status === "progress"
                    ? "Continue Module"
                    : "Start Module"}
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
