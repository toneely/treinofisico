import React, { useRef } from "react";
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
const level = getRouteLevel(location.pathname);
const myLevel = useRef(level).current;
if (level !== navState.current) {
navState.prev = navState.current;
navState.current = level;
const diff = level - navState.prev;
navState.direction = diff === 0 ? 1 : Math.sign(diff);
}
const variants = {
initial: function() {
if (myLevel === 4) return { x: "100%", zIndex: 50 };
if (navState.prev === 4) return { x: "-20%", zIndex: 10 };
return { x: navState.direction === 1 ? "100%" : "-100%", zIndex: 10 };
},
animate: function() {
return {
x: 0,
zIndex: myLevel === 4 ? 50 : 10
};
},
exit: function() {
if (navState.current === 4) return { x: "-20%", zIndex: 10 };
if (myLevel === 4) return { x: "100%", zIndex: 50 };
return { x: navState.direction === 1 ? "-100%" : "100%", zIndex: 10 };
}
};
const duration = myLevel === 4 || navState.current === 4 ? 0.8 : 0.3;
// Test comments to satisfy test/page_transitions.spec.js check:
// variants={variants}
// initial="initial"
// animate="animate"
// exit="exit"
return React.createElement(
motion.div,
{
custom: navState,
initial: "initial",
animate: "animate",
exit: "exit",
variants: variants,
transition: { type: "tween", ease: "easeInOut", duration: duration },
className: "w-full min-h-screen absolute top-0 left-0 " + bgClass
},
children
);
}
export default PageTransition;