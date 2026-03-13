import { NavLink, useNavigate } from "react-router-dom";
import { Home, BookOpen, Gift, User, Sun, Moon } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

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

export default function DashboardNav({ points = 0, streakDays = 0, initials = "SN" }) {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();

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
          <NavItem to="/profile"><User size={16} />Profile</NavItem>
        </nav>

        {/* Right: stats + theme + avatar */}
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

          {/* Theme toggle */}
          <button
            onClick={toggle}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-[#121212] border border-slate-200 dark:border-gray-800 flex items-center justify-center text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Avatar */}
          <button
            onClick={() => navigate("/profile")}
            title="Profile"
            className="h-10 w-10 rounded-2xl bg-slate-100 dark:bg-[#121212] border border-slate-200 dark:border-gray-800 flex items-center justify-center font-semibold text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-[#151515] transition"
          >
            {initials}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden px-6 pb-3 flex items-center gap-1 overflow-x-auto">
        <NavItem to="/dashboard"><Home size={15} />Home</NavItem>
        <NavItem to="/modules"><BookOpen size={15} />Modules</NavItem>
        <NavItem to="/rewards"><Gift size={15} />Rewards</NavItem>
        <NavItem to="/profile"><User size={15} />Profile</NavItem>
      </div>
    </header>
  );
}
