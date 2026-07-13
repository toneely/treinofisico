import React, { useEffect, useRef } from "react";
import { motion, useIsPresent } from "framer-motion";
import { useLocation } from "react-router-dom";

export const getRouteLevel = (pathname) => {
  if (pathname === "/app") return 1;
  if (pathname.startsWith("/historico")) return 2;
  if (pathname.startsWith("/perfil")) return 3;
  return 4;
};

const PageTransition = ({ children, bgClass = "bg-slate-50" }) => {
  const location = useLocation();
  const currentLevel = getRouteLevel(location.pathname);
  const isPresent = useIsPresent();
  const transitionRef = useRef(null);

  if (!transitionRef.current) {
    const prev = window.lastGlobalLevel || 1;
    const levelDifference = currentLevel - prev;
    const direction = levelDifference === 0 ? 1 : (levelDifference / Math.abs(levelDifference));
    const duration = (currentLevel === 4 || prev === 4) ? 0.8 : 0.3;
    transitionRef.current = { direction, duration };
    window.lastGlobalLevel = currentLevel;
  }

  const direction = transitionRef.current.direction;
  const duration = transitionRef.current.duration;

  const variants = {
    initial: (dir) => ({
      x: dir === -1 ? "-100%" : "100%",
    }),
    animate: {
      x: 0,
    },
    exit: (dir) => ({
      x: dir === -1 ? "100%" : "-100%",
    }),
  };

  return (
    <motion.div
      custom={direction}
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ type: "tween", ease: "easeInOut", duration }}
      className={"w-full min-h-screen relative " + bgClass}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
