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

function isLoggedIn() {
  return localStorage.getItem("wellness_logged_in") === "true";
}

function ProtectedRoute({ children }) {
  if (!isLoggedIn()) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />

      {/* Protected */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />

      <Route
        path="/modules"
        element={
          <ProtectedRoute>
            <Modules />
          </ProtectedRoute>
        }
      />

      <Route
        path="/modules/:moduleId"
        element={
          <ProtectedRoute>
            <ModulePlayer />
          </ProtectedRoute>
        }
      />

      <Route
        path="/rewards"
        element={
          <ProtectedRoute>
            <Rewards />
          </ProtectedRoute>
        }
      />

      <Route
        path="/quiz/biweekly"
        element={
          <ProtectedRoute>
            <BiWeeklyQuiz />
          </ProtectedRoute>
        }
      />

      <Route
        path="/quiz/module/:moduleId"
        element={
          <ProtectedRoute>
            <ModuleQuiz />
          </ProtectedRoute>
        }
      />



      
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
