'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createChildProfile } from '@/app/actions/profiles';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/core";
import { useAuth } from '@/components/auth/auth-provider';
import HeroIdentityForm from './HeroIdentityForm';
import { CachedImage } from '@/components/ui/cached-image';

type OnboardingStep = 'identity' | 'interests' | 'saving';

const SUGGESTED_INTERESTS = {
    "Themes 🎭": ["Adventure", "Friendship", "Magic", "Mystery", "Kindness", "Courage"],
    "Topics 🦖": ["Nature", "Animals", "Science", "Pets", "Space", "Dinosaurs", "Transport"],
    "Characters 🦸": ["Princesses", "Superheroes", "Fairies", "Knights"],
    "Activities 🚀": ["Sports", "Building", "Exploration"]
};

export default function OnboardingWizard() {
    const router = useRouter();
    const { refreshProfiles } = useAuth();
    const [step, setStep] = useState<OnboardingStep>('identity');
    const [formData, setFormData] = useState({
        first_name: '',
        birth_year: new Date().getFullYear() - 6,
        gender: '' as 'boy' | 'girl' | '',
        interests: [] as string[],
        avatar_asset_path: ''
    });
    const [avatarPreview, setAvatarPreview] = useState<string | undefined>();
    const [error, setError] = useState<string | null>(null);

    const nextStep = (next: OnboardingStep) => {
        setError(null);
        setStep(next);
    };

    const prevStep = (prev: OnboardingStep) => {
        setError(null);
        setStep(prev);
    };

    const toggleInterest = (interest: string) => {
        setFormData(prev => ({
            ...prev,
            interests: prev.interests.includes(interest)
                ? prev.interests.filter(i => i !== interest)
                : [...prev.interests, interest]
        }));
    };

    const handleFinish = async () => {
        if (formData.interests.length === 0) {
            setError("Please pick at least one thing they love!");
            return;
        }

        setStep('saving');
        setError(null);

        try {
            const result = await createChildProfile({
                first_name: formData.first_name,
                birth_year: formData.birth_year,
                gender: formData.gender,
                interests: formData.interests,
                avatar_asset_path: formData.avatar_asset_path
            });

            if (!result || result.error) {
                throw new Error(result?.error || 'Failed to create profile');
            }

            await refreshProfiles();
            router.push('/library');
        } catch (err: any) {
            setError(err.message || 'Something went wrong');
            setStep('interests');
        }
    };

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
        const stepOrder: OnboardingStep[] = ['identity', 'interests', 'saving'];
        const currentIndex = stepOrder.indexOf(step);
        return `${((currentIndex + 1) / stepOrder.length) * 100}%`;
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
                        {step === 'identity' && (
                            <HeroIdentityForm
                                initialData={{
                                    firstName: formData.first_name,
                                    birthYear: formData.birth_year,
                                    gender: formData.gender,
                                    avatarPreview: avatarPreview,
                                    avatarStoragePath: formData.avatar_asset_path
                                }}
                                onComplete={(data) => {
                                    setFormData(prev => ({
                                        ...prev,
                                        first_name: data.firstName,
                                        birth_year: data.birthYear,
                                        gender: data.gender,
                                        avatar_asset_path: data.avatarStoragePath || ''
                                    }));
                                    setAvatarPreview(data.avatarPreview);
                                    nextStep('interests');
                                }}
                                mode="onboarding"
                            />
                        )}

                        {step === 'interests' && (
                            <div className="w-full h-full flex flex-col space-y-4">
                                <div className="text-center space-y-1">
                                    <h2 className="text-xl md:text-2xl font-black text-ink font-fredoka">Magic Interests!</h2>
                                    <p className="text-ink-muted font-bold font-nunito text-[10px]">Optional: What does <span className="text-purple-600 font-black">{formData.first_name}</span> love most?</p>
                                </div>

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

                                <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar space-y-4">
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
                                    <button onClick={() => prevStep('identity')} className="ghost-btn h-12 px-8 flex items-center gap-2 text-ink/70">
                                        <ChevronLeft className="w-5 h-5" /> Back
                                    </button>
                                    <motion.button
                                        onClick={handleFinish}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="primary-btn h-12 px-4 sm:px-10 text-base sm:text-lg font-black font-fredoka uppercase tracking-widest flex items-center justify-center gap-1 sm:gap-2 whitespace-nowrap"
                                    >
                                        Finish! ✨ <ChevronRight className="w-5 h-5" />
                                    </motion.button>
                                </div>
                                {error && <p className="text-rose-500 font-bold font-nunito text-center text-xs">{error}</p>}
                            </div>
                        )}

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
