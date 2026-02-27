import { NavLink, useNavigate } from "react-router-dom";
import { Home, BookOpen, Gift, User } from "lucide-react";

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition border
         ${
           isActive
             ? "bg-white/5 border-blue-500/40 text-white shadow-[0_0_0_1px_rgba(59,130,246,0.15)]"
             : "bg-transparent border-transparent text-gray-300 hover:text-white hover:bg-white/5 hover:border-gray-800"
         }`
      }
    >
      {children}
    </NavLink>
  );
}

export default function DashboardNav({
  points = 0,
  streakDays = 0,
  initials = "SN",
}) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 bg-[#0b0b0b]/80 backdrop-blur border-b border-gray-900">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
        {/* Left: Logo / Title */}
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-3"
        >
          <img
            src="/njit_logo.png"
            alt="NJIT"
            className="h-10 w-auto"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />

          <div className="leading-tight text-left">
            <div className="text-sm font-semibold text-white">
              Campus Wellness Center
            </div>
            <div className="text-xs text-gray-400">NJIT</div>
          </div>
        </button>

        {/* Center: Nav (desktop) */}
        <nav className="hidden md:flex items-center gap-2">
          <NavItem to="/dashboard">
            <Home size={16} />
            Dashboard
          </NavItem>

          <NavItem to="/modules">
            <BookOpen size={16} />
            Modules
          </NavItem>

          <NavItem to="/rewards">
            <Gift size={16} />
            Rewards
          </NavItem>

        </nav>

        {/* Right: Stats + Profile */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2">
            <div className="px-4 py-2 rounded-xl bg-[#121212] border border-gray-800 text-sm">
              <span className="text-gray-400">Points:</span>{" "}
              <span className="font-semibold text-white">{points}</span>
            </div>

            <div className="px-4 py-2 rounded-xl bg-[#121212] border border-gray-800 text-sm">
              <span className="text-gray-400">Streak:</span>{" "}
              <span className="font-semibold text-white">{streakDays} days</span>
            </div>
          </div>

          {/* ✅ Clickable profile avatar */}
          <button
            onClick={() => navigate("/profile")}
            title="Profile"
            className="h-10 w-10 rounded-2xl bg-[#121212] border border-gray-800 flex items-center justify-center font-semibold text-white hover:bg-[#151515] transition hover:ring-2 hover:ring-blue-500/40
"
          >
            {initials}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden px-6 pb-4 flex items-center gap-2">
        <NavItem to="/dashboard">
          <Home size={16} />
          Dashboard
        </NavItem>

        <NavItem to="/modules">
          <BookOpen size={16} />
          Modules
        </NavItem>

        <NavItem to="/rewards">
          <Gift size={16} />
          Rewards
        </NavItem>


        <NavItem to="/profile">
          <User size={16} />
          Profile
        </NavItem>
      </div>
    </header>
  );
}
