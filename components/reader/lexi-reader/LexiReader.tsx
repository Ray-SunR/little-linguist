"use client";

import React, { useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Token } from '@/lib/core/books/tokenizer';
import { cn } from '@/lib/core/utils/cn';

interface LexiReaderProps {
    tokens: Token[];
    currentWordIndex: number;
    onWordClick?: (index: number) => void;
    className?: string;
}

/**
 * LexiReader: A high-performance, token-aware text renderer.
 * Renders the canonical token stream from the database and coordinates
 * highlighting with the narration engine.
 */
export const LexiReader: React.FC<LexiReaderProps> = ({
    tokens,
    currentWordIndex,
    onWordClick,
    className
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const wordRefs = useRef<Map<number, HTMLSpanElement>>(new Map());

    // Scroll active word into view smoothly
    useEffect(() => {
        const activeEl = wordRefs.current.get(currentWordIndex);
        if (activeEl && containerRef.current) {
            activeEl.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'center'
            });
        }
    }, [currentWordIndex]);

    return (
        <div
            ref={containerRef}
            className={cn(
                "relative max-w-4xl mx-auto px-6 py-12 leadings-relaxed text-xl md:text-2xl font-serif text-slate-800 dark:text-slate-200 select-none",
                className
            )}
        >
            {tokens && tokens.map((token, idx) => {
                if (token.type === 'w') {
                    const isActive = token.i === currentWordIndex;

                    return (
                        <span
                            key={`w-${token.i}-${idx}`}
                            ref={el => {
                                if (el && token.i !== undefined) {
                                    wordRefs.current.set(token.i, el);
                                }
                            }}
                            onClick={() => token.i !== undefined && onWordClick?.(token.i)}
                            className={cn(
                                "relative inline-block cursor-pointer transition-all duration-200 rounded-sm px-0.5",
                                isActive
                                    ? "bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 scale-105"
                                    : "hover:bg-slate-200 dark:hover:bg-slate-800"
                            )}
                        >
                            {token.t}
                            {isActive && (
                                <motion.span
                                    layoutId="highlight-underline"
                                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"
                                    initial={false}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                            )}
                        </span>
                    );
                }

                // Spaces and Punctuation (Non-interactive)
                return (
                    <span
                        key={`t-${idx}`}
                        className={token.type === 'p' ? "text-slate-400 dark:text-slate-600" : ""}
                    >
                        {token.t}
                    </span>
                );
            })}
        </div>
    );
};
