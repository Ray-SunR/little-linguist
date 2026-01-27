'use client'

import { createClient } from '@/lib/supabase/client'
import { login, signup, checkEmail } from './actions'
import { useState, useEffect, memo, useMemo, Suspense, useRef } from 'react'
import { Loader2, Sparkles, BookOpen, Star, Zap } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/lib/core'
import { motion, AnimatePresence } from 'framer-motion'
import { LumoCharacter } from '@/components/ui/lumo-character'
import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { AuthFormFields } from './components/AuthFormFields'

// --- Cinematic Components ---

const MagicBackground = memo(() => {
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden bg-shell dark:bg-[#05060f]">
            {/* Noise Texture Sync */}
            <div className="absolute inset-0 opacity-20 bg-noise z-0 mix-blend-soft-light" />
            
            {/* Pro Max Aurora Effects - Synced with Landing Page */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-[20%] -left-[10%] w-[70vh] h-[70vh] bg-gradient-to-br from-purple-300/40 to-indigo-300/40 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: "8s" }} />
                <div className="absolute top-[10%] right-[0%] w-[60vh] h-[60vh] bg-gradient-to-bl from-amber-200/40 to-orange-200/40 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "-3s", animationDuration: "10s" }} />
                <div className="absolute -bottom-[20%] left-[20%] w-[50vh] h-[50vh] bg-gradient-to-t from-blue-300/30 to-cyan-200/30 rounded-full blur-[90px] animate-pulse" style={{ animationDelay: "-5s", animationDuration: "12s" }} />
            </div>

            {/* Mesh Gradients / Blobs with will-change-transform */}
            <div className="absolute inset-0 opacity-40 dark:opacity-20 pointer-events-none">
                <div className="absolute top-[20%] left-[10%] w-96 h-96 bg-purple-400 blur-3xl animate-blob-slow rounded-full mix-blend-multiply dark:mix-blend-lighten will-change-transform" />
                <div className="absolute top-[30%] right-[10%] w-80 h-80 bg-blue-300 blur-3xl animate-blob-reverse rounded-full mix-blend-multiply dark:mix-blend-lighten will-change-transform" />
                <div className="absolute bottom-[20%] left-[20%] w-72 h-72 bg-pink-200 blur-3xl animate-blob-pulse rounded-full mix-blend-multiply dark:mix-blend-lighten will-change-transform" />
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
    const [loading, setLoading] = useState<'checking' | 'auth' | 'google' | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [authStep, setAuthStep] = useState<'email' | 'identity'>('email')
    const [emailExists, setEmailExists] = useState<boolean | null>(null)

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

        const isNative = Capacitor.isNativePlatform()

        // Use custom URL scheme for native, web origin for web
        const callbackUrl = isNative
            ? 'com.lumomind.app://auth/callback'
            : `${location.origin}/auth/callback`

        const finalRedirectUrl = new URL(callbackUrl)
        if (redirectTo) {
            finalRedirectUrl.searchParams.set('next', redirectTo)
        }

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo: finalRedirectUrl.toString(),
                skipBrowserRedirect: isNative,
            },
        })

        if (error) {
            setLoading(null)
            setError(error.message)
            return
        }

        if (isNative && data?.url) {
            // Open the OAuth URL in the in-app browser with a bottom-up sheet style
            await Browser.open({
                url: data.url,
                windowName: '_self',
                presentationStyle: 'popover'
            })
        }
    }

    const handleEmailCheck = async (e: React.FormEvent, emailFromComponent: string) => {
        e.preventDefault()
        if (!emailFromComponent) return

        setEmail(emailFromComponent)
        setLoading('checking')
        setError(null)

        const result = await checkEmail(emailFromComponent)

        if (result.error) {
            setError(result.error)
            setLoading(null)
            return
        }

        setEmailExists(!!result.exists)
        setAuthStep('identity')
        setLoading(null)
    }

    const handleEmailAuth = async (e: React.FormEvent, emailFromComponent: string, passwordFromComponent: string) => {
        e.preventDefault()
        setLoading('auth')
        setError(null)
        setSuccess(null)

        const formData = new FormData()
        formData.append('email', emailFromComponent)
        formData.append('password', passwordFromComponent)
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
        } catch (err: unknown) {
            // Next.js redirect() throws an error that should not be caught if we want it to work
            if (err instanceof Error && (err as any).digest?.includes('NEXT_REDIRECT')) {
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

                                <AuthFormFields
                                    authStep={authStep}
                                    loading={loading}
                                    onEmailCheck={handleEmailCheck}
                                    onEmailAuth={handleEmailAuth}
                                    error={error}
                                    emailExists={emailExists}
                                    initialEmail={email}
                                    onOAuthLogin={handleOAuthLogin}
                                    onBackToEmail={() => {
                                        setAuthStep('email')
                                        setError(null)
                                        setSuccess(null)
                                    }}
                                />
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
