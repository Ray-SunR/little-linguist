"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Volume2, Wand2, Calendar, Sparkles } from "lucide-react";
import { cn } from "@/lib/core/utils/cn";
import { CachedImage } from "@/components/ui/cached-image";
import { MagicSentenceModal } from "./MagicSentenceModal";

interface MagicHistoryItem {
    id: string;
    sentence: string;
    words: string[];
    audioUrl: string;
    imageUrl?: string;
    timingMarkers: any[];
    tokens: any[];
    created_at: string;
}

interface MagicHistoryViewProps {
    history: MagicHistoryItem[];
    isLoading: boolean;
}

export function MagicHistoryView({ history, isLoading }: MagicHistoryViewProps) {
    const [selectedItem, setSelectedItem] = useState<MagicHistoryItem | null>(null);

    if (isLoading && history.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-12 h-12 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin" />
                <p className="font-fredoka font-bold text-slate-400 uppercase tracking-widest text-sm">Loading Magic...</p>
            </div>
        );
    }

    if (!isLoading && history.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center px-6">
                <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6">
                    <Wand2 className="w-10 h-10 text-slate-200" />
                </div>
                <h3 className="text-xl font-black font-fredoka text-ink mb-2">No Spells Cast Yet</h3>
                <p className="text-slate-400 font-nunito font-bold max-w-xs mx-auto">
                    Pick some words and tap &quot;Make Magic&quot; to start your collection!
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {history.map((item, idx) => (
                <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => setSelectedItem(item)}
                    className="group bg-white rounded-[2rem] border-2 border-slate-100 p-5 cursor-pointer transition-all hover:border-purple-200 hover:shadow-xl hover:shadow-purple-500/5 flex flex-col gap-4"
                >
                    {/* Image Preview (Optional) */}
                    {item.imageUrl && (
                        <div className="relative aspect-video rounded-2xl overflow-hidden shadow-inner bg-slate-50 shrink-0">
                            <CachedImage
                                src={item.imageUrl}
                                alt={item.sentence}
                                width={400}
                                height={225}
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                bucket="user-assets"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-ink/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    )}

                    <div className="flex flex-col flex-1 gap-3">
                        {/* Meta / Date */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-slate-400">
                                <Calendar className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-black font-fredoka uppercase tracking-wider">
                                    {new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                </span>
                            </div>
                            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center transition-colors group-hover:bg-purple-100 shrink-0">
                                <Volume2 className="w-4 h-4 text-purple-600" />
                            </div>
                        </div>

                        {/* Sentence Snippet */}
                        <p className="text-base font-nunito font-bold text-ink line-clamp-2 leading-snug">
                            {item.sentence}
                        </p>

                        {/* Words Used */}
                        <div className="flex flex-wrap gap-1.5 mt-auto">
                            {item.words.slice(0, 3).map((w, i) => (
                                <span key={i} className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full text-[9px] font-black font-fredoka border border-amber-100/50">
                                    {w}
                                </span>
                            ))}
                            {item.words.length > 3 && (
                                <span className="text-[9px] font-black font-fredoka text-slate-300 px-1 py-0.5">
                                    +{item.words.length - 3} more
                                </span>
                            )}
                        </div>
                    </div>
                </motion.div>
            ))}

            <MagicSentenceModal
                isOpen={!!selectedItem}
                onClose={() => setSelectedItem(null)}
                isLoading={false}
                result={selectedItem ? {
                    id: selectedItem.id,
                    sentence: selectedItem.sentence,
                    audioUrl: selectedItem.audioUrl,
                    imageUrl: selectedItem.imageUrl,
                    timingMarkers: selectedItem.timingMarkers,
                    tokens: selectedItem.tokens,
                    words: selectedItem.words
                } : null}
                error={null}
            />
        </div>
    );
}
