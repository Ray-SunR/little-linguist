"use client";

import React, { useState, useRef, useEffect } from 'react';
import { X, Sparkles, Save, Check, Search, Shield, Crown, Rocket, PawPrint, Microscope, Leaf, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { updateChildProfile } from '@/app/actions/profiles';
import { toast } from 'sonner';
import { cn } from '@/lib/core';

interface InterestEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    child: { id: string; name: string; interests?: string[] };
    onUpdate?: (newInterests: string[]) => void;
}

const POPULAR_PICKS = [
    { name: "Magic", icon: Sparkles, color: "text-amber-500" },
    { name: "Superhero", icon: Shield, color: "text-rose-500" },
    { name: "Princess", icon: Crown, color: "text-pink-500" },
    { name: "Space", icon: Rocket, color: "text-purple-500" },
    { name: "Animals", icon: PawPrint, color: "text-emerald-500" },
    { name: "Science", icon: Microscope, color: "text-indigo-500" },
    { name: "Nature", icon: Leaf, color: "text-green-500" },
];

export function InterestEditorModal({ isOpen, onClose, child, onUpdate }: InterestEditorModalProps) {
    const [interests, setInterests] = useState<string[]>([]);
    const [customInput, setCustomInput] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && child) {
            setInterests(child.interests || []);
        }
    }, [isOpen, child]);

    const handleAddInterest = (interest: string) => {
        const trimmed = interest.trim();
        if (trimmed && !interests.includes(trimmed)) {
            if (interests.length >= 10) {
                toast.error("You can add up to 10 interests");
                return;
            }
            setInterests([...interests, trimmed]);
        }
        setCustomInput("");
    };

    const handleRemoveInterest = (interest: string) => {
        setInterests(interests.filter(i => i !== interest));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const result = await updateChildProfile(child.id, {
                interests
            });

            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Interests updated!");
                onUpdate?.(interests);
                onClose();
            }
        } catch (err) {
            toast.error("Failed to save interests");
        } finally {
            setIsSaving(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddInterest(customInput);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
                    >
                        <motion.div
                            initial={{ y: "100%", opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: "100%", opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-t-[2.5rem] sm:rounded-[2rem] shadow-clay-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[95dvh] sm:max-h-[90vh] mb-0 sm:mb-0 relative z-[110]"
                        >
                            {/* Header */}
                            <div className="p-5 sm:p-6 border-b border-purple-50 flex items-start sm:items-center justify-between bg-white relative overflow-hidden">
                                {/* Decorative BG Elements */}
                                <div className="absolute -top-12 -left-12 w-32 h-32 bg-purple-50/50 rounded-full blur-2xl pointer-events-none" />
                                
                                <div className="flex flex-col items-start gap-2 relative z-10">
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-600 font-fredoka font-bold text-[10px] border border-purple-100"
                                    >
                                        <Star className="w-3 h-3 fill-current" />
                                        Personalized for {child.name}
                                    </motion.div>
                                    <h2 className="text-2xl font-black text-ink font-fredoka">
                                        Stories They&apos;ll <span className="text-purple-500">Love</span>
                                    </h2>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600 relative z-10"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-8">

                                {/* Search Bar */}
                                <div className="relative w-full max-w-xl mx-auto group">
                                    <div className="absolute inset-0 bg-purple-100 rounded-2xl translate-y-1 translate-x-0.5 group-focus-within:translate-y-0.5 transition-transform" />
                                    <div className="relative flex items-center bg-white border-2 border-purple-200 rounded-2xl px-5 py-3 shadow-clay-sm group-focus-within:border-purple-400 transition-all">
                                        <Search className="w-5 h-5 text-purple-400 mr-3" />
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={customInput}
                                            onChange={(e) => setCustomInput(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            placeholder="Add something else they love..."
                                            className="flex-1 bg-transparent border-none outline-none font-fredoka text-base text-ink placeholder:text-slate-300"
                                        />
                                    </div>
                                </div>

                                {/* Popular Picks */}
                                <div className="space-y-4 text-center">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">
                                        Popular Picks
                                    </label>
                                    <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                                        {POPULAR_PICKS.map((pick) => {
                                            const isSelected = interests.includes(pick.name);
                                            return (
                                                <motion.button
                                                    key={pick.name}
                                                    type="button"
                                                    onClick={isSelected ? () => handleRemoveInterest(pick.name) : () => handleAddInterest(pick.name)}
                                                    whileHover={{ scale: 1.05, y: -2 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    className={cn(
                                                        "flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl font-fredoka font-bold transition-all border-b-4",
                                                        isSelected
                                                            ? "bg-purple-600 text-white border-purple-800 translate-y-1 shadow-none"
                                                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 shadow-clay-sm"
                                                    )}
                                                >
                                                    <AnimatePresence mode="wait">
                                                        {isSelected ? (
                                                            <motion.div
                                                                key="check"
                                                                initial={{ scale: 0, opacity: 0 }}
                                                                animate={{ scale: 1, opacity: 1 }}
                                                                exit={{ scale: 0, opacity: 0 }}
                                                            >
                                                                <Check className="w-4 h-4 text-white" />
                                                            </motion.div>
                                                        ) : (
                                                            <motion.div
                                                                key="icon"
                                                                initial={{ scale: 0, opacity: 0 }}
                                                                animate={{ scale: 1, opacity: 1 }}
                                                                exit={{ scale: 0, opacity: 0 }}
                                                            >
                                                                <pick.icon className={cn("w-4 h-4", pick.color)} />
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                    {pick.name}
                                                </motion.button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Custom Selection Tags */}
                                {interests.filter(i => !POPULAR_PICKS.some(p => p.name === i)).length > 0 && (
                                    <div className="space-y-4 text-center pb-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">
                                            My Magic Words
                                        </label>
                                        <div className="flex flex-wrap justify-center gap-3">
                                            {interests.filter(i => !POPULAR_PICKS.some(p => p.name === i)).map(interest => (
                                                <motion.button
                                                    layout
                                                    key={interest}
                                                    onClick={() => handleRemoveInterest(interest)}
                                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-fredoka font-bold transition-all border-b-4 bg-purple-600 text-white border-purple-800 translate-y-1 shadow-none"
                                                >
                                                    <Check className="w-4 h-4 text-white" />
                                                    {interest}
                                                    <X className="w-4 h-4 ml-1 opacity-50" />
                                                </motion.button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                            </div>

                            {/* Footer */}
                            <div className="p-5 sm:p-6 pb-10 sm:pb-6 border-t border-purple-50 bg-slate-50/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                                <div className="text-xs font-bold text-slate-400 px-2 text-center sm:text-left">
                                    {interests.length}/10 selected
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={onClose}
                                        className="flex-1 sm:flex-none px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="flex-1 sm:flex-none px-8 py-3 rounded-full bg-gradient-to-r from-indigo-600 to-purple-500 hover:from-indigo-500 hover:to-purple-400 text-white font-black font-fredoka uppercase tracking-widest shadow-clay-blue transition-all disabled:opacity-70 flex items-center justify-center gap-2 whitespace-nowrap"
                                    >
                                        {isSaving ? (
                                            <>
                                                <Sparkles className="w-5 h-5 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="w-5 h-5" />
                                                Save Interests
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
