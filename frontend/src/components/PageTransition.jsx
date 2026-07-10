import React, { useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";

const getRouteLevel = (pathname) => {
  if (pathname === "/app") return 1;
  if (pathname.includes("/historico")) return 2;
  if (pathname.includes("/perfil")) return 3;
  return 4; // other pages (WorkoutTemplates / Training / etc.)
};

// Persistent prevLevel object across mounts/unmounts of child components
const prevLevel = { current: 1 };

const PageTransition = ({ children }) => {
  const location = useLocation();
  const currentLevel = getRouteLevel(location.pathname);

  const isBack = currentLevel < prevLevel.current;

  useEffect(() => {
    prevLevel.current = currentLevel;
  }, [currentLevel]);

  const variants = {
    initial: {
      x: isBack ? "-100%" : "100%"
    },
    animate: {
      x: 0
    },
    exit: {
      x: isBack ? "100%" : "-100%"
    }
  };

  const isTrainingRoute = location.pathname.startsWith("/treino");

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
      className="absolute top-0 left-0 w-full min-h-screen z-10 overflow-x-hidden"
      style={{
        backgroundColor: isTrainingRoute ? "var(--bg-treino)" : "var(--bg-gestao)",
      }}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
