'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Camera, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/core";
import { CachedImage } from '@/components/ui/cached-image';
import { getAvatarUploadUrl } from '@/app/actions/profiles';

export interface HeroIdentity {
    firstName: string;
    birthYear: number;
    gender: 'boy' | 'girl' | '';
    avatarPreview?: string;
    avatarStoragePath?: string;
}

type Step = 'name' | 'age' | 'gender' | 'avatar';

interface HeroIdentityFormProps {
    initialData: HeroIdentity;
    onComplete: (data: HeroIdentity) => void;
    onBack?: () => void;
    onStepChange?: (step: Step) => void;
    initialStep?: Step;
    mode: 'onboarding' | 'story';
}

export default function HeroIdentityForm({ 
    initialData, 
    onComplete, 
    onBack,
    onStepChange,
    initialStep = 'name',
    mode 
}: HeroIdentityFormProps) {
    const [step, setStep] = useState<Step>(initialStep);
    const [formData, setFormData] = useState<HeroIdentity>(initialData);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const objectUrlRef = useRef<string | null>(null);

    // Sync internal step with parent if provided
    useEffect(() => {
        onStepChange?.(step);
    }, [step, onStepChange]);

    // Clean up Object URL on unmount or when preview changes
    useEffect(() => {
        const currentUrl = objectUrlRef.current;
        return () => {
            if (currentUrl) {
                URL.revokeObjectURL(currentUrl);
            }
        };
    }, []);

    const age = new Date().getFullYear() - formData.birthYear;

    function nextStep(next: Step): void {
        setError(null);
        setStep(next);
    }

    function prevStep(prev: Step): void {
        setError(null);
        if (prev === 'name' && step === 'name') {
            onBack?.();
        } else {
            setStep(prev);
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

    return (
        <div className="w-full h-full flex flex-col">
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
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                    onKeyDown={(e) => e.key === 'Enter' && formData.firstName && nextStep('age')}
                                    className="w-full h-12 px-8 rounded-xl border-4 border-purple-50 bg-white/50 focus:bg-white focus:border-purple-200 outline-none transition-all font-fredoka text-xl font-black text-ink placeholder:text-slate-200 shadow-inner text-center"
                                    placeholder="Leo, Mia, Sam..."
                                />
                            </div>

                            <div className="flex justify-center">
                                <motion.button
                                    disabled={!formData.firstName}
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
                                <h2 className="text-xl md:text-2xl font-black text-ink font-fredoka px-4">How old is <span className="text-purple-600 font-black">{formData.firstName}</span>?</h2>
                                <p className="text-ink-muted font-bold font-nunito text-[10px]">We&apos;ll tailor the stories to their age.</p>
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-[2.5rem] bg-purple-50/50 shadow-inner border-4 border-white mx-auto max-w-[260px] md:max-w-xs">
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    type="button"
                                    className="w-12 h-12 rounded-full bg-white shadow-clay-sm flex items-center justify-center text-2xl font-black text-purple-600 border-2 border-purple-100 disabled:opacity-50"
                                    onClick={() => setFormData({ ...formData, birthYear: formData.birthYear + 1 })}
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
                                    onClick={() => setFormData({ ...formData, birthYear: formData.birthYear - 1 })}
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
                                <p className="text-ink-muted font-bold font-nunito text-[10px]">Choose an identity for <span className="text-purple-600 font-black">{formData.firstName}</span>.</p>
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
                                <p className="text-ink-muted font-bold font-nunito text-[10px]">Add a photo of <span className="text-purple-600 font-black">{formData.firstName}</span> or use a fun image.</p>
                            </div>

                            <div className="flex items-center justify-center">
                                <label className={cn(
                                    "w-36 h-36 rounded-[2rem] border-4 border-dashed transition-all cursor-pointer relative overflow-hidden flex flex-col items-center justify-center group shadow-inner bg-white/30",
                                    formData.avatarPreview
                                        ? "border-emerald-200"
                                        : "border-purple-200 hover:bg-white/50 hover:border-purple-400"
                                )}>
                                    {formData.avatarPreview ? (
                                        <div className="relative w-full h-full p-3">
                                            <CachedImage
                                                src={formData.avatarPreview}
                                                storagePath={formData.avatarStoragePath}
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
                                                    setFormData({ ...formData, avatarPreview: undefined, avatarStoragePath: undefined });
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
                                                setFormData({ ...formData, avatarPreview: localUrl });

                                                const result = await getAvatarUploadUrl(file.name);
                                                if (result.error || !result.data) throw new Error(result.error);

                                                const { signedUrl, path } = result.data;
                                                const response = await fetch(signedUrl, {
                                                    method: 'PUT',
                                                    body: file,
                                                    headers: { 'Content-Type': file.type }
                                                });

                                                if (!response.ok) throw new Error('Failed to upload image to storage.');

                                                setFormData(prev => ({ ...prev, avatarStoragePath: path }));
                                            } catch (err: unknown) {
                                                console.error("Upload failed:", err);
                                                const message = err instanceof Error ? err.message : "Failed to upload image.";
                                                setError(message);
                                                if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
                                                objectUrlRef.current = null;
                                                setFormData(prev => ({ ...prev, avatarPreview: undefined, avatarStoragePath: undefined }));
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
                                    onClick={() => onComplete(formData)}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="primary-btn h-12 px-4 sm:px-10 text-base sm:text-lg font-black font-fredoka uppercase tracking-widest flex items-center justify-center gap-1 sm:gap-2 whitespace-nowrap"
                                >
                                    {formData.avatarPreview ? "Stunning!" : "Skip"} <ChevronRight className="w-5 h-5" />
                                </motion.button>
                            </div>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
            {error && (
                <div className="mt-2 text-rose-500 font-bold font-nunito text-center text-sm">
                    {error}
                </div>
            )}
        </div>
    );
}

function PlusIcon() {
    return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function MinusIcon() {
    return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 12H19" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
