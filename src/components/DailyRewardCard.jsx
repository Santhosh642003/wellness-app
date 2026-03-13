export default function DailyRewardCard({ claimedToday, onClaim, lastClaimDate }) {
  return (
    <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-300/10 border border-yellow-200 dark:border-yellow-300/20 px-3 py-1 rounded-full mb-3">
            🎁 Daily Reward
          </div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-1">
            {claimedToday ? "Reward claimed for today ✅" : "Claim Your Daily Bonus"}
          </h3>
          <p className="text-slate-500 dark:text-gray-400 text-sm">
            {claimedToday
              ? `Last claimed: ${lastClaimDate ? new Date(lastClaimDate).toLocaleDateString() : "—"}`
              : "Sign in every day to earn your daily bonus points (+25)"}
          </p>
        </div>
        <button
          onClick={onClaim}
          disabled={claimedToday}
          className={`font-semibold px-5 py-3 rounded-xl transition-transform shrink-0
            ${claimedToday
              ? "bg-slate-100 dark:bg-[#1a1a1a] text-slate-400 dark:text-gray-400 cursor-not-allowed border border-slate-200 dark:border-gray-800"
              : "bg-yellow-400 text-black hover:scale-[1.02] hover:brightness-105"}`}
        >
          {claimedToday ? "Claimed" : "Claim +25 Points"}
        </button>
      </div>
    </div>
  );
}
