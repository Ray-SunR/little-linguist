"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { BookOpen, Sparkles, Wand2, Star } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen page-story-maker flex flex-col items-center justify-center px-6 py-10 md:pl-28">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-[2rem] bg-gradient-to-br from-yellow-300 via-orange-400 to-orange-600 shadow-clay-orange border-4 border-white/50 mb-8 relative group">
          <motion.span
            animate={{ rotate: [0, -10, 10, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="text-5xl drop-shadow-md"
          >
            📚
          </motion.span>
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-orange-100 italic font-black text-orange-500 text-xs">
            NEW
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white/80 border-2 border-purple-100 text-sm font-black text-purple-600 mb-6 shadow-sm font-fredoka uppercase tracking-wider">
          <Sparkles className="h-4 w-4 animate-pulse" />
          Magical Reading Experience
        </div>

        <h1 className="text-6xl font-black text-ink mb-6 font-fredoka tracking-tight leading-tight">
          Welcome to <br />
          <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 bg-clip-text text-transparent">
            Story Time
          </span>
        </h1>

        <p className="max-w-md mx-auto text-xl text-ink-muted leading-relaxed font-nunito font-medium px-4">
          Cozy, kid-first reading with highlighted words, calm narration, and magical adventures.
        </p>
      </motion.div>

      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="clay-card w-full max-w-lg p-10 relative overflow-hidden"
      >
        {/* Decorative corner blob */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl" />

        <div className="space-y-6">
          <Link href="/library" className="block group">
            <motion.div
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-5 w-full p-6 rounded-[2rem] bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-clay-purple border-2 border-white/30 transition-all"
            >
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner">
                <BookOpen className="h-7 w-7 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-xl font-black font-fredoka">Open Bookshelf</h3>
                <p className="text-white/80 text-sm font-medium">Pick a story and start reading!</p>
              </div>
              <ChevronRight className="h-6 w-6 opacity-60 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
            </motion.div>
          </Link>

          <Link href="/story-maker" className="block group">
            <motion.div
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-5 w-full p-6 rounded-[2rem] bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-clay-pink border-2 border-white/30 transition-all"
            >
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner">
                <Wand2 className="h-7 w-7 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-xl font-black font-fredoka">Story Maker</h3>
                <p className="text-white/80 text-sm font-medium">Create your own magical adventure!</p>
              </div>
              <ChevronRight className="h-6 w-6 opacity-60 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
            </motion.div>
          </Link>

          <Link href="/my-words" className="block group">
            <motion.div
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-5 w-full p-6 rounded-[2rem] bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-clay-amber border-2 border-white/30 transition-all"
            >
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner">
                <Star className="h-7 w-7 text-white fill-current" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-xl font-black font-fredoka">Word Collection</h3>
                <p className="text-white/80 text-sm font-medium">View your saved magic words</p>
              </div>
              <ChevronRight className="h-6 w-6 opacity-60 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
            </motion.div>
          </Link>
        </div>
      </motion.div>
    </main>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
