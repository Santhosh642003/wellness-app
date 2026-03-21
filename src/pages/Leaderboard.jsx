import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trophy } from "lucide-react";
import DashboardNav from "../components/DashboardNav";
import Footer from "../components/Footer";
import { useAuth } from "../contexts/AuthContext";
import { leaderboard as leaderboardApi } from "../lib/api";

const MEDAL = ["🥇", "🥈", "🥉"];

export default function Leaderboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    leaderboardApi.list()
      .then(setEntries)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const myEntry = entries.find((e) => e.id === user?.id);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-page)" }}>
      <DashboardNav initials={user?.initials || "?"} />

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center">
            <Trophy size={20} className="text-yellow-500" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Leaderboard</h1>
            <p className="text-sm text-slate-500 dark:text-gray-400">Top students by wellness points</p>
          </div>
        </div>

        {/* My rank banner (if not in top 10) */}
        {myEntry && myEntry.rank > 10 && (
          <div className="mb-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-2xl px-5 py-3 flex items-center justify-between">
            <span className="text-sm text-slate-700 dark:text-gray-300">
              Your rank: <strong className="text-blue-600 dark:text-blue-400">#{myEntry.rank}</strong>
            </span>
            <span className="text-sm font-semibold text-slate-900 dark:text-white">{myEntry.points} pts</span>
          </div>
        )}

        {/* Top 3 podium */}
        {!loading && entries.length >= 3 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[entries[1], entries[0], entries[2]].map((e, i) => {
              const rank = i === 0 ? 2 : i === 1 ? 1 : 3;
              const isMe = e?.id === user?.id;
              return (
                <div
                  key={e?.id}
                  className={`flex flex-col items-center rounded-2xl border px-4 py-5 transition
                    ${rank === 1 ? "bg-yellow-50 dark:bg-yellow-400/10 border-yellow-300 dark:border-yellow-400/30 order-first" : "bg-white dark:bg-[#121212] border-slate-200 dark:border-gray-800"}
                    ${isMe ? "ring-2 ring-blue-400/50" : ""}
                    ${rank === 1 ? "col-start-2" : rank === 2 ? "col-start-1" : "col-start-3"}
                  `}
                  style={{ gridRow: 1 }}
                >
                  <span className="text-3xl mb-1">{MEDAL[rank - 1]}</span>
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold mb-2
                    ${rank === 1 ? "bg-yellow-400/20 text-yellow-700 dark:text-yellow-300" : "bg-slate-100 dark:bg-[#1a1a1a] text-slate-700 dark:text-gray-300"}`}>
                    {e?.initials || "??"}
                  </div>
                  <div className={`text-xs font-semibold text-center truncate w-full text-center
                    ${isMe ? "text-blue-600 dark:text-blue-400" : "text-slate-900 dark:text-white"}`}>
                    {isMe ? "You" : (e?.name?.split(" ")[0] || "—")}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">{e?.points ?? 0} pts</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Full ranked list */}
        <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-gray-800 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-slate-400 dark:text-gray-500 animate-pulse">Loading…</div>
          ) : entries.length === 0 ? (
            <div className="py-16 text-center text-slate-400 dark:text-gray-500">No entries yet. Be the first!</div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-gray-800/60">
              {entries.map((e) => {
                const isMe = e.id === user?.id;
                return (
                  <div
                    key={e.id}
                    className={`flex items-center gap-4 px-5 py-3.5 transition
                      ${isMe ? "bg-blue-50 dark:bg-blue-500/10" : "hover:bg-slate-50 dark:hover:bg-white/[0.02]"}`}
                  >
                    {/* Rank */}
                    <div className={`w-8 text-center text-sm font-bold shrink-0
                      ${e.rank <= 3 ? "text-yellow-500" : "text-slate-400 dark:text-gray-500"}`}>
                      {e.rank <= 3 ? MEDAL[e.rank - 1] : `#${e.rank}`}
                    </div>

                    {/* Avatar */}
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                      ${isMe
                        ? "bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-400/30"
                        : "bg-slate-100 dark:bg-[#1a1a1a] border border-slate-200 dark:border-gray-800 text-slate-700 dark:text-gray-300"
                      }`}>
                      {e.initials || "??"}
                    </div>

                    {/* Name / role */}
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-semibold truncate
                        ${isMe ? "text-blue-600 dark:text-blue-400" : "text-slate-900 dark:text-white"}`}>
                        {isMe ? "You" : e.name}
                      </div>
                      <div className="text-xs text-slate-400 dark:text-gray-500 truncate">{e.role || "Student"}</div>
                    </div>

                    {/* Points */}
                    <div className="text-sm font-semibold text-slate-900 dark:text-white shrink-0">
                      {e.points.toLocaleString()} <span className="text-xs text-slate-400 dark:text-gray-500 font-normal">pts</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-center">
          <button
            onClick={() => navigate("/dashboard")}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-[#141414] border border-slate-200 dark:border-gray-800 text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-[#171717] transition"
          >
            ← Back to Dashboard
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
