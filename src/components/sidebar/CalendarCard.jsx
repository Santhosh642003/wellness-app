import { useEffect, useMemo, useState } from "react";
import { users as usersApi } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function toYMD(date) {
  return date.toISOString().slice(0, 10);
}

export default function CalendarCard({ streakDays = 0, lastClaimDate = null }) {
  const { user } = useAuth();
  const [activitySet, setActivitySet] = useState(new Set());
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  useEffect(() => {
    if (!user?.id) return;
    usersApi.activity(user.id)
      .then((dates) => setActivitySet(new Set(dates)))
      .catch(console.error);
  }, [user?.id]);

  // Build the set of streak days (consecutive days ending at lastClaimDate)
  const streakDaySet = useMemo(() => {
    if (!lastClaimDate || streakDays <= 0) return new Set();
    const s = new Set();
    const base = new Date(lastClaimDate);
    base.setHours(0, 0, 0, 0);
    for (let i = 0; i < streakDays; i++) {
      const d = new Date(base);
      d.setDate(d.getDate() - i);
      s.add(toYMD(d));
    }
    return s;
  }, [lastClaimDate, streakDays]);

  const today = toYMD(new Date());
  const { year, month } = viewDate;

  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const totalDays = new Date(year, month + 1, 0).getDate();

  const cells = Array.from({ length: 42 }).map((_, i) => {
    const dayNum = i - firstDay + 1;
    const valid = dayNum >= 1 && dayNum <= totalDays;
    const ymd = valid ? `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}` : null;
    return {
      key: i, dayNum, valid,
      isToday: ymd === today,
      isStreak: ymd ? streakDaySet.has(ymd) : false,
      isActive: ymd ? activitySet.has(ymd) : false,
    };
  });

  const prevMonth = () => setViewDate(({ year, month }) =>
    month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 });
  const nextMonth = () => setViewDate(({ year, month }) =>
    month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 });
  const isCurrentMonth = viewDate.year === new Date().getFullYear() && viewDate.month === new Date().getMonth();

  return (
    <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
          {MONTH_NAMES[month]} {year}
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="h-6 w-6 rounded-lg flex items-center justify-center text-slate-400 dark:text-gray-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-700 dark:hover:text-gray-200 transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          {!isCurrentMonth && (
            <button
              onClick={() => { const n = new Date(); setViewDate({ year: n.getFullYear(), month: n.getMonth() }); }}
              className="text-[10px] px-1.5 py-0.5 rounded text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition"
            >
              Today
            </button>
          )}
          <button
            onClick={nextMonth}
            className="h-6 w-6 rounded-lg flex items-center justify-center text-slate-400 dark:text-gray-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-700 dark:hover:text-gray-200 transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1 text-[10px] text-slate-400 dark:text-gray-500 mb-1 text-center">
        {DAY_LABELS.map((d, i) => <div key={i}>{d}</div>)}
      </div>

      {/* Calendar cells */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c) => (
          <div key={c.key} className="flex justify-center">
            <div
              className={[
                "h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-medium border transition-all",
                !c.valid
                  ? "border-transparent opacity-0 pointer-events-none"
                  : c.isToday
                  ? "ring-2 ring-blue-400/60 ring-offset-1 dark:ring-offset-[#121212] border-blue-400/30 text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-500/10"
                  : c.isStreak
                  ? "bg-emerald-400/15 border-emerald-400/30 text-emerald-600 dark:text-emerald-300"
                  : c.isActive
                  ? "bg-yellow-400/15 border-yellow-400/30 text-yellow-700 dark:text-yellow-300"
                  : "border-slate-100 dark:border-gray-800 text-slate-400 dark:text-gray-500",
              ].join(" ")}
            >
              {c.valid ? c.dayNum : ""}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-3 flex-wrap text-[10px] text-slate-400 dark:text-gray-500">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/50 border border-emerald-400/40" />
          Streak
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/50 border border-yellow-400/40" />
          Activity
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-400/30 border border-blue-400/40" />
          Today
        </span>
      </div>
    </div>
  );
}
