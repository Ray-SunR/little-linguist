'use client'

import { createClient } from '@/lib/supabase/client'
import { login, signup, checkEmail } from './actions'
import { useState, useEffect, memo, useMemo, Suspense, useRef } from 'react'
import { Loader2, MoveRight, Sparkles, Mail, Lock, ChevronLeft, RefreshCw, BookOpen, Star, Zap } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/lib/core'
import { motion, AnimatePresence } from 'framer-motion'
import { LumoCharacter } from '@/components/ui/lumo-character'

// --- Cinematic Components ---

const MagicBackground = memo(() => {
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden bg-shell dark:bg-[#05060f]">
            {/* Pro Max Aurora Effects */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[120vw] h-[120vw] bg-gradient-to-br from-purple-500/20 via-blue-500/10 to-transparent blur-[120px] animate-aurora rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[100vw] h-[100vw] bg-gradient-to-tl from-cta/15 via-purple-400/10 to-transparent blur-[100px] animate-aurora rounded-full" style={{ animationDirection: 'reverse', animationDuration: '45s' }} />
            </div>

            {/* Mesh Gradients / Blobs */}
            <div className="absolute inset-0 opacity-40 dark:opacity-20 pointer-events-none">
                <div className="absolute top-[20%] left-[10%] w-96 h-96 bg-purple-400 blur-3xl animate-blob-slow rounded-full mix-blend-multiply dark:mix-blend-lighten" />
                <div className="absolute top-[30%] right-[10%] w-80 h-80 bg-blue-300 blur-3xl animate-blob-reverse rounded-full mix-blend-multiply dark:mix-blend-lighten" />
                <div className="absolute bottom-[20%] left-[20%] w-72 h-72 bg-pink-200 blur-3xl animate-blob-pulse rounded-full mix-blend-multiply dark:mix-blend-lighten" />
            </div>

            {/* Reactive Rim Light (Global) */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_var(--mouse-x)_var(--mouse-y),rgba(139,75,255,0.05),transparent)] pointer-events-none" />
        </div>
    )
})

MagicBackground.displayName = 'MagicBackground'

const FloatingElements = memo(() => {
    // Elements floating around the central mascot
    const elements = useMemo(() => [
        { Icon: BookOpen, color: 'text-blue-400', delay: 0, x: -60, y: -20, size: 24, rotation: -15 },
        { Icon: Star, color: 'text-yellow-400', delay: 1.5, x: 60, y: -30, size: 20, rotation: 15 },
        { Icon: Sparkles, color: 'text-purple-400', delay: 0.8, x: -50, y: 40, size: 18, rotation: -10 },
        { Icon: Zap, color: 'text-amber-400', delay: 2.2, x: 50, y: 30, size: 16, rotation: 10 },
    ], [])

    return (
        <div className="absolute inset-0 pointer-events-none">
            {elements.map((el, i) => (
                <motion.div
                    key={i}
                    className="absolute left-1/2 top-1/2"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{
                        opacity: [0, 1, 1, 0],
                        scale: [0.5, 1, 1, 0.5],
                        x: [el.x, el.x + (i % 2 === 0 ? 10 : -10)],
                        y: [el.y, el.y + (i % 2 === 0 ? -10 : 10)],
                        rotate: [el.rotation, el.rotation + (i % 2 === 0 ? 10 : -10)]
                    }}
                    transition={{
                        duration: 4,
                        repeat: Infinity,
                        repeatType: "reverse",
                        delay: el.delay,
                        ease: "easeInOut"
                    }}
                >
                    <div className={cn("p-2 bg-white/30 backdrop-blur-md rounded-xl border border-white/40 shadow-lg", el.color)}>
                        <el.Icon size={el.size} strokeWidth={2.5} />
                    </div>
                </motion.div>
            ))}
        </div>
    )
})
FloatingElements.displayName = 'FloatingElements'

// --- Main Page ---

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen w-full flex items-center justify-center bg-[#05060f]"><Loader2 className="w-12 h-12 animate-spin text-purple-500" /></div>}>
            <LoginForm />
        </Suspense>
    )
}

function LoginForm() {
    const searchParams = useSearchParams()
    const returnTo = searchParams.get('returnTo')
    const action = searchParams.get('action')

    // Construct the full redirect path including original params
    const redirectTo = useMemo(() => {
        if (!returnTo) return undefined

        // Ensure the path is relative and safe
        const isRelative = returnTo.startsWith('/') && !returnTo.startsWith('//')
        const safePath = isRelative ? returnTo : '/'

        if (!action) return safePath

        try {
            const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
            const url = new URL(safePath, base)
            url.searchParams.set('action', action)
            return url.pathname + url.search
        } catch (e) {
            return safePath
        }
    }, [returnTo, action])

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState<'checking' | 'auth' | 'google' | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [authStep, setAuthStep] = useState<'email' | 'identity'>('email')
    const [emailExists, setEmailExists] = useState<boolean | null>(null)

    // Validation Logic
    const isValidEmail = useMemo(() => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    }, [email])

    const isValidPassword = useMemo(() => {
        return password.length >= 6
    }, [password])

    const canContinue = authStep === 'email' ? isValidEmail : isValidPassword
    const supabase = useMemo(() => createClient(), [])
    const [mounted, setMounted] = useState(false)

    // Mouse Parallax & Rim Light
    const cardRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        setMounted(true)
        const handleMouseMove = (e: MouseEvent) => {
            // Update CSS variables for rim light
            if (cardRef.current) {
                const rect = cardRef.current.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                cardRef.current.style.setProperty('--mouse-x', `${x}px`);
                cardRef.current.style.setProperty('--mouse-y', `${y}px`);
            }
        }
        window.addEventListener('mousemove', handleMouseMove)
        return () => window.removeEventListener('mousemove', handleMouseMove)
    }, [])

    const handleOAuthLogin = async (provider: 'google') => {
        setLoading(provider)
        setError(null)
        setSuccess(null)

        const callbackUrl = new URL(`${location.origin}/auth/callback`)
        if (redirectTo) {
            callbackUrl.searchParams.set('next', redirectTo)
        }

        const { error } = await supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo: callbackUrl.toString(),
            },
        })
        if (error) {
            setLoading(null)
            setError(error.message)
        }
    }

    const handleEmailCheck = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email) return

        setLoading('checking')
        setError(null)

        const result = await checkEmail(email)

        if (result.error) {
            setError(result.error)
            setLoading(null)
            return
        }

        setEmailExists(!!result.exists)
        setAuthStep('identity')
        setLoading(null)
    }

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading('auth')
        setError(null)
        setSuccess(null)

        const formData = new FormData()
        formData.append('email', email)
        formData.append('password', password)
        formData.append('origin', location.origin)

        try {
            const result = (!emailExists ? await signup(formData, redirectTo) : await login(formData, redirectTo)) as { error?: string; success?: string } | undefined

            if (result?.error) {
                setError(result.error)
                setLoading(null)
            } else if (result?.success) {
                setSuccess(result.success)
                setLoading(null)
            }
        } catch (err: any) {
            // Next.js redirect() throws an error that should not be caught if we want it to work
            if (err?.digest?.includes('NEXT_REDIRECT')) {
                throw err;
            }
            setError('The portal is unstable. Please try again.')
            setLoading(null)
        }
    }

    return (
        <div className={cn(
            "min-h-screen w-full flex flex-col items-center justify-center p-4 md:p-6 relative overflow-hidden bg-shell selection:bg-purple-200 dark:selection:bg-purple-900/40",
            mounted ? "opacity-100" : "opacity-0 transition-opacity duration-1000"
        )}>

            <MagicBackground />

            {/* Content Container */}
            <div
                className={cn(
                    "w-full max-w-[480px] relative z-10 transition-all duration-1000 flex flex-col items-center",
                    mounted ? "translate-y-0 opacity-100 scale-100" : "translate-y-12 opacity-0 scale-95"
                )}
            >
                {/* Lumo Brand Mascot */}
                <motion.div
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.5 }}
                    className="relative mb-8 group"
                >
                    <div className="absolute inset-0 bg-accent/20 blur-[40px] rounded-full animate-pulse-glow" />

                    {/* Portal Halo */}
                    <div className="absolute inset-[-20%] rounded-full border-2 border-dashed border-white/40 animate-[spin_10s_linear_infinite] opacity-70" />
                    <div className="absolute inset-[-10%] rounded-full border border-white/20 animate-[spin_15s_linear_infinite_reverse] opacity-70" />

                    {/* Floating Icons */}
                    <FloatingElements />

                    <div className="relative p-7 bg-white/40 dark:bg-white/5 backdrop-blur-md rounded-[3rem] border-2 border-white/50 dark:border-white/10 shadow-clay-lg group-hover:scale-110 transition-all duration-500 group-hover:rotate-6 z-10">
                        <LumoCharacter size="lg" />
                    </div>
                </motion.div>

                {/* Liquid Glass Portal Card */}
                <div ref={cardRef} className="w-full relative group px-2 sm:px-0">
                    {/* Reactive Rim Light */}
                    <motion.div
                        className="absolute -inset-[1px] rounded-[3rem] bg-gradient-to-br from-white/40 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10"
                        style={{
                            background: `radial-gradient(400px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,255,255,0.4), transparent)`
                        }}
                    />

                    <div className="relative glass-card border-white/20 dark:border-white/10 shadow-clay-lg p-8 sm:p-10 md:p-12 flex flex-col items-center backdrop-blur-3xl bg-white/60 dark:bg-[#1a1c2e]/70 border-[1.5px] rounded-[3rem] overflow-hidden">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={authStep === 'email' ? 'email-step' : 'identity-step'}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                                className="w-full flex flex-col items-center"
                            >
                                {/* Typography: High Contrast Headlines */}
                                <div className="mb-8 w-full text-center">
                                    <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-ink dark:text-white mb-2 leading-tight font-fredoka">
                                        {authStep === 'email' ? "Magical Portal" :
                                            emailExists ? "Welcome Back" : "New Journey"}
                                    </h1>
                                    <p className="text-sm sm:text-base font-bold text-ink-muted dark:text-slate-400 leading-relaxed max-w-[280px] mx-auto">
                                        {authStep === 'email' ? "Step back into the world of magic and imagination." :
                                            emailExists ? "The realm remembers you, traveler. Enter your secret word." :
                                                "Create your traveler's profile to start your magical journey."}
                                    </p>
                                </div>

                                {authStep === 'email' ? (
                                    <div className="w-full">
                                        {/* Social Option */}
                                        <div className="w-full mb-6">
                                            <button
                                                onClick={() => handleOAuthLogin('google')}
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

                                        <div className="w-full flex items-center gap-4 mb-6 opacity-50">
                                            <div className="h-[1px] flex-1 bg-ink/20 dark:bg-white/20" />
                                            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">Secret Scroll</span>
                                            <div className="h-[1px] flex-1 bg-ink/20 dark:bg-white/20" />
                                        </div>

                                        <form onSubmit={handleEmailCheck} className="w-full space-y-4">
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
                                ) : (
                                    <form onSubmit={handleEmailAuth} className="w-full space-y-4">
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

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setAuthStep('email')
                                                setError(null)
                                                setSuccess(null)
                                                setPassword('')
                                            }}
                                            className="w-full flex items-center justify-center gap-2 py-2 text-sm font-bold text-ink-muted dark:text-slate-500 hover:text-accent dark:hover:text-purple-400 transition-colors group"
                                        >
                                            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                                            Use different email
                                        </button>
                                    </form>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                <div className="text-center pt-6">
                    <p className="text-sm font-bold font-nunito text-ink-muted">
                        New explorer? <span className="text-accent hover:underline cursor-pointer">Request Invitation</span>
                    </p>
                </div>
            </div>

            {/* Cinematic Footer */}
            <div className="mt-12 py-4 flex items-center justify-center gap-10 text-[10px] font-black text-slate-500 transition-colors tracking-[0.2em] uppercase relative z-10">
                <Link href="#" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">Privacy Sanctuary</Link>
                <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-800" />
                <Link href="#" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">Rules of Magic</Link>
            </div>
        </div>
    )
}
