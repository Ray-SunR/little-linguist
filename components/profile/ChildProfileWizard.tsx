'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createChildProfile, getAvatarUploadUrl } from '@/app/actions/profiles';
import { Camera, Check, ChevronRight, ChevronLeft, Sparkles, Wand2, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/core";
import { CachedImage } from '@/components/ui/cached-image';
import { useAuth } from '@/components/auth/auth-provider';
import { raidenCache, CacheStore } from "@/lib/core/cache";

type Step = 'name' | 'age' | 'gender' | 'avatar' | 'interests' | 'topic' | 'setting' | 'words' | 'saving';

interface ChildProfileWizardProps {
    mode?: 'onboarding' | 'story';
}



const SUGGESTED_INTERESTS = {
    "Themes 🎭": ["Adventure", "Friendship", "Magic", "Mystery", "Kindness", "Courage"],
    "Topics 🦖": ["Nature", "Animals", "Science", "Pets", "Space", "Dinosaurs", "Transport"],
    "Characters 🦸": ["Princesses", "Superheroes", "Fairies", "Knights"],
    "Activities 🚀": ["Sports", "Building", "Exploration"]
};


const GUEST_MAGIC_WORDS = [
    'Magic', 'Adventure', 'Friendship', 'Dragon', 'Space',
    'Mystery', 'Forest', 'Treasure', 'Rainbow', 'Robot'
];

export default function ChildProfileWizard({ mode = 'onboarding' }: ChildProfileWizardProps) {
    const router = useRouter();
    const { refreshProfiles } = useAuth();
    const [step, setStep] = useState<Step>('name');
    const [formData, setFormData] = useState({
        first_name: '',
        birth_year: new Date().getFullYear() - 6,
        gender: '' as 'boy' | 'girl' | '',
        interests: [] as string[],
        avatar_asset_path: '',
        topic: '',
        setting: '',
        selectedWords: [] as string[]
    });

    const objectUrlRef = useRef<string | null>(null);

    // Clean up Object URL on unmount or when preview changes
    useEffect(() => {
        return () => {
            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
            }
        };
    }, []);

    const [avatarPreview, setAvatarPreview] = useState<string | undefined>();
    const [avatarStoragePath, setAvatarStoragePath] = useState<string | undefined>();
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const age = new Date().getFullYear() - formData.birth_year;

    function nextStep(next: Step): void {
        setError(null);
        setStep(next);
    }

    function prevStep(prev: Step): void {
        setError(null);
        setStep(prev);
    }

    function toggleInterest(interest: string): void {
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
        if (!formData.first_name.trim()) {
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
                ...formData,
                avatar_asset_path: avatarStoragePath || ''
            });

            if (!result) {
                throw new Error('No response from server. Please try again or use a smaller photo.');
            }

            if (result.error) throw new Error(result.error);

            await refreshProfiles();
            router.push('/library');
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
            const draft = {
                profile: {
                    name: formData.first_name,
                    age: new Date().getFullYear() - formData.birth_year,
                    gender: formData.gender,
                    avatarUrl: avatarStoragePath ? undefined : avatarPreview, // Don't cache blob URLs if we have storage path
                    avatarStoragePath: avatarStoragePath,
                    interests: formData.interests,
                    topic: formData.topic,
                    setting: formData.setting
                },
                selectedWords: formData.selectedWords,
                storyLengthMinutes: 5, // Default for guest
                imageSceneCount: 5,    // Default for guest
                isGuestFlow: true
            };

            await raidenCache.put(CacheStore.DRAFTS, { id: "draft:guest", ...draft });

            const returnUrl = encodeURIComponent('/story-maker?action=resume_story_maker');
            router.push(`/login?returnTo=${returnUrl}`);
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
            <div className="clay-card bg-white/70 backdrop-blur-xl p-3 sm:p-4 rounded-[2.5rem] md:rounded-[3rem] border-4 border-white shadow-2xl relative overflow-hidden h-[540px] w-full flex flex-col">

                {/* Progress Bar */}
                <div className="absolute top-0 left-0 w-full h-2 bg-purple-100/50">
                    <motion.div
                        className="h-full bg-gradient-to-r from-purple-400 to-pink-400"
                        initial={{ width: '0%' }}
                        animate={{ width: progressPercentage() }}
                    />
                </div>

                <AnimatePresence mode="wait" custom={1}>
                    <motion.div
                        key={step}
                        custom={1}
                        variants={stepVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                        className="flex-grow flex flex-col items-center justify-center w-full overflow-hidden"
                    >
                        {/* --- STEP: NAME --- */}
                        {step === 'name' && (
                            <div className="w-full space-y-6 text-center">
                                <div className="space-y-2">
                                    <div className="w-16 h-16 bg-purple-100/50 rounded-[1.25rem] flex items-center justify-center mx-auto shadow-clay-purple-sm border-2 border-white">
                                        <Sparkles className="w-8 h-8 text-purple-600" />
                                    </div>
                                    <h2 className="text-xl md:text-2xl font-black text-ink font-fredoka">Who is our Hero?</h2>
                                    <p className="text-ink-muted font-bold font-nunito text-[10px] max-w-xs mx-auto">
                                         {mode === 'story'
                                             ? "Let's name your hero! We'll create a profile to save their adventures."
                                             : "Let's start by naming your child's profile."}
                                     </p>
                                </div>

                                <div className="relative max-w-sm mx-auto">
                                    <input
                                        type="text"
                                        autoFocus
                                        value={formData.first_name}
                                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                        onKeyDown={(e) => e.key === 'Enter' && formData.first_name && nextStep('age')}
                                        className="w-full h-12 px-8 rounded-xl border-4 border-purple-50 bg-white/50 focus:bg-white focus:border-purple-200 outline-none transition-all font-fredoka text-xl font-black text-ink placeholder:text-slate-200 shadow-inner text-center"
                                        placeholder="Leo, Mia, Sam..."
                                    />
                                </div>

                                <div className="flex justify-center">
                                    <motion.button
                                        disabled={!formData.first_name}
                                        onClick={() => nextStep('age')}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="primary-btn h-12 px-12 text-lg font-black font-fredoka uppercase tracking-widest disabled:opacity-50"
                                    >
                                        Continue
                                    </motion.button>
                                </div>
                            </div>
                        )}

                        {/* --- STEP: AGE --- */}
                        {step === 'age' && (
                            <div className="w-full space-y-6 text-center">
                                <div className="space-y-2">
                                    <h2 className="text-xl md:text-2xl font-black text-ink font-fredoka px-4">How old is <span className="text-purple-600 font-black">{formData.first_name}</span>?</h2>
                                    <p className="text-ink-muted font-bold font-nunito text-[10px]">We&apos;ll tailor the stories to their age.</p>
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-[2.5rem] bg-purple-50/50 shadow-inner border-4 border-white mx-auto max-w-[260px] md:max-w-xs">
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        type="button"
                                        className="w-12 h-12 rounded-full bg-white shadow-clay-sm flex items-center justify-center text-2xl font-black text-purple-600 border-2 border-purple-100 disabled:opacity-50"
                                        onClick={() => setFormData({ ...formData, birth_year: formData.birth_year + 1 })}
                                        disabled={age <= 1}
                                    >
                                        <MinusIcon />
                                    </motion.button>
                                    <div className="flex flex-col items-center">
                                        <span className="text-3xl md:text-4xl font-black text-purple-600 font-fredoka">{age}</span>
                                        <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest leading-none">Years Old</span>
                                    </div>
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        type="button"
                                        className="w-12 h-12 rounded-full bg-white shadow-clay-sm flex items-center justify-center text-2xl font-black text-purple-600 border-2 border-purple-100 disabled:opacity-50"
                                        onClick={() => setFormData({ ...formData, birth_year: formData.birth_year - 1 })}
                                        disabled={age >= 15}
                                    >
                                        <PlusIcon />
                                    </motion.button>
                                </div>

                                <div className="flex items-center justify-center gap-4">
                                    <button onClick={() => prevStep('name')} className="ghost-btn h-12 px-8 flex items-center gap-2">
                                        <ChevronLeft /> Back
                                    </button>
                                    <motion.button
                                        onClick={() => nextStep('gender')}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="primary-btn h-12 px-12 text-lg font-black font-fredoka uppercase tracking-widest"
                                    >
                                        Yep! <ChevronRight className="ml-2 inline" />
                                    </motion.button>
                                </div>
                            </div>
                        )}

                        {/* --- STEP: GENDER --- */}
                        {step === 'gender' && (
                            <div className="w-full space-y-6 text-center">
                                <div className="space-y-2">
                                    <h2 className="text-xl md:text-2xl font-black text-ink font-fredoka">Which hero are they?</h2>
                                    <p className="text-ink-muted font-bold font-nunito text-[10px]">Choose an identity for <span className="text-purple-600 font-black">{formData.first_name}</span>.</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                                    <motion.button
                                        whileHover={{ y: -4, scale: 1.02 }}
                                        whileTap={{ scale: 0.95 }}
                                        className={cn(
                                            "flex flex-col items-center gap-2 p-4 rounded-[1.5rem] border-2 transition-all font-fredoka font-black text-base",
                                            formData.gender === "boy"
                                                ? "bg-blue-500 text-white border-blue-400 shadow-clay-purple-sm"
                                                : "bg-white text-ink-muted border-white hover:border-blue-100 shadow-clay-sm"
                                        )}
                                        onClick={() => setFormData({ ...formData, gender: "boy" })}
                                    >
                                        <span className="text-5xl mb-1">👦</span>
                                        Boy
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ y: -4, scale: 1.02 }}
                                        whileTap={{ scale: 0.95 }}
                                        className={cn(
                                            "flex flex-col items-center gap-2 p-4 rounded-[1.5rem] border-2 transition-all font-fredoka font-black text-base",
                                            formData.gender === "girl"
                                                ? "bg-pink-500 text-white border-pink-400 shadow-clay-pink-sm"
                                                : "bg-white text-ink-muted border-white hover:border-pink-100 shadow-clay-sm"
                                        )}
                                        onClick={() => setFormData({ ...formData, gender: "girl" })}
                                    >
                                        <span className="text-5xl mb-1">👧</span>
                                        Girl
                                    </motion.button>
                                </div>

                                <div className="flex items-center justify-center gap-4">
                                    <button onClick={() => prevStep('age')} className="ghost-btn h-12 px-8 flex items-center gap-2 text-ink/70">
                                        <ChevronLeft /> Back
                                    </button>
                                    <motion.button
                                        disabled={!formData.gender}
                                        onClick={() => nextStep('avatar')}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="primary-btn h-12 px-12 text-lg font-black font-fredoka uppercase tracking-widest disabled:opacity-50"
                                    >
                                        Next <ChevronRight className="ml-2 inline" />
                                    </motion.button>
                                </div>
                            </div>
                        )}

                        {/* --- STEP: AVATAR --- */}
                        {step === 'avatar' && (
                            <div className="w-full space-y-4 text-center">
                                <div className="space-y-1">
                                    <h2 className="text-xl md:text-2xl font-black text-ink font-fredoka">Strike a pose!</h2>
                                    <p className="text-ink-muted font-bold font-nunito text-[10px]">Add a photo of <span className="text-purple-600 font-black">{formData.first_name}</span> or use a fun image.</p>
                                </div>

                                <div className="flex items-center justify-center">
                                    <label className={cn(
                                        "w-36 h-36 rounded-[2rem] border-4 border-dashed transition-all cursor-pointer relative overflow-hidden flex flex-col items-center justify-center group shadow-inner bg-white/30",
                                        avatarPreview
                                            ? "border-emerald-200"
                                            : "border-purple-200 hover:bg-white/50 hover:border-purple-400"
                                    )}>
                                        {avatarPreview ? (
                                            <div className="relative w-full h-full p-3">
                                                <CachedImage
                                                    src={avatarPreview}
                                                    storagePath={avatarStoragePath}
                                                    alt="Preview"
                                                    fill
                                                    className="w-full h-full object-cover rounded-[2rem] shadow-clay ring-4 ring-white"
                                                    bucket="user-assets"
                                                />
                                                <motion.button
                                                    whileHover={{ scale: 1.1, rotate: 90 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
                                                        objectUrlRef.current = null;
                                                        setAvatarPreview(undefined);
                                                        setAvatarStoragePath(undefined);
                                                    }}
                                                    className="absolute top-2 right-2 w-8 h-8 bg-rose-500 text-white rounded-full shadow-lg flex items-center justify-center font-black text-lg border-2 border-white"
                                                >
                                                    ×
                                                </motion.button>
                                            </div>
                                        ) : (
                                            <div className="text-center p-6">
                                                <motion.div
                                                    animate={{ y: [0, -5, 0] }}
                                                    transition={{ duration: 3, repeat: Infinity }}
                                                    className="w-16 h-16 rounded-[1.25rem] bg-white shadow-clay-purple-sm flex items-center justify-center mx-auto mb-4 border-2 border-purple-50"
                                                >
                                                    {isUploading ? (
                                                        <motion.img
                                                            src="/logo.png"
                                                            className="h-8 w-8"
                                                            animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                                                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                                        />
                                                    ) : (
                                                        <Camera className="h-8 w-8 text-purple-400" />
                                                    )}
                                                </motion.div>
                                                <span className="text-lg font-black text-purple-600 font-fredoka block">
                                                    {isUploading ? "Magic..." : "Pick Photo"}
                                                </span>
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            disabled={isUploading}
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;

                                                setIsUploading(true);
                                                try {
                                                    const localUrl = URL.createObjectURL(file);
                                                    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
                                                    objectUrlRef.current = localUrl;
                                                    setAvatarPreview(localUrl);

                                                    const result = await getAvatarUploadUrl(file.name);
                                                    if (result.error || !result.data) throw new Error(result.error);
                                                    
                                                    const { signedUrl, path } = result.data;
                                                    const response = await fetch(signedUrl, { 
                                                        method: 'PUT', 
                                                        body: file, 
                                                        headers: { 'Content-Type': file.type } 
                                                    });
                                                    
                                                    if (!response.ok) throw new Error('Failed to upload image to storage.');
                                                    
                                                    setAvatarStoragePath(path);
                                                } catch (err: unknown) {
                                                    console.error("Upload failed:", err);
                                                    const message = err instanceof Error ? err.message : "Failed to upload image.";
                                                    setError(message);
                                                    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
                                                    objectUrlRef.current = null;
                                                    setAvatarPreview(undefined);
                                                    setAvatarStoragePath(undefined);
                                                } finally {
                                                    setIsUploading(false);
                                                }
                                            }}
                                        />
                                    </label>
                                </div>

                                <div className="flex items-center justify-center gap-2 sm:gap-4">
                                    <button onClick={() => prevStep('gender')} className="ghost-btn h-12 px-4 sm:px-8 flex items-center gap-2 text-ink/70">
                                        <ChevronLeft /> Back
                                    </button>
                                    <motion.button
                                        onClick={() => nextStep('interests')}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="primary-btn h-12 px-4 sm:px-10 text-base sm:text-lg font-black font-fredoka uppercase tracking-widest flex items-center justify-center gap-1 sm:gap-2 whitespace-nowrap"
                                    >
                                        {avatarPreview ? "Stunning!" : "Skip"} <ChevronRight className="w-5 h-5" />
                                    </motion.button>
                                </div>
                            </div>
                        )}

                        {/* --- STEP: INTERESTS --- */}
                        {step === 'interests' && (
                            <div className="w-full h-full flex flex-col space-y-4">
                                <div className="text-center space-y-1">
                                    <h2 className="text-xl md:text-2xl font-black text-ink font-fredoka">Magic Interests!</h2>
                                    <p className="text-ink-muted font-bold font-nunito text-[10px]">Optional: What does <span className="text-purple-600 font-black">{formData.first_name}</span> love most?</p>
                                </div>

                                {/* Manual Input */}
                                <div className="relative group max-w-sm mx-auto w-full">
                                    <input
                                        type="text"
                                        placeholder="Add something else they love..."
                                        className="w-full h-10 px-4 pr-10 rounded-xl border-2 border-purple-100 bg-white/50 focus:bg-white focus:border-purple-400 outline-none transition-all font-nunito font-bold text-ink text-sm placeholder:text-slate-300 shadow-inner"
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
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-200 group-focus-within:text-purple-400 transition-colors">
                                        <kbd className="text-[8px] font-black border border-current px-1 rounded">ENTER</kbd>
                                    </div>
                                </div>

                                {/* Interests Area */}
                                <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar space-y-4">
                                    {/* Selected Interests Bar (if any) */}
                                    {formData.interests.length > 0 && (
                                        <div className="flex flex-wrap gap-2 p-2 bg-purple-50/50 rounded-xl border-2 border-white min-h-[44px]">
                                            {formData.interests.map(interest => (
                                                <motion.button
                                                    layout
                                                    initial={{ scale: 0.8, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    key={`selected-${interest}`}
                                                    onClick={() => toggleInterest(interest)}
                                                    className="px-2 py-0.5 bg-purple-500 text-white rounded-full text-[10px] font-black shadow-clay-purple-sm flex items-center gap-1 group"
                                                >
                                                    {interest}
                                                    <span className="opacity-50 group-hover:opacity-100 transition-opacity">×</span>
                                                </motion.button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Suggested Categories */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                        {Object.entries(SUGGESTED_INTERESTS).map(([category, items]) => (
                                            <div key={category} className="space-y-3">
                                                <h3 className="text-[10px] font-black text-ink-muted/40 uppercase tracking-[0.2em] px-1">{category}</h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {items.map(interest => {
                                                        const isSelected = formData.interests.includes(interest);
                                                        return (
                                                            <motion.button
                                                                key={`suggested-${interest}`}
                                                                type="button"
                                                                onClick={() => toggleInterest(interest)}
                                                                whileHover={{ scale: 1.05, y: -2 }}
                                                                whileTap={{ scale: 0.95 }}
                                                                className={cn(
                                                                    "px-3 py-1.5 rounded-xl text-xs font-bold font-nunito transition-all border-2",
                                                                    isSelected
                                                                        ? 'bg-purple-500 text-white border-purple-400 shadow-clay-purple-sm'
                                                                        : 'bg-white text-ink-muted border-white hover:border-purple-200 shadow-sm'
                                                                )}
                                                            >
                                                                {interest}
                                                            </motion.button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center justify-center gap-4 pt-2 border-t border-purple-50 mt-auto">
                                    <button onClick={() => prevStep('avatar')} className="ghost-btn h-12 px-8 flex items-center gap-2 text-ink/70">
                                        <ChevronLeft className="w-5 h-5" /> Back
                                    </button>
                                    <motion.button
                                        onClick={handleFinish}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="primary-btn h-12 px-4 sm:px-10 text-base sm:text-lg font-black font-fredoka uppercase tracking-widest flex items-center justify-center gap-1 sm:gap-2 whitespace-nowrap"
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
                                    <p className="text-ink-muted font-bold font-nunito text-[10px] max-w-sm mx-auto">Optional: Tell us a theme for <span className="text-purple-600 font-black">{formData.first_name}</span>&apos;s adventure.</p>
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
                                    >
                                        Next <ChevronRight className="w-5 h-5" />
                                    </motion.button>
                                </div>
                                {error && <p className="text-rose-500 font-bold font-nunito mt-4">{error}</p>}
                            </div>
                        )}

                        {/* --- STEP: WORDS --- */}
                        {step === 'words' && (
                            <div className="w-full h-full flex flex-col space-y-4 text-center">
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
                                    <p className="text-ink-muted font-bold font-nunito">We&apos;re getting things ready for <span className="text-purple-600">{formData.first_name}</span>.</p>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

        </div>
    );
}

function PlusIcon() {
    return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function MinusIcon() {
    return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 12H19" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
