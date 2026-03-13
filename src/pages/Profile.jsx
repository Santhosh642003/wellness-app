import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardNav from "../components/DashboardNav";
import Footer from "../components/Footer";
import Toast from "../components/Toast";

const STORAGE_KEY = "wellness_dashboard_state_v1";

const FALLBACK = {
  user: {
    name: "Santhosh",
    initials: "SN",
    email: "yourname@njit.edu",
    role: "Student",
    campus: "NJIT • Newark",
    plan: "plus",
  },
  points: 870,
  streakDays: 7,
  lastClaimDate: null,
  modules: [],
};

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function clamp01(n) {
  return Math.max(0, Math.min(1, n));
}

function pct(n) {
  return `${Math.round(clamp01(n) * 100)}%`;
}

function PlusBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full
                     bg-gradient-to-r from-yellow-400/20 to-orange-400/20
                     border border-yellow-400/30 text-yellow-300">
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
      Plus Plan
    </span>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const [toast, setToast] = useState("");
  const [data, setData] = useState(FALLBACK);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;

      setData((prev) => ({
        ...prev,
        ...parsed,
        user: { ...prev.user, ...(parsed.user || {}) },
        modules: Array.isArray(parsed.modules) ? parsed.modules : prev.modules,
      }));
    } catch {}
  }, []);

  const today = todayISO();
  const claimedToday = data.lastClaimDate === today;

  const modules = data.modules || [];
  const completedCount = modules.filter((m) => m.completed).length;
  const unlockedCount = modules.filter((m) => !m.locked).length;
  const isPlus = data.user?.plan === "plus";

  const overallProgress = useMemo(() => {
    if (!modules.length) return 0;
    const sum = modules.reduce((acc, m) => acc + clamp01(m.progress || 0), 0);
    return sum / modules.length;
  }, [modules]);

  const nextModule = useMemo(() => {
    return modules.find((m) => !m.locked && !m.completed) || null;
  }, [modules]);

  const signOut = () => {
    localStorage.removeItem("wellness_logged_in");
    setToast("👋 Signed out");
    setTimeout(() => navigate("/", { replace: true }), 600);
  };

  const resetDemo = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setToast("🔁 Demo reset");
    setData(FALLBACK);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0b0b] text-white">
      <DashboardNav
        points={data.points || 0}
        streakDays={data.streakDays || 0}
        initials={data.user?.initials || "SN"}
      />

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-semibold">Profile</h1>
            <p className="text-gray-400 mt-2">
              Your wellness learning progress, quizzes, rewards, and settings.
            </p>
          </div>

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={resetDemo}
              className="px-4 py-2 rounded-xl border border-gray-800 bg-[#121212] hover:bg-[#151515]"
            >
              Reset demo
            </button>
            <button
              onClick={signOut}
              className="px-4 py-2 rounded-xl border border-gray-800 bg-[#121212] hover:bg-[#151515]"
            >
              Sign out
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <section className="lg:col-span-8 space-y-8">
            {/* User Card */}
            <div className="bg-[#121212] border border-gray-800 rounded-2xl p-6">
              <div className="flex items-start justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-emerald-400/20 border border-gray-700 flex items-center justify-center text-lg font-semibold">
                      {data.user?.initials || "SN"}
                    </div>
                    {isPlus && (
                      <div className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-yellow-400 flex items-center justify-center">
                        <svg className="w-3 h-3 text-yellow-900" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-xl font-semibold">{data.user?.name || "Student"}</div>
                      {isPlus && <PlusBadge />}
                    </div>
                    <div className="text-gray-400 text-sm mt-0.5">{data.user?.email || "yourname@njit.edu"}</div>
                    <div className="text-gray-500 text-xs mt-1">
                      {data.user?.role || "Student"} • {data.user?.campus || "NJIT"}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setToast("✏️ Edit profile coming soon")}
                  className="text-sm px-4 py-2 rounded-xl border border-gray-800 bg-[#0f0f0f] hover:bg-[#141414]"
                >
                  Edit
                </button>
              </div>

              {/* Plan info */}
              {isPlus && (
                <div className="mt-5 pt-5 border-t border-gray-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-yellow-300 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        Wellness Plus Plan — Active
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        2x daily points • Live captions • Exclusive bonus modules
                      </div>
                    </div>
                    <button
                      onClick={() => navigate("/plans")}
                      className="text-xs px-3 py-1.5 rounded-xl border border-yellow-400/20 bg-yellow-400/5 text-yellow-400 hover:bg-yellow-400/10"
                    >
                      Manage Plan
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Learning Progress */}
            <div className="bg-[#121212] border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Learning Progress</h2>
                <span className="text-xs px-3 py-1 rounded-full bg-[#0f0f0f] border border-gray-800 text-gray-300">
                  Overall {pct(overallProgress)}
                </span>
              </div>

              <div className="mt-4 h-2 rounded-full bg-[#0f0f0f] border border-gray-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-700"
                  style={{ width: pct(overallProgress) }}
                />
              </div>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-gray-800 bg-[#0f0f0f] p-4">
                  <div className="text-xs text-gray-500">Completed</div>
                  <div className="text-2xl font-semibold mt-1">{completedCount}</div>
                </div>
                <div className="rounded-2xl border border-gray-800 bg-[#0f0f0f] p-4">
                  <div className="text-xs text-gray-500">Unlocked</div>
                  <div className="text-2xl font-semibold mt-1">{unlockedCount}</div>
                </div>
                <div className="rounded-2xl border border-gray-800 bg-[#0f0f0f] p-4">
                  <div className="text-xs text-gray-500">Next up</div>
                  <div className="text-sm font-semibold mt-2 text-gray-200">
                    {nextModule ? nextModule.title : "All done!"}
                  </div>
                  {nextModule && (
                    <button
                      onClick={() => navigate(`/modules/${nextModule.id}`)}
                      className="mt-3 w-full px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-500 to-emerald-400 hover:opacity-90"
                    >
                      Continue
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Module list snapshot */}
            <div className="bg-[#121212] border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Modules</h2>
                <button
                  onClick={() => navigate("/modules")}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  View all
                </button>
              </div>
              <div className="space-y-3">
                {modules.slice(0, 4).map((m) => (
                  <div key={m.id} className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full flex-shrink-0 ${
                      m.completed ? "bg-emerald-400" : m.locked ? "bg-gray-700" : "bg-blue-400"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-300 truncate">{m.title}</div>
                    </div>
                    <div className="text-xs text-gray-600 shrink-0">
                      {m.completed ? "✓ Done" : m.locked ? "Locked" : `${Math.round((m.progress || 0) * 100)}%`}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quizzes */}
            <div className="bg-[#121212] border border-gray-800 rounded-2xl p-6">
              <h2 className="text-lg font-semibold">Quizzes</h2>
              <p className="text-gray-400 text-sm mt-1">
                Bi-weekly quiz (HPV + MenB) and module quizzes to unlock progress.
              </p>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-gray-800 bg-[#0f0f0f] p-5">
                  <div className="text-sm font-semibold">Bi-weekly Quiz</div>
                  <div className="text-xs text-gray-500 mt-1">~20 questions • Earn bonus points</div>
                  <button
                    onClick={() => navigate("/quiz/biweekly")}
                    className="mt-4 w-full px-4 py-2 rounded-xl text-sm font-semibold bg-[#141414] border border-gray-800 hover:bg-[#171717]"
                  >
                    Start bi-weekly quiz
                  </button>
                </div>

                <div className="rounded-2xl border border-gray-800 bg-[#0f0f0f] p-5">
                  <div className="text-sm font-semibold">Module Quiz</div>
                  <div className="text-xs text-gray-500 mt-1">~10 questions • Unlock next module</div>
                  <button
                    onClick={() => {
                      const id = nextModule?.id || modules.find((m) => !m.locked)?.id || "m1";
                      navigate(`/quiz/module/${id}`);
                    }}
                    className="mt-4 w-full px-4 py-2 rounded-xl text-sm font-semibold bg-[#141414] border border-gray-800 hover:bg-[#171717]"
                  >
                    Go to module quiz
                  </button>
                </div>
              </div>
            </div>
          </section>

          <aside className="lg:col-span-4 space-y-6">
            {/* Stats */}
            <div className="bg-[#121212] border border-gray-800 rounded-2xl p-6">
              <h2 className="text-lg font-semibold">Your Stats</h2>

              <div className="mt-5 grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-gray-800 bg-[#0f0f0f] p-4">
                  <div className="text-xs text-gray-500">Points</div>
                  <div className="text-2xl font-semibold mt-1">{data.points || 0}</div>
                </div>
                <div className="rounded-2xl border border-gray-800 bg-[#0f0f0f] p-4">
                  <div className="text-xs text-gray-500">Streak</div>
                  <div className="text-2xl font-semibold mt-1">{data.streakDays || 0}</div>
                  <div className="text-xs text-gray-600 mt-0.5">days</div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-gray-800 bg-[#0f0f0f] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">Daily Reward</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {claimedToday ? "Already claimed today" : "Available now"}
                    </div>
                  </div>

                  <span
                    className={`text-xs px-3 py-1 rounded-full border ${
                      claimedToday
                        ? "border-gray-800 bg-[#141414] text-gray-400"
                        : "border-emerald-400/40 bg-[#101d1a] text-emerald-300"
                    }`}
                  >
                    {claimedToday ? "Claimed" : isPlus ? "+10 pts" : "+5 pts"}
                  </span>
                </div>
                {isPlus && !claimedToday && (
                  <div className="mt-2 text-xs text-yellow-400/70">
                    Plus plan: 2x daily points
                  </div>
                )}
              </div>
            </div>

            {/* Plan Card */}
            <div className={`rounded-2xl p-6 border ${
              isPlus
                ? "bg-gradient-to-br from-yellow-400/5 to-orange-400/5 border-yellow-400/15"
                : "bg-[#121212] border-gray-800"
            }`}>
              <div className="flex items-center gap-2 mb-3">
                {isPlus ? (
                  <>
                    <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <h2 className="text-sm font-semibold text-yellow-300">Plus Plan — Active</h2>
                  </>
                ) : (
                  <h2 className="text-sm font-semibold">Free Plan</h2>
                )}
              </div>

              {isPlus ? (
                <ul className="space-y-2 text-xs text-gray-400">
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span> 2x daily login points
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span> Live captions on all videos
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span> Exclusive bonus modules
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span> Priority reward redemptions
                  </li>
                </ul>
              ) : (
                <>
                  <p className="text-xs text-gray-500 mb-4">
                    Upgrade to Plus for 2x points, live captions, and exclusive modules.
                  </p>
                  <button
                    onClick={() => navigate("/plans")}
                    className="w-full px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-yellow-400/20 to-orange-400/20 border border-yellow-400/20 text-yellow-300 hover:opacity-90"
                  >
                    Upgrade to Plus
                  </button>
                </>
              )}
            </div>

            {/* Rewards */}
            <div className="bg-[#121212] border border-gray-800 rounded-2xl p-6">
              <h2 className="text-lg font-semibold">Rewards</h2>
              <p className="text-gray-400 text-sm mt-1">
                Earn points from modules, quizzes, and streaks.
              </p>

              <button
                onClick={() => navigate("/rewards")}
                className="mt-4 w-full px-4 py-2 rounded-xl text-sm font-semibold bg-[#141414] border border-gray-800 hover:bg-[#171717]"
              >
                View rewards
              </button>
            </div>
          </aside>
        </div>
      </main>

      <Toast message={toast} />
      <Footer />
    </div>
  );
}
