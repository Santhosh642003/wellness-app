import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardNav from "../components/DashboardNav";
import Toast from "../components/Toast";
import Footer from "../components/Footer";
import { useAuth } from "../contexts/AuthContext";
import { modules as modulesApi, users as usersApi, bookmarks as bookmarksApi } from "../lib/api";
import { mapModule } from "../lib/moduleUtils";

const CATEGORY_COLORS = {
  Foundations: { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-600 dark:text-blue-400", dot: "bg-blue-500" },
  HPV:         { bg: "bg-violet-500/10", border: "border-violet-500/20", text: "text-violet-600 dark:text-violet-400", dot: "bg-violet-500" },
  MenB:        { bg: "bg-rose-500/10", border: "border-rose-500/20", text: "text-rose-600 dark:text-rose-400", dot: "bg-rose-500" },
  Bonus:       { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500" },
  General:     { bg: "bg-teal-500/10", border: "border-teal-500/20", text: "text-teal-600 dark:text-teal-400", dot: "bg-teal-500" },
};
const DEFAULT_COLOR = { bg: "bg-slate-100 dark:bg-white/5", border: "border-slate-200 dark:border-gray-700", text: "text-slate-500 dark:text-gray-400", dot: "bg-slate-400" };
function getColor(category) { return CATEGORY_COLORS[category] || DEFAULT_COLOR; }

const CATEGORY_GRADIENTS = {
  Foundations: "from-blue-600 to-indigo-700",
  HPV:         "from-violet-600 to-purple-800",
  MenB:        "from-rose-500 to-red-700",
  Bonus:       "from-amber-500 to-orange-600",
  General:     "from-teal-500 to-emerald-700",
  default:     "from-slate-600 to-slate-800",
};
function getThumbnailGrad(category) { return CATEGORY_GRADIENTS[category] || CATEGORY_GRADIENTS.default; }

// Find the first chapter index that is not yet fully watched (for resume)
function resumeChapterIdx(m) {
  if (!m.videos || m.videos.length <= 1) return 0;
  for (let i = 0; i < m.videos.length; i++) {
    if ((m.videoProgress[String(i)] ?? 0) < 80) return i;
  }
  return 0;
}

function StatusBadge({ completed, locked, watchedPct, quizPassed }) {
  if (completed) return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-emerald-600 dark:text-emerald-400">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
      Completed
    </span>
  );
  if (locked) return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-gray-700 text-slate-400 dark:text-gray-500">
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
      Locked
    </span>
  );
  if (quizPassed) return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-400/10 border border-blue-400/20 text-blue-600 dark:text-blue-400">Quiz Passed</span>
  );
  if (watchedPct > 0) return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-400/10 border border-orange-400/20 text-orange-600 dark:text-orange-400">In Progress</span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-gray-700 text-slate-400 dark:text-gray-500">Not Started</span>
  );
}

function BookmarkButton({ moduleId, bookmarked, onToggle }) {
  const [busy, setBusy] = useState(false);
  const handleClick = async (e) => {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try { await onToggle(moduleId, bookmarked); } finally { setBusy(false); }
  };
  return (
    <button
      onClick={handleClick}
      title={bookmarked ? "Remove bookmark" : "Bookmark this module"}
      className={`shrink-0 h-7 w-7 rounded-lg flex items-center justify-center border transition-all
        ${bookmarked
          ? "bg-yellow-400/20 border-yellow-400/40 text-yellow-500"
          : "bg-white/80 dark:bg-[#1a1a1a]/80 border-slate-200 dark:border-gray-700 text-slate-400 dark:text-gray-500 hover:text-yellow-500 hover:border-yellow-400/40"}`}
    >
      <svg className="w-3.5 h-3.5" fill={bookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
    </button>
  );
}

function ModuleThumbnail({ m, gradient, showPlayHover = true }) {
  return (
    <div className="relative aspect-video overflow-hidden bg-slate-900">
      {m.thumbnailUrl ? (
        <img src={m.thumbnailUrl} alt={m.title} className="w-full h-full object-cover" loading="lazy" />
      ) : (
        <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          <span className="text-7xl font-black text-white/15 select-none">{m.orderIndex + 1}</span>
        </div>
      )}

      {/* Lock overlay */}
      {m.locked && (
        <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
          <svg className="w-8 h-8 text-white/60" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
          </svg>
        </div>
      )}

      {/* Completion badge */}
      {m.completed && (
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
          Done
        </div>
      )}

      {/* Video count badge */}
      {m.videoCount > 1 && !m.locked && (
        <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
          {m.videoCount} videos
        </div>
      )}

      {/* Watch progress bar at bottom of thumbnail */}
      {!m.locked && !m.completed && m.watchedPct > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/40">
          <div className="h-full bg-gradient-to-r from-blue-400 to-emerald-400 transition-all" style={{ width: `${m.watchedPct}%` }} />
        </div>
      )}
      {m.completed && (
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-emerald-400" />
      )}

      {/* Play hover overlay */}
      {showPlayHover && !m.locked && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <div className="h-12 w-12 rounded-full bg-white/90 shadow-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-slate-800 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>
      )}
    </div>
  );
}

function ModuleCard({ m, index, onNavigate, bookmarked, onBookmarkToggle, prevModuleTitle = null }) {
  const [chaptersExpanded, setChaptersExpanded] = useState(false);
  const color = getColor(m.category);
  const gradient = getThumbnailGrad(m.category);
  const pct = m.watchedPct;
  const isMultiVideo = m.videoCount > 1;

  const handleCardClick = () => { if (!m.locked) onNavigate(m.id, resumeChapterIdx(m)); };

  return (
    <div
      className={`group relative bg-white dark:bg-[#121212] border rounded-2xl overflow-hidden shadow-sm transition-all duration-200
        ${m.locked
          ? "border-slate-200 dark:border-gray-800 cursor-not-allowed"
          : m.completed
          ? "border-emerald-400/30 cursor-pointer hover:shadow-md hover:border-emerald-400/50"
          : "border-slate-200 dark:border-gray-800 cursor-pointer hover:border-blue-400/40 hover:shadow-lg"}`}
      onClick={handleCardClick}
    >
      <ModuleThumbnail m={m} gradient={gradient} />

      {/* Card body */}
      <div className="p-4" onClick={(e) => e.stopPropagation()}>
        {/* Category + points + bookmark row */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${color.bg} ${color.border} ${color.text}`}>
              {m.category}
            </span>
            <StatusBadge completed={m.completed} locked={m.locked} watchedPct={pct} quizPassed={m.quizPassed} />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-bold text-yellow-600 dark:text-yellow-300 px-1.5 py-0.5 rounded-full bg-yellow-400/10 border border-yellow-400/20 whitespace-nowrap">
              +{m.points} pts
            </span>
            {!m.locked && <BookmarkButton moduleId={m.id} bookmarked={bookmarked} onToggle={onBookmarkToggle} />}
          </div>
        </div>

        {/* Title */}
        <h3 className={`font-semibold text-sm leading-snug mb-1 line-clamp-2 ${m.locked ? "text-slate-400 dark:text-gray-600" : "text-slate-900 dark:text-white"}`}>
          {m.title}
        </h3>

        {/* Meta */}
        <div className="text-[10px] text-slate-400 dark:text-gray-500 mb-3">
          {m.mins} min
          {isMultiVideo ? ` · ${m.videoCount} chapters` : ""}
          {m.documentCount > 0 ? ` · ${m.documentCount} resource${m.documentCount > 1 ? "s" : ""}` : ""}
        </div>

        {/* Lock message */}
        {m.locked && (
          <p className="text-[11px] text-slate-400 dark:text-gray-500 mb-3">
            {prevModuleTitle ? `Complete "${prevModuleTitle}" to unlock` : "Complete the previous module to unlock"}
          </p>
        )}

        {/* Progress bar (not locked, has progress) */}
        {!m.locked && (pct > 0 || m.completed) && (
          <div className="mb-3">
            <div className="flex justify-between text-[10px] mb-1">
              <span className="text-slate-400 dark:text-gray-500">{m.completed ? "Completed" : "In progress"}</span>
              <span className={m.completed ? "text-emerald-500 font-semibold" : "text-slate-500 dark:text-gray-400"}>
                {m.completed ? "100%" : `${pct}%`}
              </span>
            </div>
            <div className="h-1 w-full bg-slate-100 dark:bg-[#0f0f0f] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${m.completed ? "bg-gradient-to-r from-emerald-400 to-teal-400" : "bg-gradient-to-r from-blue-500 to-emerald-400"}`}
                style={{ width: `${m.completed ? 100 : pct}%` }}
              />
            </div>
          </div>
        )}

        {/* CTA */}
        <button
          disabled={m.locked}
          onClick={(e) => { e.stopPropagation(); if (!m.locked) onNavigate(m.id, resumeChapterIdx(m)); }}
          className={`w-full px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200
            ${m.locked
              ? "bg-slate-100 dark:bg-[#1a1a1a] text-slate-400 dark:text-gray-600 cursor-not-allowed border border-slate-200 dark:border-gray-800"
              : m.completed
              ? "bg-emerald-400/10 border border-emerald-400/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-400/20"
              : "bg-gradient-to-r from-blue-500 to-emerald-400 text-white hover:opacity-90 shadow-sm"}`}
        >
          {m.locked
            ? "🔒 Locked"
            : m.completed
            ? "Rewatch"
            : pct > 0
            ? `Continue · ${pct}%`
            : isMultiVideo
            ? `Start · ${m.videoCount} chapters`
            : "Start"}
        </button>

        {/* Chapter list toggle (multi-video, non-locked) */}
        {isMultiVideo && !m.locked && (
          <div className="mt-2">
            <button
              onClick={(e) => { e.stopPropagation(); setChaptersExpanded((v) => !v); }}
              className="w-full flex items-center justify-center gap-1 text-[11px] text-slate-400 dark:text-gray-600 hover:text-slate-600 dark:hover:text-gray-400 transition py-1"
            >
              {chaptersExpanded ? "Hide" : "Show"} chapters
              <svg className={`w-3 h-3 transition-transform duration-200 ${chaptersExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {chaptersExpanded && (
              <div className="mt-1 border-t border-slate-100 dark:border-gray-800/60 pt-2 space-y-1">
                {m.videos.map((video, idx) => {
                  const vPct = m.videoProgress[String(idx)] ?? 0;
                  const done = vPct >= 80 || m.completed;
                  return (
                    <div
                      key={video.id || idx}
                      onClick={(e) => { e.stopPropagation(); onNavigate(m.id, idx); }}
                      className="flex items-center gap-2 text-[11px] py-0.5 cursor-pointer group/ch"
                    >
                      <div className={`shrink-0 h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-bold transition-colors
                        ${done ? "bg-emerald-400 text-white" : vPct > 0 ? "bg-blue-400 text-white" : "bg-slate-200 dark:bg-gray-700 text-slate-500 dark:text-gray-400"}`}>
                        {done ? "✓" : idx + 1}
                      </div>
                      <span className="flex-1 truncate text-slate-500 dark:text-gray-400 group-hover/ch:text-blue-500 dark:group-hover/ch:text-blue-400 transition-colors">
                        {video.title || `Chapter ${idx + 1}`}
                      </span>
                      {!done && vPct > 0 && <span className="text-blue-400 shrink-0">{vPct}%</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Compact card used in "Continue Watching" horizontal row
function ContinueCard({ m, onNavigate }) {
  const gradient = getThumbnailGrad(m.category);
  const pct = m.watchedPct;
  const chIdx = resumeChapterIdx(m);
  const chapterLabel = m.videoCount > 1 ? `Ch ${chIdx + 1} of ${m.videoCount}` : null;

  return (
    <div
      className="group shrink-0 w-52 bg-white dark:bg-[#121212] border border-slate-200 dark:border-gray-800 rounded-xl overflow-hidden cursor-pointer hover:border-blue-400/40 hover:shadow-md transition-all duration-200"
      onClick={() => onNavigate(m.id, chIdx)}
    >
      {/* Mini thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-slate-900">
        {m.thumbnailUrl ? (
          <img src={m.thumbnailUrl} alt={m.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradient}`} />
        )}
        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
          <div className="h-full bg-blue-400 transition-all" style={{ width: `${pct}%` }} />
        </div>
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <div className="h-9 w-9 rounded-full bg-white/90 flex items-center justify-center shadow">
            <svg className="w-4 h-4 text-slate-800 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>
      </div>
      <div className="p-3">
        <p className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-1 mb-0.5">{m.title}</p>
        <p className="text-[10px] text-blue-500 dark:text-blue-400 font-medium">
          {pct}% watched{chapterLabel ? ` · ${chapterLabel}` : ""}
        </p>
      </div>
    </div>
  );
}

export default function Modules() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [modules, setModules] = useState([]);
  const [points, setPoints] = useState(0);
  const [lifetimeEarned, setLifetimeEarned] = useState(0);
  const [streakDays, setStreakDays] = useState(0);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());
  const [showBookmarked, setShowBookmarked] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  const loadModules = useCallback(async () => {
    try {
      const [mods, userData, bmarks, summary] = await Promise.all([
        modulesApi.list(),
        user?.id ? usersApi.get(user.id) : Promise.resolve(null),
        user?.id ? bookmarksApi.list(user.id).catch(() => []) : Promise.resolve([]),
        user?.id ? usersApi.pointsSummary(user.id).catch(() => null) : Promise.resolve(null),
      ]);
      setModules((mods || []).map(mapModule));
      setBookmarkedIds(new Set((bmarks || []).map((b) => b.moduleId)));
      if (userData?.progress) {
        setPoints(userData.progress.points || 0);
        setStreakDays(userData.progress.streakDays || 0);
      }
      if (summary != null) setLifetimeEarned(summary.lifetimeEarned ?? 0);
    } catch (err) {
      console.error("Failed to load modules", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const handleBookmarkToggle = useCallback(async (moduleId, currentlyBookmarked) => {
    try {
      if (currentlyBookmarked) {
        await bookmarksApi.remove(user.id, moduleId);
        setBookmarkedIds((prev) => { const s = new Set(prev); s.delete(moduleId); return s; });
        setToast("Bookmark removed");
      } else {
        await bookmarksApi.add(user.id, moduleId);
        setBookmarkedIds((prev) => new Set([...prev, moduleId]));
        setToast("Module bookmarked");
      }
    } catch {
      setToast("Failed to update bookmark");
    }
  }, [user?.id]);

  const handleNavigate = useCallback((moduleId, chapterIdx = 0) => {
    navigate(`/modules/${moduleId}${chapterIdx > 0 ? `?chapter=${chapterIdx}` : ""}`);
  }, [navigate]);

  useEffect(() => { loadModules(); }, [loadModules]);

  const categories = useMemo(() => {
    const cats = [...new Set(modules.map((m) => m.category))].sort();
    return ["All", ...cats];
  }, [modules]);

  const continueWatching = useMemo(() =>
    modules
      .filter((m) => !m.completed && !m.locked && m.watchedPct > 0)
      .sort((a, b) => b.watchedPct - a.watchedPct)
      .slice(0, 8),
    [modules]
  );

  const filtered = useMemo(() => {
    let list = modules;
    if (showBookmarked) list = list.filter((m) => bookmarkedIds.has(m.id));
    if (activeCategory !== "All") list = list.filter((m) => m.category === activeCategory);
    return list;
  }, [modules, activeCategory, showBookmarked, bookmarkedIds]);

  const stats = useMemo(() => {
    const total = modules.length;
    const completed = modules.filter((m) => m.completed).length;
    const inProgress = modules.filter((m) => !m.completed && !m.locked && m.watchedPct > 0).length;
    const locked = modules.filter((m) => m.locked).length;
    const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
    const nextUp = modules.find((m) => !m.completed && !m.locked);
    return { total, completed, inProgress, locked, pct, nextUp };
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
      <DashboardNav points={points} streakDays={streakDays} initials={user?.initials || "?"} avatarUrl={user?.avatarUrl} />

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
              onClick={() => handleNavigate(stats.nextUp.id, resumeChapterIdx(stats.nextUp))}
              className="shrink-0 text-sm px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-emerald-400 text-white font-semibold hover:opacity-90 transition"
            >
              Continue Learning →
            </button>
          )}
        </div>

        {/* ── Continue Watching ────────────────────────────────────────────── */}
        {continueWatching.length > 0 && (
          <section>
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <span className="h-5 w-1 rounded-full bg-blue-500 inline-block" />
              Continue Watching
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-1 scroll-pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {continueWatching.map((m) => (
                <ContinueCard key={m.id} m={m} onNavigate={handleNavigate} />
              ))}
            </div>
          </section>
        )}

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Completed", value: stats.completed, total: stats.total, icon: "✅", color: "text-emerald-600 dark:text-emerald-400" },
            { label: "In Progress", value: stats.inProgress, total: null, icon: "▶", color: "text-blue-600 dark:text-blue-400" },
            { label: "Locked", value: stats.locked, total: null, icon: "🔒", color: "text-slate-500 dark:text-gray-400" },
            { label: "Points Earned", value: lifetimeEarned, total: null, icon: "⭐", color: "text-yellow-600 dark:text-yellow-300" },
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
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-700 dark:text-gray-300">Overall Progress</span>
            <span className="text-sm font-bold text-slate-900 dark:text-white">{stats.pct}%</span>
          </div>
          <div className="h-2.5 w-full bg-slate-100 dark:bg-[#0f0f0f] rounded-full overflow-hidden">
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

        {/* Filters */}
        <div className="flex gap-2 flex-wrap items-center">
          <button
            onClick={() => setShowBookmarked((v) => !v)}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all flex items-center gap-1.5
              ${showBookmarked
                ? "bg-yellow-400/10 border-yellow-400/30 text-yellow-600 dark:text-yellow-300"
                : "bg-white dark:bg-[#121212] border-slate-200 dark:border-gray-800 text-slate-500 dark:text-gray-400 hover:border-yellow-400/30"}`}
          >
            <svg className="w-3 h-3" fill={showBookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            Bookmarked <span className="opacity-60">({bookmarkedIds.size})</span>
          </button>

          {categories.length > 2 && categories.map((cat) => {
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
                    : "bg-white dark:bg-[#121212] border-slate-200 dark:border-gray-800 text-slate-500 dark:text-gray-400 hover:border-slate-300 dark:hover:border-gray-700"}`}
              >
                {cat} <span className="opacity-60">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Module grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400 dark:text-gray-500">
            <div className="text-4xl mb-3">{showBookmarked ? "🔖" : "📚"}</div>
            <p className="font-medium">{showBookmarked ? "No bookmarks yet" : "No modules yet"}</p>
            <p className="text-sm mt-1">{showBookmarked ? "Click the bookmark icon on any module to save it here" : "Check back soon — new modules are coming!"}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((m) => {
              const prevMod = m.locked
                ? modules.find((mod) => mod.orderIndex === m.orderIndex - 1)
                : null;
              return (
                <ModuleCard
                  key={m.id}
                  m={m}
                  index={modules.indexOf(m)}
                  onNavigate={handleNavigate}
                  bookmarked={bookmarkedIds.has(m.id)}
                  onBookmarkToggle={handleBookmarkToggle}
                  prevModuleTitle={prevMod?.title ?? null}
                />
              );
            })}
          </div>
        )}
      </main>

      <Toast message={toast} />
      <Footer />
    </div>
  );
}
