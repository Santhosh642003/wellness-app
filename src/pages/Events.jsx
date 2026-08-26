import { useCallback, useEffect, useState } from "react";
import DashboardNav from "../components/DashboardNav";
import Footer from "../components/Footer";
import Toast from "../components/Toast";
import { useAuth } from "../contexts/AuthContext";
import { events as eventsApi, users as usersApi } from "../lib/api";

export default function Events() {
  const { user } = useAuth();
  const [points, setPoints] = useState(0);
  const [streakDays, setStreakDays] = useState(0);
  const [eventsList, setEventsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [selectedEventId, setSelectedEventId] = useState("");
  const [checking, setChecking] = useState(false);
  const [toast, setToast] = useState("");
  const [checkedInIds, setCheckedInIds] = useState(new Set());

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [evs, userData] = await Promise.all([
        eventsApi.list(),
        usersApi.get(user.id),
      ]);
      setEventsList(evs || []);
      setPoints(userData.progress?.points || 0);
      setStreakDays(userData.progress?.streakDays || 0);
    } catch (err) {
      console.error("Failed to load events", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const now = new Date();

  const isActive = (ev) => {
    const start = new Date(ev.startsAt);
    const end = new Date(new Date(ev.endsAt).getTime() + 30 * 60 * 1000);
    return now >= start && now <= end;
  };

  const handleCheckin = async (e) => {
    e.preventDefault();
    if (!selectedEventId || !code.trim()) return;
    setChecking(true);
    try {
      const result = await eventsApi.checkin(selectedEventId, code.trim());
      setCheckedInIds((prev) => new Set([...prev, selectedEventId]));
      setPoints((p) => p + (result.pointsEarned || 0));
      setToast(`✅ Checked in to "${result.eventTitle}"! +${result.pointsEarned} pts`);
      setCode("");
    } catch (err) {
      const msg = err.data?.error || err.message || "Check-in failed";
      setToast(`❌ ${msg}`);
    } finally {
      setChecking(false);
    }
  };

  const active = eventsList.filter(isActive);
  const upcoming = eventsList.filter((ev) => new Date(ev.startsAt) > now);
  const past = eventsList.filter((ev) => new Date(new Date(ev.endsAt).getTime() + 30 * 60 * 1000) < now);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-page)" }}>
        <div className="text-[var(--text-muted)] animate-pulse">Loading events…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-page)" }}>
      <DashboardNav points={points} streakDays={streakDays} initials={user?.initials || "?"} avatarUrl={user?.avatarUrl} />

      <main id="main-content" className="max-w-4xl mx-auto px-6 py-10 space-y-8 w-full">
        <header>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">Events</h1>
          <p className="text-slate-600 dark:text-gray-400 mt-2">Attend in-person events and earn 250 points per check-in</p>
        </header>

        {/* Check-in form */}
        {active.length > 0 && (
          <div className="bg-white dark:bg-[#121212] border border-emerald-500/20 rounded-2xl p-6">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Check In Now</h2>
            <p className="text-slate-600 dark:text-gray-400 text-sm mb-4">Select the event you're attending and enter the code shown at the event</p>
            <form onSubmit={handleCheckin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-gray-400 mb-1.5">Event</label>
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  required
                  className="w-full rounded-xl bg-slate-50 dark:bg-[#0f0f0f] border border-slate-200 dark:border-gray-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  <option value="">Select an event…</option>
                  {active.map((ev) => (
                    <option key={ev.id} value={ev.id} disabled={checkedInIds.has(ev.id)}>
                      {ev.title}{checkedInIds.has(ev.id) ? " (already checked in)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-gray-400 mb-1.5">Check-in Code</label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Enter code (e.g. AB1C2D)"
                  maxLength={10}
                  required
                  className="w-full rounded-xl bg-slate-50 dark:bg-[#0f0f0f] border border-slate-200 dark:border-gray-800 px-4 py-2.5 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 tracking-widest uppercase"
                />
              </div>
              <button
                type="submit"
                disabled={checking || !selectedEventId || !code.trim()}
                className="w-full px-5 py-3 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-emerald-500 text-white hover:opacity-90 disabled:opacity-50 transition"
              >
                {checking ? "Checking in…" : "Check In (+250 pts)"}
              </button>
            </form>
          </div>
        )}

        {/* Active events */}
        {active.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-emerald-500 uppercase tracking-wide mb-3">Live Now</h2>
            <div className="space-y-3">
              {active.map((ev) => (
                <EventCard key={ev.id} ev={ev} checkedIn={checkedInIds.has(ev.id)} badge="live" />
              ))}
            </div>
          </section>
        )}

        {/* Upcoming events */}
        {upcoming.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-slate-600 dark:text-gray-400 uppercase tracking-wide mb-3">Upcoming</h2>
            <div className="space-y-3">
              {upcoming.map((ev) => (
                <EventCard key={ev.id} ev={ev} checkedIn={false} badge="upcoming" />
              ))}
            </div>
          </section>
        )}

        {/* Past events */}
        {past.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-slate-600 dark:text-gray-400 uppercase tracking-wide mb-3">Past</h2>
            <div className="space-y-3">
              {past.map((ev) => (
                <EventCard key={ev.id} ev={ev} checkedIn={checkedInIds.has(ev.id)} badge="past" />
              ))}
            </div>
          </section>
        )}

        {eventsList.length === 0 && (
          <div className="text-center py-16 text-slate-600 dark:text-gray-500">
            <p className="text-lg">No events scheduled yet</p>
            <p className="text-sm mt-1">Check back soon for upcoming wellness events</p>
          </div>
        )}
      </main>

      <Toast message={toast} />
      <Footer />
    </div>
  );
}

function EventCard({ ev, checkedIn, badge }) {
  const start = new Date(ev.startsAt);
  const end = new Date(ev.endsAt);
  return (
    <div className={`bg-white dark:bg-[#121212] border rounded-2xl p-5 ${
      badge === 'live' ? 'border-emerald-500/30' : 'border-slate-200 dark:border-gray-800'
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {badge === 'live' && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            )}
            {checkedIn && (
              <span className="text-xs font-semibold text-blue-500 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">✓ Checked in</span>
            )}
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">{ev.title}</h3>
          {ev.description && (
            <p className="text-sm text-slate-600 dark:text-gray-400 mt-0.5">{ev.description}</p>
          )}
        </div>
        <span className="text-xs font-semibold text-emerald-500 shrink-0">+250 pts</span>
      </div>
      <div className="mt-3 text-xs text-slate-600 dark:text-gray-500">
        {start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} ·{' '}
        {start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} –{' '}
        {end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
      </div>
    </div>
  );
}
