import { useNavigate } from "react-router-dom";

export default function LearningModules({ modules = [], onContinue }) {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Learning Modules</h2>
        <p className="text-slate-500 dark:text-gray-400 mt-1">Complete modules to earn points and unlock rewards</p>
      </div>

      {modules.map((m) => {
        const pct = Math.round((m.progress ?? 0) * 100);
        return (
          <div
            key={m.id}
            className={`bg-white dark:bg-[#121212] border border-slate-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm ${m.locked ? "opacity-60" : ""}`}
          >
            <div className="flex items-start justify-between gap-6">
              <div className="min-w-0 w-full">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{m.title}</h3>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-300/10 border border-emerald-200 dark:border-emerald-300/20 px-2 py-1 rounded-full">
                    +{m.points}
                  </span>
                  {m.completed && (
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-300/10 border border-emerald-200 dark:border-emerald-300/20 px-2 py-1 rounded-full">
                      Completed
                    </span>
                  )}
                  {m.locked && (
                    <span className="text-xs font-semibold text-slate-500 dark:text-gray-300 bg-slate-100 dark:bg-gray-300/10 border border-slate-200 dark:border-gray-300/20 px-2 py-1 rounded-full">
                      Locked
                    </span>
                  )}
                </div>

                <p className="text-slate-500 dark:text-gray-400 text-sm mb-4">{m.desc}</p>

                <div className="flex items-center justify-between text-xs text-slate-400 dark:text-gray-500 mb-2">
                  <span>Progress</span><span>{pct}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-[#0f0f0f] border border-slate-200 dark:border-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>

                <button
                  disabled={m.locked || m.completed}
                  onClick={() => m.locked || m.completed ? null : onContinue(m.id)}
                  className={`mt-5 w-full px-5 py-3 rounded-xl font-semibold transition
                    ${m.locked || m.completed
                      ? "bg-slate-100 dark:bg-[#1a1a1a] text-slate-400 dark:text-gray-400 cursor-not-allowed border border-slate-200 dark:border-gray-800"
                      : "bg-blue-500 text-white hover:bg-blue-600"}`}
                >
                  {m.completed ? "Completed ✓" : m.locked ? "🔒 Locked" : "Continue Module"}
                </button>
              </div>

              <div className="hidden sm:flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-100 dark:bg-[#0f0f0f] text-slate-500 dark:text-gray-300 shrink-0">
                {m.completed ? "✅" : m.locked ? "🔒" : "📘"}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
