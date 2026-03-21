import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Modules from "./pages/Modules.jsx";
import Rewards from "./pages/Rewards.jsx";
import ModulePlayer from "./pages/ModulePlayer.jsx";
import Profile from "./pages/Profile.jsx";
import BiWeeklyQuiz from "./pages/BiWeeklyQuiz.jsx";
import ModuleQuiz from "./pages/ModuleQuiz.jsx";
import Leaderboard from "./pages/Leaderboard.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import NotFound from "./pages/NotFound.jsx";
import { useAuth } from "./contexts/AuthContext.jsx";

function ProtectedRoute({ children }) {
  const { isLoggedIn, loading } = useAuth();
  if (loading) return null;
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/modules" element={<ProtectedRoute><Modules /></ProtectedRoute>} />
      <Route path="/modules/:moduleId" element={<ProtectedRoute><ModulePlayer /></ProtectedRoute>} />
      <Route path="/rewards" element={<ProtectedRoute><Rewards /></ProtectedRoute>} />
      <Route path="/quiz/biweekly" element={<ProtectedRoute><BiWeeklyQuiz /></ProtectedRoute>} />
      <Route path="/quiz/module/:moduleId" element={<ProtectedRoute><ModuleQuiz /></ProtectedRoute>} />
      <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
