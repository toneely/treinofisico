import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";

export const getRouteLevel = (pathname) => {
  if (pathname === "/app") return 1;
  if (pathname.includes("/historico")) return 2;
  if (pathname.includes("/perfil")) return 3;
  return 4; // other pages
};

// Initialize global window variables if not already set
if (typeof window !== "undefined") {
  if (typeof window.prevLevel === "undefined") {
    window.prevLevel = 1;
  }
  if (typeof window.navDirection === "undefined") {
    window.navDirection = 1;
  }
  if (typeof window.navDuration === "undefined") {
    window.navDuration = 0.3;
  }
}

const PageTransition = ({ children, bgClass = "bg-slate-50" }) => {
  const location = useLocation();
  const currentLevel = getRouteLevel(location.pathname);

  if (typeof window !== "undefined" && window.prevLevel !== currentLevel) {
    window.navDirection = (currentLevel < window.prevLevel) ? -1 : 1;
    window.navDuration = (currentLevel === 4 || window.prevLevel === 4) ? 0.8 : 0.3;
    window.prevLevel = currentLevel;
  }

  const variants = {
    initial: (direction) => ({
      x: direction === -1 ? "-100%" : "100%"
    }),
    animate: {
      x: 0
    },
    exit: () => ({
      x: window.navDirection === -1 ? "100%" : "-100%"
    })
  };

  const navDuration = typeof window !== "undefined" ? (window.navDuration || 0.3) : 0.3;

  return (
    <motion.div
      custom={window.navDirection}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      transition={{ type: "tween", ease: "easeInOut", duration: navDuration }}
      className={`w-full min-h-screen relative ${bgClass}`}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
