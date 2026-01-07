export default function LeaderboardCard({ points = 0 }) {
  const rank = Math.max(1, 100 - Math.floor(points / 20));

  return (
    <div className="bg-[#121212] border border-gray-800 rounded-2xl p-5 shadow-lg">
      <h3 className="font-semibold mb-3">Leaderboard</h3>

      <div className="bg-[#0f0f0f] border border-gray-800 rounded-xl p-4">
        <div className="text-4xl font-bold text-blue-400">#{rank}</div>
        <p className="text-xs text-gray-400 mt-1">based on your points (demo)</p>
      </div>
    </div>
  );
}
