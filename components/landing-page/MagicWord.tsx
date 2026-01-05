"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, Sparkles, X } from "lucide-react";

export default function MagicWord({ text }: { text: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <span className="relative inline-block">
      <motion.span
        whileHover={{ scale: 1.05, color: "#9333ea" }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer decoration-4 decoration-amber-400/50 underline-offset-4 hover:decoration-amber-400 transition-all select-none relative z-20"
      >
        {text}
      </motion.span>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="absolute left-0 bottom-full mb-4 w-64 bg-white rounded-2xl p-4 shadow-xl border-4 border-purple-100 z-50 text-left"
          >
            <div className="flex justify-between items-start mb-2">
                 <span className="text-xs font-bold text-amber-500 uppercase tracking-widest flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Magic Word
                 </span>
                 <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                 </button>
            </div>
            
            <div className="flex items-center gap-2 mb-2">
                <h3 className="text-2xl font-black text-purple-600 font-fredoka">{text}</h3>
                <button className="p-1.5 rounded-full bg-purple-100 text-purple-600 hover:bg-purple-200 transition-colors">
                    <Volume2 className="w-4 h-4" />
                </button>
            </div>
            
            <p className="text-sm text-gray-600 font-medium leading-relaxed">
                noun. Magical tales that take you to amazing places without leaving your chair! 🏰 ✨
            </p>
            
            {/* Arrow */}
            <div className="absolute top-full left-8 w-4 h-4 bg-white border-b-4 border-r-4 border-purple-100 transform rotate-45 -mt-2.5"></div>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}
