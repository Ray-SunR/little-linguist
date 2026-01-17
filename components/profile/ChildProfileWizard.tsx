'use client';

import { useState } from 'react';
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
        gender: 'boy',
        interests: [] as string[],
        avatar_asset_path: '',
        topic: '',
        setting: '',
        selectedWords: [] as string[]
    });

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
        setFormData(prev => ({
            ...prev,
            selectedWords: prev.selectedWords.includes(word)
                ? prev.selectedWords.filter(w => w !== word)
                : (prev.selectedWords.length < 5 ? [...prev.selectedWords, word] : prev.selectedWords)
        }));
    }

    async function handleFinish(): Promise<void> {
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
        } catch (err: any) {
            setError(err.message || 'Something went wrong');
            setStep('interests');
        }
    }

    async function handleCompleteStoryDraft(): Promise<void> {
        if (!formData.topic || !formData.setting || formData.selectedWords.length === 0) {
            setError("Please finish picking your magic theme, place, and words!");
            return;
        }

        setStep('saving');
        setError(null);

        try {
            const draft = {
                profile: {
                    name: formData.first_name,
                    age: new Date().getFullYear() - formData.birth_year,
                    gender: formData.gender,
                    avatarUrl: avatarPreview,
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
        } catch (err: any) {
            setError(err.message || 'Failed to save magic draft');
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
        <div className="w-full max-w-2xl mx-auto px-4 sm:px-0">
            <div className="clay-card bg-white/70 backdrop-blur-xl p-5 sm:p-8 md:p-10 rounded-[2.5rem] md:rounded-[3.5rem] border-4 border-white shadow-2xl relative overflow-hidden min-h-[50dvh] md:min-h-[500px] flex flex-col">

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
                        className="flex-grow flex flex-col items-center justify-center py-4 md:py-8 overflow-y-auto w-full"
                    >
                        {/* --- STEP: NAME --- */}
                        {step === 'name' && (
                            <div className="w-full space-y-8 text-center">
                                <div className="space-y-4">
                                    <div className="w-16 h-16 md:w-20 md:h-20 bg-purple-100 rounded-2xl md:rounded-3xl flex items-center justify-center mx-auto shadow-clay-purple-sm">
                                        <Sparkles className="w-8 h-8 md:w-10 md:h-10 text-purple-600" />
                                    </div>
                                    <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-ink font-fredoka">Who is our Hero?</h2>
                                    <p className="text-ink-muted font-bold font-nunito">
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
                                        className="w-full h-16 md:h-20 px-6 md:px-8 rounded-2xl md:rounded-3xl border-4 border-purple-50 bg-white/50 focus:bg-white focus:border-purple-300 outline-none transition-all font-fredoka text-xl md:text-2xl font-black text-ink placeholder:text-slate-300 shadow-inner"
                                        placeholder="Leo, Mia, Sam..."
                                    />
                                </div>

                                <motion.button
                                    disabled={!formData.first_name}
                                    onClick={() => nextStep('age')}
                                    whileHover={{ scale: 1.05, y: -4 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="primary-btn h-14 md:h-16 px-8 md:px-12 text-lg md:text-xl font-black font-fredoka uppercase tracking-widest disabled:opacity-50"
                                >
                                    Continue
                                </motion.button>
                            </div>
                        )}

                        {/* --- STEP: AGE --- */}
                        {step === 'age' && (
                            <div className="w-full space-y-10 text-center">
                                <div className="space-y-4">
                                    <h2 className="text-2xl md:text-4xl font-black text-ink font-fredoka px-4">How old is <span className="text-purple-600">{formData.first_name}</span>?</h2>
                                    <p className="text-ink-muted font-bold font-nunito text-sm md:text-base">We&apos;ll tailor the stories to their age.</p>
                                </div>

                                <div className="flex items-center justify-between p-3 md:p-4 rounded-[2.5rem] md:rounded-[3rem] bg-purple-50 shadow-inner border-4 border-white mx-auto max-w-[280px] md:max-w-xs">
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        type="button"
                                        className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white shadow-md flex items-center justify-center text-2xl md:text-3xl font-black text-purple-600 border-2 border-purple-100 disabled:opacity-50"
                                        onClick={() => setFormData({ ...formData, birth_year: formData.birth_year + 1 })}
                                        disabled={age <= 1}
                                    >
                                        <MinusIcon />
                                    </motion.button>
                                    <div className="flex flex-col items-center">
                                        <span className="text-4xl md:text-5xl font-black text-purple-600 font-fredoka">{age}</span>
                                        <span className="text-[10px] md:text-xs font-black text-purple-400 uppercase tracking-widest">Years Old</span>
                                    </div>
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        type="button"
                                        className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white shadow-md flex items-center justify-center text-2xl md:text-3xl font-black text-purple-600 border-2 border-purple-100 disabled:opacity-50"
                                        onClick={() => setFormData({ ...formData, birth_year: formData.birth_year - 1 })}
                                        disabled={age >= 15}
                                    >
                                        <PlusIcon />
                                    </motion.button>
                                </div>

                                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                    <button onClick={() => prevStep('name')} className="ghost-btn h-14 md:h-16 px-8 flex items-center gap-2 w-full sm:w-auto justify-center">
                                        <ChevronLeft /> Back
                                    </button>
                                    <motion.button
                                        onClick={() => nextStep('gender')}
                                        whileHover={{ scale: 1.05, y: -4 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="primary-btn h-14 md:h-16 px-12 text-xl font-black font-fredoka uppercase tracking-widest w-full sm:w-auto"
                                    >
                                        Yep! <ChevronRight className="ml-2 inline" />
                                    </motion.button>
                                </div>
                            </div>
                        )}

                        {/* --- STEP: GENDER --- */}
                        {step === 'gender' && (
                            <div className="w-full space-y-10 text-center">
                                <div className="space-y-4">
                                    <h2 className="text-3xl md:text-4xl font-black text-ink font-fredoka">Which hero are they?</h2>
                                    <p className="text-ink-muted font-bold font-nunito">Choose an identity for <span className="text-purple-600">{formData.first_name}</span>.</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4 md:gap-6 max-w-sm mx-auto">
                                    <motion.button
                                        whileHover={{ y: -5 }}
                                        whileTap={{ scale: 0.95 }}
                                        className={cn(
                                            "flex flex-col items-center gap-2 md:gap-4 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border-4 transition-all font-fredoka font-black text-lg md:text-xl",
                                            formData.gender === "boy"
                                                ? "bg-blue-500 text-white border-blue-400 shadow-clay-purple"
                                                : "bg-white text-ink-muted border-slate-50 hover:border-blue-100 shadow-sm"
                                        )}
                                        onClick={() => setFormData({ ...formData, gender: "boy" })}
                                    >
                                        <span className="text-4xl md:text-6xl">👦</span>
                                        Boy
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ y: -5 }}
                                        whileTap={{ scale: 0.95 }}
                                        className={cn(
                                            "flex flex-col items-center gap-2 md:gap-4 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border-4 transition-all font-fredoka font-black text-lg md:text-xl",
                                            formData.gender === "girl"
                                                ? "bg-pink-500 text-white border-pink-400 shadow-clay-pink"
                                                : "bg-white text-ink-muted border-slate-50 hover:border-pink-100 shadow-sm"
                                        )}
                                        onClick={() => setFormData({ ...formData, gender: "girl" })}
                                    >
                                        <span className="text-4xl md:text-6xl">👧</span>
                                        Girl
                                    </motion.button>
                                </div>

                                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                    <button onClick={() => prevStep('age')} className="ghost-btn h-14 md:h-16 px-8 flex items-center gap-2 text-ink/70 w-full sm:w-auto justify-center">
                                        <ChevronLeft /> Back
                                    </button>
                                    <motion.button
                                        onClick={() => nextStep('avatar')}
                                        whileHover={{ scale: 1.05, y: -4 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="primary-btn h-14 md:h-16 px-12 text-xl font-black font-fredoka uppercase tracking-widest w-full sm:w-auto"
                                    >
                                        Next <ChevronRight className="ml-2 inline" />
                                    </motion.button>
                                </div>
                            </div>
                        )}

                        {/* --- STEP: AVATAR --- */}
                        {step === 'avatar' && (
                            <div className="w-full space-y-10 text-center">
                                <div className="space-y-4">
                                    <h2 className="text-3xl md:text-4xl font-black text-ink font-fredoka">Strike a pose!</h2>
                                    <p className="text-ink-muted font-bold font-nunito">Add a photo of <span className="text-purple-600">{formData.first_name}</span> or use a fun image.</p>
                                </div>

                                <div className="flex items-center justify-center">
                                    <label className={cn(
                                        "w-40 h-40 md:w-64 md:h-64 rounded-[2rem] md:rounded-[3rem] border-4 border-dashed transition-all cursor-pointer relative overflow-hidden flex flex-col items-center justify-center group shadow-inner",
                                        avatarPreview
                                            ? "border-emerald-200 bg-emerald-50/30"
                                            : "border-purple-200 bg-purple-50/30 hover:bg-purple-50 hover:border-purple-300"
                                    )}>
                                        {avatarPreview ? (
                                            <div className="relative w-full h-full p-4">
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
                                                        setAvatarPreview(undefined);
                                                    }}
                                                    className="absolute top-4 right-4 w-10 h-10 bg-rose-500 text-white rounded-full shadow-lg flex items-center justify-center font-black text-xl border-2 border-white"
                                                >
                                                    ×
                                                </motion.button>
                                            </div>
                                        ) : (
                                            <div className="text-center p-8">
                                                <motion.div
                                                    animate={{ y: [0, -5, 0] }}
                                                    transition={{ duration: 3, repeat: Infinity }}
                                                    className="w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-[1.5rem] bg-white shadow-clay flex items-center justify-center mx-auto mb-4 md:mb-6 border-2 border-purple-100"
                                                >
                                                    {isUploading ? (
                                                        <motion.img
                                                            src="/logo.png"
                                                            className="h-8 w-8 md:h-10 md:w-10"
                                                            animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                                                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                                        />
                                                    ) : (
                                                        <Camera className="h-8 w-8 md:h-10 md:w-10 text-purple-400" />
                                                    )}
                                                </motion.div>
                                                <span className="text-lg md:text-xl font-black text-purple-600 font-fredoka block mb-1">
                                                    {isUploading ? "Magic Pixels..." : "Upload Photo"}
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
                                                    // Always show immediate preview
                                                    const localUrl = URL.createObjectURL(file);
                                                    setAvatarPreview(localUrl);

                                                    // Always upload to bucket (guest or user)
                                                    const result = await getAvatarUploadUrl(file.name);
                                                    if (result.error || !result.data) throw new Error(result.error);
                                                    
                                                    const { signedUrl, path } = result.data;
                                                    await fetch(signedUrl, { 
                                                        method: 'PUT', 
                                                        body: file, 
                                                        headers: { 'Content-Type': file.type } 
                                                    });
                                                    
                                                    setAvatarStoragePath(path);
                                                } catch (err: any) {
                                                    console.error("Upload failed:", err);
                                                    setError(err.message || "Failed to upload image.");
                                                    setAvatarPreview(undefined);
                                                    setAvatarStoragePath(undefined);
                                                } finally {
                                                    setIsUploading(false);
                                                }
                                            }}
                                        />
                                    </label>
                                </div>

                                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                    <button onClick={() => prevStep('gender')} className="ghost-btn h-14 md:h-16 px-8 flex items-center gap-2 text-ink/70 w-full sm:w-auto justify-center">
                                        <ChevronLeft /> Back
                                    </button>
                                    <motion.button
                                        onClick={() => nextStep('interests')}
                                        whileHover={{ scale: 1.05, y: -4 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="primary-btn h-14 md:h-16 px-12 text-xl font-black font-fredoka uppercase tracking-widest w-full sm:w-auto"
                                    >
                                        {avatarPreview ? "Stunning!" : "Skip for now"} <ChevronRight className="ml-2 inline" />
                                    </motion.button>
                                </div>
                            </div>
                        )}

                        {/* --- STEP: INTERESTS --- */}
                        {step === 'interests' && (
                            <div className="w-full space-y-8 text-center">
                                <div className="space-y-2">
                                    <h2 className="text-2xl md:text-4xl font-black text-ink font-fredoka">Magic Interests!</h2>
                                    <p className="text-ink-muted font-bold font-nunito">What does <span className="text-purple-600">{formData.first_name}</span> love most?</p>
                                </div>

                                <div className="flex-1 overflow-y-auto max-h-[45dvh] md:max-h-[350px] pr-2 scrollbar-thin scrollbar-thumb-purple-200 scrollbar-track-transparent">
                                    <div className="space-y-6">
                                        {Object.entries(SUGGESTED_INTERESTS).map(([category, items]) => (
                                            <div key={category} className="space-y-3">
                                                <h3 className="text-left text-sm font-black text-ink-muted/50 uppercase tracking-widest px-1">{category}</h3>
                                                <div className="flex flex-wrap gap-2 md:gap-3">
                                                    {items.map(interest => {
                                                        const isSelected = formData.interests.includes(interest);
                                                        return (
                                                            <motion.button
                                                                key={interest}
                                                                type="button"
                                                                onClick={() => toggleInterest(interest)}
                                                                whileHover={{ scale: 1.05 }}
                                                                whileTap={{ scale: 0.95 }}
                                                                className={cn(
                                                                    "px-3 py-1.5 md:px-4 md:py-2.5 rounded-xl md:rounded-2xl text-sm md:text-base font-bold font-nunito transition-all border-2 shadow-sm",
                                                                    isSelected
                                                                        ? 'bg-purple-500 text-white border-purple-400 shadow-clay-purple-sm'
                                                                        : 'bg-white text-ink-muted border-slate-100 hover:border-purple-200'
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

                                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                                    <button onClick={() => prevStep('avatar')} className="ghost-btn h-12 md:h-14 px-8 flex items-center gap-2 text-ink/70 w-full sm:w-auto justify-center">
                                        <ChevronLeft /> Back
                                    </button>
                                    <motion.button
                                        onClick={handleFinish}
                                        disabled={formData.interests.length === 0}
                                        whileHover={{ scale: 1.05, y: -4 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="primary-btn min-h-[3rem] md:h-14 py-2 px-6 md:px-10 text-sm sm:text-lg md:text-xl font-black font-fredoka uppercase tracking-wide md:tracking-widest disabled:opacity-50 w-full sm:w-auto flex items-center justify-center text-center leading-tight whitespace-normal"
                                    >
                                        {mode === 'onboarding' ? "Complete Journey! ✨" : (
                                            <>Next <ChevronRight className="ml-2 inline" /></>
                                        )}
                                    </motion.button>
                                </div>
                            </div>
                        )}

                        {/* --- STEP: TOPIC --- */}
                        {step === 'topic' && (
                            <div className="w-full space-y-10 text-center">
                                <div className="space-y-4">
                                    <div className="w-16 h-16 md:w-20 md:h-20 bg-orange-100 rounded-2xl md:rounded-3xl flex items-center justify-center mx-auto shadow-clay-pink-sm">
                                        <BookOpen className="w-8 h-8 md:w-10 md:h-10 text-orange-600" />
                                    </div>
                                    <h2 className="text-2xl md:text-4xl font-black text-ink font-fredoka uppercase">What&apos;s the Story About?</h2>
                                    <p className="text-ink-muted font-bold font-nunito text-sm md:text-base px-4">Tell us a theme for <span className="text-purple-600">{formData.first_name}</span>&apos;s adventure.</p>
                                </div>

                                <div className="relative max-w-sm mx-auto">
                                    <input
                                        type="text"
                                        autoFocus
                                        value={formData.topic}
                                        onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                if (!formData.topic) {
                                                    setError("What should our story be about?");
                                                    return;
                                                }
                                                nextStep('setting');
                                            }
                                        }}
                                        className="w-full h-20 px-8 rounded-3xl border-4 border-orange-50 bg-white/50 focus:bg-white focus:border-orange-300 outline-none transition-all font-fredoka text-2xl font-black text-ink placeholder:text-slate-300 shadow-inner"
                                        placeholder="Space, Dinosaurs, Tea Party..."
                                    />
                                </div>

                                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                    <button onClick={() => prevStep('interests')} className="ghost-btn h-14 md:h-16 px-8 flex items-center gap-2 w-full sm:w-auto justify-center">
                                        <ChevronLeft /> Back
                                    </button>
                                    <motion.button
                                        onClick={() => {
                                            if (!formData.topic) {
                                                setError("What should our story be about?");
                                                return;
                                            }
                                            nextStep('setting');
                                        }}
                                        whileHover={{ scale: 1.05, y: -4 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="primary-btn h-14 md:h-16 px-12 text-xl font-black font-fredoka uppercase tracking-widest w-full sm:w-auto"
                                    >
                                        Next <ChevronRight className="ml-2 inline" />
                                    </motion.button>
                                </div>
                                {error && <p className="text-rose-500 font-bold font-nunito mt-4">{error}</p>}
                            </div>
                        )}

                        {/* --- STEP: SETTING --- */}
                        {step === 'setting' && (
                            <div className="w-full space-y-10 text-center">
                                <div className="space-y-4">
                                    <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-100 rounded-2xl md:rounded-3xl flex items-center justify-center mx-auto shadow-clay-purple-sm">
                                        <Sparkles className="w-8 h-8 md:w-10 md:h-10 text-blue-600" />
                                    </div>
                                    <h2 className="text-2xl md:text-4xl font-black text-ink font-fredoka uppercase">Where Does it Happen?</h2>
                                    <p className="text-ink-muted font-bold font-nunito text-sm md:text-base">Pick a magical place for the story.</p>
                                </div>

                                <div className="relative max-w-sm mx-auto">
                                    <input
                                        type="text"
                                        autoFocus
                                        value={formData.setting}
                                        onChange={(e) => setFormData({ ...formData, setting: e.target.value })}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                if (!formData.setting) {
                                                    setError("Where should this adventure happen?");
                                                    return;
                                                }
                                                nextStep('words');
                                            }
                                        }}
                                        className="w-full h-20 px-8 rounded-3xl border-4 border-blue-50 bg-white/50 focus:bg-white focus:border-blue-300 outline-none transition-all font-fredoka text-2xl font-black text-ink placeholder:text-slate-300 shadow-inner"
                                        placeholder="Enchanted Forest, Mars, Underwater..."
                                    />
                                </div>

                                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                    <button onClick={() => prevStep('topic')} className="ghost-btn h-14 md:h-16 px-8 flex items-center gap-2 w-full sm:w-auto justify-center">
                                        <ChevronLeft /> Back
                                    </button>
                                    <motion.button
                                        onClick={() => {
                                            if (!formData.setting) {
                                                setError("Where should this adventure happen?");
                                                return;
                                            }
                                            nextStep('words');
                                        }}
                                        whileHover={{ scale: 1.05, y: -4 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="primary-btn h-14 md:h-16 px-12 text-xl font-black font-fredoka uppercase tracking-widest w-full sm:w-auto"
                                    >
                                        Next <ChevronRight className="ml-2 inline" />
                                    </motion.button>
                                </div>
                                {error && <p className="text-rose-500 font-bold font-nunito mt-4">{error}</p>}
                            </div>
                        )}

                        {/* --- STEP: WORDS --- */}
                        {step === 'words' && (
                            <div className="w-full space-y-10 text-center">
                                <div className="space-y-4">
                                    <div className="w-16 h-16 md:w-20 md:h-20 bg-purple-100 rounded-2xl md:rounded-3xl flex items-center justify-center mx-auto shadow-clay-purple-sm">
                                        <Wand2 className="w-8 h-8 md:w-10 md:h-10 text-purple-600" />
                                    </div>
                                    <h2 className="text-2xl md:text-4xl font-black text-ink font-fredoka uppercase">Pick Magic Words</h2>
                                    <p className="text-ink-muted font-bold font-nunito text-sm md:text-base">Choose up to 5 words to include!</p>
                                </div>

                                <div className="flex flex-wrap justify-center gap-3 md:gap-4 max-w-xl mx-auto">
                                    {GUEST_MAGIC_WORDS.map(word => {
                                        const isSelected = formData.selectedWords.includes(word);
                                        return (
                                            <motion.button
                                                key={word}
                                                type="button"
                                                onClick={() => toggleWord(word)}
                                                whileHover={{ scale: 1.1, y: -2 }}
                                                whileTap={{ scale: 0.9 }}
                                                className={cn(
                                                    "px-4 py-3 md:px-6 md:py-4 rounded-2xl md:rounded-3xl text-sm md:text-lg font-black font-fredoka transition-all border-4 shadow-sm",
                                                    isSelected
                                                        ? 'bg-purple-500 text-white border-purple-400 shadow-clay-purple-sm'
                                                        : 'bg-white text-ink border-white hover:border-purple-100'
                                                )}
                                            >
                                                {isSelected && <Check className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2 inline" />}
                                                {word}
                                            </motion.button>
                                        );
                                    })}
                                </div>

                                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                    <button onClick={() => prevStep('setting')} className="ghost-btn h-14 md:h-16 px-8 flex items-center gap-2 text-ink/70 w-full sm:w-auto justify-center">
                                        <ChevronLeft /> Back
                                    </button>
                                    <motion.button
                                        onClick={handleCompleteStoryDraft}
                                        whileHover={{ scale: 1.05, y: -4 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="primary-btn h-14 md:h-16 px-12 text-xl font-black font-fredoka uppercase tracking-widest w-full sm:w-auto"
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

            {/* Hero Tip */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                className="mt-8 text-center"
            >
                <p className="text-sm font-bold text-ink-muted/50 uppercase tracking-[0.2em]">Guided Onboarding Experience</p>
            </motion.div>
        </div>
    );
}

function PlusIcon() {
    return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function MinusIcon() {
    return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 12H19" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
