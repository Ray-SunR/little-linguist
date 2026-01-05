"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { BookOpen, Sparkles, Wand2, Star, TrendingUp, Clock } from "lucide-react";

export default function DashboardPage() {
  return (
    <main className="min-h-screen page-story-maker flex flex-col items-center px-6 py-10 lg:pl-28">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12 w-full max-w-4xl"
      >
        <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-white/60 text-sm font-black text-purple-600 mb-6 shadow-sm font-fredoka">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Ready to learn
        </div>

        <h1 className="text-5xl md:text-6xl font-black text-ink mb-4 font-fredoka tracking-tight leading-tight">
          Welcome back,{" "}
          <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 bg-clip-text text-transparent">
            Explorer!
          </span>
        </h1>

        <p className="max-w-lg mx-auto text-xl text-ink-muted leading-relaxed font-nunito font-medium">
          Your magical learning adventure continues. What would you like to do today?
        </p>
      </motion.div>

      {/* Feature Cards Grid */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-4xl grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-12"
      >
        {/* Open Bookshelf */}
        <Link href="/library" className="block group">
          <motion.div
            whileHover={{ scale: 1.02, y: -6 }}
            whileTap={{ scale: 0.98 }}
            className="clay-card p-8 h-full cursor-pointer relative overflow-hidden bg-gradient-to-br from-purple-50/80 to-indigo-50/80 border-purple-100/50"
          >
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl" />
            
            <div className="relative">
              <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-clay-purple mb-5 group-hover:scale-110 transition-transform duration-300">
                <BookOpen className="h-8 w-8 text-white" />
              </div>
              
              <h3 className="text-2xl font-black font-fredoka text-ink mb-2">
                Open Bookshelf
              </h3>
              <p className="text-ink-muted font-medium leading-relaxed">
                Continue reading your stories with interactive narration
              </p>
              
              <div className="mt-4 flex items-center gap-2 text-purple-600 font-bold text-sm group-hover:gap-3 transition-all">
                <span>Browse library</span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          </motion.div>
        </Link>

        {/* Story Maker */}
        <Link href="/story-maker" className="block group">
          <motion.div
            whileHover={{ scale: 1.02, y: -6 }}
            whileTap={{ scale: 0.98 }}
            className="clay-card p-8 h-full cursor-pointer relative overflow-hidden bg-gradient-to-br from-pink-50/80 to-rose-50/80 border-pink-100/50"
          >
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-pink-500/10 rounded-full blur-2xl" />
            
            <div className="relative">
              <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-clay-pink mb-5 group-hover:scale-110 transition-transform duration-300">
                <Wand2 className="h-8 w-8 text-white" />
              </div>
              
              <h3 className="text-2xl font-black font-fredoka text-ink mb-2">
                Story Maker
              </h3>
              <p className="text-ink-muted font-medium leading-relaxed">
                Create personalized AI adventures with your vocabulary words
              </p>
              
              <div className="mt-4 flex items-center gap-2 text-pink-600 font-bold text-sm group-hover:gap-3 transition-all">
                <span>Create story</span>
                <Sparkles className="h-4 w-4" />
              </div>
            </div>
          </motion.div>
        </Link>

        {/* Word Collection */}
        <Link href="/my-words" className="block group md:col-span-2 lg:col-span-1">
          <motion.div
            whileHover={{ scale: 1.02, y: -6 }}
            whileTap={{ scale: 0.98 }}
            className="clay-card p-8 h-full cursor-pointer relative overflow-hidden bg-gradient-to-br from-amber-50/80 to-orange-50/80 border-amber-100/50"
          >
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl" />
            
            <div className="relative">
              <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-clay-amber mb-5 group-hover:scale-110 transition-transform duration-300">
                <Star className="h-8 w-8 text-white fill-current" />
              </div>
              
              <h3 className="text-2xl font-black font-fredoka text-ink mb-2">
                Word Collection
              </h3>
              <p className="text-ink-muted font-medium leading-relaxed">
                Review saved words with smart flashcards
              </p>
              
              <div className="mt-4 flex items-center gap-2 text-amber-600 font-bold text-sm group-hover:gap-3 transition-all">
                <span>Practice words</span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          </motion.div>
        </Link>
      </motion.div>

      {/* Quick Stats Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-4xl"
      >
        <h2 className="text-xl font-black font-fredoka text-ink-muted mb-6 text-center">
          Your Learning Journey
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<BookOpen className="h-5 w-5" />}
            label="Books Read"
            value="—"
            color="purple"
          />
          <StatCard
            icon={<Star className="h-5 w-5" />}
            label="Words Learned"
            value="—"
            color="amber"
          />
          <StatCard
            icon={<Clock className="h-5 w-5" />}
            label="Reading Time"
            value="—"
            color="pink"
          />
          <StatCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Day Streak"
            value="—"
            color="emerald"
          />
        </div>
      </motion.div>
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  color: "purple" | "amber" | "pink" | "emerald";
}) {
  const colorClasses = {
    purple: "from-purple-100 to-purple-50 text-purple-600",
    amber: "from-amber-100 to-amber-50 text-amber-600",
    pink: "from-pink-100 to-pink-50 text-pink-600",
    emerald: "from-emerald-100 to-emerald-50 text-emerald-600",
  };

  return (
    <div className={`clay-card p-5 bg-gradient-to-br ${colorClasses[color]} border-white/60`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-bold uppercase tracking-wider opacity-80">{label}</span>
      </div>
      <div className="text-3xl font-black font-fredoka">{value}</div>
    </div>
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
