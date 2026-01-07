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

  const overallProgress = useMemo(() => {
    if (!modules.length) return 0;
    const sum = modules.reduce((acc, m) => acc + clamp01(m.progress || 0), 0);
    return sum / modules.length;
  }, [modules]);

  const nextModule = useMemo(() => {
    const firstUnlockedNotDone = modules.find((m) => !m.locked && !m.completed);
    return firstUnlockedNotDone || null;
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
            <div className="bg-[#121212] border border-gray-800 rounded-2xl p-6">
              <div className="flex items-start justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-[#0f0f0f] border border-gray-800 flex items-center justify-center text-lg font-semibold">
                    {data.user?.initials || "SN"}
                  </div>
                  <div>
                    <div className="text-xl font-semibold">{data.user?.name || "Student"}</div>
                    <div className="text-gray-400 text-sm">{data.user?.email || "yourname@njit.edu"}</div>
                    <div className="text-gray-500 text-xs mt-1">
                      {data.user?.role || "Student"} • {data.user?.campus || "NJIT"}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setToast("✏️ Edit profile (coming soon)")}
                  className="text-sm px-4 py-2 rounded-xl border border-gray-800 bg-[#0f0f0f] hover:bg-[#141414]"
                >
                  Edit
                </button>
              </div>
            </div>

            <div className="bg-[#121212] border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Learning Progress</h2>
                <span className="text-xs px-3 py-1 rounded-full bg-[#0f0f0f] border border-gray-800 text-gray-300">
                  Overall {pct(overallProgress)}
                </span>
              </div>

              <div className="mt-4 h-2 rounded-full bg-[#0f0f0f] border border-gray-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-400"
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
                    {nextModule ? nextModule.title : "No active module"}
                  </div>
                  {nextModule ? (
                    <button
                      onClick={() => navigate(`/modules/${nextModule.id}`)}
                      className="mt-3 w-full px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-500 to-emerald-400 hover:opacity-90"
                    >
                      Continue module
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

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

          <aside className="lg:col-span-4 space-y-8">
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
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-gray-800 bg-[#0f0f0f] p-4">
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
                    {claimedToday ? "Claimed" : "+5 points"}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-[#121212] border border-gray-800 rounded-2xl p-6">
              <h2 className="text-lg font-semibold">Rewards</h2>
              <p className="text-gray-400 text-sm mt-1">
                Earn points from modules, quizzes, and streaks to redeem rewards.
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
