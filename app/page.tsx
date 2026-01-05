"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { BookOpen, Sparkles, Brain, Mic, ArrowRight, Star } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="min-h-screen page-story-maker overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center px-6 py-16 lg:pl-28">
        {/* Decorative Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-64 h-64 bg-purple-400/20 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 right-10 w-80 h-80 bg-pink-400/15 rounded-full blur-3xl animate-float" style={{ animationDelay: "-2s" }} />
          <div className="absolute top-1/2 left-1/3 w-40 h-40 bg-amber-400/10 rounded-full blur-2xl animate-float" style={{ animationDelay: "-4s" }} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center max-w-4xl mx-auto"
        >
          {/* Animated Mascot */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="inline-flex items-center justify-center w-28 h-28 rounded-[2.5rem] bg-gradient-to-br from-yellow-300 via-orange-400 to-orange-600 shadow-clay-orange border-4 border-white/50 mb-10 relative"
          >
            <span className="text-6xl drop-shadow-md">📚</span>
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute -top-3 -right-3 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center"
            >
              <Sparkles className="h-5 w-5 text-amber-500" />
            </motion.div>
          </motion.div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-black text-ink mb-6 font-fredoka tracking-tight leading-tight">
            Where Reading{" "}
            <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 bg-clip-text text-transparent">
              Becomes Adventure
            </span>
          </h1>

          {/* Subtext */}
          <p className="max-w-2xl mx-auto text-xl md:text-2xl text-ink-muted leading-relaxed font-nunito font-medium mb-10">
            AI-powered stories, vocabulary building, and personalized learning journeys designed for young readers ages 4-10.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <motion.a
              href="/login"
              whileHover={{ scale: 1.05, y: -4 }}
              whileTap={{ scale: 0.98 }}
              className="group flex items-center gap-3 px-8 py-5 rounded-[2rem] bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-clay-purple border-2 border-white/30 text-xl font-black font-fredoka transition-all cursor-pointer no-underline"
            >
              Start Learning Free
              <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
            </motion.a>
          </div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-8 h-12 rounded-full border-2 border-ink-muted/30 flex items-start justify-center pt-2"
          >
            <div className="w-1.5 h-3 bg-ink-muted/40 rounded-full" />
          </motion.div>
        </motion.div>
      </section>

      {/* Feature Cards Section */}
      <section className="relative py-20 px-6 lg:pl-28">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-black text-ink font-fredoka mb-4">
              Learning Made Magical
            </h2>
            <p className="text-xl text-ink-muted font-medium max-w-2xl mx-auto">
              Discover how our AI-powered platform helps kids build vocabulary and reading skills through play.
            </p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-3">
            {/* Feature 1: Read-Aloud */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="clay-card p-8 bg-gradient-to-br from-purple-50/80 to-indigo-50/80 border-purple-100/50 relative overflow-hidden"
            >
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl" />
              <div className="relative">
                <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-clay-purple mb-6">
                  <Mic className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-black font-fredoka text-ink mb-3">
                  Magical Read-Aloud
                </h3>
                <p className="text-ink-muted font-medium leading-relaxed">
                  Professional voice narration with word-by-word highlighting helps kids follow along and build reading fluency.
                </p>
              </div>
            </motion.div>

            {/* Feature 2: AI Stories */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="clay-card p-8 bg-gradient-to-br from-pink-50/80 to-rose-50/80 border-pink-100/50 relative overflow-hidden"
            >
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-pink-500/10 rounded-full blur-3xl" />
              <div className="relative">
                <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-clay-pink mb-6">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-black font-fredoka text-ink mb-3">
                  Personalized Adventures
                </h3>
                <p className="text-ink-muted font-medium leading-relaxed">
                  Create custom AI stories featuring your child's interests, name, and vocabulary words they're learning.
                </p>
              </div>
            </motion.div>

            {/* Feature 3: Memory Engine */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="clay-card p-8 bg-gradient-to-br from-amber-50/80 to-orange-50/80 border-amber-100/50 relative overflow-hidden"
            >
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl" />
              <div className="relative">
                <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-clay-amber mb-6">
                  <Brain className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-black font-fredoka text-ink mb-3">
                  Memory Engine
                </h3>
                <p className="text-ink-muted font-medium leading-relaxed">
                  Smart spaced repetition flashcards ensure new words stick for life, not just for the test.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative py-20 px-6 lg:pl-28 bg-gradient-to-b from-transparent via-purple-50/30 to-transparent">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-black text-ink font-fredoka mb-4">
              How It Works
            </h2>
            <p className="text-xl text-ink-muted font-medium">
              Your child's learning journey in 4 simple steps
            </p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              { step: 1, icon: <BookOpen className="h-6 w-6" />, title: "Read Stories", desc: "Explore curated stories with interactive highlighting" },
              { step: 2, icon: <Star className="h-6 w-6" />, title: "Tap to Learn", desc: "Tap any word to see definition & pronunciation" },
              { step: 3, icon: <Brain className="h-6 w-6" />, title: "Smart Review", desc: "Practice saved words with spaced repetition" },
              { step: 4, icon: <Sparkles className="h-6 w-6" />, title: "Create Stories", desc: "Earn points to generate personalized AI adventures" },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="clay-card p-6 text-center bg-white/60"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-black text-xl font-fredoka flex items-center justify-center mx-auto mb-4 shadow-clay-purple">
                  {item.step}
                </div>
                <div className="flex items-center justify-center gap-2 mb-2 text-purple-600">
                  {item.icon}
                  <h4 className="font-black font-fredoka text-lg">{item.title}</h4>
                </div>
                <p className="text-ink-muted text-sm font-medium">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA Section */}
      <section className="relative py-24 px-6 lg:pl-28">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="clay-card p-12 md:p-16 bg-gradient-to-br from-purple-100/80 via-pink-50/80 to-orange-50/80 relative overflow-hidden"
          >
            <div className="absolute -top-20 -left-20 w-60 h-60 bg-purple-400/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-pink-400/20 rounded-full blur-3xl" />
            
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-black text-ink font-fredoka mb-4">
                Ready to Begin the Adventure?
              </h2>
              <p className="text-xl text-ink-muted font-medium mb-8">
                Free to start. Magical forever.
              </p>
              
              <motion.a
                href="/login"
                whileHover={{ scale: 1.05, y: -4 }}
                whileTap={{ scale: 0.98 }}
                className="group flex items-center gap-3 px-10 py-5 rounded-[2rem] bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-clay-purple border-2 border-white/30 text-xl font-black font-fredoka mx-auto cursor-pointer no-underline"
              >
                Start Learning Free
                <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </motion.a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 lg:pl-28 border-t border-purple-100/50">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-ink-muted font-medium">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📚</span>
            <span className="font-fredoka font-bold text-ink">Little Linguist</span>
          </div>
          <div className="flex items-center gap-6">
            <span>© 2026 Little Linguist</span>
            <Link href="#" className="hover:text-purple-600 transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-purple-600 transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
