import React from "react";
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
  const level = getRouteLevel(location.pathname);

  // Telas de nivel 4 funcionam como um Overlay que desliza por cima de tudo
  const isOverlay = level === 4;

  const variants = isOverlay ? {
    initial: { x: "100%", opacity: 1, zIndex: 50 },
    animate: { x: 0, opacity: 1, zIndex: 50 },
    exit: { x: "100%", opacity: 1, zIndex: 50 }
  } : {
    initial: { opacity: 0, scale: 0.98, zIndex: 10 },
    animate: { opacity: 1, scale: 1, zIndex: 10 },
    exit: { opacity: 0, scale: 0.98, zIndex: 10 }
  };

  const duration = isOverlay ? 0.4 : 0.2;

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
