"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { CachedImage } from "./cached-image";

const LOADING_MESSAGES = [
  "Lumo is packing your bags for a story adventure...",
  "Searching the magic forest for your book...",
  "Gathering sparkles for the next page...",
  "Polishing the words for you...",
  "Asking the owls for the right chapter...",
  "Waking up the story characters...",
];

export interface LumoLoaderProps {
  fullPage?: boolean;
}

export default function LumoLoader({ fullPage = true }: LumoLoaderProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const content = (
    <div className="flex flex-col items-center justify-center gap-8 p-8 text-center bg-transparent">
      {/* Mascot Container */}
      <div className="relative">
        <style jsx>{`
            @keyframes glow-pulse {
              0%, 100% { transform: scale(1); opacity: 0.3; }
              50% { transform: scale(1.1); opacity: 0.6; }
            }
            @keyframes lumo-float-large {
              0%, 100% { transform: translateY(0) rotate(0); }
              50% { transform: translateY(-20px) rotate(5deg); }
            }
            @keyframes progress-slide {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(100%); }
            }
            .animate-glow-pulse { animation: glow-pulse 3s ease-in-out infinite; }
            .animate-lumo-float-large { animation: lumo-float-large 4s ease-in-out infinite; }
            .animate-progress-slide { animation: progress-slide 2s linear infinite; }
        `}</style>
        
        {/* Glow effect */}
        <div className="absolute inset-0 bg-amber-400/30 blur-3xl rounded-full animate-glow-pulse" />

        {/* Lumo Mascot */}
        <div className="relative z-10 w-32 h-32 md:w-40 md:h-40 animate-lumo-float-large">
          <CachedImage
            src="/lumo-mascot.png"
            alt="Lumo Mascot"
            fill
            className="object-contain relative z-10 rounded-full"
            sizes="(max-width: 768px) 128px, 160px"
          />
        </div>

        {/* Floating sparkles */}
        <Sparkle delay={0} top="20%" left="-10%" />
        <Sparkle delay={1} top="70%" right="-10%" />
        <Sparkle delay={0.5} top="-10%" right="20%" />
      </div>

      {/* Loading Text */}
      <div className="space-y-4 max-w-sm">
        <h2 className="text-2xl font-black font-fredoka text-ink animate-pulse">
          Wait for it...
        </h2>
        <div className="h-12 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={messageIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-lg font-medium text-ink-muted font-nunito"
            >
              {LOADING_MESSAGES[messageIndex]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      {/* Claymorphic Progress Bar */}
      <div className="w-48 h-4 bg-white/50 rounded-full border-2 border-white shadow-inner overflow-hidden relative">
        <div className="absolute inset-0 w-32 h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full shadow-clay-sm animate-progress-slide" />
      </div>
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-[--shell] overflow-hidden">
        {/* Decorative Blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[50vh] h-[50vh] bg-purple-200/40 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vh] h-[50vh] bg-orange-100/40 rounded-full blur-3xl" />

        {content}
      </div>
    );
  }

  return content;
}

function Sparkle({ delay, top, left, right }: { delay: number; top?: string; left?: string; right?: string }) {
  return (
    <div
      className="absolute text-2xl z-20"
      style={{ 
          top, left, right,
          animation: `sparkle-anim 2s ease-in-out infinite`,
          animationDelay: `${delay}s`
      }}
    >
      <style jsx>{`
          @keyframes sparkle-anim {
            0%, 100% { transform: scale(0) rotate(0); opacity: 0; }
            50% { transform: scale(1) rotate(90deg); opacity: 1; }
          }
      `}</style>
      ✨
    </div>
  );
}
