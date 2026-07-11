import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";

const getRouteLevel = (pathname) => {
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
}

const PageTransition = ({ children }) => {
  const location = useLocation();
  const currentLevel = getRouteLevel(location.pathname);

  if (typeof window !== "undefined" && window.prevLevel !== currentLevel) {
    window.navDirection = (currentLevel < window.prevLevel) ? -1 : 1;
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

  return (
    <motion.div
      custom={window.navDirection}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      transition={{ type: "tween", ease: "easeInOut", duration: 1 }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
