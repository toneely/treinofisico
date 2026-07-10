import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Dumbbell, History as HistoryIcon, User } from 'lucide-react';

const BottomNav = () => {
  const { pathname } = useLocation();

  // Se o pathname NAO for "/app" E NAO comecar com "/historico" E NAO comecar com "/perfil", retorne null
  if (pathname !== "/app" && !pathname.startsWith("/historico") && !pathname.startsWith("/perfil")) {
    return null;
  }

  const isTabActive = (path) => {
    if (path === "/app") {
      return pathname === "/app";
    }
    return pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 flex justify-around items-center z-50">
      <Link
        to="/app"
        className="flex flex-col items-center gap-1"
        style={{ color: isTabActive("/app") ? "var(--color-primary-safe)" : undefined }}
      >
        <Dumbbell size={24} className={isTabActive("/app") ? "" : "text-slate-400"} />
        <span className={`text-[10px] font-bold uppercase ${isTabActive("/app") ? "" : "text-slate-400"}`}>Treinos</span>
      </Link>
      <Link
        to="/historico"
        className="flex flex-col items-center gap-1"
        style={{ color: isTabActive("/historico") ? "var(--color-primary-safe)" : undefined }}
      >
        <HistoryIcon size={24} className={isTabActive("/historico") ? "" : "text-slate-400"} />
        <span className={`text-[10px] font-bold uppercase ${isTabActive("/historico") ? "" : "text-slate-400"}`}>Histórico</span>
      </Link>
      <Link
        to="/perfil"
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
