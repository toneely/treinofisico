import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Inicio from './pages/Inicio';
import LandingPage from './pages/LandingPage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfUse from './pages/TermsOfUse';
import Admin from './pages/Admin';
import AdminUserDashboard from './pages/AdminUserDashboard';
import History from './pages/History';
import Training from './pages/Training';
import Login from './pages/Login';
import Profile from './pages/Profile';
import WorkoutTemplates from './pages/WorkoutTemplates';
import GracePeriodBanner from './components/ui/GracePeriodBanner';
import { useDynamicTitle } from "./utils/dynamicTitle";
import { useLocation } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading)
    return (
      <div
        className="min-h-screen flex items-center justify-center text-white"
        style={{
          backgroundColor: "var(--bg-gestao)",
          color: "var(--text-on-gestao)",
        }}
      >
        Carregando...
      </div>
    );
  if (!user) return <Navigate to="/login" />;

  return children;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const admins = ["tone.mendes@gmail.com"];

  if (loading)
    return (
      <div
        className="min-h-screen flex items-center justify-center text-white"
        style={{
          backgroundColor: "var(--bg-gestao)",
          color: "var(--text-on-gestao)",
        }}
      >
        Carregando...
      </div>
    );
  if (!user || !admins.includes(user.email)) return <Navigate to="/dashboard" />;

  return children;
};

const AppContent = () => {
  useDynamicTitle();
  const { isGracePeriod } = useAuth();
  const location = useLocation();
  const isTrainingRoute = location.pathname.startsWith("/treino");

  React.useEffect(() => {
    if (isTrainingRoute) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isTrainingRoute]);

  return (
    <div
      className="font-sans antialiased transition-colors duration-500 min-h-screen"
      style={{
        backgroundColor: isTrainingRoute
          ? "var(--bg-treino)"
          : "var(--bg-gestao)",
        color: isTrainingRoute
          ? "var(--text-on-treino)"
          : "var(--text-on-gestao)",
        paddingTop: "0px",
      }}
    >
      {/* {isGracePeriod && !isTrainingRoute && <GracePeriodBanner />} */}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfUse />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Inicio />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <Admin />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/user/:userId"
          element={
            <AdminRoute>
              <AdminUserDashboard />
            </AdminRoute>
          }
        />
        <Route
          path="/historico"
          element={
            <ProtectedRoute>
              <History />
            </ProtectedRoute>
          }
        />
        <Route
          path="/treino/:letra"
          element={
            <ProtectedRoute>
              <Training />
            </ProtectedRoute>
          }
        />
        <Route
          path="/perfil"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gerenciar-treinos"
          element={
            <ProtectedRoute>
              <WorkoutTemplates />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;
