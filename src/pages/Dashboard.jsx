import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import DashboardNav from "../components/DashboardNav";
import DailyRewardCard from "../components/DailyRewardCard";
import LearningModules from "../components/LearningModules";
import RightSidebar from "../components/RightSidebar";
import Toast from "../components/Toast";
import Footer from "../components/Footer";

import {
  DASHBOARD_STORAGE_KEY,
  INITIAL_DASHBOARD_STATE,
} from "../data/dashboardInitialState.js";

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isoToDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function diffDays(aISO, bISO) {
  const a = isoToDate(aISO);
  const b = isoToDate(bISO);
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(INITIAL_DASHBOARD_STATE);

  // Toast
  const [toast, setToast] = useState("");
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  // Load (crash-proof merge)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DASHBOARD_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;

      setData((prev) => ({
        ...prev,
        ...parsed,
        user: {
          ...(prev.user || { name: "Santhosh", initials: "SN" }),
          ...(parsed.user || {}),
        },
        modules: Array.isArray(parsed.modules) ? parsed.modules : prev.modules,
      }));
    } catch {}
  }, []);

  // Save
  useEffect(() => {
    try {
      localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }, [data]);

  const today = todayISO();
  const claimedToday = data.lastClaimDate === today;

  const claimDailyReward = () => {
    if (claimedToday) return;

    setData((prev) => {
      const last = prev.lastClaimDate;
      let nextStreak = 1;

      if (last) {
        const gap = diffDays(today, last);
        nextStreak = gap === 1 ? prev.streakDays + 1 : 1;
      }

      return {
        ...prev,
        points: (prev.points || 0) + 5,
        streakDays: nextStreak,
        lastClaimDate: today,
      };
    });

    setToast("✅ Claimed +5 points");
  };

  // ✅ Continue Module -> Module Player route
  const continueModule = (moduleId) => {
    const m = (data.modules || []).find((x) => String(x.id) === String(moduleId));

    if (!m) {
      setToast(`⚠️ Module id not found: ${String(moduleId)}`);
      return;
    }

    if (m.locked) {
      setToast("🔒 This module is locked. Complete the previous one first.");
      return;
    }

    navigate(`/modules/${m.id}`);
  };

  const resetDemo = () => {
    try {
      localStorage.removeItem(DASHBOARD_STORAGE_KEY);
    } catch {}
    setData(INITIAL_DASHBOARD_STATE);
    setToast("🔁 Demo reset");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0b0b] text-white">
      <DashboardNav
        points={data.points || 0}
        streakDays={data.streakDays || 0}
        initials={data.user?.initials || "SN"}
      />

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <section className="lg:col-span-8 space-y-8">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1 className="text-3xl font-semibold">
                  <span className="text-blue-400">Welcome back,</span>{" "}
                  <span className="text-emerald-300">{data.user?.name || "Santhosh"}!</span>
                </h1>
                {data.user?.plan === "plus" && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full
                                   bg-gradient-to-r from-yellow-400/20 to-orange-400/20
                                   border border-yellow-400/30 text-yellow-300">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    Plus Plan
                  </span>
                )}
              </div>
              <p className="text-gray-400 mt-1">
                We’re glad to see you. Ready to learn and earn exciting rewards?
              </p>
            </div>

            <button
              onClick={resetDemo}
              className="text-sm px-4 py-2 rounded-xl border border-gray-800 bg-[#121212] hover:bg-[#151515] shrink-0"
            >
              Reset demo
            </button>
          </div>

          <DailyRewardCard
            claimedToday={claimedToday}
            onClaim={claimDailyReward}
            lastClaimDate={data.lastClaimDate}
          />

          <LearningModules modules={data.modules || []} onContinue={continueModule} />
        </section>

        <aside className="lg:col-span-4">
          <RightSidebar points={data.points || 0} streakDays={data.streakDays || 0} />
        </aside>
      </main>

      <Toast message={toast} />
      <Footer />
    </div>
  );
}
