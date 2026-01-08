'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createChildProfile, updateChildProfile } from '@/app/actions/profiles';
import { Loader2, User, Camera, Sparkles, Check, ChevronRight, Wand2, Plus, Minus } from 'lucide-react';
import type { ChildProfilePayload } from '@/app/actions/profiles';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/core";
import { compressImage } from "@/lib/core/utils/image";
import { CachedImage } from '@/components/ui/cached-image';
import { useAuth } from '@/components/auth/auth-provider';

interface Props {
    initialData?: ChildProfilePayload & { id?: string };
    onSuccess?: () => void;
    isFirstTime?: boolean;
}

const INTEREST_OPTIONS = [
    'Adventures', 'Princess', 'Nature', 'Animal',
    'Science', 'Fantasy', 'History', 'Space',
    'Vehicles', 'Dinosaurs', 'Sports', 'Music'
];

export default function ChildProfileForm({ initialData, onSuccess, isFirstTime }: Props) {
    const router = useRouter();
    const { refreshProfiles } = useAuth();
    const [formData, setFormData] = useState<ChildProfilePayload>({
        first_name: initialData?.first_name || '',
        last_name: initialData?.last_name || '',
        birth_year: initialData?.birth_year || new Date().getFullYear() - 6,
        gender: initialData?.gender || 'boy',
        interests: initialData?.interests || [],
        avatar_asset_path: initialData?.avatar_asset_path || ''
    });

    // Local state for avatar preview (mirrors story-maker behavior)
    const [avatarPreview, setAvatarPreview] = useState<string | undefined>(initialData?.avatar_asset_path);
    const [isUploading, setIsUploading] = useState(false);
    const [errors, setErrors] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const age = new Date().getFullYear() - (formData.birth_year || new Date().getFullYear());

    const toggleInterest = (interest: string) => {
        setFormData(prev => ({
            ...prev,
            interests: prev.interests.includes(interest)
                ? prev.interests.filter(i => i !== interest)
                : [...prev.interests, interest]
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors(null);
        if (!formData.first_name.trim()) {
            setErrors("Please enter a name for your child.");
            return;
        }

        setLoading(true);

        try {
            const payload = { ...formData, avatar_asset_path: avatarPreview || '' };
            if (initialData?.id) {
                const result = await updateChildProfile(initialData.id, payload);
                if (!result) throw new Error('No response from server. Please try again.');
                if (result.error) throw new Error(result.error);
            } else {
                const result = await createChildProfile(payload);
                if (!result) throw new Error('No response from server. Please try again.');
                if (result.error) throw new Error(result.error);
            }

            await refreshProfiles();

            if (isFirstTime) {
                router.push('/dashboard');
            }

            if (onSuccess) onSuccess();

        } catch (err: any) {
            setErrors(err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative">
            <div className="clay-card bg-white/70 backdrop-blur-xl p-8 md:p-12 rounded-[3rem] border-4 border-white shadow-2xl relative overflow-hidden">

                {/* Decorative Top Gradient Line */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 opacity-50" />

                <form onSubmit={handleSubmit} className="space-y-10 relative z-10">

                    <div className="grid md:grid-cols-2 gap-10">
                        <div className="space-y-8">
                            {/* Name Field */}
                            <div>
                                <label className="mb-3 block text-xs font-black text-ink-muted uppercase tracking-widest font-fredoka">Hero's Name</label>
                                <input
                                    type="text"
                                    value={formData.first_name}
                                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                    className="w-full h-16 px-6 rounded-[1.5rem] border-4 border-purple-50 bg-white/50 focus:bg-white focus:border-purple-300 outline-none transition-all font-fredoka text-xl font-bold text-ink placeholder:text-slate-300 shadow-inner"
                                    placeholder="e.g., Leo, Mia"
                                    required
                                />
                            </div>

                            {/* Age Explorer (Plus/Minus Counter) */}
                            <div>
                                <label className="mb-4 block text-xs font-black text-ink-muted uppercase tracking-widest font-fredoka">Age Explorer</label>
                                <div className="flex items-center justify-between p-2 rounded-[2rem] bg-purple-50 shadow-inner border-2 border-white/50">
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        type="button"
                                        className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center text-2xl font-black text-purple-600 border-2 border-purple-100 disabled:opacity-50"
                                        onClick={() => setFormData({ ...formData, birth_year: formData.birth_year ? formData.birth_year + 1 : new Date().getFullYear() - 5 })}
                                        disabled={age <= 1}
                                    >
                                        −
                                    </motion.button>
                                    <div className="flex flex-col items-center">
                                        <span className="text-3xl font-black text-purple-600 font-fredoka">{age}</span>
                                        <span className="text-[10px] font-black text-purple-400 uppercase tracking-tighter">years old</span>
                                    </div>
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        type="button"
                                        className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center text-2xl font-black text-purple-600 border-2 border-purple-100 disabled:opacity-50"
                                        onClick={() => setFormData({ ...formData, birth_year: formData.birth_year ? formData.birth_year - 1 : new Date().getFullYear() - 7 })}
                                        disabled={age >= 15}
                                    >
                                        +
                                    </motion.button>
                                </div>
                            </div>

                            {/* Gender Choice (Horizontal Buttons) */}
                            <div>
                                <label className="mb-3 block text-xs font-black text-ink-muted uppercase tracking-widest font-fredoka">Identity Choice</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <motion.button
                                        whileHover={{ y: -2 }}
                                        whileTap={{ scale: 0.95 }}
                                        type="button"
                                        className={cn(
                                            "flex items-center justify-center gap-3 p-4 rounded-2xl border-4 transition-all font-fredoka font-bold text-lg",
                                            formData.gender === "boy"
                                                ? "bg-blue-500 text-white border-blue-400 shadow-clay-purple"
                                                : "bg-white text-ink-muted border-slate-50 hover:border-blue-100 shadow-sm"
                                        )}
                                        onClick={() => setFormData({ ...formData, gender: "boy" })}
                                    >
                                        <span className="text-2xl">👦</span>
                                        Boy
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ y: -2 }}
                                        whileTap={{ scale: 0.95 }}
                                        type="button"
                                        className={cn(
                                            "flex items-center justify-center gap-3 p-4 rounded-2xl border-4 transition-all font-fredoka font-bold text-lg",
                                            formData.gender === "girl"
                                                ? "bg-pink-500 text-white border-pink-400 shadow-clay-pink"
                                                : "bg-white text-ink-muted border-slate-50 hover:border-pink-100 shadow-sm"
                                        )}
                                        onClick={() => setFormData({ ...formData, gender: "girl" })}
                                    >
                                        <span className="text-2xl">👧</span>
                                        Girl
                                    </motion.button>
                                </div>
                            </div>
                        </div>

                        {/* Hero Photo Section (Aspect Square Upload) */}
                        <div className="flex items-center justify-center">
                            <label className={cn(
                                "w-full aspect-square rounded-[2.5rem] border-4 border-dashed transition-all cursor-pointer relative overflow-hidden flex flex-col items-center justify-center group",
                                avatarPreview
                                    ? "border-emerald-200 bg-emerald-50/30"
                                    : "border-purple-200 bg-purple-50/30 hover:bg-purple-50 hover:border-purple-300"
                            )}>
                                {avatarPreview ? (
                                    <div className="relative w-full h-full p-4">
                                        <CachedImage
                                            src={avatarPreview}
                                            storagePath={avatarPreview.startsWith('data:') ? undefined : avatarPreview}
                                            alt="Preview"
                                            fill
                                            className="w-full h-full object-cover rounded-[2rem] shadow-clay ring-4 ring-white"
                                        />
                                        <motion.button
                                            whileHover={{ scale: 1.1, rotate: 90 }}
                                            whileTap={{ scale: 0.9 }}
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setAvatarPreview(undefined);
                                            }}
                                            className="absolute top-6 right-6 w-10 h-10 bg-rose-500 text-white rounded-full shadow-lg flex items-center justify-center font-black text-xl border-2 border-white"
                                        >
                                            ×
                                        </motion.button>
                                    </div>
                                ) : (
                                    <div className="text-center p-8">
                                        <motion.div
                                            animate={{ y: [0, -5, 0] }}
                                            transition={{ duration: 3, repeat: Infinity }}
                                            className="w-20 h-20 rounded-[1.5rem] bg-white shadow-clay flex items-center justify-center mx-auto mb-6 border-2 border-purple-100"
                                        >
                                            {isUploading ? (
                                                <Loader2 className="h-10 w-10 text-purple-400 animate-spin" />
                                            ) : (
                                                <Camera className="h-10 w-10 text-purple-400" />
                                            )}
                                        </motion.div>
                                        <span className="text-lg font-black text-purple-600 font-fredoka block mb-1">
                                            {isUploading ? "Magical Pixels..." : "Hero Photo"}
                                        </span>
                                        <p className="text-xs font-medium text-purple-400 font-nunito">Tap to upload your picture!</p>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    disabled={isUploading}
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setIsUploading(true);
                                            try {
                                                const compressed = await compressImage(file);
                                                setAvatarPreview(compressed);
                                            } catch (err) {
                                                console.error("Compression failed:", err);
                                                setErrors("Failed to process image.");
                                            } finally {
                                                setIsUploading(false);
                                            }
                                        }
                                    }}
                                />
                            </label>
                        </div>
                    </div>

                    {/* --- Interests (Pick at least 1) --- */}
                    <div>
                        <label className="block text-xs font-black text-ink-muted uppercase tracking-widest font-fredoka mb-4">
                            What do they love? <span className="text-gray-400 font-normal normal-case ml-1">(Pick at least 1)</span>
                        </label>
                        <div className="flex flex-wrap gap-4">
                            {INTEREST_OPTIONS.map(interest => {
                                const isSelected = formData.interests.includes(interest);
                                return (
                                    <motion.button
                                        key={interest}
                                        type="button"
                                        onClick={() => toggleInterest(interest)}
                                        whileHover={{ scale: 1.05, y: -2 }}
                                        whileTap={{ scale: 0.95 }}
                                        className={cn(
                                            "px-6 py-3 rounded-2xl text-sm font-black font-fredoka transition-all border-4",
                                            isSelected
                                                ? 'bg-purple-500 text-white border-purple-400 shadow-clay-purple'
                                                : 'bg-white text-ink border-white hover:border-purple-100 shadow-sm'
                                        )}
                                    >
                                        {interest}
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>

                    {/* --- Error Message --- */}
                    <AnimatePresence>
                        {errors && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="p-4 rounded-2xl bg-red-50 text-red-600 text-sm font-bold border-2 border-red-100 flex items-center gap-3"
                            >
                                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">!</div>
                                {errors}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* --- Submit Button (Styled like Story Maker Next) --- */}
                    <motion.button
                        type="submit"
                        disabled={loading || !formData.first_name || formData.interests.length === 0}
                        whileHover={{ scale: 1.02, y: -4 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full h-20 rounded-[2rem] bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-clay-purple border-2 border-white/30 flex items-center justify-center gap-4 text-2xl font-black font-fredoka uppercase tracking-widest disabled:opacity-50 transition-all"
                    >
                        {loading ? (
                            <Loader2 className="w-8 h-8 animate-spin" />
                        ) : (
                            <>
                                <span>{initialData?.id ? 'Save Changes' : 'Start Adventure'}</span>
                                <ChevronRight className="w-8 h-8" />
                            </>
                        )}
                    </motion.button>

                </form>
            </div>
        </div>
    );
}
