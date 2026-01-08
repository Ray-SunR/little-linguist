'use client'

import { createClient } from '@/lib/supabase/client'
import { login, signup, checkEmail } from './actions'
import { useState, useEffect, memo, useMemo, Suspense } from 'react'
import { Loader2, MoveRight, Sparkles, Mail, Lock, ChevronLeft, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/lib/core'
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion'

// --- Cinematic Components ---

const MagicBackground = memo(() => {
    // Persistent particles that don't re-render with the form
    const particles = useMemo(() => Array.from({ length: 40 }, (_, i) => ({
        id: i,
        size: Math.random() * 2 + 1,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        depth: Math.random() * 1.5 + 0.5, // Parallax depth factor
        opacity: Math.random() * 0.5 + 0.2,
    })), [])

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden bg-[#05060f]">
            {/* Nebula Effects - Static Deep Layer */}
            <div className="absolute top-[-20%] left-[-10%] w-[80vw] h-[80vw] bg-purple-600/10 blur-[150px] rounded-full animate-floaty" style={{ animationDuration: '35s' }} />
            <div className="absolute bottom-[-10%] right-[-20%] w-[70vw] h-[70vw] bg-blue-600/10 blur-[130px] rounded-full animate-floaty" style={{ animationDuration: '40s', animationDelay: '-20s' }} />

            {/* Parallax Star Layers */}
            <StarLayer layerIndex={1} count={15} sizeRange={[1, 2]} speed={0.02} />
            <StarLayer layerIndex={2} count={20} sizeRange={[0.5, 1.5]} speed={0.01} />

            {/* Ambient Particles */}
            {particles.map((p) => (
                <div
                    key={p.id}
                    className="absolute bg-white rounded-full"
                    style={{
                        width: `${p.size}px`,
                        height: `${p.size}px`,
                        left: p.left,
                        top: p.top,
                        opacity: p.opacity,
                        boxShadow: '0 0 8px rgba(255, 255, 255, 0.4)',
                    }}
                />
            ))}
        </div>
    )
})

MagicBackground.displayName = 'MagicBackground'

const StarLayer = ({ layerIndex, count, sizeRange, speed }: { layerIndex: number, count: number, sizeRange: [number, number], speed: number }) => {
    const stars = useMemo(() => Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * (sizeRange[1] - sizeRange[0]) + sizeRange[0],
        opacity: Math.random() * 0.4 + 0.3
    })), [count, sizeRange])

    return (
        <div className="absolute inset-0 overflow-hidden">
            {stars.map((star) => (
                <motion.div
                    key={`${layerIndex}-${star.id}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: star.opacity }}
                    transition={{ duration: 2, delay: Math.random() * 2 }}
                    className="absolute bg-white rounded-full"
                    style={{
                        left: `${star.x}%`,
                        top: `${star.y}%`,
                        width: `${star.size}px`,
                        height: `${star.size}px`,
                        boxShadow: `0 0 ${star.size * 2}px white`,
                    }}
                />
            ))}
        </div>
    )
}

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
        if (!action) return returnTo
        const url = new URL(returnTo, 'http://localhost:3000') // Placeholder origin
        url.searchParams.set('action', action)
        return url.pathname + url.search
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
    const supabase = createClient()
    const [mounted, setMounted] = useState(false)

    // Mouse Parallax & Rim Light
    const mouseX = useMotionValue(0)
    const mouseY = useMotionValue(0)
    const springX = useSpring(mouseX, { damping: 20, stiffness: 100 })
    const springY = useSpring(mouseY, { damping: 20, stiffness: 100 })

    useEffect(() => {
        setMounted(true)
        const handleMouseMove = (e: MouseEvent) => {
            const { clientX, clientY } = e
            const { innerWidth, innerHeight } = window
            mouseX.set((clientX / innerWidth) - 0.5)
            mouseY.set((clientY / innerHeight) - 0.5)

            // Update CSS variables for rim light
            const card = document.querySelector('.glass-card') as HTMLElement;
            if (card) {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                card.style.setProperty('--mouse-x', `${x}px`);
                card.style.setProperty('--mouse-y', `${y}px`);
            }
        }
        window.addEventListener('mousemove', handleMouseMove)
        return () => window.removeEventListener('mousemove', handleMouseMove)
    }, [mouseX, mouseY])

    const parallaxX = useTransform(springX, (v) => v * 30)
    const parallaxY = useTransform(springY, (v) => v * 30)

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
        } catch (err) {
            setError('The portal is unstable. Please try again.')
            setLoading(null)
        }
    }

    return (
        <div className={cn(
            "min-h-screen w-full flex flex-col items-center justify-center p-6 relative overflow-hidden page-story-maker selection:bg-purple-200 dark:selection:bg-purple-900/40",
            mounted ? "opacity-100" : "opacity-0 transition-opacity duration-1000"
        )}>

            <MagicBackground />

            {/* Parallax Content Container */}
            <motion.div
                style={{ x: parallaxX, y: parallaxY }}
                className={cn(
                    "w-full max-w-[480px] relative z-10 transition-all duration-1000 flex flex-col items-center",
                    mounted ? "translate-y-0 opacity-100 scale-100" : "translate-y-12 opacity-0 scale-95"
                )}
            >
                {/* Radiance Token */}
                <div className="relative mb-10 group perspective-1000">
                    <div className="absolute inset-x-[-30px] inset-y-[-30px] bg-amber-400/20 blur-[50px] rounded-full animate-pulse-glow" />
                    <div className="relative w-24 h-24 rounded-[2.5rem] bg-gradient-to-br from-[#ffd700] via-[#ffa500] to-[#ff4500] border-4 border-white/40 shadow-[0_15px_40px_rgba(255,69,0,0.4)] flex items-center justify-center rotate-3 group-hover:rotate-0 transition-all duration-700 ease-&lsqb;cubic-bezier(0.34,1.56,0.64,1)&rsqb; group-hover:scale-110">
                        <Sparkles className="h-12 w-12 text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.2)] animate-bounce-subtle" strokeWidth={2.5} />
                    </div>
                </div>

                {/* Liquid Glass Portal Card */}
                <div className="w-full relative group">
                    {/* Reactive Rim Light */}
                    <motion.div
                        className="absolute -inset-[1px] rounded-[3.5rem] bg-gradient-to-br from-white/40 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10"
                        style={{
                            background: `radial-gradient(400px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,255,255,0.4), transparent)`
                        }}
                    />

                    <div className="relative glass-card border-white/10 dark:border-white/5 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.6)] p-10 md:p-12 flex flex-col items-center backdrop-blur-[50px] bg-white/5 dark:bg-[#1a1c2e]/70 border-[1.5px] rounded-[3.5rem] overflow-hidden">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={authStep === 'email' ? 'email-step' : 'identity-step'}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                                className="w-full flex flex-col items-center"
                            >
                                {/* Typography: High Contrast Headlines */}
                                <div className="mb-10 w-full text-center">
                                    <h1 className="text-4xl font-black tracking-tighter text-[#1e2238] dark:text-white mb-2 leading-tight">
                                        {authStep === 'email' ? "The Golden Portal" :
                                            emailExists ? "Welcome Back" : "Begin Adventure"}
                                    </h1>
                                    <p className="text-base font-bold text-[#5c6285] dark:text-slate-400 leading-relaxed max-w-[280px] mx-auto">
                                        {authStep === 'email' ? "Step back into the world of magic and imagination." :
                                            emailExists ? "The realm remembers you, traveler. Please enter your secret word." :
                                                "A new traveler! Create your legacy account to start your journey."}
                                    </p>
                                </div>

                                {authStep === 'email' ? (
                                    <div className="w-full">
                                        {/* Social Option */}
                                        <div className="w-full mb-8">
                                            <button
                                                onClick={() => handleOAuthLogin('google')}
                                                disabled={!!loading}
                                                className="group relative w-full h-[60px] rounded-[1.25rem] overflow-hidden active:scale-[0.98] transition-all bg-white border border-[#e2e8f0] shadow-sm hover:shadow-md dark:bg-slate-800 dark:border-slate-700"
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
                                                            <span className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight">Enter with Google</span>
                                                        </>
                                                    )}
                                                </div>
                                            </button>
                                        </div>

                                        <div className="w-full flex items-center gap-4 mb-8 opacity-50">
                                            <div className="h-[1px] flex-1 bg-[#cbd5e1] dark:bg-white/10" />
                                            <span className="text-[10px] font-black text-[#5c6285] dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">Ink & Scroll</span>
                                            <div className="h-[1px] flex-1 bg-[#cbd5e1] dark:bg-white/10" />
                                        </div>

                                        <form onSubmit={handleEmailCheck} className="w-full space-y-6">
                                            <div className="relative group/input">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within/input:text-purple-500 transition-colors" />
                                                <input
                                                    type="email"
                                                    placeholder="Magic Email"
                                                    value={email}
                                                    autoFocus
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    className="w-full pl-12 pr-4 h-[56px] bg-[#f8fafc] dark:bg-white/5 border-2 border-transparent focus:border-purple-500/30 rounded-2xl outline-none transition-all placeholder:text-slate-400 font-bold text-[#1e2238] dark:text-white"
                                                    required
                                                />
                                            </div>

                                            {error && (
                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-4 bg-rose-50 border border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20 rounded-2xl text-rose-600 dark:text-rose-400 text-sm font-bold text-center">
                                                    {error}
                                                </motion.div>
                                            )}

                                            <button
                                                type="submit"
                                                disabled={!!loading || !isValidEmail}
                                                className={cn(
                                                    "w-full group relative h-[60px] rounded-2xl overflow-hidden transition-all duration-300",
                                                    (!!loading || !isValidEmail) ? "opacity-50 grayscale cursor-not-allowed" : "active:scale-[0.98] shadow-lg hover:shadow-xl hover:shadow-purple-500/20"
                                                )}
                                            >
                                                <div className={cn(
                                                    "absolute inset-0 bg-gradient-to-r transition-all duration-500",
                                                    (!!loading || !isValidEmail)
                                                        ? "from-slate-400 to-slate-500"
                                                        : "from-[#8b5cf6] to-[#6366f1] group-hover:from-[#7c3aed] group-hover:to-[#4f46e5]"
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
                                    <form onSubmit={handleEmailAuth} className="w-full space-y-6">
                                        <div className="flex flex-col gap-4">
                                            <div className="relative group/input opacity-60">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                                <input
                                                    type="email"
                                                    value={email}
                                                    readOnly
                                                    className="w-full pl-12 pr-4 h-[56px] bg-[#f8fafc] dark:bg-white/5 border-2 border-transparent rounded-2xl outline-none font-bold text-[#1e2238] dark:text-white cursor-not-allowed"
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
                                                    className="w-full pl-12 pr-4 h-[56px] bg-[#f8fafc] dark:bg-white/5 border-2 border-transparent focus:border-purple-500/30 rounded-2xl outline-none transition-all placeholder:text-slate-400 font-bold text-[#1e2238] dark:text-white"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        {error && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-4 bg-rose-50 border border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20 rounded-2xl text-rose-600 dark:text-rose-400 text-sm font-bold text-center">
                                                {error}
                                            </motion.div>
                                        )}

                                        <motion.button
                                            whileHover={{ scale: 1.02, y: -4 }}
                                            whileTap={{ scale: 0.98 }}
                                            type="submit"
                                            disabled={!!loading || !isValidPassword}
                                            className="h-16 w-full rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-clay-purple transition-all disabled:opacity-50 border-2 border-white/30 text-xl font-black font-fredoka uppercase tracking-widest"
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
                                            className="w-full flex items-center justify-center gap-2 py-2 text-sm font-bold text-[#5c6285] dark:text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors group"
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

                <div className="text-center pt-8">
                    <p className="text-sm font-bold font-nunito text-ink-muted">
                        New explorer? <span className="text-purple-600 hover:underline cursor-pointer">Request Invitation</span>
                    </p>
                </div>
            </motion.div>

            {/* Cinematic Footer */}
            <div className="mt-12 py-4 flex items-center justify-center gap-10 text-[10px] font-black text-slate-500 transition-colors tracking-[0.2em] uppercase relative z-10">
                <Link href="#" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">Privacy Sanctuary</Link>
                <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-800" />
                <Link href="#" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">Rules of Magic</Link>
            </div>
        </div>
    )
}
