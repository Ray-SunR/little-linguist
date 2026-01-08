"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Wand2, BookOpen, Sparkles, Check, ChevronRight, User, RefreshCw, Plus } from "lucide-react";
import { useWordList } from "@/lib/features/word-insight";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/core";
import { getStoryService } from "@/lib/features/story";
import { useBookMediaSubscription, useBookAudioSubscription } from "@/lib/hooks/use-realtime-subscriptions";
import type { Story, UserProfile } from "@/lib/features/story";
import SupabaseReaderShell, { type SupabaseBook } from "@/components/reader/supabase-reader-shell";
import { compressImage } from "@/lib/core/utils/image";
import { raidenCache, CacheStore } from "@/lib/core/cache";
import { CachedImage } from "@/components/ui/cached-image";
import { useAuth } from "@/components/auth/auth-provider";

type Step = "profile" | "words" | "generating" | "reading";

interface StoryMakerClientProps {
    initialProfile: UserProfile;
}

export default function StoryMakerClient({ initialProfile }: StoryMakerClientProps) {
    const { words } = useWordList();
    const { user } = useAuth();
    const router = useRouter();
    const service = getStoryService();
    const [step, setStep] = useState<Step>("profile");
    const [profile, setProfile] = useState<UserProfile>(initialProfile);
    const [selectedWords, setSelectedWords] = useState<string[]>([]);
    const [story, setStory] = useState<Story | null>(null);
    const [supabaseBook, setSupabaseBook] = useState<SupabaseBook | null>(null);
    const [currentPage, setCurrentPage] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);

    // Initial setup if props change (though usually this component mounts once)
    useEffect(() => {
        if (initialProfile) {
            setProfile(prev => ({
                ...prev,
                ...initialProfile
            }));
        }
    }, [initialProfile]);

    // Subscribe to realtime updates
    useBookMediaSubscription(supabaseBook?.id, useCallback((newImage) => {
        setSupabaseBook(prev => {
            if (!prev) return null;
            const currentImages = prev.images || [];

            // 1. Try to find a placeholder to replace
            const placeholderIndex = currentImages.findIndex(img =>
                Number(img.afterWordIndex) === Number(newImage.afterWordIndex) && img.isPlaceholder
            );

            if (placeholderIndex !== -1) {
                const updatedImages = [...currentImages];
                updatedImages[placeholderIndex] = { ...newImage, isPlaceholder: false };
                return { ...prev, images: updatedImages };
            }

            // 2. If no placeholder, check if we should update an existing real image
            const existingIndex = currentImages.findIndex(img =>
                Number(img.afterWordIndex) === Number(newImage.afterWordIndex)
            );

            if (existingIndex !== -1) {
                const updatedImages = [...currentImages];
                updatedImages[existingIndex] = { ...updatedImages[existingIndex], ...newImage, isPlaceholder: false };
                return { ...prev, images: updatedImages };
            }

            // 3. Fallback: append if it's completely new
            return { ...prev, images: [...currentImages, newImage] };
        });
    }, [setSupabaseBook]));

    useBookAudioSubscription(supabaseBook?.id, useCallback((newShard) => {
        setSupabaseBook(prev => {
            if (!prev) return null;
            const shards = prev.shards || [];
            if (shards.some(s => s.chunk_index === newShard.chunk_index)) return prev;
            return { ...prev, shards: [...shards, newShard] };
        });
    }, [setSupabaseBook]));

    const handleProfileSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile.name) return;
        setStep("words");
    };

    const toggleWord = (word: string) => {
        if (selectedWords.includes(word)) {
            setSelectedWords(selectedWords.filter((w) => w !== word));
        } else {
            if (selectedWords.length >= 5) return; // Max 5 words
            setSelectedWords([...selectedWords, word]);
        }
    };

    const generateStory = async () => {
        setStep("generating");
        setError(null);
        try {
            // Step 1: Generate Text/Scenes Content
            const content = await service.generateStoryContent(selectedWords, profile);

            const initialStory: Story = {
                id: crypto.randomUUID(),
                book_id: content.book_id,
                title: content.title,
                content: content.content,
                scenes: content.scenes,
                createdAt: Date.now(),
                wordsUsed: selectedWords,
                userProfile: profile,
                mainCharacterDescription: content.mainCharacterDescription,
            };

            const initialSupabaseBook: SupabaseBook = {
                id: content.book_id,
                title: content.title,
                text: content.content,
                tokens: content.tokens || [],
                shards: [],
                images: content.scenes.map((scene, idx) => ({
                    id: `scene-${idx}`,
                    src: "",
                    afterWordIndex: Number(scene.after_word_index),
                    caption: "Drawing Magic...",
                    isPlaceholder: true,
                    sceneIndex: idx // Store for easier updates
                })),
            };

            setStory(initialStory);
            setSupabaseBook(initialSupabaseBook);

            // Prefill cache to make redirect instant
            await raidenCache.put(CacheStore.BOOKS, initialSupabaseBook);

            // Invalidate library metadata to force re-fetch on next visit
            if (user?.id) {
                await raidenCache.delete(CacheStore.LIBRARY_METADATA, user.id);
            }

            // Redirect to the reader page which now contains the book ID in URL
            router.push(`/reader/${content.book_id}`);

            // Trigger backend image generation (non-blocking)
            service.generateImagesForBook(content.book_id);

        } catch (err) {
            console.error(err);
            setError("Oops! Something went wrong while making your story. Please try again.");
            setStep("words");
        }
    };

    const reset = () => {
        setStep("profile");
        setStory(null);
        setSelectedWords([]);
        setError(null);
    };

    return (
        <div className="min-h-screen page-story-maker p-6 md:p-10 pb-32">
            <header className="mx-auto mb-8 flex max-w-3xl items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-4">
                        <h1 className="text-3xl font-black text-ink">
                            Story Maker
                        </h1>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-3xl">
                {step === "profile" && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="clay-card p-10 md:p-12 relative overflow-hidden"
                    >
                        {/* Decorative background blobs */}
                        <div className="absolute -top-20 -right-20 w-64 h-64 bg-pink-500/5 rounded-full blur-3xl" />
                        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl" />

                        <div className="flex items-center gap-4 mb-10 relative">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-400 to-rose-500 shadow-clay-pink flex items-center justify-center">
                                <Wand2 className="h-8 w-8 text-white animate-bounce-subtle" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-ink font-fredoka uppercase tracking-tight">About the Hero</h2>
                                <p className="text-ink-muted font-medium font-nunito">Tell us who's going on this adventure!</p>
                            </div>
                        </div>

                        <form onSubmit={handleProfileSubmit} className="relative">
                            <div className="grid md:grid-cols-2 gap-10 mb-10">
                                <div className="space-y-8">
                                    <div>
                                        <label className="mb-3 block text-xs font-black text-ink-muted uppercase tracking-widest font-fredoka">Hero's Name</label>
                                        <input
                                            type="text"
                                            value={profile.name}
                                            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                            className="w-full h-16 px-6 rounded-[1.5rem] border-4 border-purple-50 bg-white/50 focus:bg-white focus:border-purple-300 outline-none transition-all font-fredoka text-xl font-bold text-ink placeholder:text-slate-300 shadow-inner"
                                            placeholder="e.g., Leo, Mia"
                                            autoFocus
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-4 block text-xs font-black text-ink-muted uppercase tracking-widest font-fredoka">Age Explorer</label>
                                        <div className="flex items-center justify-between p-2 rounded-[2rem] bg-purple-50 shadow-inner border-2 border-white/50">
                                            <motion.button
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                type="button"
                                                className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center text-2xl font-black text-purple-600 border-2 border-purple-100 disabled:opacity-50"
                                                onClick={() => setProfile({ ...profile, age: Math.max(3, profile.age - 1) })}
                                                disabled={profile.age <= 3}
                                            >
                                                −
                                            </motion.button>
                                            <div className="flex flex-col items-center">
                                                <span className="text-3xl font-black text-purple-600 font-fredoka">{profile.age}</span>
                                                <span className="text-[10px] font-black text-purple-400 uppercase tracking-tighter">years old</span>
                                            </div>
                                            <motion.button
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                type="button"
                                                className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center text-2xl font-black text-purple-600 border-2 border-purple-100 disabled:opacity-50"
                                                onClick={() => setProfile({ ...profile, age: Math.min(10, profile.age + 1) })}
                                                disabled={profile.age >= 10}
                                            >
                                                +
                                            </motion.button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="mb-3 block text-xs font-black text-ink-muted uppercase tracking-widest font-fredoka">Gender Choice</label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <motion.button
                                                whileHover={{ y: -2 }}
                                                whileTap={{ scale: 0.95 }}
                                                type="button"
                                                className={cn(
                                                    "flex items-center justify-center gap-3 p-4 rounded-2xl border-4 transition-all font-fredoka font-bold text-lg",
                                                    profile.gender === "boy"
                                                        ? "bg-blue-500 text-white border-blue-400 shadow-clay-purple"
                                                        : "bg-white text-ink-muted border-slate-50 hover:border-blue-100 shadow-sm"
                                                )}
                                                onClick={() => setProfile({ ...profile, gender: "boy" })}
                                            >
                                                <span className="text-2xl">👦</span>
                                                Boy
                                            </motion.button>
                                            <motion.button
                                                whileHover={{ y: -2 }}
                                                whileTap={{ scale: 0.95 }}
                                                type="button"
                                                className={cn(
                                                    "flex items-center justify-center gap-3 p-4 rounded-2xl border-4 transition-all font-fredoka font-bold text-lg",
                                                    profile.gender === "girl"
                                                        ? "bg-pink-500 text-white border-pink-400 shadow-clay-pink"
                                                        : "bg-white text-ink-muted border-slate-50 hover:border-pink-100 shadow-sm"
                                                )}
                                                onClick={() => setProfile({ ...profile, gender: "girl" })}
                                            >
                                                <span className="text-2xl">👧</span>
                                                Girl
                                            </motion.button>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-center">
                                    <label className={cn(
                                        "w-full aspect-square rounded-[2.5rem] border-4 border-dashed transition-all cursor-pointer relative overflow-hidden flex flex-col items-center justify-center group",
                                        profile.avatarUrl
                                            ? "border-emerald-200 bg-emerald-50/30"
                                            : "border-purple-200 bg-purple-50/30 hover:bg-purple-50 hover:border-purple-300"
                                    )}>
                                        {profile.avatarUrl ? (
                                            <div className="relative w-full h-full p-4">
                                                <CachedImage
                                                    src={profile.avatarUrl}
                                                    storagePath={profile.avatarUrl.startsWith('data:') ? undefined : profile.avatarUrl}
                                                    alt="Preview"
                                                    fill
                                                    className="w-full h-full object-cover rounded-[2rem] shadow-clay ring-4 ring-white"
                                                />
                                                <motion.button
                                                    whileHover={{ scale: 1.1, rotate: 90 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        setProfile({ ...profile, avatarUrl: undefined });
                                                    }}
                                                    className="absolute top-6 right-6 w-10 h-10 bg-rose-500 text-white rounded-full shadow-lg flex items-center justify-center font-black text-xl border-2 border-white"
                                                >
                                                    ×
                                                </motion.button>
                                            </div>
                                        ) : (
                                            <div className="text-center p-8">
                                                <motion.div
                                                    animate={{ y: [0, -5, 0] }}
                                                    transition={{ duration: 3, repeat: Infinity }}
                                                    className="w-20 h-20 rounded-[1.5rem] bg-white shadow-clay flex items-center justify-center mx-auto mb-6 border-2 border-purple-100"
                                                >
                                                    {isUploading ? (
                                                        <RefreshCw className="h-10 w-10 text-purple-400 animate-spin" />
                                                    ) : (
                                                        <Sparkles className="h-10 w-10 text-purple-400" />
                                                    )}
                                                </motion.div>
                                                <span className="text-xl font-black text-purple-600 font-fredoka block mb-1">
                                                    {isUploading ? "Magical Pixels..." : "Hero Photo"}
                                                </span>
                                                <p className="text-sm font-medium text-purple-400 font-nunito">Tap to upload your picture!</p>
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            disabled={isUploading}
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setIsUploading(true);
                                                    try {
                                                        const compressed = await compressImage(file);
                                                        setProfile({ ...profile, avatarUrl: compressed });
                                                    } catch (err) {
                                                        console.error("Compression failed:", err);
                                                        setError("Failed to process image. Please try another one.");
                                                    } finally {
                                                        setIsUploading(false);
                                                    }
                                                }
                                            }}
                                        />
                                    </label>
                                </div>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.02, y: -4 }}
                                whileTap={{ scale: 0.98 }}
                                type="submit"
                                disabled={!profile.name}
                                className="w-full h-20 rounded-[2rem] bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-clay-purple border-2 border-white/30 flex items-center justify-center gap-3 text-2xl font-black font-fredoka uppercase tracking-widest disabled:opacity-50 transition-all"
                            >
                                <span>Next Step</span>
                                <ChevronRight className="h-8 w-8" />
                            </motion.button>
                        </form>
                    </motion.div>
                )}

                {step === "words" && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="clay-card p-10 md:p-12 relative overflow-hidden"
                    >
                        {/* Step Progress Bubble */}
                        <div className="flex items-center gap-3 mb-10 px-6 py-3 rounded-full bg-white/50 border-2 border-white w-fit shadow-sm">
                            <div className="w-8 h-8 rounded-full bg-emerald-500 shadow-clay-mint flex items-center justify-center">
                                <Check className="h-4 w-4 text-white" />
                            </div>
                            <div className="w-12 h-1.5 rounded-full bg-emerald-200" />
                            <div className="w-8 h-8 rounded-full bg-purple-500 shadow-clay-purple flex items-center justify-center font-black text-xs text-white">2</div>
                            <span className="font-fredoka font-black text-purple-600 text-sm uppercase tracking-wider ml-2">Choose Words</span>
                        </div>

                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-400 to-indigo-500 shadow-clay-purple flex items-center justify-center">
                                <Sparkles className="h-8 w-8 text-white animate-pulse" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-ink font-fredoka uppercase tracking-tight">Pick Magic Words</h2>
                                <p className="text-ink-muted font-medium font-nunito">Choose up to 5 words to include in your story</p>
                            </div>
                        </div>

                        {error && (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-8 p-5 rounded-2xl bg-rose-50 border-2 border-rose-100 text-rose-600 font-bold font-nunito flex items-center gap-3 shadow-sm">
                                <span className="text-2xl">⚠️</span> {error}
                            </motion.div>
                        )}

                        {words.length === 0 ? (
                            <div className="text-center py-16 rounded-[2.5rem] border-4 border-dashed border-purple-100 bg-purple-50/30">
                                <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 4, repeat: Infinity }}>
                                    <Sparkles className="h-16 w-16 text-purple-200 mx-auto mb-6" />
                                </motion.div>
                                <p className="font-black text-ink-muted text-xl font-fredoka mb-2">No words saved yet!</p>
                                <p className="font-medium text-ink-muted/60 mb-8 max-w-sm mx-auto">Explore more books to find magic words for your collection.</p>
                                <div className="flex flex-col gap-4 max-w-xs mx-auto">
                                    <Link href="/library">
                                        <button className="w-full h-14 rounded-2xl bg-white border-2 border-purple-200 text-purple-600 font-black font-fredoka hover:shadow-md transition-all">Go to Library</button>
                                    </Link>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => generateStory()}
                                        className="text-purple-400 font-black text-sm uppercase tracking-wider underline hover:text-purple-600"
                                    >
                                        Skip and create anyway
                                    </motion.button>
                                </div>
                            </div>
                        ) : (
                            <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {words.map((w) => {
                                    const isSelected = selectedWords.includes(w.word);
                                    return (
                                        <motion.button
                                            key={w.word}
                                            whileHover={{ y: -4, scale: 1.02 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => toggleWord(w.word)}
                                            className={cn(
                                                "relative h-20 px-6 rounded-2xl border-4 transition-all font-fredoka font-black text-xl flex items-center justify-between group overflow-hidden",
                                                isSelected
                                                    ? "bg-purple-500 text-white border-purple-400 shadow-clay-purple"
                                                    : "bg-white text-ink border-white hover:border-purple-100 shadow-sm"
                                            )}
                                        >
                                            <span className="relative z-10">{w.word}</span>
                                            {isSelected ? (
                                                <Check className="h-6 w-6 text-white relative z-10 animate-bounce-subtle" />
                                            ) : (
                                                <Plus className="h-6 w-6 text-purple-200 group-hover:text-purple-400 transition-colors" />
                                            )}
                                            {isSelected && (
                                                <motion.div
                                                    layoutId="sparkle-bg"
                                                    className="absolute inset-0 bg-gradient-to-br from-purple-400 to-indigo-600 opacity-50"
                                                />
                                            )}
                                        </motion.button>
                                    );
                                })}
                            </div>
                        )}

                        <div className="flex items-center justify-between pt-8 border-t-2 border-purple-50">
                            <motion.button
                                whileHover={{ x: -4 }}
                                onClick={() => setStep("profile")}
                                className="flex items-center gap-3 font-black text-ink-muted hover:text-ink transition-colors font-fredoka uppercase tracking-wider"
                            >
                                <ArrowLeft className="h-5 w-5" />
                                Back
                            </motion.button>

                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white shadow-inner border border-purple-100">
                                    <span className="text-2xl font-black text-purple-600 font-fredoka">{selectedWords.length}</span>
                                    <span className="text-[10px] uppercase font-black tracking-widest text-purple-400 font-fredoka">/ 5 Words</span>
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.02, y: -4 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={generateStory}
                                    className="h-16 px-10 rounded-[1.5rem] bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-clay-purple border-2 border-white/30 flex items-center gap-3 text-xl font-black font-fredoka uppercase tracking-widest"
                                >
                                    <span>Cast Spell</span>
                                    <Wand2 className="h-6 w-6" />
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {step === "generating" && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="clay-card p-16 flex flex-col items-center justify-center text-center min-h-[500px] relative overflow-hidden"
                    >
                        {/* Cinematic Background Elements */}
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5" />
                        <div className="absolute top-[-20%] left-[-20%] w-full h-full bg-purple-400/10 blur-[100px] rounded-full animate-floaty" />

                        <div className="relative mb-12">
                            {/* Outer Radiance */}
                            <div className="absolute inset-[-40px] bg-purple-400/20 blur-[60px] rounded-full animate-pulse" />

                            {/* Main Wand Hexagon/Circle */}
                            <div className="relative w-32 h-32 rounded-[2.5rem] bg-white shadow-clay-purple flex items-center justify-center border-4 border-purple-100 ring-8 ring-purple-50/50">
                                <motion.div
                                    animate={{
                                        rotate: [0, 15, -15, 0],
                                        scale: [1, 1.1, 1],
                                    }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                >
                                    <Wand2 className="h-14 w-14 text-purple-500 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
                                </motion.div>

                                {/* Floating Sparkles */}
                                {[...Array(6)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                                        animate={{
                                            x: [0, (i % 2 === 0 ? 50 : -50) * Math.cos(i)],
                                            y: [0, (i % 2 === 0 ? 50 : -50) * Math.sin(i)],
                                            opacity: [0, 1, 0],
                                            scale: [0, 1.2, 0],
                                        }}
                                        transition={{
                                            duration: 2,
                                            repeat: Infinity,
                                            delay: i * 0.3,
                                        }}
                                    />
                                ))}
                            </div>
                        </div>

                        <h2 className="text-4xl font-black font-fredoka text-ink uppercase tracking-tight mb-4 relative">
                            Making Magic...
                        </h2>
                        <p className="text-xl text-ink-muted font-bold font-nunito mb-2">
                            Writing a special adventure for <span className="text-purple-600">{profile.name}</span>
                        </p>
                        <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-full border border-purple-100 mt-6">
                            <RefreshCw className="h-4 w-4 text-purple-400 animate-spin" />
                            <span className="text-xs font-black text-purple-400 uppercase tracking-widest font-fredoka">Creating original art & story</span>
                        </div>

                        <div className="mt-12 w-full max-w-xs h-3 bg-purple-100 rounded-full overflow-hidden shadow-inner p-0.5">
                            <motion.div
                                className="h-full bg-gradient-to-r from-purple-500 via-pink-400 to-indigo-500 rounded-full"
                                animate={{ width: ["10%", "90%"] }}
                                transition={{ duration: 15, ease: "linear" }}
                            />
                        </div>
                    </motion.div>
                )}
            </main>
        </div>
    );
}
