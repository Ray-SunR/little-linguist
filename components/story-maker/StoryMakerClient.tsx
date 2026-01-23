"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Wand2, BookOpen, Sparkles, Check, ChevronRight, User, RefreshCw, Plus, Zap } from "lucide-react";
import { useWordList } from "@/lib/features/word-insight";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { cn } from "@/lib/core";
import { getStoryService } from "@/lib/features/story";
import { useBookMediaSubscription, useBookAudioSubscription } from "@/lib/hooks/use-realtime-subscriptions";
import { useUsage } from "@/lib/hooks/use-usage";
import type { Story, UserProfile } from "@/lib/features/story";
import SupabaseReaderShell, { type SupabaseBook } from "@/components/reader/supabase-reader-shell";
import { raidenCache, CacheStore } from "@/lib/core/cache";
import { CachedImage } from "@/components/ui/cached-image";
import { useAuth } from "@/components/auth/auth-provider";
import { createChildProfile, switchActiveChild, getAvatarUploadUrl } from "@/app/actions/profiles";
import { createClient } from "@/lib/supabase/client";
import { useTutorial } from "@/components/tutorial/tutorial-context";
import { PageToolbar } from "@/components/layout/page-toolbar";
import { generateUUID } from "@/lib/core/utils/uuid";

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

const containerVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.6,
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
};

export function clearStoryMakerGlobals(): void {
    // Clear all session states (e.g. on logout)
    Object.keys(generations).forEach(key => delete generations[key]);
}

interface UsageModalProps {
    isOpen: boolean;
    onClose: () => void;
    usage: any;
    plan: string;
}

function UsageModal({ isOpen, onClose, usage, plan }: UsageModalProps) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 overflow-hidden">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-ink/40 backdrop-blur-md"
                    onClick={onClose}
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl border-4 border-white overflow-hidden"
                >
                    <div className="p-8 md:p-10 flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center mb-6 shadow-inner">
                            <Sparkles className="w-8 h-8 text-purple-600 animate-pulse" />
                        </div>

                        <h2 className="text-3xl font-black font-fredoka text-ink uppercase tracking-tight mb-2">Magic Energy</h2>
                        <p className="text-ink-muted font-bold font-nunito mb-8">How to use your magical powers</p>

                        <div className="grid gap-4 w-full text-left">
                            <div className="bg-purple-50 p-5 rounded-3xl border-2 border-purple-100/50 flex items-start gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-sm">
                                    <Wand2 className="w-6 h-6 text-purple-600" />
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <h3 className="font-black font-fredoka text-purple-700 uppercase text-lg">Stories</h3>
                                        <span className="font-black text-purple-900 bg-white px-3 py-1 rounded-full text-sm">
                                            {usage.story_generation?.limit - usage.story_generation?.current} Left
                                        </span>
                                    </div>
                                    <p className="text-sm font-bold text-purple-600/70 font-nunito leading-tight">
                                        Used to weave the text of your magical adventure. Uses 1 per story.
                                    </p>
                                </div>
                            </div>

                            <div className="bg-amber-50 p-5 rounded-3xl border-2 border-amber-100/50 flex items-start gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-sm">
                                    <Sparkles className="w-6 h-6 text-amber-500" />
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <h3 className="font-black font-fredoka text-amber-700 uppercase text-lg">Images</h3>
                                        <span className="font-black text-amber-900 bg-white px-3 py-1 rounded-full text-sm">
                                            {usage.image_generation?.limit - usage.image_generation?.current} Left
                                        </span>
                                    </div>
                                    <p className="text-sm font-bold text-amber-600/70 font-nunito leading-tight">
                                        Used to draw beautiful AI illustrations for your story.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {plan === 'free' && (
                            <Link href="/pricing" className="mt-8 w-full" onClick={onClose}>
                                <button className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-black font-fredoka uppercase text-lg shadow-clay-purple hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3">
                                    <Zap className="w-5 h-5 fill-white" />
                                    Get Unlimited Magic
                                </button>
                            </Link>
                        )}

                        <button
                            onClick={onClose}
                            className="mt-6 text-slate-400 font-bold font-fredoka uppercase text-sm tracking-widest hover:text-slate-600 transition-colors"
                        >
                            Got it, thanks!
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

export default function StoryMakerClient({ initialProfile }: StoryMakerClientProps) {
    const { words } = useWordList();
    const { activeChild, isLoading, user, profiles, refreshProfiles, setActiveChild, isStoryGenerating, setIsStoryGenerating } = useAuth();
    const { completeStep } = useTutorial();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const service = getStoryService();

    // Proactively detect resume intent to prevent UI flicker
    const action = searchParams.get("action");
    const isResumingIntent = action === "resume_story_maker" || action === "generate";

    const [step, setInternalStep] = useState<Step>(isResumingIntent ? "generating" : "profile");
    const setStep = (newStep: Step) => {
        setInternalStep(newStep);
    };
    const [profile, setProfile] = useState<UserProfile>(initialProfile);
    const [selectedWords, setSelectedWords] = useState<string[]>([]);
    const [story, setStory] = useState<Story | null>(null);
    const [supabaseBook, setSupabaseBook] = useState<SupabaseBook | null>(null);
    const [currentPage, setCurrentPage] = useState(0);
    const [error, setError] = useState<{ message: string; type?: 'quota' | 'general' } | null>(null);
    const [isGuestOneOffFlow, setIsGuestOneOffFlow] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const { usage, plan, loading: usageLoading, refresh: refreshUsage } = useUsage(["story_generation", "image_generation", "word_insight"]);
    const [storyLengthMinutes, setStoryLengthMinutes] = useState(5); // In Minutes
    const [imageSceneCount, setImageSceneCount] = useState(3);
    const [currentIdempotencyKey, setCurrentIdempotencyKey] = useState<string | undefined>(undefined);
    const [showUsageModal, setShowUsageModal] = useState(false);

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

                // 2. Migration: Handled by resumeDraftIfNeeded to avoid race conditions
                if (!savedDraft && user && !processingRef.current) {
                    // We skip manual migration here and let the resume logic handle it
                    // because it needs to be atomic with the generation trigger.
                    console.debug("[StoryMakerClient] Waiting for resume logic to handle migration if needed.");
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
                    const { profile: savedProfile, selectedWords: savedWords, storyLengthMinutes: savedStoryLength, imageSceneCount: savedImageCount, idempotencyKey: savedKey } = savedDraft;
                    if (step === "profile" && (savedProfile || savedWords)) {
                        setProfile((prev: UserProfile) => {
                            // If we have a fresh official profile from props (activeChild), prioritize its core metadata
                            const merged = { ...prev, ...savedProfile };
                            if (initialProfile.name) {
                                merged.name = initialProfile.name;
                                merged.age = initialProfile.age;
                                merged.gender = initialProfile.gender;
                                merged.avatarUrl = initialProfile.avatarUrl;
                                merged.avatarStoragePath = initialProfile.avatarStoragePath;
                                merged.id = initialProfile.id;
                            }
                            return merged;
                        });
                        if (savedWords) setSelectedWords(savedWords);
                        if (savedStoryLength) setStoryLengthMinutes(savedStoryLength);
                        setImageSceneCount(savedImageCount !== undefined ? savedImageCount : (savedStoryLength || 5));
                        if (savedKey) setCurrentIdempotencyKey(savedKey);
                    }
                } else if (activeChild && !profile.name) {
                    // Pre-fill from active child if no draft exists
                    const age = activeChild.birth_year ? new Date().getFullYear() - activeChild.birth_year : 5;
                    setProfile({
                        id: activeChild.id,
                        name: activeChild.first_name,
                        age: age,
                        gender: (activeChild.gender as UserProfile['gender']) || 'neutral',
                        avatarUrl: activeChild.avatar_asset_path || undefined,
                        avatarStoragePath: (activeChild.avatar_paths && activeChild.avatar_paths.length > 0) ? activeChild.avatar_paths[0] : undefined,
                        updatedAt: activeChild.updated_at,
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialProfile, user, activeChild]);

    // Unified Effect for Resuming, Result Polling, and Cleanup
    useEffect(() => {
        async function resumeDraftIfNeeded() {
            const action = searchParams.get("action");
            const isResuming = action === "resume_story_maker" || action === "generate";
            if (!isResuming) return;

            // Wait for user and hydration
            // We allow step === "generating" here because we initialize to it proactively
            if (!user || isLoading || (step !== "profile" && step !== "generating") || processingRef.current) return;

            // LOCK IMMEDIATELY to prevent double-triggering during async operations
            processingRef.current = true;

            // Clear URL action parameters to prevent re-triggering on browser "Back"
            router.replace(pathname, { scroll: false });

            console.debug("[StoryMakerClient] resumeDraftIfNeeded triggered:", {
                hasUser: !!user,
                isLoading,
                profileCount: profiles.length,
                action
            });

            const userDraftKey = `draft:${user.id}`;
            const childDraftKey = activeChild?.id ? `draft:${user.id}:${activeChild.id}` : null;

            // Robust Lookup with Retries (to handle slow IndexedDB init in parallel workers)
            let draft = null;
            let retryCount = 0;
            const maxRetries = 5;

            while (retryCount < maxRetries) {
                draft = await raidenCache.get<any>(CacheStore.DRAFTS, userDraftKey);
                if (!draft && childDraftKey) {
                    draft = await raidenCache.get<any>(CacheStore.DRAFTS, childDraftKey);
                }

                if (!draft && user.id) {
                    draft = await raidenCache.get<any>(CacheStore.DRAFTS, "draft:guest");
                }

                // If no draft in IndexedDB, check localStorage as final fallback
                const localStorageResumeFlag = localStorage.getItem('lumo:resume_requested');
                if (!draft && localStorageResumeFlag === 'true') {
                    console.debug("[StoryMakerClient] Draft missing in IDB but found resume_requested in localStorage. Checking legacy storage...");
                    const legacyDraft = localStorage.getItem("raiden:story_maker_draft");
                    if (legacyDraft) {
                        try {
                            draft = JSON.parse(legacyDraft);
                        } catch (e) { }
                    }
                }

                if (draft && draft.resumeRequested) break;

                // Wait 200ms before retry
                console.debug(`[StoryMakerClient] Draft not found or resumeRequested false. Retry ${retryCount + 1}/${maxRetries}...`);
                await new Promise(r => setTimeout(r, 200));
                retryCount++;
            }

            // CLEANUP localStorage flag immediately
            localStorage.removeItem('lumo:resume_requested');

            // GATE: Only proceed if we have a draft AND it has the resume flag
            if (!draft || !draft.resumeRequested) {
                console.debug("[StoryMakerClient] Auto-resume skipped: no valid draft found after retries.");
                processingRef.current = false;
                if (isResumingIntent) setStep("profile");
                return;
            }

            // Migration tracking
            const guestDraftWasUsed = !(await raidenCache.get(CacheStore.DRAFTS, userDraftKey)) && !!(await raidenCache.get(CacheStore.DRAFTS, "draft:guest"));

            // CLEANUP FLAG & MIGRATE IMMEDIATELY in storage
            const finalDraft = { ...draft, resumeRequested: false };
            await raidenCache.put(CacheStore.DRAFTS, { id: userDraftKey, ...finalDraft });
            if (guestDraftWasUsed) {
                await raidenCache.delete(CacheStore.DRAFTS, "draft:guest");
            }

            // Session check: Ensure draft belongs to current user
            const state = getGenerationState(user.id);

            // Update local state immediately to match draft
            console.debug("[StoryMakerClient] Resuming with draft:", finalDraft.profile.name);
            setProfile(finalDraft.profile);
            setSelectedWords(finalDraft.selectedWords);

            const finalLength = finalDraft.storyLengthMinutes || 5;
            const finalImageCount = finalDraft.imageSceneCount !== undefined ? finalDraft.imageSceneCount : finalLength;

            setStoryLengthMinutes(finalLength);
            setImageSceneCount(finalImageCount);
            if (finalDraft.idempotencyKey) setCurrentIdempotencyKey(finalDraft.idempotencyKey);

            if (state.isGenerating) {
                console.debug("[StoryMakerClient] Resuming: Background generation in progress.");
                setStep("generating");
                return;
            }

            if (state.result) {
                console.debug("[StoryMakerClient] Resuming: Story result found.");
                const result = state.result;
                state.result = null; // Consume
                router.push(`/reader/${result.book_id}`);
                return;
            }

            // Trigger generation
            console.info("[StoryMakerClient] Starting auto-generation for resumed draft...");
            generateStory(finalDraft.selectedWords, finalDraft.profile, finalLength, finalImageCount, finalDraft.idempotencyKey);
        }

        resumeDraftIfNeeded();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, isLoading, searchParams, step, profiles]);

    // Polling effect for results (if unmounted/remounted into generating state)
    useEffect(() => {
        if (user && step === "generating") {
            const state = getGenerationState(user.id);
            if (state.result) {
                console.debug("[StoryMakerClient] Applying caught-up story result.");
                const result = state.result;
                state.result = null;
                router.push(`/reader/${result.book_id}`);
            }
        }
    }, [step, user, router]);

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
                    await raidenCache.put(CacheStore.DRAFTS, { id: draftKey, profile, selectedWords, storyLengthMinutes, imageSceneCount, idempotencyKey: currentIdempotencyKey });
                    if (isMountedRef.current) setIsSaving(false);
                }
            } catch (err) {
                console.error("Failed to save draft to IndexedDB:", err);
                if (isMountedRef.current) setIsSaving(false);
            }
        }, 1000); // 1s debounce

        return () => clearTimeout(timer);
    }, [profile, selectedWords, user, activeChild, storyLengthMinutes, imageSceneCount, currentIdempotencyKey]);

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

    async function generateStory(overrideWords?: string[], overrideProfile?: UserProfile, overrideStoryLengthMinutes?: number, overrideImageSceneCount?: number, overrideIdempotencyKey?: string): Promise<void> {
        const finalWords = overrideWords || selectedWords;
        const finalProfile = overrideProfile || profile;
        const finalStoryLengthMinutes = overrideStoryLengthMinutes || storyLengthMinutes;
        const finalImageSceneCount = overrideImageSceneCount ?? imageSceneCount;

        if (!user) {
            const guestDraftKey = "draft:guest";
            const guestDraftData = {
                id: guestDraftKey,
                profile: finalProfile,
                selectedWords: finalWords,
                storyLengthMinutes: finalStoryLengthMinutes,
                imageSceneCount: finalImageSceneCount,
                idempotencyKey: currentIdempotencyKey || generateUUID(),
                resumeRequested: true
            };

            // Non-blocking sync
            try {
                localStorage.setItem('raiden:story_maker_draft', JSON.stringify(guestDraftData));
                localStorage.setItem('lumo:resume_requested', 'true');
            } catch (e) { }

            raidenCache.put(CacheStore.DRAFTS, guestDraftData)
                .catch(err => console.warn("[StoryMakerClient] Background guest draft save failed:", err));

            router.push("/login?returnTo=/story-maker&action=generate");
            return;
        }

        const currentUid = user.id;
        const state = getGenerationState(currentUid);
        setIsStoryGenerating(true);
        state.isGenerating = true;

        if (overrideProfile) setProfile(finalProfile);
        if (overrideWords) setSelectedWords(finalWords);
        if (overrideStoryLengthMinutes) setStoryLengthMinutes(finalStoryLengthMinutes);

        // Idempotency: Use override, or current state, or generate new
        const finalIdempotencyKey = overrideIdempotencyKey || currentIdempotencyKey || generateUUID();

        // 1. FAST STATE SYNC (localStorage)
        try {
            localStorage.setItem(`raiden:generating:${currentUid}`, 'true');
        } catch (e) { }

        // 2. Persist key and draft immediately (NON-BLOCKING)
        if (finalIdempotencyKey !== currentIdempotencyKey) {
            setCurrentIdempotencyKey(finalIdempotencyKey);
            const draftKey = (activeChild?.id ? `draft:${user.id}:${activeChild.id}` : `draft:${user.id}`);
            const draftData = {
                id: draftKey,
                profile: finalProfile,
                selectedWords: finalWords,
                storyLengthMinutes: finalStoryLengthMinutes,
                imageSceneCount: finalImageSceneCount,
                idempotencyKey: finalIdempotencyKey
            };

            raidenCache.put(CacheStore.DRAFTS, draftData)
                .catch(err => console.warn("[StoryMakerClient] Background draft save failed:", err));
        }

        setStep("generating");
        setError(null);

        // Pre-flight check
        if (usage.story_generation?.isLimitReached) {
            setError({
                message: "You've reached your story generation limit for today! Upgrade to Pro for more stories.",
                type: 'quota'
            });
            setStep("profile");
            setIsStoryGenerating(false);
            return;
        }

        // Check if they have enough images for the selected scene count
        if (usage.image_generation) {
            const remainingImages = usage.image_generation.limit - usage.image_generation.current;
            if (remainingImages < finalImageSceneCount) {
                setError({
                    message: `You only have ${remainingImages} image crystal${remainingImages === 1 ? '' : 's'} left, but this story needs ${finalImageSceneCount}. Upgrade to Pro for more images!`,
                    type: 'quota'
                });
                setStep("profile");
                setIsStoryGenerating(false);
                return;
            }
        }

        completeStep('story-create');

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
                    setError({ message: "Session changed. Please try again.", type: 'general' });
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
                        imageSceneCount: finalImageSceneCount,
                        idempotencyKey: finalIdempotencyKey
                    });


                    setActiveChild(result.data);
                    await refreshProfiles(true);
                } else {
                    console.error("[StoryMakerClient] Profile creation failed:", result.error);
                    throw new Error(result.error);
                }
            }

            console.debug("[StoryMakerClient] Generating story content with storyLengthMinutes/imageSceneCount:", finalStoryLengthMinutes, finalImageSceneCount);
            const content = await service.generateStoryContent(finalWords, currentProfile, finalStoryLengthMinutes, finalImageSceneCount, finalIdempotencyKey);

            // Clear idempotency key on success (so next story is fresh)
            setCurrentIdempotencyKey(undefined);
            const draftKey = (activeChild?.id ? `draft:${user.id}:${activeChild.id}` : `draft:${user.id}`);
            // We only need to clear it from the draft, but we'll overwrite the whole draft or delete it soon anyway?
            // Actually, we usually don't delete the draft until explicitly reset or new one started?
            // But we should at least clear the key so clicking "Back" and "Start" again makes a NEW story.
            await raidenCache.put(CacheStore.DRAFTS, {
                id: draftKey,
                profile: currentProfile,
                selectedWords: finalWords,
                storyLengthMinutes: finalStoryLengthMinutes,
                imageSceneCount: finalImageSceneCount,
                idempotencyKey: undefined
            });

            // Post-await session validation
            const finalSession = await supabase.auth.getSession();
            if (finalSession.data.session?.user.id !== currentUid) {
                console.warn("[StoryMakerClient] Aborting: Session changed during story generation.");
                setStep("profile");
                setError({ message: "Session changed. Please try again.", type: 'general' });
                return;
            }

            const initialStory: Story = {
                id: generateUUID(),
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

            completeStep('story-generating');
            router.push(`/reader/${content.book_id}`);
            // service.generateImagesForBook is now called automatically on backend

        } catch (err: unknown) {
            console.error(err);
            if (err instanceof Error && err.name === 'AIError' && (err.message === 'LIMIT_REACHED' || err.message === 'IMAGE_LIMIT_REACHED')) {
                const msg = err.message === 'IMAGE_LIMIT_REACHED'
                    ? "You don't have enough energy crystals for that many sections!"
                    : "You've reached your story generation limit for today! Upgrade to Pro for more stories.";
                setError({ message: msg, type: 'quota' });
                setStep("profile"); // Drop back to profile step so they can see the error
            } else {
                const errorMessage = err instanceof Error ? err.message : "Oops! Something went wrong while making your story. Please try again.";
                setError({ message: errorMessage, type: 'general' });
            }
        } finally {
            // Immediate refresh
            refreshUsage();
            setTimeout(() => refreshUsage(), 5000);

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
        <div className="min-h-screen page-story-maker pb-32 relative">
            {/* Background Decorative Blobs */}
            <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-200/20 blur-[120px] rounded-full animate-blob-slow z-0" />
            <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-200/20 blur-[120px] rounded-full animate-blob-reverse z-0" />
            <div className="fixed top-[20%] right-[10%] w-[30%] h-[30%] bg-pink-200/10 blur-[100px] rounded-full animate-blob-pulse z-0" />

            <PageToolbar
                activeChild={activeChild ? {
                    id: activeChild.id,
                    name: activeChild.first_name,
                    avatar_url: activeChild.avatar_asset_path
                } : null}
                themeColor="violet"
                containerClassName="mb-1"
            >
                <div className="flex items-center justify-between w-full gap-2">
                    <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
                        <motion.button
                            whileHover={{ scale: 1.1, x: -2 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => {
                                if (step === 'words') setStep('profile');
                                else router.back();
                            }}
                            className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-indigo-500 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </motion.button>
                        <div className="flex flex-col min-w-0">
                            <h1 className="text-base md:text-lg font-black text-ink font-fredoka leading-none truncate">Story Maker</h1>
                            <span className="text-[10px] font-bold text-ink-muted/50 uppercase tracking-widest hidden md:block">
                                {step === 'profile' ? 'Step 1: Profile' : 'Step 2: Words'}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 md:gap-3">
                        {!usageLoading && user && (
                            <>
                                <motion.button
                                    whileHover={{ scale: 1.05, y: -2 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setShowUsageModal(true)}
                                    className="flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-1.5 rounded-xl bg-purple-50/80 border border-purple-100 shadow-sm hover:bg-purple-100 transition-colors"
                                >
                                    <Wand2 className="w-3.5 h-3.5 text-purple-600" />
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-sm font-black text-purple-700 font-fredoka">
                                            {usage.story_generation ? Math.max(0, usage.story_generation.limit - usage.story_generation.current) : 0}
                                        </span>
                                        <span className="text-[10px] font-black text-purple-600/50 uppercase truncate hidden sm:inline">Stories</span>
                                    </div>
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.05, y: -2 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setShowUsageModal(true)}
                                    className="flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-1.5 rounded-xl bg-amber-50/80 border border-amber-100 shadow-sm hover:bg-amber-100 transition-colors"
                                >
                                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-sm font-black text-amber-600 font-fredoka">
                                            {usage.image_generation ? Math.max(0, usage.image_generation.limit - usage.image_generation.current) : 0}
                                        </span>
                                        <span className="text-[10px] font-black text-amber-600/50 uppercase truncate hidden sm:inline">Images</span>
                                    </div>
                                </motion.button>
                            </>
                        )}
                        {plan === 'free' && user && (
                            <Link href="/pricing" className="shrink-0 hidden lg:block">
                                <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="bg-gradient-to-r from-purple-500 to-indigo-600 px-3 py-1.5 rounded-xl shadow-clay-purple flex items-center gap-2"
                                >
                                    <Zap className="w-3 h-3 text-white fill-white" />
                                    <span className="text-[10px] font-black text-white font-fredoka uppercase tracking-wider">Pro</span>
                                </motion.div>
                            </Link>
                        )}
                    </div>
                </div>
            </PageToolbar>

            <main className="mx-auto max-w-5xl relative px-4">
                {step === 'profile' && (
                    <div className="pt-6 pb-2 text-left mb-6">
                        <motion.h2
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-3xl md:text-4xl font-black font-fredoka text-ink uppercase tracking-tight mb-2"
                        >
                            Story Maker
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-base md:text-lg font-bold font-nunito text-ink-muted/80 leading-tight"
                        >
                            Create original stories and illustrations about your hero.
                        </motion.p>
                    </div>
                )}
                {step === "profile" && (
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-6 md:p-10 border border-white shadow-clay-lg relative z-10"
                    >
                        <div className="flex items-center gap-4 mb-8 relative">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-400 to-rose-500 shadow-clay-pink flex items-center justify-center shrink-0">
                                <Wand2 className="h-7 w-7 text-white animate-bounce-subtle" />
                            </div>
                            <div className="flex flex-col">
                                <h2 className="text-lg md:text-2xl font-black font-fredoka text-ink uppercase tracking-tight leading-none mb-1" id="hero-section-title">
                                    {isGuestOneOffFlow ? "Welcome Back! ✨" : "About the Hero"}
                                </h2>
                                <p className="text-xs md:text-sm font-bold text-ink-muted/70 font-nunito leading-tight">
                                    {isGuestOneOffFlow ? "Pick a child for this adventure." : "Tell us who's going on this adventure!"}
                                </p>
                            </div>
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={cn(
                                    "mb-8 p-6 rounded-3xl border-4 flex flex-col sm:flex-row items-center gap-6",
                                    error.type === 'quota'
                                        ? "bg-amber-50 border-amber-200 text-amber-900"
                                        : "bg-rose-50 border-rose-200 text-rose-900"
                                )}
                            >
                                <div className={cn(
                                    "w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center text-2xl shadow-clay-sm bg-white",
                                    error.type === 'quota' ? "text-amber-500" : "text-rose-500"
                                )}>
                                    {error.type === 'quota' ? "✨" : "⚠️"}
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="font-fredoka font-bold text-lg leading-tight mb-1">{error.message}</p>
                                    <p className="text-sm opacity-70 font-bold uppercase tracking-wider">Magic energy is low</p>
                                </div>
                                {error.type === 'quota' && (
                                    <Link
                                        href="/upgrade"
                                        className="whitespace-nowrap bg-gradient-to-br from-amber-400 to-orange-500 text-white px-6 py-3 rounded-2xl font-black font-fredoka shadow-clay-pink hover:scale-105 active:scale-95 transition-all text-sm uppercase tracking-wider"
                                    >
                                        Level Up to Pro
                                    </Link>
                                )}
                            </motion.div>
                        )}

                        {isGuestOneOffFlow ? (
                            <div className="max-w-4xl mx-auto mb-10">
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                                    {profiles.map((p) => (
                                        <motion.button
                                            key={p.id}
                                            variants={itemVariants}
                                            whileHover={{ scale: 1.05, y: -4 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={async () => {
                                                const birthYear = p.birth_year || new Date().getFullYear() - 5;
                                                const selectedProfile: UserProfile = {
                                                    id: p.id,
                                                    name: p.first_name,
                                                    age: new Date().getFullYear() - birthYear,
                                                    gender: (p.gender as UserProfile['gender']) || 'neutral',
                                                    avatarUrl: p.avatar_asset_path || '',
                                                    avatarStoragePath: (p.avatar_paths && p.avatar_paths.length > 0) ? p.avatar_paths[0] : undefined,
                                                    updatedAt: p.updated_at,
                                                    interests: p.interests || []
                                                };
                                                setProfile(selectedProfile);

                                                if (!user) return;

                                                // Draft Lookup: Try child-specific, then generic user, then guest-migrated
                                                const possibleKeys = [
                                                    `draft:${user.id}:${p.id}`,
                                                    `draft:${user.id}`,
                                                    "draft:guest"
                                                ];

                                                let foundDraft = null;
                                                for (const key of possibleKeys) {
                                                    const d = await raidenCache.get<any>(CacheStore.DRAFTS, key);
                                                    if (d) {
                                                        foundDraft = d;
                                                        break;
                                                    }
                                                }

                                                if (foundDraft) {
                                                    generateStory(
                                                        foundDraft.selectedWords,
                                                        selectedProfile,
                                                        foundDraft.storyLengthMinutes || 5,
                                                        foundDraft.imageSceneCount,
                                                        foundDraft.idempotencyKey
                                                    );
                                                } else {
                                                    // No draft found, just proceed with selection
                                                    setStep("words");
                                                }
                                            }}
                                            className="p-6 rounded-[2.5rem] bg-white/60 border-2 border-white shadow-soft hover:shadow-clay-purple transition-all flex flex-col items-center gap-4 group"
                                        >
                                            <div className="relative w-24 h-24">
                                                <div className="absolute inset-0 bg-purple-100 rounded-full scale-110 group-hover:scale-125 transition-transform duration-500 blur-md opacity-50" />
                                                <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-white shadow-clay-sm">
                                                    {(p.avatar_paths && p.avatar_paths.length > 0) ? (
                                                        <CachedImage
                                                            src={p.avatar_asset_path || ''}
                                                            storagePath={(p.avatar_paths && p.avatar_paths.length > 0) ? p.avatar_paths[0] : undefined}
                                                            updatedAt={p.updated_at}
                                                            alt={p.first_name}
                                                            fill
                                                            className="object-cover"
                                                            bucket="user-assets"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full bg-slate-50 flex items-center justify-center">
                                                            <User className="w-10 h-10 text-slate-300" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-xl font-black font-fredoka text-ink uppercase leading-none">{p.first_name}</div>
                                                <div className="text-[10px] font-bold text-ink-muted/60 font-nunito uppercase tracking-widest mt-1">{new Date().getFullYear() - (p.birth_year || new Date().getFullYear())} Years Old</div>
                                            </div>
                                        </motion.button>
                                    ))}
                                    <motion.button
                                        variants={itemVariants}
                                        whileHover={{ scale: 1.05, y: -4 }}
                                        whileTap={{ scale: 0.95 }}
                                        type="button"
                                        onClick={() => setIsGuestOneOffFlow(false)}
                                        className="p-6 rounded-[2.5rem] bg-purple-50/50 border-4 border-dashed border-purple-100 hover:border-purple-300 transition-all flex flex-col items-center justify-center gap-4 text-purple-600 group"
                                    >
                                        <div className="w-16 h-16 rounded-full bg-white shadow-clay-sm flex items-center justify-center group-hover:bg-purple-500 group-hover:text-white transition-all">
                                            <Plus className="w-8 h-8" />
                                        </div>
                                        <div className="text-center">
                                            <div className="text-lg font-black font-fredoka uppercase leading-tight">New Hero</div>
                                            <div className="text-[10px] font-bold opacity-60 font-nunito max-w-[120px] mt-1">Add a new adventurer</div>
                                        </div>
                                    </motion.button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleProfileSubmit} className="space-y-8">
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                    {/* Column 1: Hero Identity */}
                                    <motion.div variants={itemVariants} className="lg:col-span-4 space-y-6">
                                        <div className="flex flex-col items-start">
                                            <label className="mb-3 block text-[10px] font-black text-slate-400 uppercase tracking-widest font-fredoka text-left pl-1">Hero Photo</label>
                                            <div className="relative group w-48 h-48">
                                                <div className="absolute inset-[-8px] bg-gradient-to-br from-purple-400 to-indigo-500 rounded-[2.5rem] opacity-20 blur-lg group-hover:opacity-40 transition-opacity" />
                                                <label className={cn(
                                                    "w-full h-full rounded-[2.25rem] border-4 border-white transition-all cursor-pointer relative overflow-hidden flex flex-col items-center justify-center shadow-clay-md",
                                                    profile.avatarUrl ? "bg-white" : "bg-purple-50/50 hover:bg-purple-50"
                                                )}>
                                                    {profile.avatarUrl ? (
                                                        <>
                                                            <CachedImage
                                                                src={profile.avatarUrl || ''}
                                                                storagePath={profile.avatarStoragePath}
                                                                updatedAt={profile.updatedAt}
                                                                alt="Hero"
                                                                fill
                                                                className="object-cover"
                                                                bucket="user-assets"
                                                            />
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
                                                                <RefreshCw className="w-10 h-10 text-white" />
                                                            </div>
                                                            <motion.button
                                                                whileHover={{ scale: 1.1 }}
                                                                whileTap={{ scale: 0.9 }}
                                                                type="button"
                                                                onClick={(e: React.MouseEvent) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    setProfile({ ...profile, avatarUrl: undefined, avatarStoragePath: undefined });
                                                                }}
                                                                className="absolute top-2 right-2 w-10 h-10 bg-rose-500 text-white rounded-full shadow-lg flex items-center justify-center font-black text-2xl border-4 border-white z-20"
                                                            >
                                                                ×
                                                            </motion.button>
                                                        </>
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-2">
                                                            {isUploading ? (
                                                                <RefreshCw className="h-10 w-10 text-purple-400 animate-spin" />
                                                            ) : (
                                                                <>
                                                                    <div className="w-16 h-16 rounded-full bg-white shadow-soft flex items-center justify-center mb-1">
                                                                        <User className="h-8 w-8 text-purple-300" />
                                                                    </div>
                                                                    <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Upload Photo</span>
                                                                </>
                                                            )}
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
                                                                    const localUrl = URL.createObjectURL(file);
                                                                    const result = await getAvatarUploadUrl(file.name);
                                                                    if (result.error || !result.data) throw new Error(result.error);
                                                                    const { signedUrl, path } = result.data;
                                                                    await fetch(signedUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
                                                                    setProfile({ ...profile, avatarUrl: localUrl, avatarStoragePath: path, updatedAt: Date.now() });
                                                                } catch (err: unknown) {
                                                                    const errorMessage = err instanceof Error ? err.message : "Failed to upload.";
                                                                    setError({ message: errorMessage, type: 'general' });
                                                                } finally { setIsUploading(false); }
                                                            }
                                                        }}
                                                    />
                                                </label>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="mb-2 block text-[10px] font-black text-slate-400 uppercase tracking-widest font-fredoka pl-1">Hero&apos;s Name</label>
                                                <input
                                                    type="text"
                                                    value={profile.name}
                                                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                                    className="w-full h-14 px-6 rounded-2xl border-2 border-slate-100 bg-slate-50/50 focus:bg-white focus:border-purple-300 outline-none transition-all font-fredoka text-lg font-bold text-ink placeholder:text-slate-300 shadow-inner"
                                                    placeholder="Hero Name..."
                                                    required
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="mb-2 block text-[10px] font-black text-slate-400 uppercase tracking-widest font-fredoka pl-1">Age</label>
                                                    <div className="flex items-center justify-between p-1.5 rounded-2xl bg-slate-50 border-2 border-slate-100 h-14 shadow-inner">
                                                        <button
                                                            type="button"
                                                            className="w-10 h-10 rounded-xl bg-white shadow-soft flex items-center justify-center text-xl font-black text-purple-600 disabled:opacity-30"
                                                            onClick={() => setProfile({ ...profile, age: Math.max(3, profile.age - 1) })}
                                                            disabled={profile.age <= 3}
                                                        >
                                                            −
                                                        </button>
                                                        <span className="text-xl font-black text-ink font-fredoka">{profile.age}</span>
                                                        <button
                                                            type="button"
                                                            className="w-10 h-10 rounded-xl bg-white shadow-soft flex items-center justify-center text-xl font-black text-purple-600 disabled:opacity-30"
                                                            onClick={() => setProfile({ ...profile, age: Math.min(12, profile.age + 1) })}
                                                            disabled={profile.age >= 12}
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="mb-2 block text-[10px] font-black text-slate-400 uppercase tracking-widest font-fredoka pl-1">Gender</label>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setProfile({ ...profile, gender: "boy" })}
                                                            className={cn(
                                                                "h-14 rounded-2xl border-2 transition-all flex items-center justify-center text-xl shadow-soft",
                                                                profile.gender === "boy" ? "bg-blue-500 border-blue-400 text-white shadow-clay-blue" : "bg-white border-slate-100 text-slate-400 hover:border-blue-200"
                                                            )}
                                                        >
                                                            👦
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setProfile({ ...profile, gender: "girl" })}
                                                            className={cn(
                                                                "h-14 rounded-2xl border-2 transition-all flex items-center justify-center text-xl shadow-soft",
                                                                profile.gender === "girl" ? "bg-pink-500 border-pink-400 text-white shadow-clay-pink" : "bg-white border-slate-100 text-slate-400 hover:border-pink-200"
                                                            )}
                                                        >
                                                            👧
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>

                                    {/* Column 2: Adventure Context */}
                                    <div className="lg:col-span-8 space-y-8">
                                        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="bg-white/60 p-6 rounded-3xl border border-white shadow-soft">
                                                <label className="mb-3 block text-[10px] font-black text-slate-400 uppercase tracking-widest font-fredoka flex items-center gap-2">
                                                    <Sparkles className="w-4 h-4 text-amber-500" />
                                                    Adventure Topic
                                                </label>
                                                <input
                                                    type="text"
                                                    value={profile.topic || ''}
                                                    onChange={(e) => setProfile({ ...profile, topic: e.target.value })}
                                                    className="w-full h-14 px-6 rounded-2xl border-2 border-slate-100 bg-slate-50/50 focus:bg-white focus:border-indigo-300 outline-none transition-all font-nunito font-bold text-ink placeholder:text-slate-300 shadow-inner"
                                                    placeholder="e.g. A Dinosaur Space Race..."
                                                />
                                            </div>
                                            <div className="bg-white/60 p-6 rounded-3xl border border-white shadow-soft">
                                                <label className="mb-3 block text-[10px] font-black text-slate-400 uppercase tracking-widest font-fredoka flex items-center gap-2">
                                                    <Wand2 className="w-4 h-4 text-purple-500" />
                                                    Where does it happen?
                                                </label>
                                                <input
                                                    type="text"
                                                    value={profile.setting || ''}
                                                    onChange={(e) => setProfile({ ...profile, setting: e.target.value })}
                                                    className="w-full h-14 px-6 rounded-2xl border-2 border-slate-100 bg-slate-50/50 focus:bg-white focus:border-indigo-300 outline-none transition-all font-nunito font-bold text-ink placeholder:text-slate-300 shadow-inner"
                                                    placeholder="e.g. Underwater Kingdom..."
                                                />
                                            </div>
                                        </motion.div>

                                        {/* Adventure Calibration */}
                                        <motion.div variants={itemVariants} className="bg-indigo-50/30 p-8 rounded-[2.5rem] border border-white shadow-inner space-y-8">
                                            <div>
                                                <div className="flex items-center justify-between mb-4">
                                                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest font-fredoka flex items-center gap-2">
                                                        <BookOpen className="w-4 h-4" />
                                                        Reading Time
                                                    </label>
                                                    <span className="px-3 py-1 bg-indigo-100 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-wider">
                                                        {storyLengthMinutes} MINS • {storyLengthMinutes <= 4 ? "Quick" : storyLengthMinutes <= 7 ? "Normal" : "Epic"}
                                                    </span>
                                                </div>
                                                <input
                                                    type="range" min="1" max="10" step="1"
                                                    value={storyLengthMinutes}
                                                    onChange={(e) => {
                                                        const newVal = parseInt(e.target.value);
                                                        setStoryLengthMinutes(newVal);
                                                        if (imageSceneCount > newVal) setImageSceneCount(newVal);
                                                    }}
                                                    className="w-full h-3 bg-indigo-100 rounded-full appearance-none cursor-pointer accent-indigo-500"
                                                />
                                            </div>

                                            <div>
                                                <div className="flex items-center justify-between mb-4">
                                                    <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest font-fredoka flex items-center gap-2">
                                                        <Sparkles className="w-4 h-4" />
                                                        Illustrations
                                                    </label>
                                                    <span className="px-3 py-1 bg-amber-100 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-wider">
                                                        {imageSceneCount} IMAGES
                                                    </span>
                                                </div>
                                                <input
                                                    type="range" min="0" max={storyLengthMinutes} step="1"
                                                    value={imageSceneCount}
                                                    onChange={(e) => setImageSceneCount(parseInt(e.target.value))}
                                                    className="w-full h-3 bg-amber-100 rounded-full appearance-none cursor-pointer accent-amber-500"
                                                />
                                            </div>


                                        </motion.div>

                                        <motion.button
                                            variants={itemVariants}
                                            whileHover={{ scale: 1.02, y: -4 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => {
                                                if (profile.name) {
                                                    completeStep('story-profile');
                                                    setStep("words");
                                                }
                                            }}
                                            disabled={!profile.name || (usage.image_generation ? usage.image_generation.current + imageSceneCount > usage.image_generation.limit : false)}
                                            className="w-full h-20 rounded-3xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-clay-purple border-2 border-white/20 flex items-center justify-center gap-4 text-2xl font-black font-fredoka uppercase tracking-widest disabled:opacity-50 transition-all"
                                        >
                                            Next Step
                                            <ChevronRight className="h-8 w-8" />
                                        </motion.button>
                                    </div>
                                </div>
                            </form>
                        )}
                    </motion.div>
                )}

                {step === "words" && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="clay-card p-6 md:p-12 relative overflow-hidden"
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

                        <div className="flex items-center gap-4 mb-6 md:mb-8">
                            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-purple-400 to-indigo-500 shadow-clay-purple flex items-center justify-center shrink-0">
                                <Sparkles className="h-6 w-6 md:h-8 md:w-8 text-white animate-pulse" />
                            </div>
                            <div>
                                <h2 className="text-lg md:text-2xl font-black text-ink font-fredoka uppercase tracking-tight leading-tight">Pick Magic Words</h2>
                                <p className="text-sm md:text-base text-ink-muted font-medium font-nunito leading-tight">Choose up to 5 words to include in your story</p>
                            </div>
                        </div>

                        {error && (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-8 p-5 rounded-2xl bg-rose-50 border-2 border-rose-100 text-rose-600 font-bold font-nunito flex items-center gap-3 shadow-sm">
                                <span className="text-2xl">⚠️</span> {error.message}
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
                            <div data-tour-target="story-word-grid" className="mb-10 grid gap-3 md:gap-4 grid-cols-1 xs:grid-cols-2 lg:grid-cols-3">
                                {words.map((w) => {
                                    const isSelected = selectedWords.includes(w.word);
                                    return (
                                        <motion.button
                                            key={w.word}
                                            whileHover={{ y: -4, scale: 1.02 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => toggleWord(w.word)}
                                            className={cn(
                                                "relative h-16 md:h-20 px-5 md:px-6 rounded-xl md:rounded-2xl border-4 transition-all font-fredoka font-black text-lg md:text-xl flex items-center justify-between group overflow-hidden",
                                                isSelected
                                                    ? "bg-purple-500 text-white border-purple-400 shadow-clay-purple"
                                                    : "bg-white text-ink border-white hover:border-purple-100 shadow-sm"
                                            )}
                                        >
                                            <span className="relative z-10">{w.word}</span>
                                            {isSelected ? (
                                                <Check className="h-5 w-5 md:h-6 md:w-6 text-white relative z-10 animate-bounce-subtle" />
                                            ) : (
                                                <Plus className="h-5 w-5 md:h-6 md:w-6 text-purple-200 group-hover:text-purple-400 transition-colors" />
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

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 pt-8 border-t-2 border-purple-50">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setStep("profile")}
                                className="w-full sm:w-auto h-14 md:h-16 px-8 rounded-xl md:rounded-[1.5rem] bg-white text-ink-muted border-4 border-slate-50 font-fredoka font-black uppercase tracking-widest shadow-sm flex items-center justify-center"
                            >
                                <ArrowLeft className="h-5 w-5 mr-2" />
                                Back
                            </motion.button>

                            <div className="flex items-center gap-4 w-full sm:w-auto">
                                <div className="flex-1 sm:flex-initial flex items-center gap-2 md:gap-3 px-4 md:px-5 py-2.5 rounded-xl md:rounded-2xl bg-white shadow-inner border border-purple-100">
                                    <span className="text-xl md:text-2xl font-black text-purple-600 font-fredoka">{selectedWords.length}</span>
                                    <span className="text-[9px] md:text-[10px] uppercase font-black tracking-widest text-purple-400 font-fredoka">/ 5 Words</span>
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
                            </div>

                            <motion.button
                                id="story-create-btn"
                                data-tour-target="story-create-btn"
                                whileHover={usage["story_generation"]?.isLimitReached ? {} : { scale: 1.02, y: -4 }}
                                whileTap={usage["story_generation"]?.isLimitReached ? {} : { scale: 0.98 }}
                                onClick={() => {
                                    if (!usage["story_generation"]?.isLimitReached) {
                                        generateStory();
                                    }
                                }}
                                disabled={usage["story_generation"]?.isLimitReached}
                                className={cn(
                                    "w-full sm:w-auto h-14 md:h-16 px-8 md:px-10 rounded-xl md:rounded-[1.5rem] text-white border-2 border-white/30 flex items-center justify-center gap-2 md:gap-3 text-lg md:text-xl font-black font-fredoka uppercase tracking-widest transition-all",
                                    usage["story_generation"]?.isLimitReached
                                        ? "bg-slate-300 shadow-none cursor-not-allowed opacity-70"
                                        : "bg-gradient-to-r from-purple-500 to-indigo-600 shadow-clay-purple"
                                )}
                            >
                                <span>{usage["story_generation"]?.isLimitReached ? "Limit Reached" : "Cast Spell"}</span>
                                <Wand2 className="h-5 w-5 md:h-6 md:w-6" />
                            </motion.button>
                        </div>
                    </motion.div>
                )}

                {step === "generating" && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="clay-card p-8 md:p-16 flex flex-col items-center justify-center text-center min-h-[400px] md:min-h-[500px] relative overflow-hidden"
                    >
                        {/* Cinematic Background Elements */}
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5" />
                        <div className="absolute top-[-20%] left-[-20%] w-full h-full bg-purple-400/10 blur-[100px] rounded-full animate-floaty" />

                        {error ? (
                            <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-300">
                                <div className="w-20 h-20 md:w-24 md:h-24 bg-red-50 rounded-full flex items-center justify-center border-4 border-red-100 mb-2">
                                    <span className="text-3xl md:text-4xl">😅</span>
                                </div>
                                <div className="text-center space-y-2">
                                    <h2 className="text-2xl md:text-3xl font-black font-fredoka text-ink uppercase">Oh no!</h2>
                                    <p className="text-base md:text-lg font-bold text-ink-muted font-nunito max-w-sm mx-auto leading-tight md:leading-normal">{error.message}</p>
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
                                    <div
                                        id="story-generating-status"
                                        data-tour-target="story-generating-status"
                                        className="relative w-28 h-28 md:w-32 md:h-32 rounded-[2rem] md:rounded-[2.5rem] bg-white shadow-clay-purple flex items-center justify-center border-4 border-purple-100 ring-4 md:ring-8 ring-purple-50/50"
                                    >
                                        <motion.div
                                            animate={{
                                                rotate: [0, 15, -15, 0],
                                                scale: [1, 1.1, 1],
                                            }}
                                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                        >
                                            <Wand2 className="h-10 w-10 md:h-14 md:w-14 text-purple-500 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
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

                                <h2 className="text-3xl md:text-4xl font-black font-fredoka text-ink uppercase tracking-tight mb-4 relative">
                                    Making Magic...
                                </h2>
                                <motion.p
                                    key={profile.name || "hero"}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-lg md:text-xl text-ink-muted font-bold font-nunito mb-2 px-4"
                                >
                                    Writing a special adventure for <span className="text-purple-600">{profile.name || "our hero"}</span>
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

            <UsageModal
                isOpen={showUsageModal}
                onClose={() => setShowUsageModal(false)}
                usage={usage}
                plan={plan as string}
            />
        </div>
    );
}
