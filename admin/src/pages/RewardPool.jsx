import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { Trophy, Plus, Lock, DollarSign } from 'lucide-react';

export default function RewardPool() {
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ semesterLabel: '', budgetDollars: '' });
  const [msg, setMsg] = useState('');

  const load = () => api.rewardPool().then(setPools).catch(console.error).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openPool = pools.find((p) => !p.closedAt);

  const create = async (e) => {
    e.preventDefault();
    const budgetCents = Math.round(parseFloat(form.budgetDollars) * 100);
    if (!form.semesterLabel || !budgetCents) return;
    setCreating(true);
    setMsg('');
    try {
      await api.createRewardPool({ semesterLabel: form.semesterLabel, budgetCents });
      setForm({ semesterLabel: '', budgetDollars: '' });
      setMsg('Semester opened successfully');
      await load();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setCreating(false);
    }
  };

  const closePool = async (id) => {
    if (!window.confirm('Close this semester? Students will not be able to earn or redeem points until a new semester is opened.')) return;
    try {
      await api.updateRewardPool(id, { close: true });
      setMsg('Semester closed');
      await load();
    } catch (err) {
      setMsg(err.message);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Trophy size={22} /> Reward Pool</h2>
          <p className="text-gray-400 text-sm mt-1">Manage semester budgets for student reward redemptions</p>
        </div>
      </div>

      {msg && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${msg.includes('success') || msg.includes('closed') ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
          {msg}
        </div>
      )}

      {/* Open semester */}
      {openPool ? (
        <div className="bg-gray-900 border border-emerald-600/30 rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-emerald-400 font-semibold uppercase tracking-wide mb-1">Active Semester</div>
              <div className="text-white text-xl font-bold">{openPool.semesterLabel}</div>
              <div className="mt-3 flex gap-6 text-sm">
                <div>
                  <div className="text-gray-500 text-xs">Budget</div>
                  <div className="text-white font-semibold">${(openPool.budgetCents / 100).toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs">Spent</div>
                  <div className="text-yellow-400 font-semibold">${(openPool.spentCents / 100).toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs">Remaining</div>
                  <div className="text-emerald-400 font-semibold">${((openPool.budgetCents - openPool.spentCents) / 100).toFixed(2)}</div>
                </div>
              </div>
              <div className="mt-3 h-2 rounded-full bg-gray-800 overflow-hidden w-64">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-yellow-400"
                  style={{ width: `${Math.min(100, (openPool.spentCents / openPool.budgetCents) * 100)}%` }}
                />
              </div>
            </div>
            <button
              onClick={() => closePool(openPool.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition"
            >
              <Lock size={12} /> Close Semester
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <div className="text-gray-400 text-sm mb-4">No active semester. Open one below to enable student earning and redemptions.</div>
          <form onSubmit={create} className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Semester Label</label>
              <input
                value={form.semesterLabel}
                onChange={(e) => setForm((f) => ({ ...f, semesterLabel: e.target.value }))}
                placeholder="e.g. Fall 2025"
                className="w-48 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Budget ($)</label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={form.budgetDollars}
                onChange={(e) => setForm((f) => ({ ...f, budgetDollars: e.target.value }))}
                placeholder="e.g. 1000"
                className="w-36 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button
              type="submit"
              disabled={creating}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition"
            >
              <Plus size={14} /> {creating ? 'Opening…' : 'Open Semester'}
            </button>
          </form>
        </div>
      )}

      {/* History */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-800 text-gray-400 text-left text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3">Semester</th>
              <th className="px-4 py-3">Budget</th>
              <th className="px-4 py-3">Spent</th>
              <th className="px-4 py-3">Opened</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Loading…</td></tr>
            )}
            {!loading && pools.map((p) => (
              <tr key={p.id} className="border-b border-gray-800/50">
                <td className="px-4 py-3 text-white font-medium">{p.semesterLabel}</td>
                <td className="px-4 py-3 text-gray-300">${(p.budgetCents / 100).toFixed(2)}</td>
                <td className="px-4 py-3 text-yellow-400">${(p.spentCents / 100).toFixed(2)}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{new Date(p.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  {p.closedAt
                    ? <span className="text-xs text-gray-500">Closed {new Date(p.closedAt).toLocaleDateString()}</span>
                    : <span className="text-xs font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">Open</span>
                  }
                </td>
              </tr>
            ))}
            {!loading && pools.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No semesters yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
