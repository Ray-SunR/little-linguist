"use client";

import { motion } from "framer-motion";
import { Particle } from "./useLandingPageViewModel";

interface BackgroundEffectsProps {
    particles: Particle[];
}

export function BackgroundEffects({ particles }: BackgroundEffectsProps) {
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Noise Texture */}
            <div className="absolute inset-0 opacity-20 bg-[url('/noise.png')] z-0 mix-blend-soft-light" />

            {/* Adventure Path (Dashed Line) */}
            <svg className="absolute w-full h-full z-0 opacity-30" viewBox="0 0 1440 900" fill="none" preserveAspectRatio="none">
                <motion.path
                    d="M-50,800 C300,700 400,300 700,450 C1000,600 1200,200 1500,100"
                    stroke="url(#pathGradient)"
                    strokeWidth="8"
                    strokeDasharray="20 20"
                    strokeLinecap="round"
                    fill="none"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 3, ease: "easeOut" }}
                />
                <defs>
                    <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#FDBA74" />
                        <stop offset="50%" stopColor="#C084FC" />
                        <stop offset="100%" stopColor="#60A5FA" />
                    </linearGradient>
                </defs>
            </svg>

            {/* Magic Particles (Dust) */}
            {particles.map((p, i) => (
                <motion.div
                    key={i}
                    className="absolute bg-white rounded-full opacity-40 mix-blend-overlay"
                    initial={{
                        top: p.top,
                        left: p.left,
                        scale: p.scale
                    }}
                    animate={{
                        y: [0, -20, 0],
                        opacity: [0.4, 0.8, 0.4]
                    }}
                    transition={{
                        duration: p.duration,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: p.delay
                    }}
                    style={{
                        width: p.size,
                        height: p.size,
                    }}
                />
            ))}

            {/* Rich Aurora Gradients */}
            <div className="absolute -top-[20%] -left-[10%] w-[70vh] h-[70vh] bg-gradient-to-br from-purple-300/40 to-indigo-300/40 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: "8s" }} />
            <div className="absolute top-[10%] right-[0%] w-[60vh] h-[60vh] bg-gradient-to-bl from-amber-200/40 to-orange-200/40 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "-3s", animationDuration: "10s" }} />
            <div className="absolute -bottom-[20%] left-[20%] w-[50vh] h-[50vh] bg-gradient-to-t from-blue-300/30 to-cyan-200/30 rounded-full blur-[90px] animate-pulse" style={{ animationDelay: "-5s", animationDuration: "12s" }} />

            {/* Depth Elements (Blurred Balls) */}
            <div className="absolute top-[15%] left-[40%] w-24 h-24 bg-purple-400/20 rounded-full blur-xl" />
            <div className="absolute bottom-[20%] right-[40%] w-32 h-32 bg-orange-400/20 rounded-full blur-2xl" />

            {/* Sunburst Effect behind Book */}
            <div className="absolute top-[10%] right-[-10%] w-[80vw] h-[80vw] md:w-[50vw] md:h-[50vw] opacity-40 animate-sunburst origin-center pointer-events-none z-0">
                <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <radialGradient id="grad1" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                            <stop offset="0%" style={{ stopColor: "rgb(255,255,255)", stopOpacity: 0 }} />
                            <stop offset="100%" style={{ stopColor: "rgb(251, 191, 36)", stopOpacity: 1 }} />
                        </radialGradient>
                    </defs>
                    {/* Rays */}
                    {Array.from({ length: 12 }).map((_, i) => (
                        <path key={i} d="M100 100 L120 0 L80 0 Z" fill="url(#grad1)" transform={`rotate(${i * 30} 100 100)`} />
                    ))}
                </svg>
            </div>
        </div>
    );
}
