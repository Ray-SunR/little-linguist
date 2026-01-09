"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { useStoryStatusSubscription } from '@/lib/hooks/use-realtime-subscriptions';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { PartyPopper, BookOpen, X, AlertCircle } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';

export function GlobalStoryListener() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const processedStories = useRef(new Set<string>());
    const isMounted = useRef(true);
    const router = useRouter();
    const { user, isLoading } = useAuth();
    const userId = user?.id;

    // Fix: Clear processed stories when user changes to ensure fresh notifications
    useEffect(() => {
        processedStories.current.clear();
    }, [userId]);

    // Cleanup for unmount
    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);
    // Skip subscription if no user (login/onboarding) to avoid extra socket setup
    useStoryStatusSubscription(!isLoading ? userId : undefined, useCallback((story) => {
        if (story.status === 'completed' || story.status === 'failed') {
            // Deduplication: Don't show multiple notifications for the same story
            if (processedStories.current.has(story.id)) return;
            processedStories.current.add(story.id);

            const id = Math.random().toString(36).substring(7);
            const newNotification = {
                id,
                storyId: story.id,
                title: story.child_name ? `${story.child_name}'s Adventure` : 'Your Story',
                status: story.status,
                message: story.status === 'completed' 
                    ? 'Magic has finished drawing! Your new adventure is ready to read.' 
                    : 'Oops! The magic missed a spark this time. Please try making the magic again!',
                type: story.status === 'completed' ? 'success' : 'error'
            };

            setNotifications(prev => [...prev, newNotification]);

            // Auto-remove after 8s
            setTimeout(() => {
                if (isMounted.current) {
                    setNotifications(prev => prev.filter(n => n.id !== id));
                }
            }, 8000);
        }
    }, []));

    const removeNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    return (
        <div className="fixed bottom-24 right-6 z-[9999] flex flex-col gap-4 max-w-sm w-[90vw] pointer-events-none">
            <AnimatePresence>
                {notifications.map((n) => (
                    <motion.div
                        key={n.id}
                        initial={{ opacity: 0, scale: 0.8, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, x: 100 }}
                        className="pointer-events-auto"
                    >
                        <div className={`
                            clay-card overflow-hidden p-0 relative border-4 border-white shadow-2xl
                            ${n.type === 'success' ? 'bg-emerald-50/95' : 'bg-rose-50/95'}
                        `}>
                            {/* Decorative Sparkle Background */}
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                {n.type === 'success' ? <PartyPopper size={80} /> : <AlertCircle size={80} />}
                            </div>

                            <div className="relative p-6">
                                <div className="flex gap-4">
                                    <div className={`
                                        w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border-2 border-white shadow-clay-purple-sm
                                        ${n.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}
                                    `}>
                                        {n.type === 'success' ? <PartyPopper size={24} /> : <AlertCircle size={24} />}
                                    </div>

                                    <div className="flex-1">
                                        <h3 className="font-fredoka font-black text-xl text-ink leading-tight mb-1">
                                            {n.title}
                                        </h3>
                                        <p className="font-nunito font-bold text-ink-muted leading-tight mb-4">
                                            {n.message}
                                        </p>

                                        {n.type === 'success' && (
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => {
                                                    router.push(`/reader/${n.storyId}`);
                                                    removeNotification(n.id);
                                                }}
                                                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-black font-fredoka uppercase tracking-wider shadow-clay-mint hover:bg-emerald-600 transition-colors"
                                            >
                                                <BookOpen size={18} />
                                                Read Now
                                            </motion.button>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => removeNotification(n.id)}
                                        className="p-1 hover:bg-black/5 rounded-full transition-colors h-fit text-ink-muted/40"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>
                            
                            {/* Progress timer bar */}
                            <motion.div 
                                className={`h-1.5 ${n.type === 'success' ? 'bg-emerald-400' : 'bg-rose-400'}`}
                                initial={{ width: "100%" }}
                                animate={{ width: "0%" }}
                                transition={{ duration: 8, ease: "linear" }}
                            />
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
