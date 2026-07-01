import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { CalendarDays, Plus, RefreshCw, Trash2, Users } from 'lucide-react';

function formatDT(dt) {
  return dt ? new Date(dt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
}

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', checkInCode: '', startsAt: '', endsAt: '' });
  const [msg, setMsg] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [checkins, setCheckins] = useState([]);
  const [loadingCheckins, setLoadingCheckins] = useState(false);

  const load = () => api.events().then(setEvents).catch(console.error).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    if (!form.title || !form.checkInCode || !form.startsAt || !form.endsAt) return;
    setCreating(true);
    setMsg('');
    try {
      await api.createEvent(form);
      setForm({ title: '', description: '', checkInCode: '', startsAt: '', endsAt: '' });
      setMsg('Event created');
      await load();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setCreating(false);
    }
  };

  const rotateCode = async (id) => {
    try {
      const updated = await api.rotateEventCode(id);
      setEvents((evs) => evs.map((ev) => ev.id === id ? updated : ev));
      setMsg(`New code: ${updated.checkInCode}`);
    } catch (err) {
      setMsg(err.message);
    }
  };

  const deleteEvent = async (id) => {
    if (!window.confirm('Delete this event?')) return;
    try {
      await api.deleteEvent(id);
      await load();
    } catch (err) {
      setMsg(err.message);
    }
  };

  const viewCheckins = async (ev) => {
    setSelectedEvent(ev);
    setLoadingCheckins(true);
    try {
      const data = await api.eventCheckins(ev.id);
      setCheckins(data);
    } catch (err) {
      setCheckins([]);
    } finally {
      setLoadingCheckins(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2"><CalendarDays size={22} /> Events</h2>
          <p className="text-gray-400 text-sm mt-1">Manage in-person wellness events with check-in codes</p>
        </div>
      </div>

      {msg && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium bg-gray-800 border border-gray-700 text-gray-200">{msg}</div>
      )}

      {/* Create form */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <h3 className="text-white font-semibold mb-4">Create Event</h3>
        <form onSubmit={create} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Title *</label>
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Event title" required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Description</label>
            <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Optional description"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Check-in Code *</label>
            <input value={form.checkInCode} onChange={(e) => setForm((f) => ({ ...f, checkInCode: e.target.value.toUpperCase() }))} placeholder="e.g. WELL25"
              required className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm font-mono font-bold tracking-widest focus:outline-none focus:border-emerald-500 uppercase" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Starts At *</label>
            <input type="datetime-local" value={form.startsAt} onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))} required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Ends At *</label>
            <input type="datetime-local" value={form.endsAt} onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))} required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500" />
          </div>
          <div className="md:col-span-2">
            <button type="submit" disabled={creating}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition">
              <Plus size={14} /> {creating ? 'Creating…' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>

      {/* Event list */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-800 text-gray-400 text-left text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3">Event</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Start</th>
              <th className="px-4 py-3">End</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Loading…</td></tr>}
            {!loading && events.map((ev) => (
              <tr key={ev.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-4 py-3">
                  <div className="text-white font-medium">{ev.title}</div>
                  {ev.description && <div className="text-gray-500 text-xs">{ev.description}</div>}
                </td>
                <td className="px-4 py-3 font-mono font-bold text-emerald-400 text-xs tracking-widest">{ev.checkInCode}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{formatDT(ev.startsAt)}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{formatDT(ev.endsAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => rotateCode(ev.id)} title="Rotate code"
                      className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-400 hover:bg-emerald-400/10 transition">
                      <RefreshCw size={13} />
                    </button>
                    <button onClick={() => viewCheckins(ev)} title="View check-ins"
                      className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-400/10 transition">
                      <Users size={13} />
                    </button>
                    <button onClick={() => deleteEvent(ev.id)} title="Delete"
                      className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && events.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No events yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Check-ins drawer */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedEvent(null)} />
          <div className="relative bg-gray-900 border-l border-gray-800 w-96 h-full overflow-auto p-6">
            <h3 className="text-white font-bold mb-1">{selectedEvent.title}</h3>
            <p className="text-gray-400 text-xs mb-4">Check-ins ({loadingCheckins ? '…' : checkins.length})</p>
            {loadingCheckins && <div className="text-gray-500 text-sm">Loading…</div>}
            {!loadingCheckins && checkins.length === 0 && <div className="text-gray-500 text-sm">No check-ins yet</div>}
            {!loadingCheckins && checkins.map((c) => (
              <div key={c.id} className="flex items-center gap-3 py-2 border-b border-gray-800/50">
                <div className="h-8 w-8 rounded-full bg-emerald-600/20 border border-emerald-600/30 flex items-center justify-center text-emerald-400 text-xs font-bold shrink-0">
                  {c.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <div className="text-white text-sm font-medium">{c.name}</div>
                  <div className="text-gray-500 text-xs">{c.email} · {new Date(c.checkedInAt).toLocaleTimeString()}</div>
                </div>
              </div>
            ))}
            <button onClick={() => setSelectedEvent(null)} className="mt-4 text-xs text-gray-500 hover:text-white transition">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
