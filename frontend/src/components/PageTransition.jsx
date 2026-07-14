import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";

export const getRouteLevel = (pathname) => {
  if (pathname === "/app") return 1;
  if (pathname.startsWith("/historico")) return 2;
  if (pathname.startsWith("/perfil")) return 3;
  return 4;
};

const PageTransition = ({ children, bgClass = "bg-slate-50" }) => {
  const location = useLocation();
  const initialLevel = React.useRef(getRouteLevel(location.pathname));
  const transitionData = React.useRef(null);

  if (!transitionData.current) {
    const current = initialLevel.current;
    const prev = typeof window !== "undefined" ? (window.lastGlobalLevel || 1) : 1;

    // Calculo de direcao usando subtracao aritmetica simples
    const diff = current - prev;
    const dir = diff === 0 ? 1 : (diff / Math.abs(diff));
    const dur = (current === 4 || prev === 4) ? 0.8 : 0.3;

    transitionData.current = { direction: dir, duration: dur };

    if (typeof window !== "undefined") {
      window.lastGlobalLevel = current;
    }
  }

  const direction = transitionData.current.direction;
  const duration = transitionData.current.duration;

  const variants = {
    initial: (dir) => ({ x: dir === -1 ? "-100%" : "100%" }),
    animate: { x: 0 },
    exit: (dir) => ({ x: dir === -1 ? "100%" : "-100%" })
  };

  return (
    <motion.div
      custom={direction}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      transition={{ type: "tween", ease: "easeInOut", duration: duration }}
      className={"w-full min-h-screen relative " + bgClass}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
