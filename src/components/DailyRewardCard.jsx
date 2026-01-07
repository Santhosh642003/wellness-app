export default function DailyRewardCard({ claimedToday, onClaim, lastClaimDate }) {
  return (
    <div className="bg-[#121212] border border-gray-800 rounded-2xl p-6 shadow-lg">
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 text-sm text-yellow-300 bg-yellow-300/10 border border-yellow-300/20 px-3 py-1 rounded-full mb-3">
            🎁 Daily Reward
          </div>

          <h3 className="text-xl font-semibold mb-1">
            {claimedToday ? "Reward claimed for today ✅" : "Claim Your Daily Bonus"}
          </h3>

          <p className="text-gray-400 text-sm">
            {claimedToday
              ? `Last claimed: ${lastClaimDate}`
              : "Sign in every day to earn your daily bonus points"}
          </p>
        </div>

        <button
          onClick={onClaim}
          disabled={claimedToday}
          className={`font-semibold px-5 py-3 rounded-xl transition-transform
            ${
              claimedToday
                ? "bg-[#1a1a1a] text-gray-400 cursor-not-allowed"
                : "bg-yellow-400 text-black hover:scale-[1.02]"
            }`}
        >
          {claimedToday ? "Claimed" : "Claim +5 Points"}
        </button>
      </div>
    </div>
  );
}
