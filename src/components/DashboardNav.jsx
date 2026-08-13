import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Home, BookOpen, Gift, User, Sun, Moon, Trophy, Bell, X } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import { notifications as notificationsApi } from "../lib/api";

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition border
         ${
           isActive
             ? "bg-white/5 dark:bg-white/5 border-blue-500/40 text-blue-600 dark:text-white"
             : "bg-transparent border-transparent text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 hover:border-slate-200 dark:hover:border-gray-800"
         }`
      }
    >
      {children}
    </NavLink>
  );
}

const STORAGE_KEY = "wellness_notif_seen_count";

export default function DashboardNav({ points = 0, streakDays = 0, initials = "?", avatarUrl = null }) {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const [notifs, setNotifs] = useState([]);
  const [showBell, setShowBell] = useState(false);
  const bellRef = useRef(null);

  // Track unread count via localStorage
  const seenCount = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
  const unread = Math.max(0, notifs.length - seenCount);

  useEffect(() => {
    notificationsApi.list()
      .then((data) => setNotifs(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showBell) return;
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setShowBell(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showBell]);

  const openBell = () => {
    setShowBell((v) => !v);
    // Mark all as seen
    localStorage.setItem(STORAGE_KEY, String(notifs.length));
  };

  return (
    <header className="sticky top-0 z-50 bg-white/90 dark:bg-[#0b0b0b]/80 backdrop-blur border-b border-slate-200 dark:border-gray-900">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
        {/* Logo */}
        <button onClick={() => navigate("/dashboard")} className="flex items-center gap-3">
          <img src="/njit_logo.png" alt="NJIT" className="h-10 w-auto" onError={(e) => { e.currentTarget.style.display = "none"; }} />
          <div className="leading-tight text-left">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Campus Wellness Center</div>
            <div className="text-xs text-slate-500 dark:text-gray-400">NJIT</div>
          </div>
        </button>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-2">
          <NavItem to="/dashboard"><Home size={16} />Dashboard</NavItem>
          <NavItem to="/modules"><BookOpen size={16} />Modules</NavItem>
          <NavItem to="/rewards"><Gift size={16} />Rewards</NavItem>
          <NavItem to="/leaderboard"><Trophy size={16} />Leaderboard</NavItem>
          <NavItem to="/profile"><User size={16} />Profile</NavItem>
        </nav>

        {/* Right: stats + notifications + theme + avatar */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2">
            <div className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#121212] border border-slate-200 dark:border-gray-800 text-sm">
              <span className="text-slate-500 dark:text-gray-400">Points:</span>{" "}
              <span className="font-semibold text-slate-900 dark:text-white">{points}</span>
            </div>
            <div className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#121212] border border-slate-200 dark:border-gray-800 text-sm">
              <span className="text-slate-500 dark:text-gray-400">Streak:</span>{" "}
              <span className="font-semibold text-slate-900 dark:text-white">{streakDays}d</span>
            </div>
          </div>

          {/* Notification bell */}
          <div className="relative" ref={bellRef}>
            <button
              onClick={openBell}
              aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
              aria-expanded={showBell}
              aria-haspopup="true"
              className="relative h-10 w-10 rounded-xl bg-slate-100 dark:bg-[#121212] border border-slate-200 dark:border-gray-800 flex items-center justify-center text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition"
            >
              <Bell size={16} aria-hidden="true" />
              {unread > 0 && (
                <span aria-hidden="true" className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>

            {/* Notification dropdown */}
            {showBell && (
              <div className="absolute right-0 top-12 w-80 bg-white dark:bg-[#141414] border border-slate-200 dark:border-gray-800 rounded-2xl shadow-xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-gray-800">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</span>
                  <button onClick={() => setShowBell(false)} aria-label="Close notifications" className="text-slate-400 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300 transition">
                    <X size={14} aria-hidden="true" />
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-gray-800">
                  {notifs.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 dark:text-gray-500 text-sm">No notifications yet</div>
                  ) : (
                    notifs.map((n) => (
                      <div key={n.id} className="px-4 py-3">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">{n.title}</div>
                        {n.body && <div className="text-xs text-slate-500 dark:text-gray-400 mt-0.5 leading-relaxed">{n.body}</div>}
                        <div className="text-[10px] text-slate-400 dark:text-gray-600 mt-1">
                          {new Date(n.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggle}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-[#121212] border border-slate-200 dark:border-gray-800 flex items-center justify-center text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition"
          >
            {theme === "dark" ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
          </button>

          {/* Avatar */}
          <button
            onClick={() => navigate("/profile")}
            aria-label="Go to profile"
            className="h-10 w-10 rounded-2xl bg-slate-100 dark:bg-[#121212] border border-slate-200 dark:border-gray-800 flex items-center justify-center font-semibold text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-[#151515] transition overflow-hidden"
          >
            {avatarUrl
              ? <img src={avatarUrl} alt={initials} className="h-full w-full object-cover" />
              : initials}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden px-6 pb-3 flex items-center gap-1 overflow-x-auto">
        <NavItem to="/dashboard"><Home size={15} />Home</NavItem>
        <NavItem to="/modules"><BookOpen size={15} />Modules</NavItem>
        <NavItem to="/rewards"><Gift size={15} />Rewards</NavItem>
        <NavItem to="/leaderboard"><Trophy size={15} />Leaderboard</NavItem>
        <NavItem to="/profile"><User size={15} />Profile</NavItem>
      </div>
    </header>
  );
}
