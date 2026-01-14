"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
    Sparkles, 
    BookOpen, 
    Wand2, 
    Rocket, 
    Check, 
    Zap, 
    Star,
    Brain,
    Image as ImageIcon,
    Mic2
} from "lucide-react";
import { cn } from "@/lib/core/utils/cn";
import { useAuth } from "@/components/auth/auth-provider";
import { useUsage } from "@/lib/hooks/use-usage";

export default function PricingPage() {
    const { user } = useAuth();
    const { plan } = useUsage(["story_generation", "image_generation"]);

    const tiers = [
        {
            name: "Magic Explorer",
            price: "Free",
            description: "Perfect for testing the waters of imagination.",
            icon: Rocket,
            color: "text-blue-500",
            bg: "bg-blue-50",
            borderColor: "border-blue-100",
            shadow: "shadow-clay-blue",
            features: [
                "3 AI Stories per month",
                "10 AI Images per month",
                "100 Word Insights per month",
                "Basic Voice Narration",
                "Shared Library Access"
            ],
            cta: "Explore Now",
            ctaHref: "/dashboard",
            isCurrent: plan === 'free' || !user,
            highlight: false
        },
        {
            name: "Master Storyteller",
            price: "$9.99",
            period: "/month",
            description: "Unlimited adventures for the ultimate hero.",
            icon: Sparkles,
            color: "text-purple-600",
            bg: "bg-purple-50",
            borderColor: "border-purple-200",
            shadow: "shadow-clay-purple",
            features: [
                "20 AI Stories per month",
                "100 AI Images per month",
                "1000 Word Insights per month",
                "Premium Studio Voices",
                "Priority AI Generation",
                "Early access to new features"
            ],
            cta: "Level Up Now",
            ctaHref: "/upgrade",
            isCurrent: plan === 'pro',
            highlight: true
        }
    ];

    return (
        <div className="min-h-screen bg-shell pt-20 pb-32 px-6">
            <div className="max-w-5xl mx-auto">
                <header className="text-center mb-10 md:mb-16 space-y-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border-2 border-purple-100 shadow-sm mb-2 md:mb-4"
                    >
                        <Zap className="w-4 h-4 text-purple-500 fill-purple-500" />
                        <span className="text-[10px] font-black font-fredoka text-purple-600 uppercase tracking-widest">Choose Your Power</span>
                    </motion.div>
                    
                    <motion.h1 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-6xl font-black text-ink font-fredoka leading-tight px-4"
                    >
                        Unlock Unlimited <br className="hidden md:block" /> 
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-500">Magic Adventures</span>
                    </motion.h1>
                    
                    <motion.p 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-base md:text-lg text-ink-muted font-medium max-w-2xl mx-auto px-6"
                    >
                        Choose the plan that fits your child&apos;s curiosity. From daily sparks of imagination to a universe of infinite stories.
                    </motion.p>
                </header>

                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {tiers.map((tier, idx) => (
                        <motion.div
                            key={tier.name}
                            initial={{ opacity: 0, x: idx === 0 ? -20 : 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 + idx * 0.1 }}
                            className={cn(
                                "relative clay-card p-6 md:p-10 flex flex-col h-full overflow-hidden border-4",
                                tier.highlight ? "border-purple-200 z-10" : "border-white",
                                tier.bg
                            )}
                        >
                            {tier.highlight && (
                                <div className="absolute top-6 right-[-35px] rotate-45 bg-amber-400 text-white px-12 py-1 text-xs font-black font-fredoka uppercase tracking-widest shadow-sm">
                                    Best Value
                                </div>
                            )}

                            <div className="mb-8">
                                <div className={cn(
                                    "w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-clay-sm bg-white",
                                    tier.color
                                )}>
                                    <tier.icon className="w-8 h-8" />
                                </div>
                                <h2 className="text-3xl font-black text-ink font-fredoka uppercase tracking-tight mb-2">
                                    {tier.name}
                                </h2>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-black text-ink font-fredoka">{tier.price}</span>
                                    {tier.period && <span className="text-ink-muted font-bold text-lg">{tier.period}</span>}
                                </div>
                                <p className="text-ink-muted mt-4 font-medium leading-relaxed">
                                    {tier.description}
                                </p>
                            </div>

                            <div className="space-y-4 mb-10 flex-1">
                                {tier.features.map((feature) => (
                                    <div key={feature} className="flex items-start gap-3">
                                        <div className={cn(
                                            "mt-1 w-5 h-5 rounded-full flex items-center justify-center shrink-0",
                                            tier.highlight ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-500"
                                        )}>
                                            <Check className="w-3 h-3 stroke-[3]" />
                                        </div>
                                        <span className="font-bold text-ink-muted text-sm tracking-tight">{feature}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="block group">
                                <Link 
                                    href={tier.isCurrent ? "#" : tier.ctaHref}
                                    className={cn(
                                        "w-full py-5 rounded-2xl font-black font-fredoka uppercase tracking-widest transition-all text-lg shadow-lg flex items-center justify-center",
                                        tier.isCurrent 
                                            ? "bg-slate-100 text-slate-400 cursor-default shadow-none border-2 border-slate-200" 
                                            : tier.highlight
                                                ? "bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-clay-purple hover:scale-[1.02] active:scale-95 group-hover:shadow-clay-purple"
                                                : "bg-white text-blue-500 border-2 border-blue-100 hover:bg-blue-50 active:scale-95 shadow-clay-sm"
                                    )}
                                >
                                    {tier.isCurrent ? "Active Plan" : (plan === 'pro' && !tier.highlight ? "Downgrade" : tier.cta)}
                                </Link>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <motion.section 
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="mt-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
                >
                    {[
                        { title: "Smart Learning", icon: Brain, desc: "Personalized vocabulary based on reading level.", color: "bg-orange-50 text-orange-500" },
                        { title: "Studio Audio", icon: Mic2, desc: "Natural AI voices that make stories come alive.", color: "bg-emerald-50 text-emerald-500" },
                        { title: "Dream Visuals", icon: ImageIcon, desc: "Beautiful AI illustrations for every scene.", color: "bg-pink-50 text-pink-500" },
                        { title: "Safe & Private", icon: Star, desc: "100% child-safe content, curated for growing minds.", color: "bg-indigo-50 text-indigo-500" },
                    ].map((item, idx) => (
                        <div key={item.title} className="bg-white/40 backdrop-blur-sm border-2 border-white p-6 rounded-3xl shadow-clay-sm">
                            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-sm", item.color)}>
                                <item.icon className="w-6 h-6" />
                            </div>
                            <h3 className="font-fredoka font-black text-ink uppercase tracking-tight mb-2 text-sm">{item.title}</h3>
                            <p className="text-xs text-ink-muted font-bold leading-relaxed">{item.desc}</p>
                        </div>
                    ))}
                </motion.section>

                <footer className="mt-20 text-center pb-12">
                    <p className="text-ink-muted font-bold text-sm mb-6">
                        Questions? <Link href="/support/contact" className="text-purple-600 underline underline-offset-4 decoration-2">Let us know!</Link>
                    </p>
                    <div className="flex items-center justify-center gap-6 text-[10px] text-ink-muted font-black uppercase tracking-widest">
                        <Link href="/legal/privacy" className="hover:text-ink">Privacy</Link>
                        <span>•</span>
                        <Link href="/legal/terms" className="hover:text-ink">Terms</Link>
                        <span>•</span>
                        <Link href="/support/faq" className="hover:text-ink">FAQ</Link>
                    </div>
                </footer>
            </div>
            {/* Nav spacer for mobile */}
            <div className="h-24 md:hidden" />
        </div>
    );
}
