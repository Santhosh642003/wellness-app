import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';

const EMPTY = { slug: '', title: '', description: '', duration: '', category: 'HPV', orderIndex: 0, pointsValue: 100, locked: true, videoUrl: '' };

export default function Modules() {
  const [modules, setModules] = useState([]);
  const [form, setForm] = useState(null); // null | { ...module } for edit, or EMPTY for new
  const [saving, setSaving] = useState(false);

  const load = () => api.modules().then(setModules).catch(console.error);
  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      if (form.id) { await api.updateModule(form.id, form); }
      else { await api.createModule(form); }
      setForm(null); load();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!confirm('Delete this module?')) return;
    await api.deleteModule(id); load();
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Modules</h2>
        <button onClick={() => setForm({ ...EMPTY })} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={16} /> Add Module
        </button>
      </div>

      {form && (
        <div className="bg-gray-900 border border-emerald-600/40 rounded-xl p-6 mb-6">
          <h3 className="text-white font-semibold mb-4">{form.id ? 'Edit Module' : 'New Module'}</h3>
          <div className="grid grid-cols-2 gap-4">
            {[['title','Title'],['slug','Slug'],['description','Description'],['duration','Duration (e.g. 12 min)'],['videoUrl','Video URL']].map(([k,label]) => (
              <div key={k} className={k === 'description' || k === 'videoUrl' ? 'col-span-2' : ''}>
                <label className="block text-gray-400 text-xs mb-1">{label}</label>
                <input value={form[k]} onChange={e => setForm(f => ({...f,[k]:e.target.value}))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500" />
              </div>
            ))}
            <div>
              <label className="block text-gray-400 text-xs mb-1">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({...f,category:e.target.value}))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
                {['HPV','MenB','Bonus'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-gray-400 text-xs mb-1">Points Value</label>
              <input type="number" value={form.pointsValue} onChange={e => setForm(f => ({...f,pointsValue:+e.target.value}))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
            </div>
            <div>
              <label className="block text-gray-400 text-xs mb-1">Order Index</label>
              <input type="number" value={form.orderIndex} onChange={e => setForm(f => ({...f,orderIndex:+e.target.value}))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
            </div>
            <div className="flex items-center gap-2 mt-4">
              <input type="checkbox" id="locked" checked={form.locked} onChange={e => setForm(f => ({...f,locked:e.target.checked}))} />
              <label htmlFor="locked" className="text-gray-300 text-sm">Locked</label>
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
              <th className="px-4 py-3">#</th><th className="px-4 py-3">Title</th><th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Duration</th><th className="px-4 py-3">Points</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {modules.map(m => (
              <tr key={m.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                <td className="px-4 py-3 text-gray-500">{m.orderIndex}</td>
                <td className="px-4 py-3 text-white font-medium">{m.title}</td>
                <td className="px-4 py-3"><span className="px-2 py-1 rounded-full text-xs bg-blue-900/30 text-blue-300 border border-blue-800/30">{m.category}</span></td>
                <td className="px-4 py-3 text-gray-400">{m.duration}</td>
                <td className="px-4 py-3 text-emerald-400">{m.pointsValue}</td>
                <td className="px-4 py-3"><span className={`text-xs ${m.locked ? 'text-red-400':'text-emerald-400'}`}>{m.locked?'Locked':'Unlocked'}</span></td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => setForm({...m})} className="text-gray-400 hover:text-white"><Pencil size={14}/></button>
                    <button onClick={() => del(m.id)} className="text-gray-400 hover:text-red-400"><Trash2 size={14}/></button>
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
