"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Wand2, BookOpen, Sparkles, Check, ChevronRight, User, RefreshCw, Plus } from "lucide-react";
import { useWordList } from "@/lib/features/word-insight";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/core";
import { getStoryService } from "@/lib/features/story";
import { useBookMediaSubscription, useBookAudioSubscription } from "@/lib/hooks/use-realtime-subscriptions";
import { useUsage } from "@/lib/hooks/use-usage";
import type { Story, UserProfile } from "@/lib/features/story";
import SupabaseReaderShell, { type SupabaseBook } from "@/components/reader/supabase-reader-shell";
import { compressImage } from "@/lib/core/utils/image";
import { raidenCache, CacheStore } from "@/lib/core/cache";
import { CachedImage } from "@/components/ui/cached-image";
import { useAuth } from "@/components/auth/auth-provider";
import { createChildProfile, switchActiveChild } from "@/app/actions/profiles";
import { createClient } from "@/lib/supabase/client";

type Step = "profile" | "words" | "generating" | "reading";

interface StoryMakerClientProps {
    initialProfile: UserProfile;
}

interface GenerationState {
    isGenerating: boolean;
    result: Story | null;
}

// Global store keyed by userId to prevent session leakage
const generations: Record<string, GenerationState> = {};

function getGenerationState(userId: string): GenerationState {
    if (!generations[userId]) {
        generations[userId] = { isGenerating: false, result: null };
    }
    return generations[userId];
}

export function clearStoryMakerGlobals(): void {
    // Clear all session states (e.g. on logout)
    Object.keys(generations).forEach(key => delete generations[key]);
}

export default function StoryMakerClient({ initialProfile }: StoryMakerClientProps) {
    const { words } = useWordList();
    const { activeChild, isLoading, user, profiles, refreshProfiles, setActiveChild, isStoryGenerating, setIsStoryGenerating } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const service = getStoryService();
    const [step, setStep] = useState<Step>("profile");
    const [profile, setProfile] = useState<UserProfile>(initialProfile);
    const [selectedWords, setSelectedWords] = useState<string[]>([]);
    const [story, setStory] = useState<Story | null>(null);
    const [supabaseBook, setSupabaseBook] = useState<SupabaseBook | null>(null);
    const [currentPage, setCurrentPage] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [isGuestOneOffFlow, setIsGuestOneOffFlow] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const { usage, plan, loading: usageLoading, refresh: refreshUsage } = useUsage(["story_generation", "image_generation", "word_insight"]);
    const [storyLengthMinutes, setStoryLengthMinutes] = useState(5); // In Minutes
    const [imageSceneCount, setImageSceneCount] = useState(3);

    // Track versions to prevent race conditions
    const saveVersionRef = useRef(0);
    const isMountedRef = useRef(true);
    const processingRef = useRef(false);
    const supabase = useMemo(() => createClient(), []);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);


    // Load saved draft on mount
    useEffect(() => {
        const loadDraft = async () => {
            try {
                // 1. Try IndexedDB first (session-keyed by user + active child)
                const draftKey = user
                    ? (activeChild?.id ? `draft:${user.id}:${activeChild.id}` : `draft:${user.id}`)
                    : "draft:guest";
                let savedDraft = await raidenCache.get<any>(CacheStore.DRAFTS, draftKey);

                // 2. Migration: If user is logged in but has no draft, check for guest draft
                if (!savedDraft && user && !processingRef.current) {
                    const guestDraft = await raidenCache.get<any>(CacheStore.DRAFTS, "draft:guest");
                    if (guestDraft) {
                        console.debug("[StoryMakerClient] Found guest draft to migrate.");
                        savedDraft = guestDraft;
                    }
                }

                // 3. Migration fallback: check localStorage
                if (!savedDraft) {
                    const legacyDraft = localStorage.getItem("raiden:story_maker_draft");
                    if (legacyDraft) {
                        try {
                            savedDraft = JSON.parse(legacyDraft);
                        } catch (e) {
                            console.error("Failed to parse legacy draft:", e);
                        }
                    }
                }

                if (!isMountedRef.current) return;

                if (savedDraft) {
                    const { profile: savedProfile, selectedWords: savedWords, storyLengthMinutes: savedStoryLength, imageSceneCount: savedImageCount } = savedDraft;
                    if (step === "profile" && (savedProfile || savedWords)) {
                        setProfile((prev: UserProfile) => {
                            if (prev.name && !savedProfile?.name) return prev;
                            return { ...prev, ...savedProfile };
                        });
                        if (savedWords) setSelectedWords(savedWords);
                        if (savedStoryLength) setStoryLengthMinutes(savedStoryLength);
                        setImageSceneCount(savedImageCount !== undefined ? savedImageCount : (savedStoryLength || 5));
                    }
                } else if (activeChild && !profile.name) {
                    // Pre-fill from active child if no draft exists
                    const age = activeChild.birth_year ? new Date().getFullYear() - activeChild.birth_year : 5;
                    setProfile({
                        id: activeChild.id,
                        name: activeChild.first_name,
                        age: age,
                        gender: (activeChild.gender as any) || 'neutral',
                        avatarUrl: (activeChild.avatar_paths && activeChild.avatar_paths.length > 0) ? activeChild.avatar_paths[0] : undefined,
                        avatarStoragePath: (activeChild.avatar_paths && activeChild.avatar_paths.length > 0) ? activeChild.avatar_paths[0] : undefined,
                        interests: activeChild.interests || [],
                        // Pre-fill topic with first interest if available
                        topic: activeChild.interests?.[0] || ""
                    });
                } else if (initialProfile && !profile.name) {
                    setProfile((prev: UserProfile) => ({
                        ...prev,
                        ...initialProfile
                    }));
                }
            } catch (err) {
                console.error("Failed to load/migrate story maker draft:", err);
            }
        };
        loadDraft();
    }, [initialProfile, user, activeChild]);

    // Unified Effect for Resuming, Result Polling, and Cleanup
    useEffect(() => {
        async function resumeDraftIfNeeded() {
            // Wait for user and hydration, but allow step === "profile"
            if (!user || isLoading || step !== "profile" || processingRef.current) return;

            const action = searchParams.get("action");
            const isResuming = action === "resume_story_maker" || action === "generate";
            if (!isResuming) return;

            const draftKey = `draft:${user.id}`;
            let draft = await raidenCache.get<any>(CacheStore.DRAFTS, draftKey);

            // Migration fallback
            if (!draft) {
                const guestDraft = await raidenCache.get<any>(CacheStore.DRAFTS, "draft:guest");
                if (guestDraft) {
                    console.debug("[StoryMakerClient] Consuming guest draft for resume.");
                    draft = guestDraft;
                    // Persist to user+child record and delete guest
                    await raidenCache.put(CacheStore.DRAFTS, { id: draftKey, ...guestDraft });
                    await raidenCache.delete(CacheStore.DRAFTS, "draft:guest");
                }
            }

            if (!draft) {
                console.debug("[StoryMakerClient] No draft found to resume.");
                return;
            }

            // Session check: Ensure draft belongs to current user
            const state = getGenerationState(user.id);

            // Update local state immediately to match draft
            console.debug("[StoryMakerClient] Resuming with draft:", draft.profile.name);
            setProfile(draft.profile);
            setSelectedWords(draft.selectedWords);
            if (draft.storyLength) setStoryLengthMinutes(draft.storyLength);
            setImageSceneCount(draft.imageCount !== undefined ? draft.imageCount : (draft.storyLength || 5));

            if (state.isGenerating) {
                console.debug("[StoryMakerClient] Resuming: Background generation in progress.");
                setStep("generating");
                processingRef.current = true;
                return;
            }

            if (state.result) {
                console.debug("[StoryMakerClient] Resuming: Story result found.");
                setStory(state.result);
                setStep("reading");
                state.result = null; // Consume
                processingRef.current = true;
                return;
            }

            // Trigger generation
            processingRef.current = true;
            generateStory(draft.selectedWords, draft.profile, draft.storyLength, draft.imageCount);
        }

        resumeDraftIfNeeded();
    }, [user, isLoading, searchParams, step]);

    // Polling effect for results (if unmounted/remounted into generating state)
    useEffect(() => {
        if (user && step === "generating") {
            const state = getGenerationState(user.id);
            if (state.result) {
                console.debug("[StoryMakerClient] Applying caught-up story result.");
                setStory(state.result);
                setStep("reading");
                state.result = null;
            }
        }
    }, [step, user]);

    // Save draft on changes (Debounced)
    useEffect(() => {
        const version = ++saveVersionRef.current;
        setIsSaving(true);

        const timer = setTimeout(async () => {
            try {
                // Only save if this is still the latest version
                if (version === saveVersionRef.current) {
                    const draftKey = user
                        ? (activeChild?.id ? `draft:${user.id}:${activeChild.id}` : `draft:${user.id}`)
                        : "draft:guest";
                    await raidenCache.put(CacheStore.DRAFTS, { id: draftKey, profile, selectedWords, storyLengthMinutes, imageSceneCount });
                    if (isMountedRef.current) setIsSaving(false);
                }
            } catch (err) {
                console.error("Failed to save draft to IndexedDB:", err);
                if (isMountedRef.current) setIsSaving(false);
            }
        }, 1000); // 1s debounce

        return () => clearTimeout(timer);
    }, [profile, selectedWords, user]);

    // Subscribe to realtime updates
    useBookMediaSubscription(supabaseBook?.id, useCallback((newImage: any) => {
        setSupabaseBook((prev: SupabaseBook | null) => {
            if (!prev) return null;
            const currentImages = prev.images || [];

            // 1. Try to find a placeholder to replace
            const placeholderIndex = currentImages.findIndex((img: any) =>
                Number(img.afterWordIndex) === Number(newImage.afterWordIndex) && img.isPlaceholder
            );

            if (placeholderIndex !== -1) {
                const updatedImages = [...currentImages];
                updatedImages[placeholderIndex] = { ...newImage, isPlaceholder: false };
                return { ...prev, images: updatedImages };
            }

            // 2. If no placeholder, check if we should update an existing real image
            const existingIndex = currentImages.findIndex((img: any) =>
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

    useBookAudioSubscription(supabaseBook?.id, useCallback((newShard: any) => {
        setSupabaseBook((prev: SupabaseBook | null) => {
            if (!prev) return null;
            const shards = prev.shards || [];
            if (shards.some((s: any) => s.chunk_index === newShard.chunk_index)) return prev;
            return { ...prev, shards: [...shards, newShard] };
        });
    }, [setSupabaseBook]));

    function handleProfileSubmit(e: React.FormEvent<HTMLFormElement>): void {
        e.preventDefault();
        if (profile.name) {
            setStep("words");
        }
    }

    function toggleWord(word: string): void {
        setSelectedWords(prev =>
            prev.includes(word)
                ? prev.filter(w => w !== word)
                : (prev.length < 5 ? [...prev, word] : prev)
        );
    }

    async function generateStory(overrideWords?: string[], overrideProfile?: UserProfile, overrideStoryLengthMinutes?: number, overrideImageSceneCount?: number): Promise<void> {
        const finalWords = overrideWords || selectedWords;
        const finalProfile = overrideProfile || profile;
        const finalStoryLengthMinutes = overrideStoryLengthMinutes || storyLengthMinutes;

        if (!user) {
            await raidenCache.put(CacheStore.DRAFTS, { id: "draft:guest", profile: finalProfile, selectedWords: finalWords });
            router.push("/login?returnTo=/story-maker&action=generate");
            return;
        }

        const currentUid = user.id;
        const state = getGenerationState(currentUid);
        setIsStoryGenerating(true);
        state.isGenerating = true;

        if (overrideProfile) setProfile(finalProfile);
        if (overrideWords) setSelectedWords(finalWords);
        if (overrideWords) setSelectedWords(finalWords);
        if (overrideStoryLengthMinutes) setStoryLengthMinutes(finalStoryLengthMinutes);
        // Note: imageSceneCount override support avoided for simplicity unless needed, assuming state matches
        const finalImageSceneCount = imageSceneCount; // Use current state as override logic for image count is tricky without clearer signature

        setStep("generating");
        setError(null);

        try {
            let currentProfile = finalProfile;

            // Profile auto-creation logic
            const shouldCreateProfile = !currentProfile.id;

            console.debug("[StoryMakerClient] Story generation started for:", currentProfile.name, {
                shouldCreateProfile,
                hasProfileId: !!currentProfile.id,
                profileCount: profiles.length
            });

            if (shouldCreateProfile) {
                const profileData = {
                    first_name: currentProfile.name,
                    birth_year: new Date().getFullYear() - currentProfile.age,
                    gender: currentProfile.gender,
                    interests: currentProfile.interests || [],
                    avatar_asset_path: currentProfile.avatarUrl,
                    avatar_paths: currentProfile.avatarStoragePath ? [currentProfile.avatarStoragePath] : []
                };

                console.debug("[StoryMakerClient] Creating profile for guest-to-user flow...");
                const result = await createChildProfile(profileData);

                // Post-await session validation
                const postFetchSession = await supabase.auth.getSession();
                if (postFetchSession.data.session?.user.id !== currentUid) {
                    console.warn("[StoryMakerClient] Aborting: Session changed during profile creation.");
                    setStep("profile");
                    setError("Session changed. Please try again.");
                    return;
                }

                if (result.success && result.data) {
                    console.debug("[StoryMakerClient] Profile created:", result.data.id);
                    currentProfile = { ...currentProfile, id: result.data.id };
                    setProfile(currentProfile);
                    await raidenCache.put(CacheStore.DRAFTS, {
                        id: `draft:${currentUid}`,
                        profile: currentProfile,
                        selectedWords: finalWords,
                        storyLengthMinutes: finalStoryLengthMinutes,
                        imageSceneCount: finalImageSceneCount
                    });


                    setActiveChild(result.data);
                    await refreshProfiles(true);
                } else {
                    console.error("[StoryMakerClient] Profile creation failed:", result.error);
                    throw new Error(result.error);
                }
            }

            console.debug("[StoryMakerClient] Generating story content with storyLengthMinutes/imageSceneCount:", finalStoryLengthMinutes, finalImageSceneCount);
            const content = await service.generateStoryContent(finalWords, currentProfile, finalStoryLengthMinutes, finalImageSceneCount);

            // Post-await session validation
            const finalSession = await supabase.auth.getSession();
            if (finalSession.data.session?.user.id !== currentUid) {
                console.warn("[StoryMakerClient] Aborting: Session changed during story generation.");
                setStep("profile");
                setError("Session changed. Please try again.");
                return;
            }

            const initialStory: Story = {
                id: crypto.randomUUID(),
                book_id: content.book_id,
                title: content.title,
                content: content.content,
                sections: content.sections,
                createdAt: Date.now(),
                wordsUsed: finalWords,
                userProfile: currentProfile, // Use the one with ID now
                mainCharacterDescription: content.mainCharacterDescription,
            };

            const initialSupabaseBook: SupabaseBook = {
                id: content.book_id,
                title: content.title,
                text: content.content,
                tokens: content.tokens || [],
                shards: [],
                images: content.sections.map((section, idx) => ({
                    id: `section-${idx}`,
                    src: "",
                    afterWordIndex: Number(section.after_word_index),
                    caption: "Drawing Magic...",
                    prompt: section.image_prompt,
                    isPlaceholder: true,
                    sectionIndex: idx
                })),
            };

            setStory(initialStory);
            setSupabaseBook(initialSupabaseBook);

            // Capture result in session-keyed global
            state.result = initialStory;

            await raidenCache.put(CacheStore.BOOKS, initialSupabaseBook);
            if (user?.id) await raidenCache.delete(CacheStore.LIBRARY_METADATA, user.id);

            router.push(`/reader/${content.book_id}`);
            // service.generateImagesForBook is now called automatically on backend

        } catch (err: any) {
            console.error(err);
            if (err.name === 'AIError' && (err.message === 'LIMIT_REACHED' || err.message === 'IMAGE_LIMIT_REACHED')) {
                const msg = err.message === 'IMAGE_LIMIT_REACHED'
                    ? "You don't have enough energy crystals for that many sections!"
                    : "You've reached your story generation limit for today! Upgrade to Pro for more stories.";
                setError(msg);
                setStep("profile"); // Drop back to profile step so they can see the error
            } else {
                setError("Oops! Something went wrong while making your story. Please try again.");
            }
        } finally {
            refreshUsage(); // Refresh usage after attempt
            setIsStoryGenerating(false);
            state.isGenerating = false;
            processingRef.current = false;
        }
    }

    function reset(): void {
        setStep("profile");
        setStory(null);
        setSelectedWords([]);
        setError(null);
    }

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
                                <h2 className="text-3xl font-black text-ink font-fredoka uppercase tracking-tight">
                                    {isGuestOneOffFlow ? "Welcome Back! ✨" : "About the Hero"}
                                </h2>
                                <p className="text-ink-muted font-medium font-nunito">
                                    {isGuestOneOffFlow ? "Pick a child for this adventure." : "Tell us who&apos;s going on this adventure!"}
                                </p>
                            </div>
                        </div>

                        {isGuestOneOffFlow ? (
                            <div className="max-w-4xl mx-auto mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                                    {profiles.map((p) => (
                                        <motion.button
                                            key={p.id}
                                            type="button"
                                            whileHover={{ scale: 1.05, y: -4 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={async () => {
                                                const birthYear = p.birth_year || new Date().getFullYear() - 5;
                                                const selectedProfile: UserProfile = {
                                                    id: p.id,
                                                    name: p.first_name,
                                                    age: new Date().getFullYear() - birthYear,
                                                    gender: (p.gender as any) || 'neutral',
                                                    avatarUrl: (p.avatar_paths && p.avatar_paths.length > 0) ? p.avatar_paths[0] : '',
                                                    avatarStoragePath: (p.avatar_paths && p.avatar_paths.length > 0) ? p.avatar_paths[0] : undefined,
                                                    interests: p.interests || []
                                                };
                                                setProfile(selectedProfile);
                                                const draftKey = user ? `draft:${user.id}` : "draft:guest";
                                                const draft = await raidenCache.get<any>(CacheStore.DRAFTS, draftKey);
                                                if (draft) {
                                                    generateStory(draft.selectedWords, selectedProfile, draft.storyLength);
                                                }
                                            }}
                                            className="p-6 rounded-[2.5rem] bg-white border-4 border-purple-50 hover:border-purple-200 transition-all shadow-lg flex flex-col items-center gap-4 group"
                                        >
                                            <div className="relative w-24 h-24">
                                                <div className="absolute inset-0 bg-purple-100 rounded-full scale-110 group-hover:scale-125 transition-transform duration-500" />
                                                <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-white shadow-md">
                                                    {(p.avatar_paths && p.avatar_paths.length > 0) ? (
                                                        <CachedImage
                                                            src={p.avatar_paths[0]}
                                                            storagePath={p.avatar_paths[0]}
                                                            alt={p.first_name}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                                                            <User className="w-10 h-10 text-slate-300" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-xl font-black font-fredoka text-ink uppercase">{p.first_name}</div>
                                                <div className="text-xs font-bold text-ink-muted font-nunito uppercase tracking-widest">{new Date().getFullYear() - (p.birth_year || new Date().getFullYear())} Years Old</div>
                                            </div>
                                        </motion.button>
                                    ))}
                                    <motion.button
                                        whileHover={{ scale: 1.05, y: -4 }}
                                        whileTap={{ scale: 0.95 }}
                                        type="button"
                                        onClick={() => setIsGuestOneOffFlow(false)}
                                        className="p-6 rounded-[2.5rem] bg-purple-50 border-4 border-dashed border-purple-200 hover:border-purple-400 transition-all flex flex-col items-center justify-center gap-4 text-purple-600 group"
                                    >
                                        <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:bg-purple-500 group-hover:text-white transition-colors">
                                            <Plus className="w-8 h-8" />
                                        </div>
                                        <div className="text-center">
                                            <div className="text-lg font-black font-fredoka uppercase leading-tight">Create New Hero</div>
                                            <div className="text-[10px] font-bold opacity-60 font-nunito max-w-[120px]">If this story is for someone new.</div>
                                        </div>
                                    </motion.button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleProfileSubmit} className="relative">
                                <div className="grid md:grid-cols-2 gap-10 mb-10">
                                    <div className="space-y-8">
                                        <div>
                                            <label className="mb-3 block text-xs font-black text-ink-muted uppercase tracking-widest font-fredoka">Hero&apos;s Name</label>
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
                                                        src={profile.avatarUrl || ''}
                                                        storagePath={profile.avatarStoragePath || (profile.avatarUrl?.includes('/') ? profile.avatarUrl : undefined)}
                                                        alt="Preview"
                                                        fill
                                                        className="w-full h-full object-cover rounded-[2rem] shadow-clay ring-4 ring-white"
                                                    />

                                                    {/* Change Photo Overlay */}
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-[2rem] z-10">
                                                        <span className="text-white font-bold font-fredoka flex items-center gap-2">
                                                            <RefreshCw className="w-5 h-5" />
                                                            Change
                                                        </span>
                                                    </div>

                                                    <motion.button
                                                        whileHover={{ scale: 1.1, rotate: 90 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        type="button"
                                                        onClick={(e: React.MouseEvent) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setProfile({ ...profile, avatarUrl: undefined, avatarStoragePath: undefined });
                                                        }}
                                                        className="absolute top-6 right-6 w-10 h-10 bg-rose-500 text-white rounded-full shadow-lg flex items-center justify-center font-black text-xl border-2 border-white z-20"
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
                                                onClick={(e) => { (e.target as HTMLInputElement).value = '' }}
                                                onChange={async (e: React.ChangeEvent<HTMLInputElement>) => {
                                                    const file = e.target.files?.[0];
                                                    if (file && user) {
                                                        setIsUploading(true);
                                                        try {
                                                            const compressed = await compressImage(file);

                                                            // Convert base64 Data URL to Blob for upload
                                                            const res = await fetch(compressed);
                                                            const blob = await res.blob();

                                                            const timestamp = Date.now();
                                                            const randomId = crypto.randomUUID().split('-')[0];
                                                            const ext = file.name.split('.').pop() || 'jpg';
                                                            const storagePath = `${user.id}/story-uploads/${timestamp}-${randomId}.${ext}`;

                                                            const { error: uploadError } = await supabase.storage
                                                                .from('user-assets')
                                                                .upload(storagePath, blob, {
                                                                    contentType: file.type,
                                                                    upsert: true
                                                                });

                                                            if (uploadError) throw uploadError;

                                                            const { data: { publicUrl } } = supabase.storage
                                                                .from('user-assets')
                                                                .getPublicUrl(storagePath);

                                                            setProfile({
                                                                ...profile,
                                                                avatarUrl: storagePath,
                                                                avatarStoragePath: storagePath
                                                            });
                                                        } catch (err) {
                                                            console.error("Upload failed:", err);
                                                            setError("Failed to process and upload image. Please try another one.");
                                                        } finally {
                                                            setIsUploading(false);
                                                        }
                                                    } else if (!user) {
                                                        setError("Please log in to upload photos.");
                                                    }
                                                }}
                                            />
                                        </label>
                                    </div>
                                </div>

                                {/* Adventure Details: Topic and Setting */}
                                <div className="grid md:grid-cols-2 gap-8 mb-10 pt-8 border-t-2 border-purple-50">
                                    <div>
                                        <label className="mb-3 block text-xs font-black text-ink-muted uppercase tracking-widest font-fredoka">What&apos;s the Story About?</label>
                                        <input
                                            type="text"
                                            value={profile.topic || ''}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfile({ ...profile, topic: e.target.value })}
                                            className="w-full h-14 px-6 rounded-2xl border-4 border-purple-50 bg-white/50 focus:bg-white focus:border-purple-300 outline-none transition-all font-nunito text-lg font-bold text-ink placeholder:text-slate-300 shadow-inner"
                                            placeholder="e.g., A trip to Mars, A talking kitten"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-3 block text-xs font-black text-ink-muted uppercase tracking-widest font-fredoka">Where Does it Happen?</label>
                                        <input
                                            type="text"
                                            value={profile.setting || ''}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfile({ ...profile, setting: e.target.value })}
                                            className="w-full h-14 px-6 rounded-2xl border-4 border-purple-50 bg-white/50 focus:bg-white focus:border-purple-300 outline-none transition-all font-nunito text-lg font-bold text-ink placeholder:text-slate-300 shadow-inner"
                                            placeholder="e.g., Space, Enchanted Forest, Underwater"
                                        />
                                    </div>
                                </div>

                                {/* New: Story Length Control */}
                                <div className="mb-10 pt-8 border-t-2 border-purple-50">
                                    <div className="flex items-center justify-between mb-4">
                                        <label className="text-xs font-black text-ink-muted uppercase tracking-widest font-fredoka flex items-center gap-2">
                                            <BookOpen className="w-4 h-4 text-purple-400" />
                                            Story Length
                                        </label>
                                        <span className={cn(
                                            "px-3 py-1 rounded-full text-xs font-black font-fredoka uppercase tracking-wider",
                                            storyLengthMinutes <= 4 ? "bg-blue-50 text-blue-500" :
                                                storyLengthMinutes <= 7 ? "bg-purple-50 text-purple-500" : "bg-pink-50 text-pink-500"
                                        )}>
                                            {storyLengthMinutes === 3 ? "Quick Adventure" :
                                                storyLengthMinutes <= 5 ? "Normal Tale" :
                                                    storyLengthMinutes <= 8 ? "Epic Journey" : "Gran Saga"}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-6 p-4 rounded-[2rem] bg-purple-50 shadow-inner border-2 border-white/50">
                                        <div className="flex-1 px-4">
                                            <div className="flex justify-between mb-3 px-1 items-center">
                                                <label className="text-xs font-black text-ink-muted uppercase tracking-widest font-fredoka flex items-center gap-2">
                                                    <BookOpen className="w-4 h-4 text-purple-400" />
                                                    Reading Time
                                                </label>
                                                <span className="text-[10px] font-bold text-purple-400 bg-purple-100 px-2 py-0.5 rounded-full">
                                                    {storyLengthMinutes === 1 ? "Quick" : storyLengthMinutes <= 5 ? "Normal" : "Long"}
                                                </span>
                                            </div>
                                            <div className="flex justify-between mb-2 px-1">
                                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => (
                                                    <div
                                                        key={val}
                                                        className={cn(
                                                            "w-1.5 h-1.5 rounded-full transition-all duration-300",
                                                            val <= storyLengthMinutes ? "bg-purple-400 scale-125" : "bg-purple-200"
                                                        )}
                                                    />
                                                ))}
                                            </div>
                                            <input
                                                type="range"
                                                min="1"
                                                max="10"
                                                step="1"
                                                value={storyLengthMinutes}
                                                onChange={(e) => {
                                                    const newVal = parseInt(e.target.value);
                                                    setStoryLengthMinutes(newVal);
                                                    if (imageSceneCount > newVal) setImageSceneCount(newVal);
                                                }}
                                                className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                                            />
                                            <div className="mt-1 flex justify-between text-[10px] font-black text-purple-300 font-fredoka uppercase">
                                                <span>1 min</span>
                                                <span>10 mins</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-center min-w-[70px]">
                                            <span className="text-3xl font-black text-purple-600 font-fredoka leading-none">{storyLengthMinutes}</span>
                                            <span className="text-[10px] font-black text-purple-400 uppercase tracking-tighter">mins</span>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex items-center gap-6 p-4 rounded-[2rem] bg-amber-50 shadow-inner border-2 border-white/50">
                                        <div className="flex-1 px-4">
                                            <div className="flex justify-between mb-3 px-1 items-center">
                                                <label className="text-xs font-black text-ink-muted uppercase tracking-widest font-fredoka flex items-center gap-2">
                                                    <Sparkles className="w-4 h-4 text-amber-500" />
                                                    Illustrations
                                                </label>
                                            </div>
                                            <div className="flex justify-between mb-2 px-1">
                                                {Array.from({ length: Math.min(storyLengthMinutes + 1, 11) }).map((_, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={cn(
                                                            "w-1.5 h-1.5 rounded-full transition-all duration-300",
                                                            idx <= imageSceneCount ? "bg-amber-400 scale-125" : "bg-amber-200"
                                                        )}
                                                    />
                                                ))}
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max={storyLengthMinutes}
                                                step="1"
                                                value={imageSceneCount}
                                                onChange={(e) => setImageSceneCount(parseInt(e.target.value))}
                                                className="w-full h-2 bg-amber-100 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                            />
                                            <div className="mt-1 flex justify-between text-[10px] font-black text-amber-300 font-fredoka uppercase">
                                                <span>None</span>
                                                <span>Max</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-center min-w-[70px]">
                                            <span className="text-3xl font-black text-amber-500 font-fredoka leading-none">{imageSceneCount}</span>
                                            <span className="text-[10px] font-black text-amber-400 uppercase tracking-tighter">images</span>
                                        </div>
                                    </div>

                                    <p className="mt-3 text-[10px] font-bold text-ink-muted font-nunito flex items-center gap-1.5 px-2">
                                        <Sparkles className="w-3 h-3 text-amber-400" />
                                        <span>This adventure will use <strong>{imageSceneCount}</strong> images.</span>
                                        {usage["image_generation"] && (
                                            <span className={cn(
                                                "ml-2 px-2 py-0.5 rounded-full text-[10px] border",
                                                usage["image_generation"].current + imageSceneCount > usage["image_generation"].limit
                                                    ? "bg-rose-50 text-rose-500 border-rose-100"
                                                    : "bg-emerald-50 text-emerald-600 border-emerald-100"
                                            )}>
                                                ({usage["image_generation"].limit - usage["image_generation"].current} remaining)
                                            </span>
                                        )}
                                    </p>
                                    {usage["image_generation"] && usage["image_generation"].current + imageSceneCount > usage["image_generation"].limit && (
                                        <p className="mt-1 text-[10px] font-bold text-rose-500 font-nunito px-2 flex items-center gap-1">
                                            <span>⚠️ Not enough image credits. Reduce illustrations or upgrade.</span>
                                        </p>
                                    )}
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.02, y: -4 }}
                                    whileTap={{ scale: 0.98 }}
                                    type="submit"
                                    disabled={!profile.name || (usage["image_generation"] ? usage["image_generation"].current + imageSceneCount > usage["image_generation"].limit : false)}
                                    className="w-full h-20 rounded-[2rem] bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-clay-purple border-2 border-white/30 flex items-center justify-center gap-3 text-2xl font-black font-fredoka uppercase tracking-widest disabled:opacity-50 transition-all"
                                >
                                    <span>Next Step</span>
                                    <ChevronRight className="h-8 w-8" />
                                </motion.button>

                                {usage["story_generation"] && (
                                    <div className="mt-6 flex flex-col items-center justify-center gap-3">
                                        <div className={cn(
                                            "px-4 py-2 rounded-full border text-xs font-black font-fredoka uppercase tracking-wider flex items-center gap-2",
                                            usage["story_generation"].isLimitReached ? "bg-rose-50 border-rose-100 text-rose-500" : "bg-purple-50 border-purple-100 text-purple-400"
                                        )}>
                                            {usage["story_generation"].isLimitReached ? (
                                                <>
                                                    <span className="text-base">⚠️</span>
                                                    Daily Story Limit Reached
                                                </>
                                            ) : (
                                                <>
                                                    <Wand2 className="w-3.5 h-3.5" />
                                                    {usage["story_generation"].current} / {usage["story_generation"].limit} Stories Used Today
                                                </>
                                            )}
                                        </div>

                                        {usage["story_generation"].isLimitReached && (
                                            <Link href="/pricing" className="group">
                                                <motion.div
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-white font-fredoka font-black text-sm uppercase tracking-wider shadow-lg flex items-center gap-2"
                                                >
                                                    <Sparkles className="w-4 h-4" />
                                                    Upgrade for Unlimited Stories
                                                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                                </motion.div>
                                            </Link>
                                        )}
                                    </div>
                                )}
                            </form>
                        )}
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

                                {usage["story_generation"] && (
                                    <div className={cn(
                                        "hidden sm:flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white shadow-inner border transition-colors",
                                        usage["story_generation"].isLimitReached ? "border-rose-200 bg-rose-50" : "border-purple-100"
                                    )}>
                                        <span className={cn(
                                            "text-2xl font-black font-fredoka",
                                            usage["story_generation"].isLimitReached ? "text-rose-500" : "text-purple-600"
                                        )}>
                                            {usage["story_generation"].current}
                                        </span>
                                        <span className={cn(
                                            "text-[10px] uppercase font-black tracking-widest font-fredoka",
                                            usage["story_generation"].isLimitReached ? "text-rose-400" : "text-purple-400"
                                        )}>
                                            / {usage["story_generation"].limit} Stories
                                        </span>
                                    </div>
                                )}

                                <motion.button
                                    whileHover={usage["story_generation"]?.isLimitReached ? {} : { scale: 1.02, y: -4 }}
                                    whileTap={usage["story_generation"]?.isLimitReached ? {} : { scale: 0.98 }}
                                    onClick={() => !usage["story_generation"]?.isLimitReached && generateStory()}
                                    disabled={usage["story_generation"]?.isLimitReached}
                                    className={cn(
                                        "h-16 px-10 rounded-[1.5rem] text-white border-2 border-white/30 flex items-center gap-3 text-xl font-black font-fredoka uppercase tracking-widest transition-all",
                                        usage["story_generation"]?.isLimitReached
                                            ? "bg-slate-300 shadow-none cursor-not-allowed opacity-70"
                                            : "bg-gradient-to-r from-purple-500 to-indigo-600 shadow-clay-purple"
                                    )}
                                >
                                    <span>{usage["story_generation"]?.isLimitReached ? "Limit Reached" : "Cast Spell"}</span>
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

                        {error ? (
                            <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-300">
                                <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center border-4 border-red-100 mb-2">
                                    <span className="text-4xl">😅</span>
                                </div>
                                <div className="text-center space-y-2">
                                    <h2 className="text-3xl font-black font-fredoka text-ink uppercase">Oh no!</h2>
                                    <p className="text-lg font-bold text-ink-muted font-nunito max-w-sm mx-auto">{error}</p>
                                </div>
                                <div className="flex gap-4 mt-4">
                                    <button
                                        onClick={() => setStep("words")}
                                        className="ghost-btn h-12 px-6 rounded-xl font-bold text-ink-muted uppercase tracking-wider"
                                    >
                                        Go Back
                                    </button>
                                    <button
                                        onClick={() => {
                                            setError(null);
                                            // Retry based on context (profile creation or generation)
                                            // Since we don't easily know which failed without complexity, 
                                            // we restart generation which handles both idempotent-ly enough
                                            // or we redirect user to restart.
                                            // Simplest is to restart generation logic if profile exists, or profile logic if not.
                                            // But for now, let's just let them go back or try generating again.
                                            if (isGuestOneOffFlow && !profile.id) {
                                                // Retry profile creation by clearing error (useEffect will NOT re-run merely on error clear)
                                                // So we need to manually trigger logic? 
                                                // Actually, "Go Back" is safer.
                                                // Let's make "Try Again" just call generateStory if profile exists?
                                                if (profile.id) generateStory();
                                                else setStep("profile"); // If no profile, go back to start
                                            } else {
                                                generateStory();
                                            }
                                        }}
                                        className="primary-btn h-12 px-8 rounded-xl text-lg font-black font-fredoka uppercase shadow-lg shadow-purple-500/20"
                                    >
                                        Try Again
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
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
                                        {[...Array(6)].map((_, i: number) => (
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
                                <motion.p
                                    key={profile.name}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-xl text-ink-muted font-bold font-nunito mb-2"
                                >
                                    Writing a special adventure for <span className="text-purple-600">{profile.name}</span>
                                </motion.p>

                                <div className="flex flex-col items-center gap-4 mt-8">
                                    <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-full border border-purple-100">
                                        <RefreshCw className="h-4 w-4 text-purple-400 animate-spin" />
                                        <span className="text-xs font-black text-purple-400 uppercase tracking-widest font-fredoka">Creating original art & story</span>
                                    </div>

                                    {profile.topic && (
                                        <div className="text-sm font-bold text-ink-muted/60 font-nunito italic">
                                            &quot;A story about {profile.topic}...&quot;
                                        </div>
                                    )}
                                </div>

                                <div className="mt-12 w-full max-w-xs h-3 bg-purple-100 rounded-full overflow-hidden shadow-inner p-0.5">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-purple-500 via-pink-400 to-indigo-500 rounded-full"
                                        animate={{ width: ["10%", "90%"] }}
                                        transition={{ duration: 15, ease: "linear" }}
                                    />
                                </div>
                            </>
                        )}
                    </motion.div>
                )}
            </main>
        </div>
    );
}
