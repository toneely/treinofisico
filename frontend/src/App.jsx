import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import History from './pages/History';
import Training from './pages/Training';
import Login from './pages/Login';
import Profile from './pages/Profile';
import UserSettings from './pages/UserSettings';

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

const App = () => {
  return (
    <Router>
      <div className="font-sans antialiased text-slate-900 bg-slate-50 min-h-screen">
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
    </Router>
  );
};

export default App;
