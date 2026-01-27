'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createChildProfile } from '@/app/actions/profiles';
import { ChevronRight, ChevronLeft, Check, Star, Search, Shield, Crown, Rocket, PawPrint, Microscope, Leaf, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/core";
import { useAuth } from '@/components/auth/auth-provider';
import HeroIdentityForm, { HeroIdentity } from './HeroIdentityForm';
import { CachedImage } from '@/components/ui/cached-image';

type OnboardingStep = 'identity' | 'interests' | 'saving';

const POPULAR_PICKS = [
    { name: "Magic", icon: Sparkles, color: "text-amber-500" },
    { name: "Superhero", icon: Shield, color: "text-rose-500" },
    { name: "Princess", icon: Crown, color: "text-pink-500" },
    { name: "Space", icon: Rocket, color: "text-purple-500" },
    { name: "Animals", icon: PawPrint, color: "text-emerald-500" },
    { name: "Science", icon: Microscope, color: "text-indigo-500" },
    { name: "Nature", icon: Leaf, color: "text-green-500" },
];

const ShootingStar = ({ 
    startX, 
    startY, 
    endX, 
    endY, 
    onComplete 
}: { 
    startX: number; 
    startY: number; 
    endX: number; 
    endY: number; 
    onComplete: () => void 
}) => {
    const angle = Math.atan2(endY - startY, endX - startX) * (180 / Math.PI);
    
    return (
        <motion.div
            initial={{ x: startX, y: startY, opacity: 1, scale: 1 }}
            animate={{ 
                x: endX, 
                y: endY, 
                opacity: 0, 
                scale: 0.5,
            }}
            transition={{ 
                duration: 0.6, 
                ease: [0.23, 1, 0.32, 1] 
            }}
            onAnimationComplete={onComplete}
            className="fixed top-0 left-0 pointer-events-none z-[100] -translate-x-1/2 -translate-y-1/2"
        >
            <div className="relative flex items-center">
                <div className="absolute inset-0 w-4 h-4 -translate-x-1/2 -translate-y-1/2 bg-purple-400 blur-md rounded-full" />
                <div className="w-2 h-2 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,1)] relative z-10" />
                <motion.div 
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: [0, 60, 0], opacity: [0, 1, 0] }}
                    transition={{ duration: 0.6 }}
                    className="absolute right-full h-[2px] bg-gradient-to-l from-white via-purple-300 to-transparent origin-right"
                    style={{
                        rotate: `${angle}deg`,
                    }}
                />
            </div>
        </motion.div>
    );
};

const WarpStar = ({ id }: { id: number }) => {
    const angle = Math.random() * Math.PI * 2;
    const distance = 400 + Math.random() * 800;
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;

    return (
        <motion.div
            initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
            animate={{ 
                x, 
                y, 
                scale: [0, 1, 4], 
                opacity: [0, 1, 0] 
            }}
            transition={{ 
                duration: 0.5 + Math.random() * 0.5, 
                repeat: Infinity,
                delay: Math.random() * 0.5,
                ease: "easeIn"
            }}
            className="absolute top-1/2 left-1/2 w-1 h-1 bg-white rounded-full shadow-[0_0_12px_white] z-[200]"
        />
    );
};

interface OnboardingWizardProps {
    onFinishing?: (finishing: boolean) => void;
}

export default function OnboardingWizard({ onFinishing }: OnboardingWizardProps) {
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
    const [stars, setStars] = useState<{ id: number; startX: number; startY: number; endX: number; endY: number }[]>([]);
    const [isFinishing, setIsFinishing] = useState(false);

    React.useEffect(() => {
        onFinishing?.(isFinishing);
    }, [isFinishing, onFinishing]);

    const targetRef = useRef<HTMLDivElement>(null);

    const nextStep = (next: OnboardingStep) => {
        setError(null);
        setStep(next);
    };

    const prevStep = (prev: OnboardingStep) => {
        setError(null);
        setStep(prev);
    };

    const toggleInterest = (interest: string, e?: React.MouseEvent) => {
        const isSelecting = !formData.interests.includes(interest);
        
        if (isSelecting && e && targetRef.current) {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const targetRect = targetRef.current.getBoundingClientRect();
            
            const newStar = {
                id: performance.now(),
                startX: rect.left + rect.width / 2,
                startY: rect.top + rect.height / 2,
                endX: targetRect.left + targetRect.width / 2,
                endY: targetRect.top + targetRect.height / 2,
            };
            
            setStars(prev => [...prev, newStar]);
        }

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

        setIsFinishing(true);
        onFinishing?.(true);

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
            
            setTimeout(() => {
                router.push('/dashboard');
            }, 1500);
        } catch (err: any) {
            console.error('[OnboardingWizard] Error in handleFinish:', err);
            setIsFinishing(false);
            onFinishing?.(false);
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
        <div 
            className="w-full max-w-2xl mx-auto px-1 sm:px-0 flex items-center justify-center h-full"
            data-test-status="ready"
        >
            <AnimatePresence>
                {isFinishing && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        data-testid="hyper-drive-overlay"
                        className="fixed inset-0 z-[300] bg-[#8B4BFF] flex items-center justify-center overflow-hidden"
                    >
                        {Array.from({ length: 50 }).map((_, i) => (
                            <WarpStar key={i} id={i} />
                        ))}
                        
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ 
                                opacity: [0, 1, 0], 
                                scale: [0.5, 2, 4] 
                            }}
                            transition={{ duration: 1, delay: 0.2 }}
                            className="absolute inset-0 bg-white blur-3xl rounded-full"
                        />

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="relative z-[210] text-center"
                        >
                            <h2 className="text-4xl md:text-6xl font-black text-white font-fredoka tracking-tighter drop-shadow-xl">
                                INITIATING HYPER-DRIVE...
                            </h2>
                            <p className="text-white font-black font-nunito mt-4 text-xl drop-shadow-md">
                                Launching your adventure...
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="bg-white p-4 sm:p-6 rounded-[3rem] border-4 border-purple-50 shadow-clay-lg relative overflow-hidden h-[540px] w-full flex flex-col transition-colors duration-500">
                
                <div className="absolute -top-24 -left-24 w-64 h-64 bg-purple-100/30 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-amber-100/30 rounded-full blur-3xl pointer-events-none" />

                <div className="absolute top-0 left-0 w-full h-1.5 bg-purple-50">
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
                            <div className="w-full h-full flex flex-col items-center relative z-10">
                                <div className="fixed inset-0 pointer-events-none z-[5]">
                                    {stars.map(star => (
                                        <ShootingStar
                                            key={star.id}
                                            {...star}
                                            onComplete={() => setStars(prev => prev.filter(s => s.id !== star.id))}
                                        />
                                    ))}
                                </div>

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

                                <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar w-full text-center">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 block mb-4">
                                        Popular Picks
                                    </label>
                                    <div className="flex flex-wrap justify-center gap-2 sm:gap-3 pb-8">
                                        {POPULAR_PICKS.map((pick) => {
                                            const isSelected = formData.interests.includes(pick.name);
                                            return (
                                                <motion.button
                                                    key={pick.name}
                                                    type="button"
                                                    onClick={(e) => toggleInterest(pick.name, e)}
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

                                        {formData.interests.filter(i => !POPULAR_PICKS.some(p => p.name === i)).map(interest => (
                                            <motion.button
                                                key={interest}
                                                type="button"
                                                onClick={(e) => toggleInterest(interest, e)}
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

                                <div className="flex items-center justify-center gap-4 pt-4 pb-6 sm:pb-0 border-t border-purple-50 w-full mt-auto">
                                    <button onClick={() => prevStep('identity')} className="h-12 px-8 flex items-center gap-2 text-ink/60 font-bold hover:text-ink transition-colors text-sm sm:text-base">
                                        <ChevronLeft className="w-5 h-5" /> Back
                                    </button>
                                    <motion.button
                                        data-testid="onboarding-finish"
                                        onClick={handleFinish}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="h-12 px-6 sm:px-10 rounded-full bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 text-white text-base sm:text-lg font-black font-fredoka uppercase tracking-widest flex items-center justify-center gap-2 shadow-clay-blue transition-all whitespace-nowrap"
                                    >
                                        Finish! ✨ <ChevronRight className="w-5 h-5" />
                                    </motion.button>
                                </div>
                                {error && <p className="text-rose-500 font-bold font-nunito text-center text-xs bg-rose-50 p-2 rounded-lg border border-rose-100">{error}</p>}
                            </div>
                        )}

                        {step === 'saving' && (
                            <div className="w-full space-y-8 text-center flex flex-col items-center justify-center min-h-[50dvh] relative z-10">
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
                                        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                        className="absolute -inset-8 border-2 border-dashed border-purple-200/30 rounded-[4rem] pointer-events-none"
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
