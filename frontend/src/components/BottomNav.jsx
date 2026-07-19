import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Dumbbell, History as HistoryIcon, User } from 'lucide-react';

const BottomNav = ({ isDemo = false, activeTab, onTabChange }) => {
  const { pathname } = useLocation();

  const isTabActive = (path) => {
    if (isDemo) {
      if (path === "/app") return activeTab === "inicio";
      if (path === "/historico") return activeTab === "historico";
      if (path === "/perfil") return activeTab === "perfil";
      return false;
    }
    if (path === "/app") {
      return pathname === "/app";
    }
    return pathname.startsWith(path);
  };

  const handleTabClick = (e, tab) => {
    if (isDemo) {
      e.preventDefault();
      onTabChange?.(tab);
    }
  };

  return (
    <nav className={`fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 flex justify-around items-center ${isDemo ? "z-[110] demo-bottom-nav" : "z-50 standard-bottom-nav"}`}>
      <Link
        to={isDemo ? "#" : "/app"}
        onClick={(e) => handleTabClick(e, "inicio")}
        className="flex flex-col items-center gap-1"
        style={{ color: isTabActive("/app") ? "var(--color-primary-safe)" : undefined }}
      >
        <Dumbbell size={24} className={isTabActive("/app") ? "" : "text-slate-400"} />
        <span className={`text-[10px] font-bold uppercase ${isTabActive("/app") ? "" : "text-slate-400"}`}>Treinos</span>
      </Link>
      <Link
        to={isDemo ? "#" : "/historico"}
        onClick={(e) => handleTabClick(e, "historico")}
        className="flex flex-col items-center gap-1"
        style={{ color: isTabActive("/historico") ? "var(--color-primary-safe)" : undefined }}
      >
        <HistoryIcon size={24} className={isTabActive("/historico") ? "" : "text-slate-400"} />
        <span className={`text-[10px] font-bold uppercase ${isTabActive("/historico") ? "" : "text-slate-400"}`}>Histórico</span>
      </Link>
      <Link
        to={isDemo ? "#" : "/perfil"}
        onClick={(e) => handleTabClick(e, "perfil")}
        className="flex flex-col items-center gap-1"
        style={{ color: isTabActive("/perfil") ? "var(--color-primary-safe)" : undefined }}
      >
        <User size={24} className={isTabActive("/perfil") ? "" : "text-slate-400"} />
        <span className={`text-[10px] font-bold uppercase ${isTabActive("/perfil") ? "" : "text-slate-400"}`}>Perfil</span>
      </Link>
    </nav>
  );
};

export default BottomNav;
