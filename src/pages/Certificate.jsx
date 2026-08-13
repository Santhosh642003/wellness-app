import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Award, Download } from "lucide-react";
import DashboardNav from "../components/DashboardNav";
import Footer from "../components/Footer";
import { useAuth } from "../contexts/AuthContext";
import { users as usersApi } from "../lib/api";

export default function Certificate() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const loadData = useCallback(async () => {
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

  useEffect(() => { loadData(); }, [loadData]);

  const completedCount = profileData?.moduleProgresses?.filter((m) => m.completed).length ?? 0;
  const totalModules = profileData?.moduleProgresses?.length ?? 0;
  const points = profileData?.progress?.points ?? 0;
  const allComplete = totalModules > 0 && completedCount === totalModules;

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-page)" }}>
        <div className="h-8 w-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-page)" }}>
      <DashboardNav points={points} streakDays={profileData?.progress?.streakDays ?? 0} initials={user?.initials || "?"} avatarUrl={user?.avatarUrl} />

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center">
              <Award size={20} className="text-yellow-500" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Progress Certificate</h1>
              <p className="text-sm text-slate-500 dark:text-gray-400">Your NJIT Campus Wellness achievement</p>
            </div>
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-blue-500 text-white hover:bg-blue-600 transition print:hidden"
          >
            <Download size={15} />
            Save / Print
          </button>
        </div>

        {!allComplete && (
          <div className="mb-6 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl px-5 py-4">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
              You've completed {completedCount} of {totalModules} modules.
              Finish all modules to earn your full certificate!
            </p>
            <div className="mt-2 h-2 rounded-full bg-amber-100 dark:bg-amber-900/30 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-yellow-400 transition-all"
                style={{ width: `${totalModules > 0 ? Math.round((completedCount / totalModules) * 100) : 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Certificate card */}
        <div
          id="certificate"
          className="bg-white dark:bg-[#0f0f0f] border-2 border-yellow-400/40 rounded-3xl p-10 shadow-xl text-center relative overflow-hidden"
        >
          {/* Background decoration */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
            <div className="absolute top-0 left-0 w-64 h-64 rounded-full bg-yellow-400 -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full bg-blue-400 translate-x-1/2 translate-y-1/2" />
          </div>

          {/* Header seal */}
          <div className="relative inline-flex flex-col items-center mb-6">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg mb-3">
              <Award size={36} className="text-white" />
            </div>
            <span className="text-xs tracking-[4px] uppercase text-slate-400 dark:text-gray-500 font-semibold">Certificate of Achievement</span>
          </div>

          <p className="text-slate-500 dark:text-gray-400 text-sm mb-2">This certifies that</p>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{profileData?.name || user?.name || "—"}</h2>
          <p className="text-slate-500 dark:text-gray-400 text-sm mb-6">
            {profileData?.campus || "NJIT Newark"} · {profileData?.role || "Student"}
            {profileData?.major ? ` · ${profileData.major}` : ""}
          </p>

          <div className="relative bg-slate-50 dark:bg-white/5 rounded-2xl px-8 py-6 mb-6 border border-slate-200 dark:border-gray-800">
            <p className="text-slate-600 dark:text-gray-300 text-sm leading-relaxed">
              has successfully completed{" "}
              <span className="font-bold text-slate-900 dark:text-white">{completedCount}</span>
              {totalModules > 0 && <span className="text-slate-400 dark:text-gray-500"> of {totalModules}</span>}{" "}
              wellness modules on the NJIT Campus Wellness platform, demonstrating commitment to health education and personal well-being.
            </p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: "Modules Completed", value: completedCount },
              { label: "Points Earned", value: points.toLocaleString() },
              { label: "Day Streak", value: profileData?.progress?.streakDays ?? 0 },
            ].map((s) => (
              <div key={s.label} className="bg-slate-50 dark:bg-white/5 rounded-xl p-4 border border-slate-200 dark:border-gray-800">
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{s.value}</div>
                <div className="text-[11px] text-slate-400 dark:text-gray-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-slate-400 dark:text-gray-600">
            <span>NJIT Campus Wellness Center</span>
            <span>{today}</span>
          </div>

          {allComplete && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-emerald-600 dark:text-emerald-400 text-sm font-semibold">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              All Modules Completed
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3 justify-center print:hidden">
          <button
            onClick={() => navigate("/modules")}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-[#141414] border border-slate-200 dark:border-gray-800 text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-[#171717] transition"
          >
            ← Back to Modules
          </button>
          {!allComplete && (
            <button
              onClick={() => navigate("/modules")}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-500 to-emerald-400 text-white hover:opacity-90 transition"
            >
              Continue Learning →
            </button>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
