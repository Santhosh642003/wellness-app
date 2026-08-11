export default function StreakCard({ streakDays = 0 }) {
  const filled = Math.min(7, streakDays);
  const days = Array.from({ length: 7 }).map((_, i) => i < filled);

  return (
    <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-900 dark:text-white">Streak</h3>
        <span className="text-emerald-500">🔥</span>
      </div>

      <div className="bg-slate-50 dark:bg-[#0f0f0f] border border-slate-200 dark:border-gray-800 rounded-xl p-4">
        <div className="text-3xl font-bold text-slate-900 dark:text-white">
          {streakDays} <span className="text-slate-400 dark:text-gray-400 text-base font-semibold">days</span>
        </div>

        <div className="mt-4 flex gap-2">
          {days.map((on, idx) => (
            <div
              key={idx}
              className={`h-8 w-8 rounded-full border flex items-center justify-center text-xs
                ${on ? "bg-emerald-400/15 border-emerald-400/30 text-emerald-600 dark:text-emerald-300" : "border-slate-200 dark:border-gray-800 text-slate-400 dark:text-gray-600"}`}
            >
              {idx + 1}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
