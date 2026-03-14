import { useEffect, useState } from "react";
import { leaderboard as leaderboardApi } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";

const MEDAL = { 1: "🥇", 2: "🥈", 3: "🥉" };

export default function LeaderboardCard() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [myEntry, setMyEntry] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    leaderboardApi
      .list()
      .then((data) => {
        setEntries(data.slice(0, 10));
        const me = data.find((e) => e.id === user?.id);
        setMyEntry(me || null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user?.id]);

  const myRank = myEntry?.rank ?? null;
  // If the current user is outside top 10, show them below
  const showMyRow = myEntry && myEntry.rank > 10;

  return (
    <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Leaderboard</h3>
        {myRank && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-500/25">
            You #{myRank}
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 rounded-lg bg-slate-100 dark:bg-gray-800/60 animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="text-xs text-slate-400 dark:text-gray-500 text-center py-4">No data yet — be the first!</p>
      ) : (
        <div className="space-y-1">
          {entries.map((entry) => {
            const isMe = entry.id === user?.id;
            return (
              <div
                key={entry.id}
                className={[
                  "flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-sm",
                  isMe
                    ? "bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/25"
                    : "hover:bg-slate-50 dark:hover:bg-white/[0.03]",
                ].join(" ")}
              >
                {/* Rank */}
                <span className={`w-6 text-center text-xs font-bold shrink-0 ${isMe ? "text-blue-600 dark:text-blue-300" : "text-slate-400 dark:text-gray-500"}`}>
                  {MEDAL[entry.rank] || `#${entry.rank}`}
                </span>

                {/* Avatar */}
                <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${isMe ? "bg-blue-500 text-white" : "bg-slate-200 dark:bg-gray-700 text-slate-600 dark:text-gray-300"}`}>
                  {entry.initials}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className={`truncate text-xs font-medium ${isMe ? "text-blue-700 dark:text-blue-200" : "text-slate-700 dark:text-gray-300"}`}>
                    {isMe ? "You" : entry.name.split(" ")[0]}
                  </p>
                </div>

                {/* Points */}
                <span className={`text-xs font-semibold shrink-0 ${isMe ? "text-blue-600 dark:text-blue-300" : "text-slate-500 dark:text-gray-400"}`}>
                  {entry.points.toLocaleString()} pts
                </span>
              </div>
            );
          })}

          {/* Current user below top 10 */}
          {showMyRow && (
            <>
              <div className="flex items-center gap-1 py-1 px-3">
                <div className="flex-1 border-t border-dashed border-slate-200 dark:border-gray-700" />
                <span className="text-[10px] text-slate-300 dark:text-gray-600 px-1">···</span>
                <div className="flex-1 border-t border-dashed border-slate-200 dark:border-gray-700" />
              </div>
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/25 text-sm">
                <span className="w-6 text-center text-xs font-bold text-blue-600 dark:text-blue-300 shrink-0">
                  #{myEntry.rank}
                </span>
                <div className="h-7 w-7 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                  {myEntry.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-xs font-medium text-blue-700 dark:text-blue-200">You</p>
                </div>
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-300 shrink-0">
                  {myEntry.points.toLocaleString()} pts
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
