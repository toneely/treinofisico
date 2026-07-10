import React from "react";
import { motion } from "framer-motion";

const PageTransition = ({ children }) => {
  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "-100%" }}
      transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
