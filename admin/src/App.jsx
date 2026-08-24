import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from './contexts/AuthContext.jsx';
import Sidebar from './components/Sidebar.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Users from './pages/Users.jsx';
import UserDetail from './pages/UserDetail.jsx';
import Modules from './pages/Modules.jsx';
import Quizzes from './pages/Quizzes.jsx';
import Rewards from './pages/Rewards.jsx';
import Redemptions from './pages/Redemptions.jsx';
import Notifications from './pages/Notifications.jsx';
import RewardPool from './pages/RewardPool.jsx';
import Events from './pages/Events.jsx';

function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="flex min-h-screen bg-gray-950">
      {/* Mobile/tablet overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — always visible on lg+, drawer on smaller screens */}
      <div className={`fixed lg:static inset-y-0 left-0 z-50 w-64 transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile/tablet top bar with hamburger */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-gray-900 border-b border-gray-800 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
          >
            <Menu size={20} />
          </button>
          <span className="text-white font-semibold text-sm">Wellness Admin</span>
        </div>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

function Protected({ children }) {
  const { admin } = useAuth();
  if (!admin) return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/users" element={<Protected><Users /></Protected>} />
      <Route path="/users/:id" element={<Protected><UserDetail /></Protected>} />
      <Route path="/modules" element={<Protected><Modules /></Protected>} />
      <Route path="/quizzes" element={<Protected><Quizzes /></Protected>} />
      <Route path="/rewards" element={<Protected><Rewards /></Protected>} />
      <Route path="/redemptions" element={<Protected><Redemptions /></Protected>} />
      <Route path="/notifications" element={<Protected><Notifications /></Protected>} />
      <Route path="/reward-pool" element={<Protected><RewardPool /></Protected>} />
      <Route path="/events" element={<Protected><Events /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
