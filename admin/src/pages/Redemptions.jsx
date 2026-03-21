import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';
import { Search } from 'lucide-react';

const DATE_FILTERS = ['All time', 'Today', 'This week', 'This month'];

function inRange(dateStr, range) {
  const d = new Date(dateStr);
  const now = new Date();
  if (range === 'Today') {
    return d.toDateString() === now.toDateString();
  }
  if (range === 'This week') {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    return d >= start;
  }
  if (range === 'This month') {
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }
  return true;
}

export default function Redemptions() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState('All time');

  useEffect(() => {
    api.redemptions()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = data;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.userName?.toLowerCase().includes(q) ||
        r.userEmail?.toLowerCase().includes(q) ||
        r.rewardTitle?.toLowerCase().includes(q) ||
        r.rewardCategory?.toLowerCase().includes(q)
      );
    }
    list = list.filter(r => inRange(r.redeemedAt, dateRange));
    return list;
  }, [data, search, dateRange]);

  const totalPtsSpent = filtered.reduce((s, r) => s + (r.pointsSpent || 0), 0);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">Redemption History</h2>
        <p className="text-gray-400 text-sm mt-1">{data.length} total redemptions</p>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Redemptions shown', value: filtered.length },
          { label: 'Points spent', value: totalPtsSpent.toLocaleString() },
          { label: 'Unique users', value: new Set(filtered.map(r => r.userEmail)).size },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4">
            <p className="text-white text-xl font-bold">{s.value}</p>
            <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search user, reward…"
            className="w-64 bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-white text-sm focus:outline-none focus:border-emerald-500" />
        </div>
        <div className="flex gap-1">
          {DATE_FILTERS.map(f => (
            <button key={f} onClick={() => setDateRange(f)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${dateRange === f ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">User</th>
              <th className="px-4 py-3 text-left">Reward</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-left">Points Spent</th>
              <th className="px-4 py-3 text-left">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                  Loading…
                </div>
              </td></tr>
            )}
            {!loading && filtered.map(r => (
              <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                <td className="px-4 py-3">
                  <p className="text-white font-medium text-sm">{r.userName}</p>
                  <p className="text-gray-500 text-xs">{r.userEmail}</p>
                </td>
                <td className="px-4 py-3 text-gray-300 text-sm">{r.rewardTitle}</td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 border border-gray-700 text-gray-400">{r.rewardCategory}</span>
                </td>
                <td className="px-4 py-3 text-red-400 font-semibold text-sm">−{r.pointsSpent} pts</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{new Date(r.redeemedAt).toLocaleString()}</td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-500 text-sm">
                No redemptions match your filters
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
