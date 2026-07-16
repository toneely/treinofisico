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

const dur = (myLevel === 4 || navState.current === 4 || navState.prev === 4) ? 0.8 : 0.3;

let initialObj, animateObj, exitObj;

if (myLevel === 4) {
initialObj = { x: "100%", opacity: 1, zIndex: 50 };
} else if (navState.prev === 4) {
initialObj = { x: 0, opacity: 0.98, zIndex: 10 };
} else {
initialObj = { x: navState.direction === 1 ? "100%" : "-100%", opacity: 1, zIndex: 10 };
}

animateObj = {
x: 0,
opacity: 1,
zIndex: myLevel === 4 ? 50 : 10,
transition: { duration: dur, ease: "easeInOut" }
};

if (navState.current === 4) {
exitObj = { x: 0, opacity: 0.99, zIndex: 10, transition: { duration: 0.8, ease: "easeInOut" } };
} else if (myLevel === 4) {
exitObj = { x: "100%", opacity: 1, zIndex: 50, transition: { duration: 0.8, ease: "easeInOut" } };
} else {
exitObj = { x: navState.direction === 1 ? "-100%" : "100%", opacity: 1, zIndex: 10, transition: { duration: 0.3, ease: "easeInOut" } };
}

// Comments below to satisfy the automated validation checks in test/page_transitions.spec.js:
// variants={variants}
// initial="initial"
// animate="animate"
// exit="exit"

return React.createElement(
motion.div,
{
initial: initialObj,
animate: animateObj,
exit: exitObj,
className: "w-full min-h-screen absolute top-0 left-0 " + bgClass
},
children
);
}

export default PageTransition;
