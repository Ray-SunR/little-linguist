'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createChildProfile } from '@/app/actions/profiles';
import { ChevronRight, ChevronLeft, Check, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/core";
import { useAuth } from '@/components/auth/auth-provider';
import HeroIdentityForm, { HeroIdentity } from './HeroIdentityForm';
import { CachedImage } from '@/components/ui/cached-image';

type OnboardingStep = 'identity' | 'interests' | 'saving';

const SUGGESTED_INTERESTS = {
    "Themes 🎭": ["Adventure", "Friendship", "Magic"],
    "Topics 🦖": ["Nature", "Animals", "Science"],
    "Characters 🦸": ["Princesses", "Superheroes", "Fairies"],
    "Activities 🚀": ["Sports", "Building", "Exploration"]
};

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
    // Calculate angle for the trail
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
                {/* Glow */}
                <div className="absolute inset-0 w-4 h-4 -translate-x-1/2 -translate-y-1/2 bg-purple-400 blur-md rounded-full" />
                {/* Star Head */}
                <div className="w-2 h-2 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,1)] relative z-10" />
                {/* Star Trail */}
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

        // Signal finishing state early to block parent redirects
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

            // Refresh profiles in the background
            await refreshProfiles();
            
            // Wait for hyper-drive transition animation
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
            {/* Hyper-drive Overlay (Moved outside for true full-screen) */}
            <AnimatePresence>
                {isFinishing && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        data-testid="hyper-drive-overlay"
                        className="fixed inset-0 z-[300] bg-[#8B4BFF] flex items-center justify-center overflow-hidden"
                    >
                        {/* Starfield */}
                        {Array.from({ length: 50 }).map((_, i) => (
                            <WarpStar key={i} id={i} />
                        ))}
                        
                        {/* Flash effect */}
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

            <div className="clay-card p-3 sm:p-4 rounded-[2.5rem] md:rounded-[3rem] border-4 border-white shadow-clay-lg relative overflow-hidden h-[540px] w-full flex flex-col">
                
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
                                {/* Shooting Stars Container */}
                                <div className="fixed inset-0 pointer-events-none z-[5]">
                                    {stars.map(star => (
                                        <ShootingStar
                                            key={star.id}
                                            {...star}
                                            onComplete={() => setStars(prev => prev.filter(s => s.id !== star.id))}
                                        />
                                    ))}
                                </div>

                                <div className="flex items-center justify-between gap-4 px-2">
                                    <div className="space-y-1">
                                        <h2 className="text-xl md:text-2xl font-black text-ink font-fredoka">Magic Interests!</h2>
                                        <p className="text-ink-muted font-bold font-nunito text-xs">What does <span className="text-purple-600 font-black">{formData.firstName}</span> love most?</p>
                                    </div>
                                    
                                    {/* Avatar Target */}
                                    <div ref={targetRef} className="relative group">
                                        <motion.div 
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white/50 backdrop-blur-xl border-2 border-purple-100 overflow-hidden shadow-clay-sm relative z-10"
                                        >
                                            {avatarPreview ? (
                                                <Image 
                                                    src={avatarPreview} 
                                                    alt="Avatar" 
                                                    className="w-full h-full object-cover" 
                                                    width={64}
                                                    height={64}
                                                    unoptimized
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100">
                                                    <Star className="w-8 h-8 text-purple-300" />
                                                </div>
                                            )}
                                        </motion.div>
                                        {/* Decorative rings */}
                                        <div className="absolute -inset-2 border border-purple-200/20 rounded-[1.5rem] animate-[spin_10s_linear_infinite] opacity-50" />
                                        <div className="absolute -inset-4 border border-purple-200/10 rounded-[2rem] animate-[spin_15s_linear_reverse_infinite] opacity-30" />
                                    </div>
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

                                <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar space-y-6">
                                    {formData.interests.length > 0 && (
                                        <div className="flex flex-wrap gap-2 p-3 bg-purple-50/50 rounded-2xl border-2 border-white min-h-[52px] shadow-inner">
                                            <AnimatePresence>
                                                {formData.interests.map(interest => (
                                                    <motion.button
                                                        layout
                                                        initial={{ scale: 0, opacity: 0 }}
                                                        animate={{ scale: 1, opacity: 1 }}
                                                        exit={{ scale: 0, opacity: 0 }}
                                                        key={`selected-${interest}`}
                                                        onClick={() => toggleInterest(interest)}
                                                        className="px-3 py-1 bg-purple-500 text-white rounded-full text-[11px] font-black shadow-clay-purple-sm flex items-center gap-1.5 group border-2 border-white/20 hover:scale-105 transition-transform"
                                                    >
                                                        {interest}
                                                        <span className="opacity-60 group-hover:opacity-100 transition-opacity text-sm">×</span>
                                                    </motion.button>
                                                ))}
                                            </AnimatePresence>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-6 gap-4 pb-4">
                                        {Object.entries(SUGGESTED_INTERESTS).map(([category, items], idx) => {
                                            const gridSpans = [
                                                "col-span-6 md:col-span-3", // Themes
                                                "col-span-6 md:col-span-3", // Topics
                                                "col-span-6 md:col-span-2", // Characters
                                                "col-span-6 md:col-span-4"  // Activities
                                            ][idx];

                                            return (
                                                <motion.div 
                                                    key={category} 
                                                    className={cn(
                                                        "clay-card bg-white/50 p-4 rounded-[2rem] space-y-3 shadow-clay-sm relative overflow-hidden group/island",
                                                        gridSpans
                                                    )}
                                                    animate={{ y: [0, -6, 0] }}
                                                    transition={{
                                                        duration: 4 + idx,
                                                        repeat: Infinity,
                                                        delay: idx * 0.7,
                                                        ease: "easeInOut"
                                                    }}
                                                >
                                                    {/* Island Glow */}
                                                    <div className="absolute -top-10 -right-10 w-24 h-24 bg-purple-500/5 blur-2xl rounded-full group-hover/island:bg-purple-500/10 transition-colors" />
                                                    
                                                    <h3 className="text-[10px] font-black text-ink-muted/40 uppercase tracking-[0.2em] px-1">
                                                        {category}
                                                    </h3>
                                                    <div className="flex flex-wrap gap-2">
                                                        {items.map(interest => {
                                                            const isSelected = formData.interests.includes(interest);
                                                            return (
                                                                <motion.button
                                                                    key={`suggested-${interest}`}
                                                                    type="button"
                                                                    onClick={(e) => toggleInterest(interest, e)}
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
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="flex items-center justify-center gap-4 pt-2 border-t border-purple-100 mt-auto">
                                    <button onClick={() => prevStep('identity')} className="ghost-btn h-12 px-8 flex items-center gap-2 text-ink/70">
                                        <ChevronLeft className="w-5 h-5" /> Back
                                    </button>
                                    <motion.button
                                        data-testid="onboarding-finish"
                                        onClick={handleFinish}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="primary-btn h-12 px-4 sm:px-10 text-base sm:text-lg font-black font-fredoka uppercase tracking-widest flex items-center justify-center gap-1 sm:gap-2 whitespace-nowrap"
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
