import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardNav from "../components/DashboardNav";
import Toast from "../components/Toast";
import Footer from "../components/Footer";
import { useAuth } from "../contexts/AuthContext";
import { modules as modulesApi } from "../lib/api";

const CATEGORY_COLORS = {
  Foundations: { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-600 dark:text-blue-400", dot: "bg-blue-500" },
  HPV: { bg: "bg-violet-500/10", border: "border-violet-500/20", text: "text-violet-600 dark:text-violet-400", dot: "bg-violet-500" },
  MenB: { bg: "bg-rose-500/10", border: "border-rose-500/20", text: "text-rose-600 dark:text-rose-400", dot: "bg-rose-500" },
  Bonus: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500" },
  General: { bg: "bg-teal-500/10", border: "border-teal-500/20", text: "text-teal-600 dark:text-teal-400", dot: "bg-teal-500" },
};

const DEFAULT_COLOR = { bg: "bg-slate-100 dark:bg-white/5", border: "border-slate-200 dark:border-gray-700", text: "text-slate-500 dark:text-gray-400", dot: "bg-slate-400" };

function getColor(category) {
  return CATEGORY_COLORS[category] || DEFAULT_COLOR;
}

function mapModule(m) {
  return {
    id: m.id,
    slug: m.slug,
    title: m.title,
    desc: m.description,
    mins: parseInt(m.duration) || 10,
    points: m.pointsValue,
    watchedPct: m.userProgress ? Math.round(m.userProgress.watchedPercent ?? 0) : 0,
    locked: m.locked,
    completed: m.userProgress?.completed ?? false,
    quizPassed: m.userProgress?.quizPassed ?? false,
    category: m.category || "General",
    orderIndex: m.orderIndex ?? 0,
    keyPoints: Array.isArray(m.keyPoints) ? m.keyPoints : [],
    videoUrl: m.videoUrl || "",
  };
}

function StatusBadge({ completed, locked, watchedPct, quizPassed }) {
  if (completed) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-emerald-600 dark:text-emerald-400">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
        Completed
      </span>
    );
  }
  if (locked) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-gray-700 text-slate-400 dark:text-gray-500">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
        </svg>
        Locked
      </span>
    );
  }
  if (quizPassed) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-400/10 border border-blue-400/20 text-blue-600 dark:text-blue-400">
        Quiz Passed
      </span>
    );
  }
  if (watchedPct > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-400/10 border border-orange-400/20 text-orange-600 dark:text-orange-400">
        In Progress
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-gray-700 text-slate-400 dark:text-gray-500">
      Not Started
    </span>
  );
}

function StepIndicator({ watchedPct, quizPassed, completed }) {
  const steps = [
    { label: "Watch", done: watchedPct >= 80 || completed },
    { label: "Quiz", done: quizPassed || completed },
    { label: "Done", done: completed },
  ];
  return (
    <div className="flex items-center gap-0.5">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center gap-0.5">
          <div className={`h-1.5 w-8 rounded-full transition-all ${s.done ? "bg-gradient-to-r from-blue-500 to-emerald-400" : "bg-slate-200 dark:bg-gray-700"}`} />
        </div>
      ))}
      <span className="ml-1.5 text-[10px] text-slate-400 dark:text-gray-500">
        {completed ? "Complete" : quizPassed ? "2/3" : watchedPct >= 80 ? "1/3" : watchedPct > 0 ? "Watching" : "0/3"}
      </span>
    </div>
  );
}

function ModuleCard({ m, index, onClick }) {
  const color = getColor(m.category);
  const isActive = !m.locked && !m.completed;
  const pct = m.watchedPct;

  return (
    <div
      className={`group relative bg-white dark:bg-[#121212] border rounded-2xl overflow-hidden shadow-sm transition-all duration-200
        ${m.locked ? "border-slate-200 dark:border-gray-800 opacity-60" : m.completed ? "border-emerald-400/30" : "border-slate-200 dark:border-gray-800 hover:border-blue-400/40 hover:shadow-md"}`}
    >
      {/* Top accent bar */}
      <div className={`h-1 w-full ${m.completed ? "bg-gradient-to-r from-emerald-400 to-teal-400" : m.locked ? "bg-slate-200 dark:bg-gray-800" : "bg-gradient-to-r from-blue-500 to-emerald-400"}`} />

      <div className="p-6">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            {/* Step number */}
            <div className={`shrink-0 h-9 w-9 rounded-xl flex items-center justify-center text-sm font-bold
              ${m.completed ? "bg-emerald-400/10 border border-emerald-400/20 text-emerald-500" : m.locked ? "bg-slate-100 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-slate-400 dark:text-gray-500" : "bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400"}`}>
              {m.completed ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : m.locked ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                </svg>
              ) : (
                index + 1
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm leading-tight">{m.title}</h3>
              </div>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {/* Category badge */}
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md border ${color.bg} ${color.border} ${color.text}`}>
                  {m.category}
                </span>
                <StatusBadge completed={m.completed} locked={m.locked} watchedPct={pct} quizPassed={m.quizPassed} />
              </div>
            </div>
          </div>

          {/* Points badge */}
          <div className="shrink-0 text-right">
            <div className="text-xs px-2.5 py-1 rounded-lg bg-yellow-400/10 border border-yellow-400/20 text-yellow-600 dark:text-yellow-300 font-bold">
              +{m.points} pts
            </div>
            <div className="text-[10px] text-slate-400 dark:text-gray-500 mt-1">{m.mins} min</div>
          </div>
        </div>

        {/* Description */}
        <p className="text-slate-500 dark:text-gray-400 text-xs leading-relaxed line-clamp-2 mb-4">{m.desc}</p>

        {/* Key points preview */}
        {m.keyPoints.length > 0 && !m.locked && (
          <div className="mb-4 space-y-1">
            {m.keyPoints.slice(0, 3).map((kp, i) => (
              <div key={i} className="flex items-start gap-2 text-[11px] text-slate-500 dark:text-gray-400">
                <div className={`mt-1 shrink-0 h-1.5 w-1.5 rounded-full ${color.dot}`} />
                <span className="leading-tight">{kp}</span>
              </div>
            ))}
            {m.keyPoints.length > 3 && (
              <div className="text-[10px] text-slate-400 dark:text-gray-500 pl-3.5">+{m.keyPoints.length - 3} more topics</div>
            )}
          </div>
        )}

        {/* Progress section */}
        {!m.locked && (
          <div className="mb-4 space-y-2">
            {/* Watch progress */}
            <div>
              <div className="flex justify-between text-[10px] text-slate-400 dark:text-gray-500 mb-1">
                <span>Video progress</span>
                <span className={pct >= 80 ? "text-emerald-500 font-semibold" : ""}>{pct}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 dark:bg-[#0f0f0f] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${pct >= 80 ? "bg-gradient-to-r from-blue-500 to-emerald-400" : "bg-blue-400"}`}
                  style={{ width: `${Math.max(pct, m.completed ? 100 : 0)}%` }}
                />
              </div>
            </div>

            {/* 3-step mini tracker */}
            <StepIndicator watchedPct={pct} quizPassed={m.quizPassed} completed={m.completed} />
          </div>
        )}

        {/* Video indicator */}
        {m.videoUrl && !m.locked && (
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-gray-500 mb-4">
            <svg className="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
            </svg>
            <span>Video available</span>
            {pct > 0 && pct < 100 && <span className="text-orange-400">• Resume at {pct}%</span>}
          </div>
        )}

        {/* CTA button */}
        <button
          disabled={m.locked}
          onClick={() => !m.locked && onClick(m)}
          className={`w-full px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
            ${m.locked
              ? "bg-slate-100 dark:bg-[#1a1a1a] text-slate-400 dark:text-gray-500 cursor-not-allowed border border-slate-200 dark:border-gray-800"
              : m.completed
              ? "bg-emerald-400/10 border border-emerald-400/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-400/20"
              : pct > 0
              ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:opacity-90 shadow-sm"
              : "bg-gradient-to-r from-blue-500 to-emerald-400 text-white hover:opacity-90 shadow-sm"
            }`}
        >
          {m.locked
            ? "🔒 Locked"
            : m.completed
            ? "Review Module"
            : pct > 0
            ? `▶ Continue — ${pct}% watched`
            : "Start Module →"}
        </button>
      </div>
    </div>
  );
}

export default function Modules() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [modules, setModules] = useState([]);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");

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

  const categories = useMemo(() => {
    const cats = [...new Set(modules.map((m) => m.category))].sort();
    return ["All", ...cats];
  }, [modules]);

  const filtered = useMemo(() => {
    if (activeCategory === "All") return modules;
    return modules.filter((m) => m.category === activeCategory);
  }, [modules, activeCategory]);

  const stats = useMemo(() => {
    const total = modules.length;
    const completed = modules.filter((m) => m.completed).length;
    const inProgress = modules.filter((m) => !m.completed && !m.locked && m.watchedPct > 0).length;
    const locked = modules.filter((m) => m.locked).length;
    const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
    const totalPoints = modules.filter((m) => m.completed).reduce((acc, m) => acc + (m.points || 0), 0);
    const nextUp = modules.find((m) => !m.completed && !m.locked);
    return { total, completed, inProgress, locked, pct, totalPoints, nextUp };
  }, [modules]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-page)" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          <p className="text-[var(--text-muted)] text-sm">Loading modules…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-page)" }}>
      <DashboardNav initials={user?.initials || "?"} />

      <main className="flex-grow max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8 w-full">

        {/* Page header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Learning Modules</h1>
            <p className="text-slate-500 dark:text-gray-400 mt-1 text-sm">
              Complete all modules to earn points and build your health knowledge
            </p>
          </div>
          {stats.nextUp && (
            <button
              onClick={() => navigate(`/modules/${stats.nextUp.id}`)}
              className="shrink-0 text-sm px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-emerald-400 text-white font-semibold hover:opacity-90 transition"
            >
              Continue Learning →
            </button>
          )}
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Completed", value: stats.completed, total: stats.total, icon: "✅", color: "text-emerald-600 dark:text-emerald-400" },
            { label: "In Progress", value: stats.inProgress, total: null, icon: "▶", color: "text-blue-600 dark:text-blue-400" },
            { label: "Locked", value: stats.locked, total: null, icon: "🔒", color: "text-slate-500 dark:text-gray-400" },
            { label: "Points Earned", value: stats.totalPoints, total: null, icon: "⭐", color: "text-yellow-600 dark:text-yellow-300" },
          ].map((s) => (
            <div key={s.label} className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm">
              <div className="text-lg mb-1">{s.icon}</div>
              <div className={`text-xl font-bold ${s.color}`}>
                {s.value}{s.total != null ? <span className="text-sm font-normal text-slate-400 dark:text-gray-500">/{s.total}</span> : ""}
              </div>
              <div className="text-[11px] text-slate-400 dark:text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Overall progress bar */}
        <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-700 dark:text-gray-300">Overall Progress</span>
            <span className="text-sm font-bold text-slate-900 dark:text-white">{stats.pct}%</span>
          </div>
          <div className="h-3 w-full bg-slate-100 dark:bg-[#0f0f0f] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-700"
              style={{ width: `${stats.pct}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-400 dark:text-gray-500 mt-2">
            <span>{stats.completed} of {stats.total} modules completed</span>
            {stats.pct === 100 && <span className="text-emerald-500 font-semibold">All done! 🎉</span>}
            {stats.pct > 0 && stats.pct < 100 && <span>{100 - stats.pct}% remaining</span>}
          </div>
        </div>

        {/* Category filter tabs */}
        {categories.length > 2 && (
          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => {
              const color = cat === "All" ? null : getColor(cat);
              const count = cat === "All" ? modules.length : modules.filter((m) => m.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all
                    ${activeCategory === cat
                      ? cat === "All"
                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white"
                        : `${color.bg} ${color.border} ${color.text} shadow-sm`
                      : "bg-white dark:bg-[#121212] border-slate-200 dark:border-gray-800 text-slate-500 dark:text-gray-400 hover:border-slate-300 dark:hover:border-gray-700"
                    }`}
                >
                  {cat} <span className="opacity-60">({count})</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Module grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400 dark:text-gray-500">
            <div className="text-4xl mb-3">📚</div>
            <p className="font-medium">No modules yet</p>
            <p className="text-sm mt-1">Check back soon — new modules are coming!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filtered.map((m, i) => (
              <ModuleCard
                key={m.id}
                m={m}
                index={modules.indexOf(m)}
                onClick={(mod) => navigate(`/modules/${mod.id}`)}
              />
            ))}
          </div>
        )}
      </main>

      <Toast message={toast} />
      <Footer />
    </div>
  );
}
