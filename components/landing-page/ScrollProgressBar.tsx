"use client";

import { motion, useScroll, useSpring } from "framer-motion";

export function ScrollProgressBar() {
    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    return (
        <motion.div
            className="fixed top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-purple-600 origin-left z-[100]"
            style={{ scaleX }}
        />
    );
}
