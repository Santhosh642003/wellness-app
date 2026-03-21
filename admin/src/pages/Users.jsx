import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { Search, ChevronUp, ChevronDown, Users as UsersIcon } from 'lucide-react';

const SORT_KEYS = { name: 'name', email: 'email', points: 'points', streakDays: 'streakDays', modulesCompleted: 'modulesCompleted', createdAt: 'createdAt' };

function SortIcon({ col, sortKey, sortDir }) {
  if (sortKey !== col) return <ChevronDown size={12} className="text-gray-700 ml-1" />;
  return sortDir === 'asc' ? <ChevronUp size={12} className="text-emerald-400 ml-1" /> : <ChevronDown size={12} className="text-emerald-400 ml-1" />;
}

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [sortKey, setSortKey] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const [roleFilter, setRoleFilter] = useState('All');
  const navigate = useNavigate();

  useEffect(() => {
    api.users()
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const roles = useMemo(() => ['All', ...new Set(users.map(u => u.role).filter(Boolean))], [users]);

  const processed = useMemo(() => {
    let list = users;
    if (roleFilter !== 'All') list = list.filter(u => u.role === roleFilter);
    if (filter) {
      const q = filter.toLowerCase();
      list = list.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.campus || '').toLowerCase().includes(q));
    }
    list = [...list].sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (sortKey === 'createdAt') { av = new Date(av); bv = new Date(bv); }
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    return list;
  }, [users, filter, sortKey, sortDir, roleFilter]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const Th = ({ col, label }) => (
    <th className="px-4 py-3 cursor-pointer select-none hover:text-white transition-colors" onClick={() => toggleSort(col)}>
      <span className="flex items-center">
        {label}<SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
      </span>
    </th>
  );

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Users</h2>
          <p className="text-gray-400 text-sm mt-1">{users.length} total · {processed.length} shown</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Search name, email, campus…"
            className="w-72 bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="flex gap-1">
          {roles.map(r => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${roleFilter === r ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'}`}>
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-800 text-gray-400 text-left text-xs uppercase tracking-wide">
            <tr>
              <Th col="name" label="Name" />
              <th className="px-4 py-3">Campus / Role</th>
              <Th col="points" label="Points" />
              <Th col="streakDays" label="Streak" />
              <Th col="modulesCompleted" label="Modules" />
              <Th col="createdAt" label="Joined" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                  Loading users…
                </div>
              </td></tr>
            )}
            {!loading && processed.map(u => (
              <tr key={u.id} onClick={() => navigate(`/users/${u.id}`)}
                className="border-b border-gray-800/50 hover:bg-gray-800/50 cursor-pointer transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-emerald-600/20 border border-emerald-600/30 flex items-center justify-center text-emerald-400 text-xs font-bold shrink-0">
                      {u.initials || u.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <span className="text-white font-medium">{u.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="text-gray-300 text-xs">{u.campus || '—'}</p>
                  <p className="text-gray-500 text-xs">{u.role}</p>
                </td>
                <td className="px-4 py-3 text-emerald-400 font-semibold">{parseInt(u.points).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium ${u.streakDays > 0 ? 'text-yellow-400' : 'text-gray-600'}`}>
                    {u.streakDays > 0 ? `🔥 ${u.streakDays}d` : '—'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${parseInt(u.modulesCompleted) > 0 ? 'bg-emerald-600/10 border border-emerald-600/20 text-emerald-400' : 'text-gray-600'}`}>
                    {u.modulesCompleted}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {!loading && processed.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center">
                <UsersIcon size={32} className="text-gray-700 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No users found</p>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
