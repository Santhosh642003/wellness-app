import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { Users, Star, CheckCircle, ShoppingBag, Trophy } from 'lucide-react';

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className={`inline-flex p-3 rounded-lg mb-4 ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <p className="text-gray-400 text-sm">{label}</p>
      <p className="text-white text-3xl font-bold mt-1">{value?.toLocaleString() ?? '—'}</p>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.stats().then(setStats).catch(console.error); }, []);

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-white mb-2">Dashboard</h2>
      <p className="text-gray-400 mb-8">Platform overview</p>
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard icon={Users} label="Total Users" value={stats?.totalUsers} color="bg-blue-600" />
        <StatCard icon={Star} label="Total Points Distributed" value={stats?.totalPointsDistributed} color="bg-emerald-600" />
        <StatCard icon={CheckCircle} label="Module Completions" value={stats?.totalCompletions} color="bg-purple-600" />
        <StatCard icon={Trophy} label="Quizzes Passed" value={stats?.totalQuizzesPassed} color="bg-yellow-600" />
        <StatCard icon={ShoppingBag} label="Reward Redemptions" value={stats?.totalRedemptions} color="bg-red-600" />
      </div>
    </div>
  );
}
