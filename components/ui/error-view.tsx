"use client";

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { RefreshCw, BookOpen, Sparkles } from 'lucide-react';
import { cn } from '@/lib/core/utils/cn';

interface ErrorViewProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  actionHref?: string;
  actionLabel?: string;
}

export function ErrorView({
  title = "Oops! Where are we?",
  message = "It looks like this book has vanished into thin air!",
  onRetry,
  actionHref = "/library",
  actionLabel = "Back to Library"
}: ErrorViewProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-12 select-none">
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 50, rotate: -5 }}
        animate={{ scale: 1, opacity: 1, y: 0, rotate: 0 }}
        transition={{ type: "spring", damping: 15, stiffness: 250 }}
        className="clay-card p-10 sm:p-14 max-w-lg w-full text-center relative overflow-hidden bg-white border-8 border-white shadow-2xl"
      >
        {/* Decorative elements from ClayNav style */}
        <div className="absolute top-[-50px] left-[-50px] w-32 h-32 bg-purple-100 rounded-full blur-3xl opacity-60 animate-float" />
        <div className="absolute bottom-[-50px] right-[-50px] w-32 h-32 bg-orange-100 rounded-full blur-3xl opacity-60 animate-float" style={{ animationDelay: '-3s' }} />

        <div className="relative w-32 h-32 mx-auto mb-10">
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className="absolute inset-[-15%] rounded-[3rem] bg-gradient-to-br from-orange-300 via-yellow-400 to-purple-400 opacity-20 blur-2xl"
            />
            <div className="relative w-full h-full squircle bg-gradient-to-br from-purple-400 to-indigo-600 flex items-center justify-center shadow-clay-purple border-4 border-white overflow-hidden">
                <span className="text-6xl drop-shadow-2xl animate-bounce-subtle">🤔</span>
            </div>
            <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -bottom-2 -right-2 w-12 h-12 rounded-full bg-yellow-400 border-4 border-white flex items-center justify-center shadow-clay-amber"
            >
                <Sparkles className="w-6 h-6 text-white" />
            </motion.div>
        </div>

        <h1 className="text-4xl font-fredoka font-black text-ink mb-4 leading-tight tracking-tight">
          {title}
        </h1>

        <p className="text-lg font-nunito font-bold text-ink-muted mb-10 px-4 italic">
          “{message}”
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {onRetry && (
            <button
              onClick={onRetry}
              className="w-full sm:w-auto py-4 px-8 rounded-2xl bg-white text-purple-600 font-fredoka font-black flex items-center justify-center gap-3 hover:bg-purple-50 transition-all active:scale-90 border-2 border-purple-100 shadow-clay-purple"
            >
              <RefreshCw className="w-5 h-5" />
              Try Again
            </button>
          )}

          <Link
            href={actionHref}
            className="w-full sm:w-auto py-4 px-8 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-fredoka font-black shadow-clay-purple hover:from-purple-700 hover:to-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-3 animate-squish"
          >
            <BookOpen className="w-5 h-5 text-white" />
            {actionLabel}
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
