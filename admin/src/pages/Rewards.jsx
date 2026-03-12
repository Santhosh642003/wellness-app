import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { Plus, Pencil, Trash2, X, Check, ToggleLeft, ToggleRight } from 'lucide-react';

const EMPTY = { title:'', description:'', pointsCost:100, category:'Gift Cards', stock:-1, available:true };

export default function Rewards() {
  const [rewards, setRewards] = useState([]);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => api.rewards().then(setRewards).catch(console.error);
  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      if (form.id) { await api.updateReward(form.id, form); }
      else { await api.createReward(form); }
      setForm(null); load();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const toggle = async (r) => {
    await api.updateReward(r.id, { available: !r.available }); load();
  };

  const del = async (id) => {
    if (!confirm('Delete this reward?')) return;
    await api.deleteReward(id); load();
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Rewards</h2>
        <button onClick={() => setForm({...EMPTY})} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={16}/> Add Reward
        </button>
      </div>

      {form && (
        <div className="bg-gray-900 border border-emerald-600/40 rounded-xl p-6 mb-6">
          <h3 className="text-white font-semibold mb-4">{form.id ? 'Edit Reward' : 'New Reward'}</h3>
          <div className="grid grid-cols-2 gap-4">
            {[['title','Title'],['description','Description'],['category','Category']].map(([k,label]) => (
              <div key={k} className={k==='description'?'col-span-2':''}>
                <label className="block text-gray-400 text-xs mb-1">{label}</label>
                <input value={form[k]} onChange={e => setForm(f => ({...f,[k]:e.target.value}))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500" />
              </div>
            ))}
            <div>
              <label className="block text-gray-400 text-xs mb-1">Points Cost</label>
              <input type="number" value={form.pointsCost} onChange={e => setForm(f => ({...f,pointsCost:+e.target.value}))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
            </div>
            <div>
              <label className="block text-gray-400 text-xs mb-1">Stock (-1 = unlimited)</label>
              <input type="number" value={form.stock} onChange={e => setForm(f => ({...f,stock:+e.target.value}))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={save} disabled={saving} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm"><Check size={16}/>{saving?'Saving…':'Save'}</button>
            <button onClick={() => setForm(null)} className="flex items-center gap-2 text-gray-400 hover:text-white px-4 py-2 rounded-lg text-sm border border-gray-700"><X size={16}/>Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-800">
            <tr className="text-gray-400 text-left">
              <th className="px-4 py-3">Title</th><th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Cost</th><th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Status</th><th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rewards.map(r => (
              <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-4 py-3 text-white font-medium">{r.title}</td>
                <td className="px-4 py-3 text-gray-400">{r.category}</td>
                <td className="px-4 py-3 text-emerald-400 font-semibold">{r.pointsCost} pts</td>
                <td className="px-4 py-3 text-gray-300">{r.stock === -1 ? '∞' : r.stock}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggle(r)} className={r.available ? 'text-emerald-400 hover:text-emerald-300' : 'text-gray-500 hover:text-gray-400'}>
                    {r.available ? <ToggleRight size={20}/> : <ToggleLeft size={20}/>}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => setForm({...r})} className="text-gray-400 hover:text-white"><Pencil size={14}/></button>
                    <button onClick={() => del(r.id)} className="text-gray-400 hover:text-red-400"><Trash2 size={14}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
