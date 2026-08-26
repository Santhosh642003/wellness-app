import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardNav from "../components/DashboardNav";
import DailyRewardCard from "../components/DailyRewardCard";
import LearningModules from "../components/LearningModules";
import RightSidebar from "../components/RightSidebar";
import Toast from "../components/Toast";
import Footer from "../components/Footer";
import { useAuth } from "../contexts/AuthContext";
import { users as usersApi, modules as modulesApi } from "../lib/api";
import { mapModule } from "../lib/moduleUtils";

function todayStr() {
  return new Date().toDateString();
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [points, setPoints] = useState(0);
  const [streakDays, setStreakDays] = useState(0);
  const [lastClaimDate, setLastClaimDate] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [pointsSummary, setPointsSummary] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [userData, mods, summary] = await Promise.all([
        usersApi.get(user.id),
        modulesApi.list(),
        usersApi.pointsSummary(user.id).catch(() => null),
      ]);
      const p = userData.progress || {};
      setPoints(p.points || 0);
      setStreakDays(p.streakDays || 0);
      setLastClaimDate(p.lastClaimDate || null);
      setModules((mods || []).map(mapModule));
      setPointsSummary(summary);
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const claimedToday = lastClaimDate
    ? new Date(lastClaimDate).toDateString() === todayStr()
    : false;

  const claimDailyReward = async () => {
    if (!user?.id || claimedToday) return;
    try {
      const result = await usersApi.dailyClaim(user.id);
      setPoints(result.totalPoints);
      setStreakDays(result.streakDays);
      setLastClaimDate(new Date().toISOString());
      setToast(`✅ Claimed +${result.pointsEarned} points!`);
    } catch (err) {
      if (err.status === 409) setToast("Already claimed today");
      else setToast("Could not claim reward — try again");
    }
  };

  const continueModule = (moduleId) => {
    const m = modules.find((x) => x.id === moduleId);
    if (!m) return;
    if (m.locked) { setToast("🔒 Complete the previous module first"); return; }
    navigate(`/modules/${m.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-page)]">
        <div className="text-[var(--text-muted)] animate-pulse">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-page)" }}>
      <DashboardNav points={points} streakDays={streakDays} initials={user?.initials || "?"} avatarUrl={user?.avatarUrl} />

      <main id="main-content" className="flex-1 max-w-7xl mx-auto w-full px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <section className="lg:col-span-8 space-y-8">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">
              <span className="text-blue-500">Welcome back,</span>{" "}
              <span className="text-emerald-500 dark:text-emerald-300">{user?.name || "Student"}!</span>
            </h1>
            <p className="text-slate-600 dark:text-gray-400 mt-2">
              Ready to learn and earn exciting rewards?
            </p>
          </div>

          <DailyRewardCard
            claimedToday={claimedToday}
            onClaim={claimDailyReward}
            lastClaimDate={lastClaimDate}
          />

          <LearningModules modules={modules} onContinue={continueModule} />

          {/* Points earning caps */}
          {pointsSummary && pointsSummary.semesterLabel && (
            <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-gray-800 rounded-2xl p-6">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
                Points Earning — {pointsSummary.semesterLabel}
              </h2>
              <p className="text-xs text-slate-600 dark:text-gray-500 mb-4">How much you can still earn from each source this semester</p>
              <div className="space-y-3">
                {pointsSummary.sources.filter(s => s.scope === 'semester').map((s) => (
                  <div key={s.source}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 dark:text-gray-400">{s.label}</span>
                      <span className="text-slate-600 dark:text-gray-500">{s.earned}/{s.cap} pts</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 dark:bg-gray-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${s.headroom === 0 ? 'bg-slate-300 dark:bg-gray-600' : 'bg-gradient-to-r from-blue-500 to-emerald-400'}`}
                        style={{ width: `${Math.min(100, (s.earned / s.cap) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <aside className="lg:col-span-4">
          <RightSidebar points={points} streakDays={streakDays} lastClaimDate={lastClaimDate} />
        </aside>
      </main>

      <Toast message={toast} />
      <Footer />
    </div>
  );
}
