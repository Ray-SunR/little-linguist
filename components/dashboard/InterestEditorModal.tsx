
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Sparkles, Save, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { updateChildProfile, ChildProfile } from '@/app/actions/profiles';
import { toast } from 'sonner';
import { cn } from '@/lib/core';

interface InterestEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    child: { id: string; name: string; interests?: string[] };
    onUpdate?: (newInterests: string[]) => void;
}

const SUGGESTED_INTERESTS = {
    "Themes 🎭": ["Adventure", "Friendship", "Magic", "Mystery", "Kindness", "Courage"],
    "Topics 🦖": ["Nature", "Animals", "Science", "Pets", "Space", "Dinosaurs", "Transport"],
    "Characters 🦸": ["Princesses", "Superheroes", "Fairies", "Knights"],
    "Activities 🚀": ["Sports", "Building", "Exploration"]
};

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
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-[2rem] shadow-clay-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-50 to-pink-50">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-purple-600">
                                        <Sparkles className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-fredoka font-bold text-slate-800">
                                            {child.name}&apos;s Interests
                                        </h2>
                                        <p className="text-sm text-slate-500 font-medium">
                                            Select up to 10 topics to personalize specific stories
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-white/50 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                                
                                {/* Current Selection */}
                                <div className="space-y-3">
                                    <label className="text-sm font-bold text-slate-400 uppercase tracking-wider flex justify-between">
                                        Selected Topics
                                        <span className={cn("text-xs font-normal normal-case px-2 py-0.5 rounded-full", 
                                            interests.length >= 10 ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-500"
                                        )}>
                                            {interests.length}/10
                                        </span>
                                    </label>
                                    <div className="flex flex-wrap gap-2 min-h-[3rem] p-4 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200">
                                        {interests.length === 0 ? (
                                            <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm font-medium italic">
                                                Add topics below to explore new worlds...
                                            </div>
                                        ) : (
                                            interests.map(interest => (
                                                <motion.button
                                                    layout
                                                    key={interest}
                                                    onClick={() => handleRemoveInterest(interest)}
                                                    className="group flex items-center gap-1.5 pl-3 pr-2 py-1.5 bg-white border border-purple-100 rounded-full shadow-sm text-purple-700 font-bold text-sm hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-all cursor-pointer"
                                                >
                                                    {interest}
                                                    <X className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100" />
                                                </motion.button>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Custom Input */}
                                <div className="space-y-3">
                                    <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                                        Add Custom Topic
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={customInput}
                                            onChange={(e) => setCustomInput(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            placeholder="e.g. Baking, Robots, Ninjas..."
                                            className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none font-bold text-slate-700 placeholder:text-slate-400 placeholder:font-medium transition-all"
                                        />
                                        <button
                                            onClick={() => handleAddInterest(customInput)}
                                            disabled={!customInput.trim()}
                                            className="px-5 rounded-xl bg-purple-100 text-purple-700 font-bold hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <Plus className="w-6 h-6" />
                                        </button>
                                    </div>
                                </div>

                                {/* Suggestions */}
                                <div className="space-y-6">
                                    {Object.entries(SUGGESTED_INTERESTS).map(([category, items]) => (
                                        <div key={category} className="space-y-3">
                                            <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                                                {category}
                                            </label>
                                            <div className="flex flex-wrap gap-2">
                                                {items.map(item => {
                                                    const isSelected = interests.includes(item);
                                                    return (
                                                        <button
                                                            key={item}
                                                            onClick={isSelected ? () => handleRemoveInterest(item) : () => handleAddInterest(item)}
                                                            className={cn(
                                                                "px-3 py-1.5 rounded-xl text-sm font-bold border-2 transition-all flex items-center gap-1.5",
                                                                isSelected 
                                                                    ? "bg-purple-100 border-purple-200 text-purple-700 ring-2 ring-purple-50 ring-offset-1" 
                                                                    : "bg-white border-slate-200 text-slate-600 hover:border-purple-200 hover:text-purple-600 hover:bg-purple-50"
                                                            )}
                                                        >
                                                            {item}
                                                            {isSelected && <Check className="w-3.5 h-3.5" />}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                            </div>

                            {/* Footer */}
                            <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
                                <button
                                    onClick={onClose}
                                    className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="px-8 py-3 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 text-white font-bold shadow-lg shadow-purple-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-wait flex items-center gap-2"
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
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// Ensure "use client" is at the top
