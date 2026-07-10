import React, { useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";

const getRouteLevel = (pathname) => {
  if (pathname === "/app") return 1;
  if (pathname.startsWith("/historico")) return 2;
  if (pathname.startsWith("/perfil")) return 3;
  return 4; // internal pages / admin / training / etc.
};

const PageTransition = ({ children }) => {
  const location = useLocation();
  const currentLevel = getRouteLevel(location.pathname);

  // Track the previous route level across renders
  const prevLevelRef = useRef(currentLevel);

  useEffect(() => {
    prevLevelRef.current = currentLevel;
  }, [currentLevel]);

  const isBack = currentLevel < prevLevelRef.current;

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

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
