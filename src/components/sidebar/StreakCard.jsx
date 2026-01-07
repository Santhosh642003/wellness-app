export default function StreakCard({ streakDays = 0 }) {
  const filled = Math.min(7, streakDays);
  const days = Array.from({ length: 7 }).map((_, i) => i < filled);

  return (
    <div className="bg-[#121212] border border-gray-800 rounded-2xl p-5 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Streak</h3>
        <span className="text-emerald-300">🔥</span>
      </div>

      <div className="bg-[#0f0f0f] border border-gray-800 rounded-xl p-4">
        <div className="text-3xl font-bold">
          {streakDays} <span className="text-gray-400 text-base font-semibold">days</span>
        </div>

        <div className="mt-4 flex gap-2">
          {days.map((on, idx) => (
            <div
              key={idx}
              className={`h-8 w-8 rounded-full border flex items-center justify-center text-xs
                ${on ? "bg-emerald-400/15 border-emerald-400/30 text-emerald-300" : "border-gray-800 text-gray-600"}`}
            >
              {idx + 1}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
