import React, { useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";

let globalPrevLevel = 1;

export const getRouteLevel = (pathname) => {
  if (pathname === "/app") return 1;
  if (pathname.startsWith("/historico")) return 2;
  if (pathname.startsWith("/perfil")) return 3;
  return 4;
};

const PageTransition = ({ children, bgClass = "bg-slate-50" }) => {
  const location = useLocation();
  const [config] = useState(() => {
    const currentLevel = getRouteLevel(location.pathname);
    const prevLevel = globalPrevLevel;
    const direction = Math.sign(currentLevel - prevLevel);
    globalPrevLevel = currentLevel;
    return {
      level: currentLevel,
      direction,
      isOverlay: currentLevel === 4 || prevLevel === 4
    };
  });

  const variants = config.isOverlay ? {
    // Regras exclusivas para o Nivel 4 (Overlay)
    initial: { x: config.level === 4 ? "100%" : "-20%", zIndex: 50 },
    animate: { x: 0, zIndex: 50 },
    exit: { x: config.level === 4 ? "-20%" : "100%", zIndex: 50 }
  } : {
    // Regras para as Abas Principais (Niveis 1, 2 e 3)
    initial: { x: config.direction === 1 ? "100%" : "-100%", zIndex: 10 },
    animate: { x: 0, zIndex: 10 },
    exit: { x: config.direction === 1 ? "-100%" : "100%", zIndex: 10 }
  };

  const duration = config.isOverlay ? 0.8 : 0.3;

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      transition={{ type: "tween", ease: "easeInOut", duration: duration }}
      className={"w-full min-h-screen absolute top-0 left-0 " + bgClass}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
