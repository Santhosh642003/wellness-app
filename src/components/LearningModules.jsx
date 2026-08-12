import { useNavigate } from "react-router-dom";

const CATEGORY_COLORS = {
  Foundations: { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-600 dark:text-blue-400", accent: "bg-blue-500" },
  HPV:         { bg: "bg-violet-500/10", border: "border-violet-500/20", text: "text-violet-600 dark:text-violet-400", accent: "bg-violet-500" },
  MenB:        { bg: "bg-rose-500/10", border: "border-rose-500/20", text: "text-rose-600 dark:text-rose-400", accent: "bg-rose-500" },
  Bonus:       { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-600 dark:text-amber-400", accent: "bg-amber-500" },
  General:     { bg: "bg-teal-500/10", border: "border-teal-500/20", text: "text-teal-600 dark:text-teal-400", accent: "bg-teal-500" },
};
const DEFAULT_COLOR = { bg: "bg-slate-100 dark:bg-white/5", border: "border-slate-200 dark:border-gray-700", text: "text-slate-500 dark:text-gray-400", accent: "bg-slate-400" };
function getColor(cat) { return CATEGORY_COLORS[cat] || DEFAULT_COLOR; }

function StatusBadge({ completed, locked, watchedPct }) {
  if (completed) return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-emerald-600 dark:text-emerald-400">
      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
      Done
    </span>
  );
  if (locked) return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-gray-700 text-slate-400 dark:text-gray-500">
      Locked
    </span>
  );
  if (watchedPct > 0) return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-400/10 border border-orange-400/20 text-orange-600 dark:text-orange-400">
      In Progress
    </span>
  );
  return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-gray-700 text-slate-400 dark:text-gray-500">
      Not Started
    </span>
  );
}

export default function LearningModules({ modules = [], onContinue }) {
  const navigate = useNavigate();

  const completedCount = modules.filter((m) => m.completed).length;
  const totalCount = modules.length;
  const overallPct = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  // Up to 4 slots: in-progress → next unlocked → completed (review) → locked
  const display = [
    ...modules.filter((m) => !m.locked && !m.completed && m.watchedPct > 0),
    ...modules.filter((m) => !m.locked && !m.completed && m.watchedPct === 0),
    ...modules.filter((m) => !m.locked && m.completed),
    ...modules.filter((m) => m.locked),
  ].slice(0, 4);

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Learning Modules</h2>
          <p className="text-xs text-slate-400 dark:text-gray-500 mt-0.5">
            {completedCount}/{totalCount} completed
          </p>
        </div>
        <button
          onClick={() => navigate("/modules")}
          className="shrink-0 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition"
        >
          View all →
        </button>
      </div>

      {/* Overall progress strip */}
      {totalCount > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-slate-100 dark:bg-[#0f0f0f] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-700"
              style={{ width: `${overallPct}%` }}
            />
          </div>
          <span className="shrink-0 text-[11px] font-semibold text-slate-500 dark:text-gray-400">{overallPct}%</span>
        </div>
      )}

      {/* 2-column compact card grid */}
      {display.length === 0 ? (
        <div className="text-center py-8 text-sm text-slate-400 dark:text-gray-500">No modules yet — check back soon!</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {display.map((m) => {
            const color = getColor(m.category);
            const pct = m.watchedPct;
            const isMultiVideo = m.videoCount > 1;
            return (
              <div
                key={m.id}
                onClick={() => !m.locked && onContinue(m.id)}
                className={`group relative bg-white dark:bg-[#121212] border rounded-xl overflow-hidden transition-all duration-200
                  ${m.locked
                    ? "border-slate-200 dark:border-gray-800 opacity-60"
                    : m.completed
                    ? "border-emerald-400/30 cursor-pointer hover:shadow-sm"
                    : "border-slate-200 dark:border-gray-800 cursor-pointer hover:border-blue-400/40 hover:shadow-md"}`}
              >
                {/* Category accent bar */}
                <div className={`h-0.5 w-full ${m.completed ? "bg-emerald-400" : m.locked ? "bg-slate-200 dark:bg-gray-800" : color.accent}`} />

                <div className="p-4">
                  {/* Badges + points */}
                  <div className="flex items-center gap-1.5 flex-wrap mb-2">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${color.bg} ${color.border} ${color.text}`}>
                      {m.category}
                    </span>
                    <StatusBadge completed={m.completed} locked={m.locked} watchedPct={pct} />
                    <span className="ml-auto text-[10px] font-bold text-yellow-600 dark:text-yellow-300 bg-yellow-400/10 border border-yellow-400/20 px-1.5 py-0.5 rounded-full shrink-0">
                      +{m.points}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className={`text-sm font-semibold leading-snug line-clamp-2 mb-1 ${m.locked ? "text-slate-400 dark:text-gray-600" : "text-slate-900 dark:text-white"}`}>
                    {m.title}
                  </h3>

                  {/* Duration / chapter count */}
                  <p className="text-[10px] text-slate-400 dark:text-gray-500 mb-3">
                    {m.mins} min{isMultiVideo ? ` · ${m.videoCount} chapters` : ""}
                  </p>

                  {/* Progress bar */}
                  {!m.locked && (
                    <div className="h-1 w-full bg-slate-100 dark:bg-[#0f0f0f] rounded-full overflow-hidden mb-3">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${m.completed ? "bg-emerald-400" : "bg-gradient-to-r from-blue-500 to-emerald-400"}`}
                        style={{ width: `${Math.max(pct, m.completed ? 100 : 0)}%` }}
                      />
                    </div>
                  )}

                  {/* CTA */}
                  <button
                    disabled={m.locked}
                    onClick={(e) => { e.stopPropagation(); if (!m.locked) onContinue(m.id); }}
                    className={`w-full px-3 py-2 rounded-lg text-xs font-semibold transition-all
                      ${m.locked
                        ? "bg-slate-100 dark:bg-[#1a1a1a] text-slate-400 dark:text-gray-500 cursor-not-allowed border border-slate-200 dark:border-gray-800"
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
                      ? `Start · ${m.videoCount} ch`
                      : "Start"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
