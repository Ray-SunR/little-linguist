'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import { Loader2, Wand2, MoveRight, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/core'

export default function LoginPage() {
    const [loading, setLoading] = useState<string | null>(null)
    const supabase = createClient()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const handleLogin = async (provider: 'google' | 'facebook' | 'apple') => {
        setLoading(provider)
        const { error } = await supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo: `${location.origin}/auth/callback`,
            },
        })
        if (error) {
            setLoading(null)
            console.error(error)
        }
    }

    return (
        <div className={cn(
            "min-h-screen w-full flex flex-col items-center justify-center p-6 relative overflow-hidden page-story-maker selection:bg-purple-200 dark:selection:bg-purple-900/30",
            mounted ? "opacity-100" : "opacity-0 transition-opacity duration-1000"
        )}>

            {/* Expert UX: Immersive Background Blobs */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[10%] left-[5%] w-[40vw] h-[40vw] bg-purple-400/20 blur-[150px] rounded-full animate-floaty" style={{ animationDuration: '15s' }} />
                <div className="absolute bottom-[5%] right-[5%] w-[35vw] h-[35vw] bg-blue-400/20 blur-[130px] rounded-full animate-floaty" style={{ animationDuration: '12s', animationDelay: '-5s' }} />
                <div className="absolute top-[30%] right-[-5%] w-[25vw] h-[25vw] bg-pink-300/15 blur-[100px] rounded-full animate-floaty" style={{ animationDuration: '18s', animationDelay: '-2s' }} />
            </div>

            {/* Main Container */}
            <div className={cn(
                "w-full max-w-[520px] relative z-10 transition-all duration-1000 cubic-bezier(0.16, 1, 0.3, 1)",
                mounted ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"
            )}>

                <div className="glass-card p-10 md:p-12 flex flex-col items-center shadow-2xl">

                    {/* Header */}
                    <div className="mb-10 w-full flex flex-col items-center text-center">
                        <div className="w-20 h-20 rounded-[2.5rem] bg-gradient-to-br from-purple-500 to-indigo-600 shadow-xl shadow-purple-500/25 flex items-center justify-center mb-8 rotate-3 hover:rotate-0 transition-transform duration-500 group">
                            <Sparkles className="h-10 w-10 text-white group-hover:scale-110 transition-transform" strokeWidth={2.5} />
                        </div>

                        <h1 className="text-4xl font-extrabold tracking-tight text-ink dark:text-white mb-3">
                            Golden Portal
                        </h1>
                        <p className="text-lg text-ink-muted dark:text-slate-400 max-w-sm leading-relaxed">
                            Step back into your world of magic words and wonderful stories.
                        </p>
                    </div>

                    {/* Branded Providers Stack */}
                    <div className="space-y-4 w-full">

                        {/* Google - Recognizable Brand Identity */}
                        <button
                            onClick={() => handleLogin('google')}
                            disabled={!!loading}
                            className="relative w-full group overflow-hidden"
                        >
                            <div className="flex items-center justify-center gap-4 py-4 px-6 bg-white dark:bg-[#1a1d2d] rounded-2xl border-2 border-slate-200 dark:border-white/5 hover:border-purple-200 dark:hover:border-purple-900/40 hover:shadow-xl hover:shadow-purple-500/5 transition-all duration-300 active:scale-[0.98]">
                                {loading === 'google' ? (
                                    <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                                ) : (
                                    <>
                                        <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24">
                                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                        </svg>
                                        <span className="text-lg font-bold text-slate-700 dark:text-slate-200">Continue with Google</span>
                                    </>
                                )}
                            </div>
                        </button>

                        {/* Facebook - Brand Recognizability & Contrast Fix */}
                        <button
                            onClick={() => handleLogin('facebook')}
                            disabled={!!loading}
                            className="relative w-full group overflow-hidden"
                        >
                            <div className="flex items-center justify-center gap-4 py-4 px-6 bg-[#1877F2] rounded-2xl border-b-4 border-[#0e5cad] hover:brightness-110 hover:shadow-xl hover:shadow-[#1877F2]/20 transition-all duration-300 active:scale-[0.98] active:border-b-0 active:translate-y-1">
                                {loading === 'facebook' ? (
                                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                                ) : (
                                    <>
                                        <svg className="w-7 h-7 shrink-0 text-white" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 2.848-6.326 6.358-6.326 1.686 0 3.246.083 3.423.111l-.002 3.85h-2.189c-1.5 0-1.874.55-1.874 1.835v2.11h3.766l-.503 3.667h-3.263v7.98h-5.719z" />
                                        </svg>
                                        <span className="text-lg font-bold text-white">Continue with Facebook</span>
                                    </>
                                )}
                            </div>
                        </button>

                        {/* Apple - Brand Standard */}
                        <button
                            onClick={() => handleLogin('apple')}
                            disabled={!!loading}
                            className="relative w-full group overflow-hidden"
                        >
                            <div className="flex items-center justify-center gap-4 py-4 px-6 bg-black dark:bg-white rounded-2xl hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-white/10 transition-all duration-300 active:scale-[0.98]">
                                {loading === 'apple' ? (
                                    <Loader2 className="w-6 h-6 animate-spin text-white dark:text-black" />
                                ) : (
                                    <>
                                        <svg className="w-6 h-6 shrink-0 text-white dark:text-black" fill="currentColor" viewBox="0 0 384 512">
                                            <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
                                        </svg>
                                        <span className="text-lg font-bold text-white dark:text-black">Continue with Apple</span>
                                    </>
                                )}
                            </div>
                        </button>
                    </div>

                    {/* Expert UX: Tightened Secondary Area */}
                    <div className="mt-10 pt-8 border-t border-purple-100 dark:border-white/5 w-full text-center">
                        <Link href="/" className="inline-flex items-center gap-3 text-sm font-black text-ink-muted dark:text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 transition-all uppercase tracking-[0.2em] group">
                            <Wand2 className="w-5 h-5 text-pink-400 group-hover:rotate-12 transition-transform" />
                            Back to Reader
                            <MoveRight className="w-4 h-4 transition-transform group-hover:translate-x-2" />
                        </Link>
                    </div>
                </div>

                {/* Magic Footer */}
                <div className="mt-8 py-4 flex items-center justify-center gap-8 text-[10px] font-bold text-slate-400 dark:text-slate-600 transition-colors tracking-widest uppercase">
                    <Link href="#" className="hover:text-purple-500">Privacy</Link>
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800" />
                    <Link href="#" className="hover:text-purple-500">Terms</Link>
                </div>

            </div>
        </div>
    )
}
