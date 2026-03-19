import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { Plus, Pencil, Trash2, X, Check, ToggleLeft, ToggleRight, Upload, Image } from 'lucide-react';

const EMPTY = { title:'', description:'', pointsCost:100, category:'Gift Cards', stock:-1, available:true, imageUrl:'' };

function ImageUploader({ value, onChange }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true); setProgress(0); setError('');
    try {
      const result = await api.uploadImage(file, setProgress);
      onChange(result.url);
    } catch (err) { setError(err.message || 'Upload failed'); }
    finally { setUploading(false); }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-start">
        {value && (
          <div className="h-14 w-14 rounded-lg bg-gray-800 border border-gray-700 overflow-hidden shrink-0">
            <img src={value} alt="Reward" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
          </div>
        )}
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
            <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
              className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm hover:bg-gray-700 disabled:opacity-50">
              <Upload size={14} />{uploading ? `Uploading ${progress}%` : 'Upload image'}
            </button>
            {value && <button type="button" onClick={() => onChange('')} className="text-gray-500 hover:text-red-400 text-xs px-2">Remove</button>}
          </div>
          {uploading && (
            <div className="h-1.5 w-full rounded-full bg-gray-800 overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all duration-200 rounded-full" style={{ width: `${progress}%` }} />
            </div>
          )}
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://... or /uploads/image.jpg"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500" />
        </div>
      </div>
    </div>
  );
}

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
            <div className="col-span-2">
              <label className="block text-gray-400 text-xs mb-2">Reward Image</label>
              <ImageUploader value={form.imageUrl || ''} onChange={(url) => setForm(f => ({ ...f, imageUrl: url }))} />
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
              <th className="px-4 py-3">Image</th><th className="px-4 py-3">Title</th><th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Cost</th><th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Status</th><th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rewards.map(r => (
              <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-4 py-3">
                  {r.imageUrl
                    ? <img src={r.imageUrl} alt={r.title} className="h-10 w-10 object-cover rounded-lg border border-gray-700" onError={(e) => { e.target.replaceWith(Object.assign(document.createElement('div'), { className: 'h-10 w-10 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center', innerHTML: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#6b7280"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>' })); }}  />
                    : <div className="h-10 w-10 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center"><Image size={14} className="text-gray-600" /></div>
                  }
                </td>
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
                    <button onClick={() => setForm({...r, imageUrl: r.imageUrl || ''})} className="text-gray-400 hover:text-white"><Pencil size={14}/></button>
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
