'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, ChevronRight, ChevronLeft, Sparkles, Plus, Minus, X } from 'lucide-react';
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

export type HeroIdentityStep = 'name' | 'age' | 'gender' | 'avatar';

interface HeroIdentityFormProps {
    initialData: HeroIdentity;
    onComplete: (data: HeroIdentity) => void;
    onBack?: () => void;
    onStepChange?: (step: HeroIdentityStep) => void;
    onFormDataChange?: (data: HeroIdentity) => void;
    initialStep?: HeroIdentityStep;
    mode: 'onboarding' | 'story';
    isInline?: boolean;
}

const HeroIdentityForm: React.FC<HeroIdentityFormProps> = ({ 
    initialData, 
    onComplete, 
    onBack,
    onStepChange,
    onFormDataChange,
    initialStep = 'name',
    mode,
    isInline = false
}) => {
    const [step, setStep] = useState<HeroIdentityStep>(initialStep);
    const [formData, setFormData] = useState<HeroIdentity>(initialData);

    const onFormDataChangeRef = useRef(onFormDataChange);
    useEffect(() => {
        onFormDataChangeRef.current = onFormDataChange;
    }, [onFormDataChange]);

    const handleFieldChange = useCallback((updates: Partial<HeroIdentity>) => {
        setFormData(prev => ({ ...prev, ...updates }));
    }, []);

    useEffect(() => {
        onFormDataChangeRef.current?.(formData);
    }, [formData]);

    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const objectUrlRef = useRef<string | null>(null);

    const onStepChangeRef = useRef(onStepChange);
    useEffect(() => {
        onStepChangeRef.current = onStepChange;
    }, [onStepChange]);

    useEffect(() => {
        if (!isInline) {
            onStepChangeRef.current?.(step);
        }
    }, [step, isInline]);

    useEffect(() => {
        return () => {
            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
            }
        };
    }, []);

    const age = new Date().getFullYear() - formData.birthYear;

    function nextStep(next: HeroIdentityStep): void {
        setError(null);
        setStep(next);
    }

    function prevStep(prev: HeroIdentityStep): void {
        setError(null);
        if (prev === 'name' && step === 'name') {
            onBack?.();
        } else {
            setStep(prev);
        }
    }

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const localUrl = URL.createObjectURL(file);
            if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = localUrl;
            
            setFormData(prev => ({ ...prev, avatarPreview: localUrl }));

            const result = await getAvatarUploadUrl(file.name);
            if (result.error || !result.data) throw new Error(result.error);

            const { signedUrl, path } = result.data;
            const response = await fetch(signedUrl, {
                method: 'PUT',
                body: file,
                headers: { 'Content-Type': file.type }
            });

            if (!response.ok) throw new Error('Failed to upload image to storage.');

            handleFieldChange({ avatarPreview: localUrl, avatarStoragePath: path });
        } catch (err: unknown) {
            console.error("Upload failed:", err);
            setError(err instanceof Error ? err.message : "Failed to upload image.");
            if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
            setFormData(prev => ({ ...prev, avatarPreview: undefined, avatarStoragePath: undefined }));
        } finally {
            setIsUploading(false);
        }
    };

    const renderAvatarField = () => (
        <div className="flex items-center justify-center">
            <label className={cn(
                "rounded-[2.5rem] border-4 border-dashed transition-all cursor-pointer relative overflow-hidden flex flex-col items-center justify-center group shadow-inner bg-white/30",
                isInline ? "w-48 h-48" : "w-36 h-36",
                formData.avatarPreview ? "border-emerald-200" : "border-purple-200 hover:bg-white/50 hover:border-purple-400"
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
                                handleFieldChange({ avatarPreview: undefined, avatarStoragePath: undefined });
                            }}
                            className="absolute top-2 right-2 w-8 h-8 bg-rose-500 text-white rounded-full shadow-lg flex items-center justify-center font-black text-lg border-2 border-white z-20"
                        >
                            <X className="w-5 h-5" />
                        </motion.button>
                    </div>
                ) : (
                    <div className="text-center p-6">
                        <motion.div
                            animate={{ y: [0, -5, 0] }}
                            transition={{ duration: 3, repeat: Infinity }}
                            className={cn(
                                "bg-white shadow-clay-purple-sm flex items-center justify-center mx-auto mb-4 border-2 border-purple-50",
                                isInline ? "w-20 h-20 rounded-[1.5rem]" : "w-16 h-16 rounded-[1.25rem]"
                            )}
                        >
                            {isUploading ? (
                                <motion.img
                                    src="/logo.png"
                                    className={isInline ? "h-10 w-10" : "h-8 w-8"}
                                    animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                />
                            ) : (
                                <Camera className={cn("text-purple-400", isInline ? "h-10 w-10" : "h-8 w-8")} />
                            )}
                        </motion.div>
                        <span className={cn("font-black text-purple-600 font-fredoka block", isInline ? "text-xl" : "text-lg")}>
                            {isUploading ? "Magic..." : "Pick Photo"}
                        </span>
                    </div>
                )}
                <input type="file" accept="image/*" className="hidden" disabled={isUploading} onChange={handleAvatarUpload} />
            </label>
        </div>
    );

    const renderNameField = () => (
        <div className={cn("w-full space-y-6 text-center", isInline ? "max-w-sm mx-auto" : "")}>
            {!isInline && (
                <div className="space-y-2">
                    <div className="w-16 h-16 bg-purple-100/50 rounded-[1.25rem] flex items-center justify-center mx-auto shadow-clay-purple-sm border-2 border-white">
                        <Sparkles className="w-8 h-8 text-purple-600" />
                    </div>
                    <h2 className="text-xl md:text-2xl font-black text-ink font-fredoka">Who is our Hero?</h2>
                    <p className="text-ink-muted font-bold font-nunito text-[10px] max-w-xs mx-auto">
                        {mode === 'story' ? "Let's name your hero!" : "Let's start by naming your child's profile."}
                    </p>
                </div>
            )}
            <div className="relative max-w-sm mx-auto">
                {isInline && <label className="text-xs font-black text-ink-muted uppercase tracking-widest font-fredoka block mb-2 text-left ml-2">Hero&apos;s Name</label>}
                <input
                    type="text"
                    autoFocus={!isInline}
                    value={formData.firstName}
                    onChange={(e) => handleFieldChange({ firstName: e.target.value })}
                    onKeyDown={(e) => !isInline && e.key === 'Enter' && formData.firstName && nextStep('age')}
                    className="w-full h-12 px-8 rounded-xl border-4 border-purple-50 bg-white/50 focus:bg-white focus:border-purple-200 outline-none transition-all font-fredoka text-xl font-black text-ink placeholder:text-slate-200 shadow-inner text-center"
                    placeholder="Leo, Mia, Sam..."
                />
            </div>
            {!isInline && (
                <div className="flex justify-center">
                    <motion.button
                        data-testid="identity-continue-name"
                        disabled={!formData.firstName}
                        onClick={() => nextStep('age')}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="primary-btn h-12 px-12 text-lg font-black font-fredoka uppercase tracking-widest disabled:opacity-50"
                    >
                        Continue
                    </motion.button>
                </div>
            )}
        </div>
    );

    const renderAgeField = () => (
        <div className={cn("w-full space-y-6 text-center", isInline ? "max-w-sm mx-auto" : "")}>
            {!isInline && (
                <div className="space-y-2">
                    <h2 className="text-xl md:text-2xl font-black text-ink font-fredoka px-4">How old is <span className="text-purple-600 font-black">{formData.firstName}</span>?</h2>
                    <p className="text-ink-muted font-bold font-nunito text-[10px]">We&apos;ll tailor the stories to their age.</p>
                </div>
            )}
            <div className="flex items-center justify-between p-3 rounded-[2.5rem] bg-purple-50/50 shadow-inner border-4 border-white mx-auto w-full max-w-[260px] md:max-w-xs">
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    type="button"
                    className="w-12 h-12 rounded-full bg-white shadow-clay-sm flex items-center justify-center text-2xl font-black text-purple-600 border-2 border-purple-100 disabled:opacity-50"
                    onClick={() => handleFieldChange({ birthYear: formData.birthYear + 1 })}
                    disabled={age <= 1}
                >
                    <Minus className="w-6 h-6" strokeWidth={4} />
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
                    onClick={() => handleFieldChange({ birthYear: formData.birthYear - 1 })}
                    disabled={age >= 15}
                >
                    <Plus className="w-6 h-6" strokeWidth={4} />
                </motion.button>
            </div>
            {!isInline && (
                <div className="flex items-center justify-center gap-4">
                    <button onClick={() => prevStep('name')} className="ghost-btn h-12 px-8 flex items-center gap-2 text-ink/70">
                        <ChevronLeft /> Back
                    </button>
                    <motion.button
                        data-testid="identity-continue-age"
                        onClick={() => nextStep('gender')}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="primary-btn h-12 px-12 text-lg font-black font-fredoka uppercase tracking-widest"
                    >
                        Yep! <ChevronRight className="ml-2 inline" />
                    </motion.button>
                </div>
            )}
        </div>
    );

    const renderGenderField = () => (
        <div className={cn("w-full space-y-6 text-center", isInline ? "max-w-sm mx-auto" : "")}>
            {!isInline && (
                <div className="space-y-2">
                    <h2 className="text-xl md:text-2xl font-black text-ink font-fredoka">Which hero are they?</h2>
                    <p className="text-ink-muted font-bold font-nunito text-[10px]">Choose an identity for <span className="text-purple-600 font-black">{formData.firstName}</span>.</p>
                </div>
            )}
            <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                <motion.button
                    data-testid="gender-button-boy"
                    whileHover={{ y: -4, scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    aria-label="Boy"
                    className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-[1.5rem] border-2 transition-all font-fredoka font-black text-base",
                        formData.gender === "boy" ? "bg-blue-500 text-white border-blue-400 shadow-clay-purple-sm" : "bg-white text-ink-muted border-white hover:border-blue-100 shadow-clay-sm"
                    )}
                    onClick={() => handleFieldChange({ gender: "boy" })}
                >
                    <span className="text-5xl mb-1" aria-hidden="true">👦</span>
                    Boy
                </motion.button>
                <motion.button
                    data-testid="gender-button-girl"
                    whileHover={{ y: -4, scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    aria-label="Girl"
                    className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-[1.5rem] border-2 transition-all font-fredoka font-black text-base",
                        formData.gender === "girl" ? "bg-pink-500 text-white border-pink-400 shadow-clay-pink-sm" : "bg-white text-ink-muted border-white hover:border-pink-100 shadow-clay-sm"
                    )}
                    onClick={() => handleFieldChange({ gender: "girl" })}
                >
                    <span className="text-5xl mb-1" aria-hidden="true">👧</span>
                    Girl
                </motion.button>
            </div>
            {!isInline && (
                <div className="flex items-center justify-center gap-4">
                    <button onClick={() => prevStep('age')} className="ghost-btn h-12 px-8 flex items-center gap-2 text-ink/70">
                        <ChevronLeft /> Back
                    </button>
                    <motion.button
                        data-testid="identity-continue-gender"
                        disabled={!formData.gender}
                        onClick={() => nextStep('avatar')}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="primary-btn h-12 px-12 text-lg font-black font-fredoka uppercase tracking-widest disabled:opacity-50"
                    >
                        Next <ChevronRight className="ml-2 inline" />
                    </motion.button>
                </div>
            )}
        </div>
    );

    if (isInline) {
        return (
            <div className="w-full space-y-8 flex flex-col items-center py-4 overflow-y-auto" data-testid="hero-identity-form" data-step="inline">
                {renderAvatarField()}
                {renderNameField()}
                {renderAgeField()}
                {renderGenderField()}
                {error && <div className="mt-2 text-rose-500 font-bold font-nunito text-center text-sm">{error}</div>}
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col" data-testid="hero-identity-form" data-step={step}>
            <AnimatePresence mode="wait">
                <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                    className="flex-grow flex flex-col items-center justify-center w-full overflow-hidden"
                >
                    {step === 'name' && renderNameField()}
                    {step === 'age' && renderAgeField()}
                    {step === 'gender' && renderGenderField()}
                    {step === 'avatar' && (
                        <div className="w-full space-y-4 text-center">
                            <div className="space-y-1">
                                <h2 className="text-xl md:text-2xl font-black text-ink font-fredoka">Strike a pose!</h2>
                                <p className="text-ink-muted font-bold font-nunito text-[10px]">Add a photo of <span className="text-purple-600 font-black">{formData.firstName}</span>.</p>
                            </div>
                            {renderAvatarField()}
                            <div className="flex items-center justify-center gap-2 sm:gap-4">
                                <button onClick={() => prevStep('gender')} className="ghost-btn h-12 px-4 sm:px-8 flex items-center gap-2 text-ink/70"><ChevronLeft /> Back</button>
                                <motion.button
                                    data-testid="identity-complete"
                                    onClick={() => onComplete(formData)}
                                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                    className="primary-btn h-12 px-4 sm:px-10 text-base sm:text-lg font-black font-fredoka uppercase tracking-widest flex items-center justify-center gap-1 sm:gap-2 whitespace-nowrap"
                                >
                                    {formData.avatarPreview ? "Stunning!" : "Skip"} <ChevronRight className="w-5 h-5" />
                                </motion.button>
                            </div>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
            {error && <div className="mt-2 text-rose-500 font-bold font-nunito text-center text-sm">{error}</div>}
        </div>
    );
};

export default HeroIdentityForm;
