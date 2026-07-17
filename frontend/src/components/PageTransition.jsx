import React from "react";
import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";

let globalPrevLevel = 1;

export const getRouteLevel = (pathname) => {
  if (pathname === "/app") return 1;
  if (pathname.startsWith("/historico")) return 2;
  if (pathname.startsWith("/perfil")) return 3;
  return 4;
};

export const getTabLevel = (pathname) => {
  if (pathname === '/app') return 1;
  if (pathname.startsWith('/historico')) return 2;
  if (pathname.startsWith('/perfil')) return 3;
  return null;
};

const PageTransition = ({ children, bgClass = "bg-slate-50" }) => {
  const location = useLocation();
  const isDeep = getTabLevel(location.pathname) === null;
  const positionClass = isDeep ? 'fixed' : 'absolute';

  const variants = {
    initial: (custom) => {
      const type = custom?.type || 'tab';
      const dir = custom?.dir || 1;
      if (type === 'toDeep') {
        return {
          x: '100%',
          zIndex: 60
        };
      }
      if (type === 'fromDeep') {
        return {
          x: 0,
          zIndex: 10
        };
      }
      return {
        x: dir === 1 ? '100%' : '-100%',
        zIndex: 10
      };
    },
    animate: () => ({
      x: 0,
      zIndex: isDeep ? 60 : 10
    }),
    exit: (custom) => {
      const type = custom?.type || 'tab';
      const dir = custom?.dir || 1;
      if (type === 'toDeep') {
        return {
          x: 0,
          zIndex: 10
        };
      }
      if (type === 'fromDeep') {
        return {
          x: '100%',
          zIndex: 60
        };
      }
      return {
        x: dir === 1 ? '-100%' : '100%',
        zIndex: 10
      };
    }
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      transition={{ type: 'tween', ease: 'easeInOut', duration: 0.8 }}
      className={"w-full min-h-screen top-0 left-0 " + positionClass + " " + bgClass}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
