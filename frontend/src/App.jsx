import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AppearanceProvider } from './context/AppearanceContext';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import History from './pages/History';
import Training from './pages/Training';
import Login from './pages/Login';
import Profile from './pages/Profile';
import UserSettings from './pages/UserSettings';
import { useDynamicTitle } from './utils/dynamicTitle';
import { useLocation } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">Carregando...</div>;
  if (!user) return <Navigate to="/login" />;

  return children;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const admins = ['tone.mendes@gmail.com'];

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">Carregando...</div>;
  if (!user || !admins.includes(user.email)) return <Navigate to="/" />;

  return children;
};

const AppContent = () => {
  useDynamicTitle();
  const location = useLocation();
  const isTrainingRoute = location.pathname.startsWith('/treino');

  React.useEffect(() => {
    if (isTrainingRoute) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isTrainingRoute]);

  return (
    <div className={`font-sans antialiased transition-colors duration-500 min-h-screen ${
      isTrainingRoute ? 'bg-[var(--bg-treino)] text-white' : 'bg-[var(--bg-gestao)] text-slate-900'
    }`}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
        <Route path="/configuracoes" element={<ProtectedRoute><UserSettings /></ProtectedRoute>} />
        <Route path="/historico" element={<ProtectedRoute><History /></ProtectedRoute>} />
        <Route path="/treino/:letra" element={<ProtectedRoute><Training /></ProtectedRoute>} />
        <Route path="/perfil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      </Routes>
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <AppearanceProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </AppearanceProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
