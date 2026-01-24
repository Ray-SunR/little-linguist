"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Wand2, BookOpen, Sparkles, Check, ChevronRight, User, RefreshCw, Plus, Zap } from "lucide-react";
import { useWordList } from "@/lib/features/word-insight";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { cn } from "@/lib/core";
import { getStoryService, draftManager, useStoryState } from "@/lib/features/story";
import HeroIdentityForm, { type HeroIdentity, type HeroIdentityStep } from "@/components/profile/HeroIdentityForm";
import { useBookMediaSubscription, useBookAudioSubscription } from "@/lib/hooks/use-realtime-subscriptions";
import { useUsage } from "@/lib/hooks/use-usage";
import type { Story, UserProfile } from "@/lib/features/story";
import { raidenCache, CacheStore } from "@/lib/core/cache";
import { CachedImage } from "@/components/ui/cached-image";
import { ShadowPill } from "@/components/ui/shadow-pill";
import MagicSlider from "@/components/ui/MagicSlider";
import { useAuth } from "@/components/auth/auth-provider";
import { createChildProfile, switchActiveChild, getAvatarUploadUrl } from "@/app/actions/profiles";
import { createClient } from "@/lib/supabase/client";
import { useTutorial } from "@/components/tutorial/tutorial-context";
import { PageToolbar } from "@/components/layout/page-toolbar";
import { generateUUID } from "@/lib/core/utils/uuid";

interface StoryMakerClientProps {
    initialProfile: UserProfile;
}

interface GenerationState {
    isGenerating: boolean;
    result: Story | null;
}

const generations: Record<string, GenerationState> = {};

export function clearStoryMakerGlobals() {
    Object.keys(generations).forEach(key => delete generations[key]);
}

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
        transition: { duration: 0.6, staggerChildren: 0.1 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
};

export default function StoryMakerClient({ initialProfile }: StoryMakerClientProps) {
    const { words } = useWordList();
    const { activeChild, isLoading, user, profiles, refreshProfiles, setActiveChild, setIsStoryGenerating } = useAuth();
    const { completeStep } = useTutorial();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const service = getStoryService();

    const action = searchParams.get("action");
    const isResumingIntent = action === "resume_story_maker" || action === "generate";

    const { 
        state: storyMachine, 
        startConfiguring, 
        startMigrating, 
        startGenerating, 
        setSuccess, 
        setError: setMachineError, 
        reset: resetMachine 
    } = useStoryState(isResumingIntent ? "MIGRATING" : "CONFIGURING");

    const [profile, setProfile] = useState<UserProfile>(initialProfile);
    const [selectedWords, setSelectedWords] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<"profile" | "words">("profile");
    const [identityStep, setIdentityStep] = useState<HeroIdentityStep>("name");
    const [supabaseBook, setSupabaseBook] = useState<any>(null);
    const [isGuestOneOffFlow, setIsGuestOneOffFlow] = useState(false);
    const [storyLengthMinutes, setStoryLengthMinutes] = useState(5);
    const [imageSceneCount, setImageSceneCount] = useState(3);
    const [generatingHeroName, setGeneratingHeroName] = useState<string>("");
    
    const processingRef = useRef(false);
    const isMountedRef = useRef(true);
    const supabase = useMemo(() => createClient(), []);

    useEffect(() => {
        return () => { isMountedRef.current = false; };
    }, []);

    useEffect(() => {
        if (initialProfile.name && !profile.name) {
            setProfile(prev => ({ ...prev, ...initialProfile }));
        }
    }, [initialProfile, profile.name]);

    const handleHeroDataChange = useCallback((data: HeroIdentity) => {
        setProfile(prev => ({ 
            ...prev, 
            name: data.firstName, 
            age: new Date().getFullYear() - data.birthYear, 
            gender: data.gender === "" ? "neutral" : data.gender, 
            avatarUrl: data.avatarPreview, 
            avatarStoragePath: data.avatarStoragePath 
        }));
    }, []);

    const toggleWord = useCallback((word: string) => {
        setSelectedWords(prev =>
            prev.includes(word)
                ? prev.filter(w => w !== word)
                : (prev.length < 5 ? [...prev, word] : prev)
        );
    }, []);

    const { usage, plan, refresh: refreshUsage } = useUsage(["story_generation", "image_generation"]);

    const generateStory = useCallback(async (
        overrideWords?: string[], 
        overrideProfile?: UserProfile, 
        overrideStoryLengthMinutes?: number, 
        overrideImageSceneCount?: number, 
        overrideIdempotencyKey?: string
    ): Promise<void> => {
        const finalWords = overrideWords || selectedWords;
        const finalProfile = overrideProfile || profile;
        const finalStoryLengthMinutes = overrideStoryLengthMinutes || storyLengthMinutes;
        const finalImageSceneCount = overrideImageSceneCount ?? imageSceneCount;
        const finalIdempotencyKey = overrideIdempotencyKey || storyMachine.idempotencyKey || generateUUID();

        setGeneratingHeroName(finalProfile.name || "our hero");

        if (!user) {
            const guestDraftData = { profile: finalProfile, selectedWords: finalWords, storyLengthMinutes: finalStoryLengthMinutes, imageSceneCount: finalImageSceneCount, idempotencyKey: finalIdempotencyKey, resumeRequested: true };
            await draftManager.saveDraft("draft:guest", guestDraftData);
            localStorage.setItem("lumo:resume_requested", "true");
            router.push(`/login?returnTo=${encodeURIComponent("/story-maker?action=resume_story_maker")}`);
            return;
        }

        const currentUid = user.id;
        const state = getGenerationState(currentUid);
        startGenerating(finalIdempotencyKey);
        setIsStoryGenerating(true);
        state.isGenerating = true;

        if (overrideProfile) setProfile(finalProfile);
        if (overrideWords) setSelectedWords(finalWords);

        completeStep("story-create");

        try {
            let currentProfile = finalProfile;
            if (!currentProfile.id) {
                const result = await createChildProfile({ 
                    first_name: currentProfile.name, 
                    birth_year: new Date().getFullYear() - currentProfile.age, 
                    gender: currentProfile.gender, 
                    interests: currentProfile.interests || [], 
                    avatar_asset_path: currentProfile.avatarUrl, 
                    avatar_paths: currentProfile.avatarStoragePath ? [currentProfile.avatarStoragePath] : [] 
                });
                if (result.success && result.data) {
                    currentProfile = { ...currentProfile, id: result.data.id };
                    setProfile(currentProfile);
                    setActiveChild(result.data);
                    await refreshProfiles(true);
                } else {
                    throw new Error(result.error || "Failed to create profile");
                }
            }

            const content = await service.generateStoryContent(finalWords, currentProfile, finalStoryLengthMinutes, finalImageSceneCount, finalIdempotencyKey);
            
            const initialStory: Story = { id: generateUUID(), book_id: content.book_id, title: content.title, content: content.content, sections: content.sections, createdAt: Date.now(), wordsUsed: finalWords, userProfile: currentProfile, mainCharacterDescription: content.mainCharacterDescription };
            const initialSupabaseBook = { id: content.book_id, title: content.title, text: content.content, tokens: content.tokens || [], shards: [], images: content.sections.map((section: any, idx: number) => ({ id: `section-${idx}`, src: "", afterWordIndex: Number(section.after_word_index), caption: "Drawing Magic...", prompt: section.image_prompt, isPlaceholder: true, sectionIndex: idx })) };

            setSupabaseBook(initialSupabaseBook);
            state.result = initialStory;
            await raidenCache.put(CacheStore.BOOKS, initialSupabaseBook as any);
            if (user?.id) await raidenCache.delete(CacheStore.LIBRARY_METADATA, user.id);
            
            setSuccess(initialStory.id);
            router.push(`/reader/${content.book_id}`);
        } catch (err: any) {
            console.error("[StoryMakerClient] ERROR during generation:", err);
            setMachineError(err.message || "Oops! Something went wrong.");
        } finally {
            setIsStoryGenerating(false);
            state.isGenerating = false;
            processingRef.current = false;
        }
    }, [user, selectedWords, profile, storyLengthMinutes, imageSceneCount, storyMachine.idempotencyKey, router, completeStep, service, setActiveChild, refreshProfiles, setSuccess, setMachineError, setIsStoryGenerating]);

    useEffect(() => {
        const handleMigration = async () => {
            if (!user || storyMachine.status !== "MIGRATING" || processingRef.current) return;
            processingRef.current = true;
            try {
                const guestDraft = await draftManager.getDraft("draft:guest");
                const userDraftKey = activeChild?.id ? `draft:${user.id}:${activeChild.id}` : `draft:${user.id}`;
                if (guestDraft) {
                    await draftManager.migrateGuestDraft("draft:guest", userDraftKey);
                    setProfile(guestDraft.profile);
                    generateStory(guestDraft.selectedWords, guestDraft.profile, guestDraft.storyLengthMinutes, guestDraft.imageSceneCount, guestDraft.idempotencyKey);
                } else {
                    const userDraft = await draftManager.getDraft(userDraftKey);
                    if (userDraft) {
                        setProfile(userDraft.profile);
                        generateStory(userDraft.selectedWords, userDraft.profile, userDraft.storyLengthMinutes, userDraft.imageSceneCount, userDraft.idempotencyKey);
                    } else {
                        startConfiguring();
                    }
                }
            } catch (err) {
                startConfiguring();
            } finally {
                processingRef.current = false;
                router.replace(pathname, { scroll: false });
            }
        };
        handleMigration();
    }, [user, storyMachine.status, activeChild, pathname, router, generateStory, startConfiguring]);

    useEffect(() => {
        if (!user || storyMachine.status !== "GENERATING") return;

        const checkResult = () => {
            const state = getGenerationState(user.id);
            if (state.result && isMountedRef.current) {
                const result = state.result;
                state.result = null;
                setSuccess(result.id);
                router.push(`/reader/${result.book_id}`);
                return true;
            }
            return false;
        };

        if (checkResult()) return;

        const interval = setInterval(() => {
            if (checkResult()) {
                clearInterval(interval);
            }
        }, 500);

        return () => clearInterval(interval);
    }, [storyMachine.status, user, router, setSuccess]);

    useBookMediaSubscription(supabaseBook?.id, useCallback((newImage: any) => {
        setSupabaseBook((prev: any) => {
            if (!prev) return null;
            const currentImages = prev.images || [];
            const idx = currentImages.findIndex((img: any) => Number(img.afterWordIndex) === Number(newImage.afterWordIndex));
            if (idx !== -1) {
                const updated = [...currentImages];
                updated[idx] = { ...newImage, isPlaceholder: false };
                return { ...prev, images: updated };
            }
            return { ...prev, images: [...currentImages, newImage] };
        });
    }, []));

    const reset = () => { resetMachine(); setProfile(initialProfile); setActiveTab("profile"); setIdentityStep("name"); setSelectedWords([]); setSupabaseBook(null); };

    return (
        <div className="min-h-screen page-story-maker pb-32 relative" data-status={storyMachine.status} data-error={!!storyMachine.error}>
            <PageToolbar activeChild={activeChild ? { id: activeChild.id, name: activeChild.first_name, avatar_url: activeChild.avatar_asset_path } : null} themeColor="violet">
                <div className="flex items-center gap-2">
                    <button onClick={() => activeTab === "words" ? setActiveTab("profile") : router.back()} className="p-2 bg-slate-50 rounded-xl"><ArrowLeft className="w-5 h-5" /></button>
                    <h1 className="text-base font-black font-fredoka">Story Maker</h1>
                </div>

                <div className="flex items-center gap-2 md:gap-3">
                    {usage?.story_generation && (
                        <ShadowPill 
                            icon={Wand2} 
                            label="Stories" 
                            count={`${usage.story_generation.current}/${usage.story_generation.limit}`} 
                            color="purple" 
                        />
                    )}
                    {usage?.image_generation && (
                        <ShadowPill 
                            icon={Sparkles} 
                            label="Images" 
                            count={`${usage.image_generation.current}/${usage.image_generation.limit}`} 
                            color="amber" 
                        />
                    )}
                    {plan !== 'pro' && (
                        <Link href="/upgrade">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="px-3 md:px-4 py-1.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-full font-fredoka font-black text-[10px] uppercase shadow-clay-orange-sm whitespace-nowrap"
                            >
                                PRO
                            </motion.button>
                        </Link>
                    )}
                </div>
            </PageToolbar>

            <main className="mx-auto max-w-5xl px-4 pt-6">
                {storyMachine.status === "ERROR" && (
                    <div className="clay-card p-8 text-center" data-testid="error-container">
                        <div className="text-4xl mb-4">😅</div>
                        <h2 className="text-2xl font-black font-fredoka uppercase mb-2">Oh no!</h2>
                        <p className="text-ink-muted mb-6">{storyMachine.error}</p>
                        <div className="flex justify-center gap-4">
                            <button onClick={reset} className="ghost-btn h-12 px-6 font-bold uppercase">Go Back</button>
                            <button onClick={() => generateStory()} className="primary-btn h-12 px-8 font-black uppercase">Try Again</button>
                        </div>
                    </div>
                )}

                {storyMachine.status === "SUCCESS" && (
                    <div className="clay-card p-12 text-center" data-testid="success-container">
                        <div className="text-6xl mb-6">✨</div>
                        <h2 className="text-3xl font-black font-fredoka uppercase mb-4">Magic Created!</h2>
                        <p className="text-lg font-bold text-ink-muted mb-8">Your story is ready. Opening the portal...</p>
                        <RefreshCw className="w-10 h-10 text-purple-500 animate-spin mx-auto" />
                    </div>
                )}

                {storyMachine.status === "CONFIGURING" && (
                    <motion.div variants={containerVariants} initial="hidden" animate="visible">
                        {activeTab === "profile" && (
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                {/* Left Column: Hero Identity */}
                                <motion.div variants={itemVariants} className="lg:col-span-4 bg-white/40 backdrop-blur-xl rounded-[2.5rem] border-2 border-white shadow-clay-lg overflow-hidden flex flex-col">
                                    <div className="p-6 border-b border-purple-50">
                                        <h2 className="text-xl font-black font-fredoka uppercase tracking-tight text-ink flex items-center gap-2">
                                            <User className="w-5 h-5 text-purple-500" />
                                            Hero Profile
                                        </h2>
                                    </div>
                                    <HeroIdentityForm 
                                        initialData={{ 
                                            firstName: profile.name, 
                                            birthYear: new Date().getFullYear() - profile.age, 
                                            gender: (profile.gender === "boy" || profile.gender === "girl") ? profile.gender : "", 
                                            avatarPreview: profile.avatarUrl, 
                                            avatarStoragePath: profile.avatarStoragePath 
                                        }} 
                                        onFormDataChange={handleHeroDataChange}
                                        onComplete={(data: HeroIdentity) => handleHeroDataChange(data)} 
                                        mode="story"
                                        isInline={true}
                                    />
                                </motion.div>

                                {/* Right Column: Adventure Details */}
                                <div className="lg:col-span-8 space-y-6">
                                    <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-white/60 p-6 rounded-3xl border-2 border-white shadow-soft">
                                            <label className="mb-3 block text-[10px] font-black text-slate-400 uppercase tracking-widest font-fredoka flex items-center gap-2">
                                                <Sparkles className="w-4 h-4 text-amber-500" />
                                                Adventure Topic
                                            </label>
                                            <input 
                                                type="text" 
                                                value={profile.topic || ""} 
                                                onChange={(e) => setProfile({ ...profile, topic: e.target.value })} 
                                                className="w-full h-14 px-6 rounded-2xl border-2 border-slate-100 bg-white/50 focus:bg-white focus:border-indigo-300 outline-none transition-all font-nunito font-bold text-ink placeholder:text-slate-300 shadow-inner" 
                                                placeholder="Adventure Topic..." 
                                                data-testid="story-topic-input" 
                                            />
                                        </div>
                                        <div className="bg-white/60 p-6 rounded-3xl border-2 border-white shadow-soft">
                                            <label className="mb-3 block text-[10px] font-black text-slate-400 uppercase tracking-widest font-fredoka flex items-center gap-2">
                                                <Wand2 className="w-4 h-4 text-purple-500" />
                                                Where does it happen?
                                            </label>
                                            <input 
                                                type="text" 
                                                value={profile.setting || ""} 
                                                onChange={(e) => setProfile({ ...profile, setting: e.target.value })} 
                                                className="w-full h-14 px-6 rounded-2xl border-2 border-slate-100 bg-white/50 focus:bg-white focus:border-indigo-300 outline-none transition-all font-nunito font-bold text-ink placeholder:text-slate-300 shadow-inner" 
                                                placeholder="Where does it happen?" 
                                                data-testid="story-setting-input" 
                                            />
                                        </div>
                                    </motion.div>

                                    {/* Magic Sliders */}
                                    <motion.div variants={itemVariants} className="bg-white/40 backdrop-blur-md p-8 rounded-[2.5rem] border-2 border-white shadow-inner space-y-8">
                                        <MagicSlider 
                                            label="Reading Time"
                                            value={storyLengthMinutes}
                                            min={1}
                                            max={10}
                                            onChange={(val) => {
                                                setStoryLengthMinutes(val);
                                                if (imageSceneCount > val) setImageSceneCount(val);
                                            }}
                                            color="indigo"
                                            statusLabel={`${storyLengthMinutes} MINS • ${storyLengthMinutes <= 4 ? "QUICK" : storyLengthMinutes <= 7 ? "NORMAL" : "EPIC"}`}
                                        />

                                        <MagicSlider 
                                            label="Illustrations"
                                            value={imageSceneCount}
                                            min={0}
                                            max={storyLengthMinutes}
                                            onChange={setImageSceneCount}
                                            color="amber"
                                            statusLabel={`${imageSceneCount} IMAGES`}
                                        />
                                    </motion.div>

                                    <motion.button 
                                        variants={itemVariants}
                                        whileHover={{ scale: 1.02, y: -4 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => { 
                                            if (profile.name) {
                                                completeStep("story-profile");
                                                setActiveTab("words"); 
                                            }
                                        }} 
                                        disabled={!profile.name}
                                        className="w-full h-20 rounded-3xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-clay-purple border-2 border-white/20 flex items-center justify-center gap-4 text-2xl font-black font-fredoka uppercase tracking-widest disabled:opacity-50 transition-all" 
                                        data-testid="story-config-next"
                                    >
                                        Next Step 
                                        <ChevronRight className="h-8 w-8" />
                                    </motion.button>
                                </div>
                            </div>
                        )}

                        {activeTab === "words" && (
                            <div className="clay-card p-8 md:p-12 relative overflow-hidden" data-testid="words-tab-content">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-400 to-indigo-500 shadow-clay-purple flex items-center justify-center shrink-0">
                                        <Sparkles className="h-8 w-8 text-white animate-pulse" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-ink font-fredoka uppercase tracking-tight">Pick Magic Words</h2>
                                        <p className="text-base text-ink-muted font-medium font-nunito">Choose up to 5 words to include in your story</p>
                                    </div>
                                </div>

                                {words.length === 0 ? (
                                    <div className="text-center py-16 rounded-[2.5rem] border-4 border-dashed border-purple-100 bg-purple-50/30 mb-8">
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
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                                        {words.map(w => (
                                            <button 
                                                key={w.word} 
                                                onClick={() => toggleWord(w.word)} 
                                                className={cn(
                                                    "h-16 md:h-20 px-6 rounded-xl md:rounded-2xl border-4 transition-all font-fredoka font-black text-lg md:text-xl flex items-center justify-between group overflow-hidden", 
                                                    selectedWords.includes(w.word) 
                                                        ? "bg-purple-500 text-white border-purple-400 shadow-clay-purple" 
                                                        : "bg-white text-ink border-white hover:border-purple-100 shadow-sm"
                                                )}
                                            >
                                                <span className="relative z-10">{w.word}</span>
                                                {selectedWords.includes(w.word) 
                                                    ? <Check className="h-6 w-6 text-white relative z-10 animate-bounce-subtle" /> 
                                                    : <Plus className="h-6 w-6 text-purple-200 group-hover:text-purple-400 transition-colors" />
                                                }
                                                {selectedWords.includes(w.word) && (
                                                    <motion.div
                                                        layoutId="sparkle-bg"
                                                        className="absolute inset-0 bg-gradient-to-br from-purple-400 to-indigo-600 opacity-50"
                                                    />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-8 border-t-2 border-purple-50">
                                    <motion.button 
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setActiveTab("profile")} 
                                        className="w-full sm:w-auto h-14 md:h-16 px-8 rounded-xl md:rounded-[1.5rem] bg-white text-ink-muted border-4 border-slate-50 font-fredoka font-black uppercase tracking-widest shadow-sm flex items-center justify-center"
                                    >
                                        <ArrowLeft className="h-5 w-5 mr-2" />
                                        Back
                                    </motion.button>

                                    <div className="flex items-center gap-4 w-full sm:w-auto">
                                        <div className="flex-1 sm:flex-initial flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white shadow-inner border border-purple-100">
                                            <span className="text-2xl font-black text-purple-600 font-fredoka">{selectedWords.length}</span>
                                            <span className="text-[10px] uppercase font-black tracking-widest text-purple-400 font-fredoka">/ 5 Words</span>
                                        </div>
                                    </div>

                                    <motion.button 
                                        data-testid="cast-spell-button"
                                        whileHover={usage?.story_generation?.isLimitReached ? {} : { scale: 1.02, y: -4 }}
                                        whileTap={usage?.story_generation?.isLimitReached ? {} : { scale: 0.98 }}
                                        onClick={() => generateStory()} 
                                        disabled={usage?.story_generation?.isLimitReached}
                                        className={cn(
                                            "w-full sm:w-auto h-14 md:h-16 px-10 md:px-12 rounded-xl md:rounded-[1.5rem] text-white border-2 border-white/30 flex items-center justify-center gap-3 text-lg md:text-xl font-black font-fredoka uppercase tracking-widest transition-all", 
                                            usage?.story_generation?.isLimitReached 
                                                ? "bg-slate-300 shadow-none cursor-not-allowed opacity-70" 
                                                : "bg-gradient-to-r from-purple-500 to-indigo-600 shadow-clay-purple"
                                        )}
                                    >
                                        <span>{usage?.story_generation?.isLimitReached ? "Limit Reached" : "Cast Spell"}</span>
                                        <Wand2 className="h-6 w-6" />
                                    </motion.button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                {(storyMachine.status === "GENERATING" || storyMachine.status === "MIGRATING") && (
                    <div className="clay-card p-12 text-center" data-testid="loading-container">
                        <div className="w-24 h-24 bg-white rounded-3xl shadow-clay-purple flex items-center justify-center mx-auto mb-8 border-4">
                            <RefreshCw className="w-12 h-12 text-purple-500 animate-spin" />
                        </div>
                        <h2 className="text-3xl font-black font-fredoka uppercase mb-4" id="generating-header">
                            {storyMachine.status === "MIGRATING" ? "Finding Your Magic..." : "Making Magic..."}
                        </h2>
                        <p className="text-lg font-bold text-ink-muted">
                            Writing a special adventure for <span className="text-purple-600">{generatingHeroName || profile.name || "our hero"}</span>
                        </p>
                        <div className="mt-12 w-full max-w-xs mx-auto h-3 bg-purple-100 rounded-full overflow-hidden p-0.5">
                            <motion.div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full" animate={{ width: ["10%", "90%"] }} transition={{ duration: 15, ease: "linear" }} />
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
