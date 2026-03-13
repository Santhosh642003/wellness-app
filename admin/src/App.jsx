import { Routes, Route, Navigate } from 'react-router-dom';
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

function Layout({ children }) {
  return (
    <div className="flex min-h-screen bg-gray-950">
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
