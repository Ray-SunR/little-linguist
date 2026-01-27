'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createChildProfile, getAvatarUploadUrl } from '@/app/actions/profiles';
import { Camera, Check, ChevronRight, ChevronLeft, Sparkles, Wand2, BookOpen, Search, Shield, Crown, Rocket, PawPrint, Microscope, Leaf, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/core";
import { CachedImage } from '@/components/ui/cached-image';
import { useAuth } from '@/components/auth/auth-provider';
import { raidenCache, CacheStore } from "@/lib/core/cache";
import HeroIdentityForm, { HeroIdentity } from './HeroIdentityForm';

type Step = 'name' | 'age' | 'gender' | 'avatar' | 'interests' | 'topic' | 'setting' | 'words' | 'saving';

interface ChildProfileWizardProps {
    mode?: 'onboarding' | 'story';
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

const GUEST_MAGIC_WORDS = [
    'Magic', 'Adventure', 'Friendship', 'Dragon', 'Space',
    'Mystery', 'Forest', 'Treasure', 'Rainbow', 'Robot'
];

export default function ChildProfileWizard({ mode = 'onboarding' }: ChildProfileWizardProps) {
    const router = useRouter();
    const { refreshProfiles, user } = useAuth();
    const [step, setStep] = useState<Step>('name');
    const [formData, setFormData] = useState({
        firstName: '',
        birthYear: new Date().getFullYear() - 6,
        gender: '' as 'boy' | 'girl' | '',
        interests: [] as string[],
        avatar_asset_path: '',
        topic: '',
        setting: '',
        selectedWords: [] as string[]
    });

    const objectUrlRef = useRef<string | null>(null);

    useEffect(() => {
        const currentObjectUrl = objectUrlRef.current;
        return () => {
            if (currentObjectUrl) {
                URL.revokeObjectURL(currentObjectUrl);
            }
        };
    }, []);

    const [avatarPreview, setAvatarPreview] = useState<string | undefined>();
    const [avatarStoragePath, setAvatarStoragePath] = useState<string | undefined>();
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function nextStep(next: Step): void {
        setError(null);
        setStep(next);
    }

    function prevStep(prev: Step): void {
        setError(null);
        setStep(prev);
    }

    const [showPoof, setShowPoof] = useState(false);

    function toggleInterest(interest: string): void {
        setShowPoof(true);
        setTimeout(() => setShowPoof(false), 500);
        setFormData(prev => ({
            ...prev,
            interests: prev.interests.includes(interest)
                ? prev.interests.filter(i => i !== interest)
                : [...prev.interests, interest]
        }));
    }

    function toggleWord(word: string): void {
        setError(null);
        setFormData(prev => ({
            ...prev,
            selectedWords: prev.selectedWords.includes(word)
                ? prev.selectedWords.filter(w => w !== word)
                : (prev.selectedWords.length < 5 ? [...prev.selectedWords, word] : prev.selectedWords)
        }));
    }

    function validateRequiredFields(): boolean {
        if (!formData.firstName.trim()) {
            setError("Hero's name is required!");
            setStep('name');
            return false;
        }
        if (!formData.gender) {
            setError("Please pick a hero identity!");
            setStep('gender');
            return false;
        }
        return true;
    }

    async function handleFinish(): Promise<void> {
        if (!validateRequiredFields()) return;

        if (formData.interests.length === 0) {
            setError("Please pick at least one thing they love!");
            return;
        }

        if (mode === 'story') {
            nextStep('topic');
            return;
        }

        setStep('saving');
        setError(null);

        try {
            const result = await createChildProfile({
                first_name: formData.firstName,
                birth_year: formData.birthYear,
                gender: formData.gender,
                interests: formData.interests,
                avatar_asset_path: avatarStoragePath || ''
            });

            if (!result) {
                throw new Error('No response from server. Please try again or use a smaller photo.');
            }

            if (result.error) throw new Error(result.error);

            await refreshProfiles();
            router.push('/dashboard');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Something went wrong';
            setError(message);
            setStep('interests');
        }
    }

    async function handleCompleteStoryDraft(): Promise<void> {
        if (!validateRequiredFields()) return;

        setStep('saving');
        setError(null);

        try {
            const draftData = {
                profile: {
                    name: formData.firstName,
                    age: new Date().getFullYear() - formData.birthYear,
                    gender: formData.gender,
                    avatarUrl: avatarStoragePath ? undefined : avatarPreview,
                    avatarStoragePath: avatarStoragePath,
                    interests: formData.interests,
                    topic: formData.topic,
                    setting: formData.setting
                },
                selectedWords: formData.selectedWords,
                storyLengthMinutes: 5,
                imageSceneCount: 3,
                isGuestFlow: true,
                resumeRequested: true
            };

            try {
                localStorage.setItem('raiden:story_maker_draft', JSON.stringify(draftData));
                localStorage.setItem('lumo:resume_requested', 'true');
            } catch (e) {
                console.warn("[ChildProfileWizard] LocalStorage failed, falling back to IDB only.");
            }

            raidenCache.put(CacheStore.DRAFTS, { id: "draft:guest", ...draftData })
                .catch(err => console.warn("[ChildProfileWizard] Background IDB save failed:", err));

            if (user) {
                refreshProfiles().catch(console.error);
                router.push('/story-maker?action=resume_story_maker');
            } else {
                const returnUrl = encodeURIComponent('/story-maker?action=resume_story_maker');
                router.push(`/login?returnTo=${returnUrl}`);
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to save magic draft';
            setError(message);
            setStep('words');
        }
    }

    const stepVariants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 100 : -100,
            opacity: 0,
            scale: 0.95
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1,
            scale: 1
        },
        exit: (direction: number) => ({
            zIndex: 0,
            x: direction < 0 ? 100 : -100,
            opacity: 0,
            scale: 0.95
        })
    };

    const progressPercentage = () => {
        const stepOrder: Step[] = mode === 'onboarding'
            ? ['name', 'age', 'gender', 'avatar', 'interests', 'saving']
            : ['name', 'age', 'gender', 'avatar', 'interests', 'topic', 'setting', 'words', 'saving'];
        const currentIndex = stepOrder.indexOf(step);
        if (currentIndex === -1) return '0%';
        const denominator = stepOrder.length - 1;
        return `${Math.min(100, ((currentIndex) / denominator) * 100)}%`;
    };

    return (
        <div className="w-full max-w-2xl mx-auto px-1 sm:px-0 flex items-center justify-center h-full">
            <div data-testid="wizard-card" className="bg-white p-4 sm:p-6 rounded-[3rem] border-4 border-purple-50 shadow-clay-lg relative overflow-hidden h-[540px] w-full flex flex-col transition-colors duration-500">

                {/* Decorative BG Elements */}
                <div className="absolute -top-24 -left-24 w-64 h-64 bg-purple-100/30 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-amber-100/30 rounded-full blur-3xl pointer-events-none" />

                {/* Progress Bar */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-purple-50">
                    <motion.div
                        className="h-full bg-gradient-to-r from-purple-400 to-pink-400"
                        initial={{ width: '0%' }}
                        animate={{ width: progressPercentage() }}
                    />
                </div>

                <AnimatePresence>
                    {showPoof && (
                        <motion.div
                            data-testid="poof-animation"
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1.5 }}
                            exit={{ opacity: 0, scale: 2 }}
                            className="fixed inset-0 pointer-events-none z-[100] flex items-center justify-center"
                        >
                            <div className="relative">
                                {[...Array(8)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ x: 0, y: 0 }}
                                        animate={{ 
                                            x: Math.cos(i * 45 * Math.PI / 180) * 100,
                                            y: Math.sin(i * 45 * Math.PI / 180) * 100,
                                            opacity: 0
                                        }}
                                        transition={{ duration: 0.5 }}
                                        className="absolute w-2 h-2 bg-purple-400 rounded-full shadow-[0_0_10px_purple]"
                                    />
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence mode="wait" custom={1}>
                    <motion.div
                        key={['name', 'age', 'gender', 'avatar'].includes(step) ? 'identity' : step}
                        custom={1}
                        variants={stepVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                        className="flex-grow flex flex-col items-center justify-center w-full overflow-hidden"
                    >
                        {/* --- IDENTITY STEPS --- */}
                        {['name', 'age', 'gender', 'avatar'].includes(step) && (
                            <HeroIdentityForm
                                initialData={{
                                    firstName: formData.firstName,
                                    birthYear: formData.birthYear,
                                    gender: formData.gender,
                                    avatarPreview: avatarPreview,
                                    avatarStoragePath: avatarStoragePath
                                }}
                                initialStep={step as any}
                                onStepChange={(s) => setStep(s as Step)}
                                onComplete={(data: HeroIdentity) => {
                                    setFormData(prev => ({
                                        ...prev,
                                        firstName: data.firstName,
                                        birthYear: data.birthYear,
                                        gender: data.gender
                                    }));
                                    setAvatarPreview(data.avatarPreview);
                                    setAvatarStoragePath(data.avatarStoragePath);
                                    setStep('interests');
                                }}
                                mode={mode}
                            />
                        )}

                        {/* --- STEP: INTERESTS --- */}
                        {step === 'interests' && (
                            <div className="w-full h-full flex flex-col items-center">
                                <div className="text-center mb-8">
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-600 font-fredoka font-bold text-[10px] mb-3 border border-purple-100"
                                    >
                                        <Star className="w-3 h-3 fill-current" />
                                        Personalized for {formData.firstName || 'You'}
                                    </motion.div>
                                    <h2 className="text-2xl md:text-3xl font-black text-ink font-fredoka mb-2">
                                        Stories They&apos;ll <span className="text-purple-500">Love</span>
                                    </h2>
                                    <p className="text-xs text-ink-muted font-nunito max-w-md mx-auto">
                                        What does <span className="text-purple-600 font-black">{formData.firstName}</span> enjoy most?
                                    </p>
                                </div>

                                {/* Claymorphic Search Bar */}
                                <div className="relative w-full max-w-lg group mb-8">
                                    <div className="absolute inset-0 bg-purple-100 rounded-2xl translate-y-1 translate-x-0.5 group-focus-within:translate-y-0.5 transition-transform" />
                                    <div className="relative flex items-center bg-white border-2 border-purple-200 rounded-2xl px-5 py-3 shadow-clay-sm group-focus-within:border-purple-400 transition-all">
                                        <Search className="w-5 h-5 text-purple-400 mr-3" />
                                        <input
                                            type="text"
                                            placeholder="Add something else they love..."
                                            className="flex-1 bg-transparent border-none outline-none font-fredoka text-base text-ink placeholder:text-slate-300"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    const val = e.currentTarget.value.trim();
                                                    if (val) {
                                                        if (!formData.interests.includes(val)) {
                                                            toggleInterest(val);
                                                        }
                                                        e.currentTarget.value = '';
                                                    }
                                                }
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar w-full">
                                    <div className="flex flex-wrap justify-center gap-2 sm:gap-3 pb-8">
                                        {POPULAR_PICKS.map((pick) => {
                                            const isSelected = formData.interests.includes(pick.name);
                                            return (
                                                <motion.button
                                                    key={pick.name}
                                                    type="button"
                                                    onClick={() => toggleInterest(pick.name)}
                                                    whileHover={{ scale: 1.05, y: -2 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    className={cn(
                                                        "flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-fredoka font-bold transition-all border-b-4",
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
                                                    <span>{pick.name}</span>
                                                </motion.button>
                                            );
                                        })}

                                        {/* Custom Selections */}
                                        {formData.interests.filter(i => !POPULAR_PICKS.some(p => p.name === i)).map(interest => (
                                            <motion.button
                                                key={interest}
                                                type="button"
                                                onClick={() => toggleInterest(interest)}
                                                initial={{ scale: 0, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-fredoka font-bold transition-all border-b-4 bg-purple-600 text-white border-purple-800 translate-y-1 shadow-none"
                                            >
                                                <Check className="w-4 h-4 text-white" />
                                                {interest}
                                                <span className="ml-1 opacity-50">×</span>
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center justify-center gap-4 pt-4 border-t border-purple-50 w-full mt-auto">
                                    <button onClick={() => prevStep('avatar')} className="h-12 px-8 flex items-center gap-2 text-ink/60 font-bold hover:text-ink transition-colors">
                                        <ChevronLeft className="w-5 h-5" /> Back
                                    </button>
                                    <motion.button
                                        onClick={handleFinish}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        data-testid="onboarding-finish"
                                        className="h-12 px-10 rounded-full bg-blue-500 hover:bg-blue-400 text-white text-lg font-black font-fredoka uppercase tracking-widest flex items-center justify-center gap-2 shadow-clay-blue transition-all whitespace-nowrap"
                                    >
                                        {mode === 'onboarding' ? "Finish! ✨" : "Continue"} <ChevronRight className="w-5 h-5" />
                                    </motion.button>
                                </div>
                            </div>
                        )}

                        {/* --- STEP: TOPIC --- */}
                        {step === 'topic' && (
                            <div className="w-full space-y-4 text-center">
                                <div className="space-y-1">
                                    <div className="w-16 h-16 bg-orange-100/50 rounded-[1.25rem] flex items-center justify-center mx-auto shadow-clay-pink-sm border-2 border-white">
                                        <BookOpen className="w-8 h-8 text-orange-600" />
                                    </div>
                                    <h2 className="text-xl md:text-2xl font-black text-ink font-fredoka uppercase">What&apos;s the Story About?</h2>
                                    <p className="text-ink-muted font-bold font-nunito text-[10px] max-w-sm mx-auto">Optional: Tell us a theme for <span className="text-purple-600 font-black">{formData.firstName}</span>&apos;s adventure.</p>
                                </div>

                                <div className="relative max-w-sm mx-auto">
                                    <input
                                        type="text"
                                        autoFocus
                                        value={formData.topic}
                                        onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                                        onKeyDown={(e) => e.key === 'Enter' && nextStep('setting')}
                                        className="w-full h-12 px-8 rounded-xl border-4 border-orange-50 bg-white/50 focus:bg-white focus:border-orange-200 outline-none transition-all font-fredoka text-lg font-black text-ink placeholder:text-slate-200 shadow-inner text-center"
                                        placeholder="Space, Dinosaurs, Tea Party..."
                                        data-testid="story-topic-input"
                                    />
                                </div>

                                <div className="flex items-center justify-center gap-2 sm:gap-4">
                                    <button onClick={() => prevStep('interests')} className="ghost-btn h-12 px-4 sm:px-8 flex items-center gap-2">
                                        <ChevronLeft /> Back
                                    </button>
                                    <motion.button
                                        onClick={() => nextStep('setting')}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="primary-btn h-12 px-4 sm:px-10 text-base sm:text-lg font-black font-fredoka uppercase tracking-widest flex items-center justify-center gap-1 sm:gap-2 whitespace-nowrap"
                                        data-testid="onboarding-topic-next"
                                    >
                                        Next <ChevronRight className="w-5 h-5" />
                                    </motion.button>
                                </div>
                                {error && <p className="text-rose-500 font-bold font-nunito mt-4">{error}</p>}
                            </div>
                        )}

                        {/* --- STEP: SETTING --- */}
                        {step === 'setting' && (
                            <div className="w-full space-y-4 text-center">
                                <div className="space-y-1">
                                    <div className="w-16 h-16 bg-blue-100/50 rounded-[1.25rem] flex items-center justify-center mx-auto shadow-clay-purple-sm border-2 border-white">
                                        <Sparkles className="w-8 h-8 text-blue-600" />
                                    </div>
                                    <h2 className="text-xl md:text-2xl font-black text-ink font-fredoka uppercase">Where Does it Happen?</h2>
                                    <p className="text-ink-muted font-bold font-nunito text-[10px] max-w-sm mx-auto">Optional: Pick a magical place for the story.</p>
                                </div>

                                <div className="relative max-w-sm mx-auto">
                                    <input
                                        type="text"
                                        autoFocus
                                        value={formData.setting}
                                        onChange={(e) => setFormData({ ...formData, setting: e.target.value })}
                                        onKeyDown={(e) => e.key === 'Enter' && nextStep('words')}
                                        className="w-full h-12 px-8 rounded-xl border-4 border-blue-50 bg-white/50 focus:bg-white focus:border-blue-200 outline-none transition-all font-fredoka text-lg font-black text-ink placeholder:text-slate-200 shadow-inner text-center"
                                        placeholder="Enchanted Forest, Mars, Underwater..."
                                        data-testid="story-setting-input"
                                    />
                                </div>

                                <div className="flex items-center justify-center gap-2 sm:gap-4">
                                    <button onClick={() => prevStep('topic')} className="ghost-btn h-12 px-4 sm:px-8 flex items-center gap-2">
                                        <ChevronLeft /> Back
                                    </button>
                                    <motion.button
                                        onClick={() => nextStep('words')}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="primary-btn h-12 px-4 sm:px-10 text-base sm:text-lg font-black font-fredoka uppercase tracking-widest flex items-center justify-center gap-1 sm:gap-2 whitespace-nowrap"
                                        data-testid="onboarding-setting-next"
                                    >
                                        Next <ChevronRight className="w-5 h-5" />
                                    </motion.button>
                                </div>
                                {error && <p className="text-rose-500 font-bold font-nunito mt-4">{error}</p>}
                            </div>
                        )}

                        {/* --- STEP: WORDS --- */}
                        {step === 'words' && (
                            <div className="w-full h-full flex flex-col space-y-4 text-center" data-testid="words-tab-content">
                                <div className="space-y-1">
                                    <div className="w-16 h-16 bg-purple-100/50 rounded-[1.25rem] flex items-center justify-center mx-auto shadow-clay-purple-sm border-2 border-white">
                                        <Wand2 className="w-8 h-8 text-purple-600" />
                                    </div>
                                    <h2 className="text-xl md:text-2xl font-black text-ink font-fredoka uppercase">Pick Magic Words</h2>
                                    <p className="text-ink-muted font-bold font-nunito text-[10px]">Optional: Choose up to 5 words to include!</p>
                                </div>

                                <div className="flex-grow flex flex-wrap justify-center content-start gap-2 max-w-xl mx-auto py-2 overflow-y-auto custom-scrollbar">
                                    {GUEST_MAGIC_WORDS.map(word => {
                                        const isSelected = formData.selectedWords.includes(word);
                                        return (
                                            <motion.button
                                                key={word}
                                                type="button"
                                                data-testid={`magic-word-${word.toLowerCase()}`}
                                                onClick={() => toggleWord(word)}
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                className={cn(
                                                    "px-4 py-2 rounded-xl text-sm font-black font-fredoka transition-all border-2",
                                                    isSelected
                                                        ? 'bg-purple-500 text-white border-purple-400 shadow-clay-purple-sm'
                                                        : 'bg-white text-ink border-white hover:border-purple-100 shadow-clay-sm'
                                                )}
                                            >
                                                {isSelected && <Check className="w-3 h-3 mr-1 inline" />}
                                                {word}
                                            </motion.button>
                                        );
                                    })}
                                </div>

                                <div className="flex items-center justify-center gap-2 sm:gap-4 pt-2 border-t border-purple-50 mt-auto">
                                    <button onClick={() => prevStep('setting')} className="ghost-btn h-12 px-4 sm:px-8 flex items-center gap-2 text-ink/70">
                                        <ChevronLeft /> Back
                                    </button>
                                    <motion.button
                                        onClick={handleCompleteStoryDraft}
                                        data-testid="onboarding-create-story"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="primary-btn h-12 px-4 sm:px-6 text-sm sm:text-base font-black font-fredoka uppercase tracking-wider flex items-center justify-center gap-1 sm:gap-2 whitespace-nowrap"
                                    >
                                        Create Story! ✨
                                    </motion.button>
                                </div>
                                {error && <p className="text-rose-500 font-bold font-nunito mt-4">{error}</p>}
                            </div>
                        )}

                        {/* --- STEP: SAVING --- */}
                        {step === 'saving' && (
                            <div className="w-full space-y-8 text-center flex flex-col items-center justify-center min-h-[50dvh]">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-purple-400/20 blur-3xl animate-pulse rounded-full" />
                                    <motion.div
                                        animate={{ rotate: [0, 5, -5, 0], y: [0, -10, 0] }}
                                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                        className="w-32 h-32 flex items-center justify-center p-4 bg-white rounded-[2.5rem] shadow-clay-purple border-4 border-white"
                                    >
                                        <CachedImage src="/logo.png" alt="Saving..." fill className="object-contain" />
                                    </motion.div>
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                        className="absolute -inset-4 border-4 border-dashed border-purple-200 rounded-[3.5rem] pointer-events-none"
                                    />
                                </div>
                                <div className="space-y-4">
                                    <h2 className="text-3xl font-black text-ink font-fredoka">Creating Your World...</h2>
                                    <p className="text-ink-muted font-bold font-nunito">We&apos;re getting things ready for <span className="text-purple-600">{formData.firstName}</span>.</p>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
