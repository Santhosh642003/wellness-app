import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { Users, Star, CheckCircle, ShoppingBag, Trophy, TrendingUp, BookOpen, Gift, Zap, BarChart2 } from 'lucide-react';

// Simple bar chart — no external lib required
function MiniBarChart({ data, color = '#10b981', label }) {
  if (!data || data.length === 0) return <div className="text-gray-600 text-xs py-4 text-center">No data for period</div>;
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div>
      <div className="text-xs text-gray-500 mb-2">{label}</div>
      <div className="flex items-end gap-0.5 h-20">
        {data.map((d) => (
          <div key={d.date} className="flex-1 flex flex-col items-center justify-end group relative" title={`${d.date}: ${d.count}`}>
            <div
              className="w-full rounded-sm transition-all"
              style={{ height: `${Math.max(2, (d.count / max) * 76)}px`, background: color }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function Skeleton() {
  return <div className="h-7 w-20 bg-gray-800 rounded animate-pulse" />;
}

function StatCard({ icon: Icon, label, value, sub, color, loading }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className={`inline-flex p-2.5 rounded-lg mb-3 ${color}`}>
        <Icon size={16} className="text-white" />
      </div>
      {loading ? <Skeleton /> : <p className="text-white text-2xl font-bold">{value ?? '—'}</p>}
      <p className="text-gray-400 text-xs mt-1">{label}</p>
      {sub && !loading && <p className="text-gray-600 text-xs mt-0.5">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [poolOpen, setPoolOpen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.stats(),
      api.analytics().catch(() => null),
      api.rewardPool().catch(() => null),
    ])
      .then(([s, a, pools]) => {
        setStats(s);
        setAnalytics(a);
        setPoolOpen(Array.isArray(pools) ? pools.some((p) => !p.closedAt) : null);
      })
      .catch(() => setError('Failed to load stats. Check backend connection.'))
      .finally(() => setLoading(false));
  }, []);

  const completionRate = stats?.totalUsers > 0 && stats?.totalModules > 0
    ? Math.round((stats.totalCompletions / (stats.totalUsers * stats.totalModules)) * 100)
    : 0;

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Dashboard</h2>
          <p className="text-gray-400 text-sm mt-1">Platform-wide overview</p>
        </div>
        {stats?.newUsersThisWeek > 0 && (
          <div className="flex items-center gap-2 bg-emerald-600/10 border border-emerald-600/20 rounded-xl px-4 py-2">
            <TrendingUp size={14} className="text-emerald-400" />
            <span className="text-emerald-400 text-sm font-medium">
              +{stats.newUsersThisWeek} new user{stats.newUsersThisWeek !== 1 ? 's' : ''} this week
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="text-red-400 text-sm mb-6 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {poolOpen === false && (
        <div className="flex items-start gap-3 mb-6 bg-amber-500/10 border border-amber-500/30 rounded-xl px-5 py-4">
          <Trophy size={18} className="text-amber-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-amber-300 font-semibold text-sm">No active reward semester</p>
            <p className="text-amber-400/80 text-xs mt-0.5">
              Students cannot earn points or redeem rewards until a semester is opened.
            </p>
          </div>
          <button
            onClick={() => navigate('/reward-pool')}
            className="shrink-0 text-xs font-medium text-amber-300 border border-amber-400/40 rounded-lg px-3 py-1.5 hover:bg-amber-400/10 transition-colors"
          >
            Open semester →
          </button>
        </div>
      )}

      {/* Primary stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
        <StatCard icon={Users} label="Total Users" value={stats?.totalUsers?.toLocaleString()}
          sub={`${stats?.newUsersThisWeek ?? 0} joined this week`} color="bg-blue-600" loading={loading} />
        <StatCard icon={Star} label="Points Distributed" value={stats?.totalPointsDistributed?.toLocaleString()}
          sub={`Avg ${(stats?.avgPointsPerUser ?? 0).toLocaleString()} per user`} color="bg-emerald-600" loading={loading} />
        <StatCard icon={CheckCircle} label="Module Completions" value={stats?.totalCompletions?.toLocaleString()}
          sub={`${completionRate}% completion rate`} color="bg-purple-600" loading={loading} />
        <StatCard icon={ShoppingBag} label="Redemptions" value={stats?.totalRedemptions?.toLocaleString()}
          sub={`${(stats?.totalPointsRedeemed ?? 0).toLocaleString()} pts redeemed`} color="bg-red-600" loading={loading} />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Trophy} label="Quizzes Passed" value={stats?.totalQuizzesPassed?.toLocaleString()}
          sub={`${stats?.quizPassRate ?? 0}% pass rate`} color="bg-yellow-600" loading={loading} />
        <StatCard icon={BookOpen} label="Modules Published"
          value={stats?.unlockedModules != null ? `${stats.unlockedModules}/${stats.totalModules}` : null}
          sub="unlocked for users" color="bg-indigo-600" loading={loading} />
        <StatCard icon={Gift} label="Active Rewards" value={stats?.availableRewards?.toLocaleString()}
          sub={`of ${stats?.totalRewards ?? 0} total`} color="bg-pink-600" loading={loading} />
        <StatCard icon={Zap} label="Quiz Attempts" value={stats?.totalQuizAttempts?.toLocaleString()}
          sub="all time" color="bg-orange-600" loading={loading} />
      </div>

      {/* Analytics charts */}
      {analytics && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-white font-semibold text-sm mb-4">New Registrations (30 days)</h3>
            <MiniBarChart data={analytics.registrations} color="#3b82f6" label="Daily new users" />
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-white font-semibold text-sm mb-4">Module Completions (30 days)</h3>
            <MiniBarChart data={analytics.completions} color="#10b981" label="Daily completions" />
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-white font-semibold text-sm mb-4">Quiz Attempts (30 days)</h3>
            <MiniBarChart data={analytics.quizAttempts} color="#f59e0b" label="Daily quiz attempts" />
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-white font-semibold text-sm mb-4">Daily Claims (30 days)</h3>
            <MiniBarChart data={analytics.dailyClaims} color="#8b5cf6" label="Daily point claims" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Top users leaderboard */}
        <div className="xl:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Top Users by Points</h3>
            <button onClick={() => navigate('/users')} className="text-emerald-400 text-xs hover:text-emerald-300 transition-colors">
              View all →
            </button>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-800 rounded animate-pulse" />
              ))}
            </div>
          ) : stats?.topUsers?.length > 0 ? (
            stats.topUsers.map((u, i) => (
              <div key={u.email} className="flex items-center gap-3 py-2.5 border-b border-gray-800 last:border-0 cursor-pointer hover:bg-gray-800/50 rounded-lg px-2 -mx-2 transition-colors"
                onClick={() => navigate('/users')}>
                <span className={`text-sm font-bold w-5 shrink-0 ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-600' : 'text-gray-500'}`}>
                  #{i + 1}
                </span>
                <div className="h-7 w-7 rounded-full bg-emerald-600/20 border border-emerald-600/30 flex items-center justify-center text-emerald-400 text-[10px] font-bold shrink-0 overflow-hidden">
                  {u.avatarUrl
                    ? <img src={u.avatarUrl} alt={u.name?.[0]} className="h-full w-full object-cover" />
                    : (u.name?.[0]?.toUpperCase() || '?')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{u.name}</p>
                  <p className="text-gray-500 text-xs truncate">{u.email}</p>
                </div>
                <span className="text-emerald-400 text-sm font-semibold shrink-0">
                  {parseInt(u.points).toLocaleString()} pts
                </span>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-sm py-4 text-center">No users yet</p>
          )}
        </div>

        {/* Quick actions */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-1">
            {[
              { label: 'Add a new module', sub: 'Upload video + create quiz', path: '/modules', icon: BookOpen, color: 'text-indigo-400' },
              { label: 'Add a reward', sub: 'Set points cost & stock', path: '/rewards', icon: Gift, color: 'text-pink-400' },
              { label: 'Manage users', sub: 'Search, view & adjust points', path: '/users', icon: Users, color: 'text-blue-400' },
              { label: 'Redemptions', sub: 'Track all reward claims', path: '/redemptions', icon: ShoppingBag, color: 'text-red-400' },
              { label: 'Quiz management', sub: 'Edit questions & passing scores', path: '/quizzes', icon: BarChart2, color: 'text-yellow-400' },
            ].map(({ label, sub, path, icon: Icon, color }) => (
              <button key={path} onClick={() => navigate(path)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-gray-800 transition-colors text-left group">
                <div className={`${color} opacity-70 group-hover:opacity-100 transition-opacity`}>
                  <Icon size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium">{label}</p>
                  <p className="text-gray-500 text-xs">{sub}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
