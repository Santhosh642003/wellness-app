import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { Plus, Pencil, Trash2, X, Check, ToggleLeft, ToggleRight, Upload, Bell } from 'lucide-react';

const EMPTY = { title: '', body: '', imageUrl: '', active: true };

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
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-start">
        {value && (
          <div className="h-14 w-24 rounded-lg bg-gray-800 border border-gray-700 overflow-hidden shrink-0">
            <img src={value} alt="Notification" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
          </div>
        )}
        <div className="flex-1 space-y-2">
          <div className="flex gap-2 flex-wrap">
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
            <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
              className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm hover:bg-gray-700 disabled:opacity-50">
              <Upload size={13} />{uploading ? `Uploading ${progress}%` : 'Upload poster/image'}
            </button>
            {value && (
              <button type="button" onClick={() => onChange('')} className="text-gray-500 hover:text-red-400 text-xs px-2">
                Remove
              </button>
            )}
          </div>
          {uploading && (
            <div className="h-1.5 w-full rounded-full bg-gray-800 overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all duration-200 rounded-full" style={{ width: `${progress}%` }} />
            </div>
          )}
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <input value={value} onChange={(e) => onChange(e.target.value)}
            placeholder="https://... or /uploads/poster.jpg"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500" />
        </div>
      </div>
    </div>
  );
}

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => api.notifications().then(setItems).catch(console.error).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.title.trim()) { alert('Title is required'); return; }
    setSaving(true);
    try {
      if (form.id) {
        await api.updateNotification(form.id, { title: form.title, body: form.body, imageUrl: form.imageUrl || null, active: form.active });
      } else {
        await api.createNotification({ title: form.title, body: form.body, imageUrl: form.imageUrl || null, active: form.active });
      }
      setForm(null); load();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const toggle = async (n) => {
    await api.updateNotification(n.id, { active: !n.active }); load();
  };

  const del = async (id) => {
    if (!confirm('Delete this notification?')) return;
    await api.deleteNotification(id); load();
  };

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Notifications</h2>
          <p className="text-gray-400 text-sm mt-1">Manage announcements shown to users above the calendar</p>
        </div>
        <button onClick={() => setForm({ ...EMPTY })}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> New Notification
        </button>
      </div>

      {/* Form */}
      {form && (
        <div className="bg-gray-900 border border-emerald-600/30 rounded-xl p-6 mb-6">
          <h3 className="text-white font-semibold mb-4">{form.id ? 'Edit Notification' : 'New Notification'}</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 text-xs mb-1">Title *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Wellness Week Event"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-gray-400 text-xs mb-1">Message body (optional)</label>
              <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                rows={3} placeholder="Add details, links, or instructions…"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500 resize-none" />
            </div>
            <div>
              <label className="block text-gray-400 text-xs mb-2">Poster / Image (optional)</label>
              <ImageUploader value={form.imageUrl || ''} onChange={(url) => setForm(f => ({ ...f, imageUrl: url }))} />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-gray-400 text-xs">Visible to users</label>
              <button type="button" onClick={() => setForm(f => ({ ...f, active: !f.active }))}>
                {form.active
                  ? <ToggleRight size={22} className="text-emerald-400" />
                  : <ToggleLeft size={22} className="text-gray-500" />}
              </button>
              <span className={`text-xs font-medium ${form.active ? 'text-emerald-400' : 'text-gray-500'}`}>
                {form.active ? 'Active' : 'Hidden'}
              </span>
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
              <Check size={15} />{saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => setForm(null)}
              className="flex items-center gap-2 text-gray-400 hover:text-white px-4 py-2 rounded-lg text-sm border border-gray-700 transition-colors">
              <X size={15} /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />)}
        </div>
      ) : items.length === 0 && !form ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl py-16 text-center">
          <Bell size={32} className="text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No notifications yet</p>
          <p className="text-gray-600 text-xs mt-1">Create one to show announcements to users</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <div key={n.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="flex items-start gap-4 p-4">
                {n.imageUrl && (
                  <div className="h-16 w-24 rounded-lg bg-gray-800 border border-gray-700 overflow-hidden shrink-0">
                    <img src={n.imageUrl} alt={n.title} className="w-full h-full object-cover"
                      onError={(e) => { e.target.parentElement.style.display = 'none'; }} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-white font-medium text-sm">{n.title}</p>
                      {n.body && <p className="text-gray-400 text-xs mt-1 line-clamp-2">{n.body}</p>}
                      <p className="text-gray-600 text-xs mt-1.5">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => toggle(n)} title={n.active ? 'Hide from users' : 'Show to users'}>
                        {n.active
                          ? <ToggleRight size={20} className="text-emerald-400 hover:text-emerald-300" />
                          : <ToggleLeft size={20} className="text-gray-500 hover:text-gray-400" />}
                      </button>
                      <button onClick={() => setForm({ ...n, imageUrl: n.imageUrl || '' })}
                        className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => del(n.id)}
                        className="text-gray-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-400/10 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className={`px-4 py-1.5 text-xs font-medium border-t border-gray-800 ${n.active ? 'text-emerald-400 bg-emerald-600/5' : 'text-gray-600 bg-gray-800/30'}`}>
                {n.active ? '● Active — visible to users' : '○ Hidden from users'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
