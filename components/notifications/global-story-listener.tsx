"use client";

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useStoryStatusSubscription } from '@/lib/hooks/use-realtime-subscriptions';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { PartyPopper, BookOpen, X, AlertCircle } from 'lucide-react';

export function GlobalStoryListener() {
    const [userId, setUserId] = useState<string | undefined>();
    const [notifications, setNotifications] = useState<any[]>([]);
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setUserId(data.user?.id);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUserId(session?.user?.id);
        });

        return () => subscription.unsubscribe();
    }, [supabase]);

    useStoryStatusSubscription(userId, useCallback((story) => {
        if (story.status === 'completed' || story.status === 'failed') {
            const id = Math.random().toString(36).substring(7);
            const newNotification = {
                id,
                storyId: story.id,
                title: story.child_name ? `${story.child_name}'s Adventure` : 'Your Story',
                status: story.status,
                message: story.status === 'completed' ? 'Drawing Magic... complete! Your story is ready to read.' : 'Oops! Magic missed a spark. Story generation failed.',
                type: story.status === 'completed' ? 'success' : 'error'
            };

            setNotifications(prev => [...prev, newNotification]);

            // Auto-remove after 10s
            setTimeout(() => {
                setNotifications(prev => prev.filter(n => n.id !== id));
            }, 10000);
        }
    }, []));

    const removeNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
            <AnimatePresence>
                {notifications.map((n) => (
                    <motion.div
                        key={n.id}
                        initial={{ opacity: 0, scale: 0.9, y: 20, x: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                        className="pointer-events-auto"
                    >
                        <div className={`
              relative p-4 rounded-2xl shadow-2xl border backdrop-blur-xl
              ${n.type === 'success'
                                ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
                                : 'bg-rose-50/90 border-rose-200 text-rose-900'}
            `}>
                            <div className="flex gap-3">
                                <div className={`
                  p-2 rounded-xl h-fit
                  ${n.type === 'success' ? 'bg-emerald-200/50' : 'bg-rose-200/50'}
                `}>
                                    {n.type === 'success' ? <PartyPopper size={24} /> : <AlertCircle size={24} />}
                                </div>

                                <div className="flex-1 pr-4">
                                    <h3 className="font-bold text-lg mb-1">{n.title}</h3>
                                    <p className="text-sm opacity-90 leading-relaxed mb-3">
                                        {n.message}
                                    </p>

                                    {n.type === 'success' && (
                                        <button
                                            onClick={() => {
                                                router.push(`/reader/${n.storyId}`);
                                                removeNotification(n.id);
                                            }}
                                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-500/20"
                                        >
                                            <BookOpen size={16} />
                                            Read Now
                                        </button>
                                    )}
                                </div>

                                <button
                                    onClick={() => removeNotification(n.id)}
                                    className="absolute top-3 right-3 p-1 hover:bg-black/5 rounded-full transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
