import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { Search } from 'lucide-react';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('');
  const navigate = useNavigate();

  useEffect(() => { api.users().then(setUsers).catch(console.error); }, []);

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(filter.toLowerCase()) ||
    u.email.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-white mb-6">Users</h2>
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-3 text-gray-500" />
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search by name or email…"
          className="w-full max-w-sm bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" />
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-800">
            <tr className="text-gray-400 text-left">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Points</th>
              <th className="px-4 py-3">Streak</th>
              <th className="px-4 py-3">Modules Done</th>
              <th className="px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} onClick={() => navigate(`/users/${u.id}`)}
                className="border-b border-gray-800/50 hover:bg-gray-800/50 cursor-pointer transition-colors">
                <td className="px-4 py-3 text-white font-medium">{u.name}</td>
                <td className="px-4 py-3 text-gray-400">{u.email}</td>
                <td className="px-4 py-3 text-emerald-400 font-semibold">{u.points}</td>
                <td className="px-4 py-3 text-yellow-400">{u.streakDays}d</td>
                <td className="px-4 py-3 text-gray-300">{u.modulesCompleted}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
