import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardNav from "../components/DashboardNav";
import Footer from "../components/Footer";
import Toast from "../components/Toast";
import { useAuth } from "../contexts/AuthContext";
import { users as usersApi } from "../lib/api";

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [toast, setToast] = useState("");
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  const loadProfile = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await usersApi.get(user.id);
      setProfileData(data);
    } catch (err) {
      console.error("Failed to load profile", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const progress = profileData?.progress || {};
  const moduleProgresses = profileData?.moduleProgresses || [];
  const redemptions = profileData?.redemptions || [];

  const completedCount = moduleProgresses.filter((m) => m.completed).length;
  const totalModules = moduleProgresses.length;

  const overallPct = useMemo(() => {
    if (!totalModules) return 0;
    const sum = moduleProgresses.reduce((acc, m) => acc + (m.watchedPercent || 0), 0);
    return Math.round(sum / totalModules);
  }, [moduleProgresses, totalModules]);

  const nextModule = moduleProgresses.find((m) => !m.locked && !m.completed);

  const signOut = () => {
    logout();
    navigate("/", { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-page)" }}>
        <div className="text-[var(--text-muted)] animate-pulse">Loading profile…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-page)" }}>
      <DashboardNav
        points={progress.points || 0}
        streakDays={progress.streakDays || 0}
        initials={user?.initials || "SN"}
      />

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">Profile</h1>
            <p className="text-slate-500 dark:text-gray-400 mt-2">Your wellness learning stats and history</p>
          </div>
          <button onClick={signOut} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-[#121212] text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-[#151515] text-sm">
            Sign out
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <section className="lg:col-span-8 space-y-6">
            {/* User Card */}
            <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-gray-800 rounded-2xl p-6">
              <div className="flex items-start justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-emerald-400/20 border border-slate-200 dark:border-gray-700 flex items-center justify-center text-lg font-semibold text-slate-900 dark:text-white">
                    {user?.initials || "SN"}
                  </div>
                  <div>
                    <div className="text-xl font-semibold text-slate-900 dark:text-white">{user?.name || "Student"}</div>
                    <div className="text-slate-500 dark:text-gray-400 text-sm">{user?.email}</div>
                    <div className="text-slate-400 dark:text-gray-500 text-xs mt-1">{profileData?.role || "Student"} · {profileData?.campus || "NJIT"}</div>
                  </div>
                </div>
                <button onClick={() => setToast("Edit profile coming soon")} className="text-sm px-4 py-2 rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-[#0f0f0f] text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-[#141414]">Edit</button>
              </div>
            </div>

            {/* Learning Progress */}
            <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-gray-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Learning Progress</h2>
                <span className="text-xs px-3 py-1 rounded-full bg-slate-100 dark:bg-[#0f0f0f] border border-slate-200 dark:border-gray-800 text-slate-600 dark:text-gray-300">
                  {overallPct}% overall
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 dark:bg-[#0f0f0f] border border-slate-200 dark:border-gray-800 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all" style={{ width: `${overallPct}%` }} />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-4">
                <div className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-[#0f0f0f] p-4 text-center">
                  <div className="text-2xl font-semibold text-slate-900 dark:text-white">{completedCount}</div>
                  <div className="text-xs text-slate-400 dark:text-gray-500 mt-1">Completed</div>
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-[#0f0f0f] p-4 text-center">
                  <div className="text-2xl font-semibold text-slate-900 dark:text-white">{totalModules}</div>
                  <div className="text-xs text-slate-400 dark:text-gray-500 mt-1">Total Modules</div>
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-[#0f0f0f] p-4">
                  <div className="text-xs text-slate-400 dark:text-gray-500 mb-2">Next up</div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-gray-200">
                    {nextModule ? nextModule.title : "All done!"}
                  </div>
                  {nextModule && (
                    <button onClick={() => navigate(`/modules/${nextModule.moduleId}`)} className="mt-2 w-full px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-500 to-emerald-400 text-white hover:opacity-90">
                      Continue
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Module List */}
            {moduleProgresses.length > 0 && (
              <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-gray-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Module History</h2>
                  <button onClick={() => navigate("/modules")} className="text-xs text-blue-500 hover:text-blue-400">View all</button>
                </div>
                <div className="space-y-3">
                  {moduleProgresses.map((m) => (
                    <div key={m.moduleId} className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full shrink-0 ${m.completed ? "bg-emerald-400" : m.locked ? "bg-slate-300 dark:bg-gray-700" : "bg-blue-400"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-slate-700 dark:text-gray-300 truncate">{m.title}</div>
                      </div>
                      <div className="text-xs text-slate-400 dark:text-gray-600 shrink-0">
                        {m.completed ? "✓ Done" : m.locked ? "Locked" : `${m.watchedPercent}%`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quizzes */}
            <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-gray-800 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Quizzes</h2>
              <p className="text-slate-500 dark:text-gray-400 text-sm mb-5">Bi-weekly and module quizzes to earn points</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-[#0f0f0f] p-5">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">Bi-weekly Quiz</div>
                  <div className="text-xs text-slate-400 dark:text-gray-500 mt-1 mb-4">~20 questions · Earn bonus points</div>
                  <button onClick={() => navigate("/quiz/biweekly")} className="w-full px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-[#141414] border border-slate-200 dark:border-gray-800 text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-[#171717]">
                    Start quiz
                  </button>
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-[#0f0f0f] p-5">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">Module Quiz</div>
                  <div className="text-xs text-slate-400 dark:text-gray-500 mt-1 mb-4">~10 questions · Unlock next module</div>
                  <button onClick={() => navigate("/modules")} className="w-full px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-[#141414] border border-slate-200 dark:border-gray-800 text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-[#171717]">
                    Go to modules
                  </button>
                </div>
              </div>
            </div>

            {/* Redemption History */}
            {redemptions.length > 0 && (
              <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-gray-800 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Redemption History</h2>
                <div className="space-y-3">
                  {redemptions.map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#0f0f0f] border border-slate-200 dark:border-gray-800">
                      <div>
                        <div className="text-sm font-medium text-slate-800 dark:text-gray-200">{r.title}</div>
                        <div className="text-xs text-slate-400 dark:text-gray-500">{new Date(r.redeemedAt).toLocaleDateString()}</div>
                      </div>
                      <span className="text-sm font-semibold text-red-500 dark:text-red-400">-{r.pointsSpent} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Right Sidebar */}
          <aside className="lg:col-span-4 space-y-6">
            <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-gray-800 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-5">Your Stats</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-[#0f0f0f] p-4">
                  <div className="text-xs text-slate-400 dark:text-gray-500">Points</div>
                  <div className="text-2xl font-semibold text-slate-900 dark:text-white mt-1">{progress.points || 0}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-[#0f0f0f] p-4">
                  <div className="text-xs text-slate-400 dark:text-gray-500">Streak</div>
                  <div className="text-2xl font-semibold text-slate-900 dark:text-white mt-1">{progress.streakDays || 0}</div>
                  <div className="text-xs text-slate-400 dark:text-gray-600 mt-0.5">days</div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-gray-800 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Rewards</h2>
              <p className="text-slate-500 dark:text-gray-400 text-sm mb-4">Earn points from modules, quizzes, and streaks</p>
              <button onClick={() => navigate("/rewards")} className="w-full px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-[#141414] border border-slate-200 dark:border-gray-800 text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-[#171717]">
                View rewards store
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
