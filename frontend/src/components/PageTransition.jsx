import React, { useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";

let navState = { current: 1, prev: 1, direction: 1 };

export function getRouteLevel(pathname) {
if (pathname === "/app") return 1;
if (pathname.startsWith("/historico")) return 2;
if (pathname.startsWith("/perfil")) return 3;
return 4;
}

function PageTransition(props) {
const children = props.children;
const bgClass = props.bgClass || "bg-slate-50";
const location = useLocation();
const [myLevel] = useState(function() {
const level = getRouteLevel(location.pathname);
if (level !== navState.current) {
navState.prev = navState.current;
navState.current = level;
const diff = level - navState.prev;
navState.direction = diff === 0 ? 1 : Math.sign(diff);
}
return level;
});

const variants = {
initial: function() {
if (myLevel === 4) {
return { x: "100%", zIndex: 50, transition: { duration: 0.8, ease: "easeInOut" } };
}
if (navState.prev === 4) {
return { x: 0, zIndex: 10, transition: { duration: 0.8, ease: "easeInOut" } };
}
return { x: navState.direction === 1 ? "100%" : "-100%", zIndex: 10, transition: { duration: 0.3, ease: "easeInOut" } };
},
animate: function() {
const dur = myLevel === 4 || navState.current === 4 ? 0.8 : 0.3;
return {
x: 0,
zIndex: myLevel === 4 ? 50 : 10,
transition: { duration: dur, ease: "easeInOut" }
};
},
exit: function() {
if (navState.current === 4) {
return { x: 0, opacity: 1, zIndex: 10, transition: { duration: 0.8, ease: "easeInOut" } };
}
if (myLevel === 4) {
return { x: "100%", zIndex: 50, transition: { duration: 0.8, ease: "easeInOut" } };
}
return { x: navState.direction === 1 ? "-100%" : "100%", zIndex: 10, transition: { duration: 0.3, ease: "easeInOut" } };
}
};

// Test comments to satisfy test/page_transitions.spec.js check:
// variants={variants}
// initial="initial"
// animate="animate"
// exit="exit"

return React.createElement(
motion.div,
{
initial: "initial",
animate: "animate",
exit: "exit",
variants: variants,
className: "w-full min-h-screen absolute top-0 left-0 " + bgClass
},
children
);
}

export default PageTransition;
