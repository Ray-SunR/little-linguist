'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createChildProfile } from '@/app/actions/profiles';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/core";
import { useAuth } from '@/components/auth/auth-provider';
import HeroIdentityForm, { HeroIdentity } from './HeroIdentityForm';
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
        firstName: '',
        birthYear: new Date().getFullYear() - 6,
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
                first_name: formData.firstName,
                birth_year: formData.birthYear,
                gender: formData.gender,
                interests: formData.interests,
                avatar_asset_path: formData.avatar_asset_path
            });

            if (!result || result.error) {
                throw new Error(result?.error || 'Failed to create profile');
            }

            await refreshProfiles();
            router.push('/dashboard');
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
            <div className="bg-white/10 backdrop-blur-xl p-3 sm:p-4 rounded-[2.5rem] md:rounded-[3rem] border border-white/20 shadow-2xl relative overflow-hidden h-[540px] w-full flex flex-col">
                
                {/* Progress Bar */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-white/10">
                    <motion.div
                        className="h-full bg-gradient-to-r from-purple-400/60 to-pink-400/60 blur-[1px]"
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
                                        firstName: formData.firstName,
                                        birthYear: formData.birthYear,
                                        gender: formData.gender,
                                        avatarPreview: avatarPreview,
                                        avatarStoragePath: formData.avatar_asset_path
                                    }}
                                    onComplete={(data: HeroIdentity) => {
                                        setFormData(prev => ({
                                            ...prev,
                                            firstName: data.firstName,
                                            birthYear: data.birthYear,
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
                            <div className="w-full h-full flex flex-col space-y-4 relative z-10">
                                <div className="text-center space-y-1">
                                    <h2 className="text-xl md:text-2xl font-black text-white font-fredoka drop-shadow-lg">Magic Interests!</h2>
                                    <p className="text-white/80 font-bold font-nunito text-[10px] drop-shadow-md">What does <span className="text-purple-300 font-black drop-shadow-sm">{formData.firstName}</span> love most?</p>
                                </div>

                                <div className="relative group max-w-sm mx-auto w-full">
                                    <input
                                        type="text"
                                        placeholder="Add something else they love..."
                                        className="w-full h-10 px-4 pr-10 rounded-xl border-2 border-white/20 bg-white/10 focus:bg-white/20 focus:border-white/40 outline-none transition-all font-nunito font-bold text-white text-sm placeholder:text-white/30 shadow-inner backdrop-blur-md"
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
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-white/40 transition-colors">
                                        <kbd className="text-[8px] font-black border border-current px-1 rounded">ENTER</kbd>
                                    </div>
                                </div>

                                <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar space-y-4">
                                    {formData.interests.length > 0 && (
                                        <div className="flex flex-wrap gap-2 p-2 bg-white/5 backdrop-blur-md rounded-xl border-2 border-white/10 min-h-[44px]">
                                            {formData.interests.map(interest => (
                                                <motion.button
                                                    layout
                                                    initial={{ scale: 0.8, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    key={`selected-${interest}`}
                                                    onClick={() => toggleInterest(interest)}
                                                    className="px-2 py-0.5 bg-purple-500/60 backdrop-blur-md text-white rounded-full text-[10px] font-black shadow-xl flex items-center gap-1 group border border-purple-400/30"
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
                                                <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] px-1 drop-shadow-sm">{category}</h3>
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
                                                                    "px-3 py-1.5 rounded-xl text-xs font-bold font-nunito transition-all border-2 backdrop-blur-md shadow-lg",
                                                                    isSelected
                                                                        ? 'bg-purple-500/60 text-white border-purple-400/40'
                                                                        : 'bg-white/10 text-white/70 border-white/10 hover:border-white/30 hover:bg-white/20'
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

                                <div className="flex items-center justify-center gap-4 pt-2 border-t border-white/10 mt-auto">
                                    <button onClick={() => prevStep('identity')} className="h-12 px-8 flex items-center gap-2 text-white/70 hover:text-white transition-colors font-fredoka font-black uppercase tracking-wider text-sm">
                                        <ChevronLeft className="w-5 h-5" /> Back
                                    </button>
                                    <motion.button
                                        data-testid="onboarding-finish"
                                        onClick={handleFinish}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="bg-white/20 hover:bg-white/30 backdrop-blur-md border-2 border-white/30 text-white h-12 px-4 sm:px-10 text-base sm:text-lg font-black font-fredoka uppercase tracking-widest flex items-center justify-center gap-1 sm:gap-2 whitespace-nowrap rounded-xl shadow-xl transition-all"
                                    >
                                        Finish! ✨ <ChevronRight className="w-5 h-5" />
                                    </motion.button>
                                </div>
                                {error && <p className="text-rose-300 font-bold font-nunito text-center text-xs drop-shadow-md bg-rose-500/20 backdrop-blur-md p-2 rounded-lg border border-rose-500/30">{error}</p>}
                            </div>
                        )}

                        {step === 'saving' && (
                            <div className="w-full space-y-8 text-center flex flex-col items-center justify-center min-h-[50dvh] relative z-10">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-white/20 blur-3xl animate-pulse rounded-full" />
                                    <motion.div
                                        animate={{ rotate: [0, 5, -5, 0], y: [0, -10, 0] }}
                                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                        className="w-32 h-32 flex items-center justify-center p-4 bg-white/10 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border-2 border-white/20"
                                    >
                                        <CachedImage src="/logo.png" alt="Saving..." fill className="object-contain drop-shadow-lg" />
                                    </motion.div>
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                        className="absolute -inset-8 border-2 border-dashed border-white/10 rounded-[4rem] pointer-events-none"
                                    />
                                </div>
                                <div className="space-y-4">
                                    <h2 className="text-3xl font-black text-white font-fredoka drop-shadow-lg">Creating Your World...</h2>
                                    <p className="text-white/80 font-bold font-nunito drop-shadow-md">We&apos;re getting things ready for <span className="text-purple-300 font-black drop-shadow-sm">{formData.firstName}</span>.</p>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
