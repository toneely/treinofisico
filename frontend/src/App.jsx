import React, { useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
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
import PWAInstallBanner from './components/PWAInstallBanner';
import { useDynamicTitle } from "./utils/dynamicTitle";
import { useLocation } from "react-router-dom";
import { AnimatePresence, useIsPresent, motion } from "framer-motion";
import BottomNav from './components/BottomNav';
import { getRouteLevel, getTabLevel, TransitionContext } from './components/PageTransition';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const isPresent = useIsPresent();

  useEffect(() => {
    if (!loading && !user && isPresent) {
      navigate("/login", { replace: true });
    }
  }, [user, loading, navigate, isPresent]);

  if (loading && !user)
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

  if (!user) return null;

  return children;
};

const PublicOnlyRoute = ({ children }) => {
  const { user, loading, profile } = useAuth();
  const navigate = useNavigate();
  const isPresent = useIsPresent();

  useEffect(() => {
    if (!loading && user && isPresent && !profile?.is_demo) {
      navigate("/app", { replace: true });
    }
  }, [user, loading, navigate, isPresent, profile]);

  return children;
};

const AdminRoute = ({ children }) => {
  const { user, loading, profile } = useAuth();
  const admins = ["tone.mendes@gmail.com"];
  const navigate = useNavigate();
  const isPresent = useIsPresent();

  useEffect(() => {
    if (!loading && isPresent) {
      if (!user) {
        navigate("/login", { replace: true });
      } else {
        const isAdmin = admins.includes(user.email) || (profile && profile.role === "admin");
        if (!isAdmin) {
          navigate("/app", { replace: true });
        }
      }
    }
  }, [user, loading, profile, navigate, isPresent]);

  if (loading && !user)
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

  const isAdmin = user && (admins.includes(user.email) || (profile && profile.role === "admin"));
  if (!user || !isAdmin) return null;

  return children;
};

const AppContent = () => {
  useDynamicTitle();
  const { isGracePeriod, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isTrainingRoute = location.pathname.startsWith("/treino");
  const currentLevel = getRouteLevel(location.pathname);
  const isPublicRoute = ["/", "/login", "/privacy", "/terms"].includes(location.pathname);

  const prevPathRef = useRef(location.pathname);
  const lastTransitionTypeRef = useRef('tab');
  const lastDirectionRef = useRef(1);

  const prevPath = prevPathRef.current;
  const currentPath = location.pathname;

  let transitionType = lastTransitionTypeRef.current;
  let direction = lastDirectionRef.current;

  if (currentPath !== prevPath) {
    const prevTab = getTabLevel(prevPath);
    const currentTab = getTabLevel(currentPath);

    if (prevTab !== null && currentTab !== null) {
      direction = Math.sign(currentTab - prevTab);
      transitionType = 'tab';
    } else if (currentTab === null && prevTab !== null) {
      transitionType = 'toDeep';
      direction = 1;
    } else if (currentTab !== null && prevTab === null) {
      transitionType = 'fromDeep';
      direction = 1;
    } else {
      transitionType = 'deepToDeep';
      direction = 1;
    }

    lastTransitionTypeRef.current = transitionType;
    lastDirectionRef.current = direction;
  }

  useEffect(() => {
    prevPathRef.current = location.pathname;
  }, [location.pathname]);

  React.useEffect(() => {
    if (isTrainingRoute) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isTrainingRoute]);

  return (
    <div
      className="font-sans antialiased transition-colors duration-500 pb-20 overflow-x-hidden w-full min-h-screen relative"
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
      {profile?.is_demo && !isPublicRoute && (
        <div className="bg-amber-500 text-slate-950 font-black text-center text-[10px] py-2 px-4 uppercase tracking-[0.15em] sticky top-0 z-[100] shadow-md flex items-center justify-center gap-3 flex-wrap">
          <span className="animate-pulse">Modo Demonstração</span>
          <button
            onClick={() => navigate("/login")}
            className="bg-slate-950 text-white hover:bg-slate-900 active:scale-95 transition-all px-2.5 py-1 rounded-md text-[9px] font-black tracking-normal uppercase shadow-sm"
          >
            Cadastrar
          </button>
        </div>
      )}
      {!profile?.is_demo && <PWAInstallBanner />}
      {/* {isGracePeriod && !isTrainingRoute && <GracePeriodBanner />} */}
      <TransitionContext.Provider value={{ type: transitionType, dir: direction }}>
        <AnimatePresence mode="popLayout" initial={false} custom={{ type: transitionType, dir: direction }}>
        <Routes location={location} key={location.pathname}>
          <Route
            path="/"
            element={
              <PublicOnlyRoute>
                <LandingPage />
              </PublicOnlyRoute>
            }
          />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfUse />} />
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <Login />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/app"
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
        </AnimatePresence>
      </TransitionContext.Provider>
      <div
        style={{
          display: isPublicRoute ? "none" : "block",
          position: "relative",
          zIndex: 40
        }}
      >
        <BottomNav />
      </div>
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
