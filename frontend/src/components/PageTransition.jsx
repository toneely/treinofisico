import React, { useState, createContext, useContext, useRef } from "react";
import { motion, useIsPresent } from "framer-motion";
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

export const TransitionContext = createContext(null);

const PageTransition = ({ children, bgClass = "bg-slate-50" }) => {
  const location = useLocation();
  const isDeep = getTabLevel(location.pathname) === null;
  const positionClass = isDeep ? 'fixed' : 'absolute';

  const contextCustom = useContext(TransitionContext);
  const isPresent = useIsPresent();
  const latestCustomRef = useRef(contextCustom);

  if (isPresent && contextCustom) {
    latestCustomRef.current = contextCustom;
  }

  const custom = isPresent ? contextCustom : latestCustomRef.current;

  const variants = {
    initial: (custom) => {
      const { type = 'tab', dir = 1 } = custom || {};
      if (type === 'toDeep') {
        return {
          x: '100%',
          zIndex: 60,
          transition: { type: "tween", ease: "easeInOut", duration: 0.4 }
        };
      }
      if (type === 'fromDeep') {
        return {
          x: 0,
          zIndex: 10,
          transition: { type: "tween", ease: "easeInOut", duration: 0.4 }
        };
      }
      return {
        x: dir === 1 ? '100%' : '-100%',
        zIndex: 10,
        transition: { type: "tween", ease: "easeInOut", duration: 0.3 }
      };
    },
    animate: () => ({
      x: 0,
      zIndex: isDeep ? 60 : 10,
      transition: isDeep
        ? { type: "tween", ease: "easeInOut", duration: 0.8 }
        : { type: "tween", ease: "easeInOut", duration: 0.3 }
    }),
    exit: (custom) => {
      const { type = 'tab', dir = 1 } = custom || {};
      if (type === 'toDeep') {
        return {
          x: 0,
          zIndex: 10,
          transition: { type: "tween", ease: "easeInOut", duration: 0.4 }
        };
      }
      if (type === 'fromDeep') {
        return {
          x: '100%',
          zIndex: 60,
          transition: { type: "tween", ease: "easeInOut", duration: 0.4 }
        };
      }
      return {
        x: dir === 1 ? '-100%' : '100%',
        zIndex: 10,
        transition: { type: "tween", ease: "easeInOut", duration: 0.3 }
      };
    }
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      custom={custom}
      variants={variants}
      transition={{ type: "tween", ease: "easeInOut" }}
      className={"w-full min-h-screen top-0 left-0 " + positionClass + " " + bgClass}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
