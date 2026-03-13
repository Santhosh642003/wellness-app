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

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [userData, mods] = await Promise.all([
        usersApi.get(user.id),
        modulesApi.list(),
      ]);
      const p = userData.progress || {};
      setPoints(p.points || 0);
      setStreakDays(p.streakDays || 0);
      setLastClaimDate(p.lastClaimDate || null);
      setModules((mods || []).map(mapModule));
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
      <DashboardNav points={points} streakDays={streakDays} initials={user?.initials || "SN"} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <section className="lg:col-span-8 space-y-8">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">
              <span className="text-blue-500">Welcome back,</span>{" "}
              <span className="text-emerald-500 dark:text-emerald-300">{user?.name || "Student"}!</span>
            </h1>
            <p className="text-slate-500 dark:text-gray-400 mt-2">
              Ready to learn and earn exciting rewards?
            </p>
          </div>

          <DailyRewardCard
            claimedToday={claimedToday}
            onClaim={claimDailyReward}
            lastClaimDate={lastClaimDate}
          />

          <LearningModules modules={modules} onContinue={continueModule} />
        </section>

        <aside className="lg:col-span-4">
          <RightSidebar points={points} streakDays={streakDays} />
        </aside>
      </main>

      <Toast message={toast} />
      <Footer />
    </div>
  );
}
