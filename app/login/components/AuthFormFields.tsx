'use client'

import React, { useState, useMemo, memo } from 'react'
import { Mail, Lock, Loader2, MoveRight, RefreshCw, ChevronLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/core'

interface AuthFormFieldsProps {
    authStep: 'email' | 'identity'
    loading: 'checking' | 'auth' | 'google' | null
    onEmailCheck: (e: React.FormEvent, email: string) => Promise<void>
    onEmailAuth: (e: React.FormEvent, email: string, password: string) => Promise<void>
    error: string | null
    emailExists: boolean | null
    initialEmail?: string
    onBackToEmail?: () => void
    onOAuthLogin?: (provider: 'google') => Promise<void>
}

export const AuthFormFields = memo(({
    authStep,
    loading,
    onEmailCheck,
    onEmailAuth,
    error,
    emailExists,
    initialEmail = '',
    onBackToEmail,
    onOAuthLogin
}: AuthFormFieldsProps) => {
    const [email, setEmail] = useState(initialEmail)
    const [password, setPassword] = useState('')

    const isValidEmail = useMemo(() => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    }, [email])

    const isValidPassword = useMemo(() => {
        return password.length >= 6
    }, [password])

    const handleEmailSubmit = (e: React.FormEvent) => {
        return onEmailCheck(e, email)
    }

    const handleAuthSubmit = (e: React.FormEvent) => {
        return onEmailAuth(e, email, password)
    }

    if (authStep === 'email') {
        return (
            <div className="w-full">
                {/* Social Option */}
                {onOAuthLogin && (
                    <div className="w-full mb-6">
                        <button
                            onClick={() => onOAuthLogin('google')}
                            disabled={!!loading}
                            className="group relative w-full h-[56px] rounded-[1.25rem] overflow-hidden active:scale-[0.98] transition-all bg-white/80 dark:bg-slate-800/80 border border-white/50 dark:border-slate-700 shadow-clay-sm hover:shadow-clay-md"
                            aria-label="Sign in with Google"
                        >
                            <div className="relative flex items-center justify-center gap-3 h-full px-6">
                                {loading === 'google' ? (
                                    <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                                ) : (
                                    <>
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm border border-slate-100">
                                            <svg className="h-5 w-5" viewBox="0 0 24 24">
                                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                            </svg>
                                        </div>
                                        <span className="text-base font-black text-ink dark:text-slate-100 tracking-tight">Enter with Google</span>
                                    </>
                                )}
                            </div>
                        </button>
                    </div>
                )}

                <div className="w-full flex items-center gap-4 mb-6 opacity-50">
                    <div className="h-[1px] flex-1 bg-ink/20 dark:bg-white/20" />
                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">Secret Scroll</span>
                    <div className="h-[1px] flex-1 bg-ink/20 dark:bg-white/20" />
                </div>

                <form onSubmit={handleEmailSubmit} className="w-full space-y-4">
                    <div className="relative group/input">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within/input:text-purple-500 transition-colors" />
                        <input
                            type="email"
                            placeholder="Magic Email"
                            value={email}
                            autoFocus
                            disabled={loading === 'checking'}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-12 pr-4 h-[56px] bg-white/50 dark:bg-white/5 border-2 border-transparent focus:border-purple-500/30 rounded-2xl outline-none transition-all placeholder:text-slate-400 font-bold text-ink dark:text-white disabled:opacity-50 shadow-clay-inset"
                            required
                            aria-label="Email address"
                        />
                    </div>

                    {error && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-sm font-bold text-center">
                            {error}
                        </motion.div>
                    )}

                    <button
                        type="submit"
                        disabled={!!loading || !isValidEmail}
                        className={cn(
                            "w-full group relative h-[56px] rounded-2xl overflow-hidden transition-all duration-300",
                            (!!loading || !isValidEmail) ? "opacity-50 cursor-not-allowed" : "active:scale-[0.98] shadow-clay-lg hover:shadow-xl hover:shadow-purple-500/20"
                        )}
                    >
                        <div className={cn(
                            "absolute inset-0 bg-gradient-to-r from-accent to-indigo-600 transition-all duration-500",
                            !(!!loading || !isValidEmail) && "group-hover:from-purple-600 group-hover:to-indigo-500"
                        )} />
                        <div className="relative flex items-center justify-center gap-3 h-full px-8">
                            {loading === 'checking' ? (
                                <Loader2 className="w-7 h-7 animate-spin text-white" />
                            ) : (
                                <>
                                    <span className="text-lg font-black text-white">Continue</span>
                                    <MoveRight className="w-6 h-6 text-white group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </div>
                    </button>
                </form>
            </div>
        )
    }

    return (
        <form onSubmit={handleAuthSubmit} className="w-full space-y-4">
            <div className="flex flex-col gap-4">
                <div className="relative group/input opacity-60">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="email"
                        value={email}
                        readOnly
                        className="w-full pl-12 pr-4 h-[56px] bg-white/50 dark:bg-white/5 border-2 border-transparent rounded-2xl outline-none font-bold text-ink dark:text-white cursor-not-allowed shadow-clay-inset"
                        aria-label="Email address (read-only)"
                    />
                </div>
                <div className="relative group/input">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within/input:text-purple-500 transition-colors" />
                    <input
                        type="password"
                        placeholder="Secret Word"
                        value={password}
                        autoFocus
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-12 pr-4 h-[56px] bg-white/50 dark:bg-white/5 border-2 border-transparent focus:border-purple-500/30 rounded-2xl outline-none transition-all placeholder:text-slate-400 font-bold text-ink dark:text-white shadow-clay-inset"
                        required
                        aria-label="Secret Word (Password)"
                    />
                </div>
            </div>

            {error && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-4 bg-rose-50 border border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20 rounded-2xl text-rose-600 dark:text-rose-400 text-sm font-bold text-center">
                    {error}
                </motion.div>
            )}

            <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={!!loading || !isValidPassword}
                className="h-14 w-full rounded-2xl bg-gradient-to-r from-accent to-indigo-600 text-white shadow-clay-lg transition-all disabled:opacity-50 border-2 border-white/30 text-lg font-black font-fredoka uppercase tracking-widest"
            >
                {loading === 'auth' ? (
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin" />
                ) : (
                    "Enter Realm"
                )}
            </motion.button>

            {onBackToEmail && (
                <button
                    type="button"
                    onClick={onBackToEmail}
                    className="w-full flex items-center justify-center gap-2 py-2 text-sm font-bold text-ink-muted dark:text-slate-500 hover:text-accent dark:hover:text-purple-400 transition-colors group"
                >
                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Use different email
                </button>
            )}
        </form>
    )
})

AuthFormFields.displayName = 'AuthFormFields'
