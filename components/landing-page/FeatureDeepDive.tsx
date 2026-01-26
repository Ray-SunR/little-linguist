"use client";

import { motion } from "framer-motion";
import { Library, Volume2, PenTool } from "lucide-react";
import { CachedImage } from "@/components/ui/cached-image";
import { LumoCharacter } from "@/components/ui/lumo-character";
import Link from "next/link";

export function FeatureDeepDive() {
    return (
        <section className="relative py-12 md:py-16 px-6 lg:pl-28 bg-white/40 pt-24 md:pt-32">
            <div className="absolute top-0 left-0 w-full overflow-hidden leading-[0] rotate-180">
                <svg data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block h-[60px] md:h-[100px] w-[calc(100%+1.3px)] fill-white/10">
                    <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"></path>
                </svg>
            </div>

            <div className="max-w-7xl mx-auto space-y-16 md:space-y-24">
                {/* Feature 1: Library */}
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    <div className="order-1 perspective-1000">
                        <motion.div
                            whileHover={{ rotateY: -5, scale: 1.02 }}
                            className="relative aspect-auto md:aspect-[4/3] rounded-[2rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white transform transition-transform bg-blue-50/50 p-4 md:p-8"
                        >
                            <div className="relative w-full h-[320px] md:h-full">
                                <CachedImage src="/images/feature-library.png" alt="Library Interface" fill className="object-contain" />
                            </div>
                        </motion.div>
                    </div>
                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="order-2 px-4 md:px-0">
                        <div className="inline-block p-3 rounded-2xl bg-blue-100 text-blue-600 mb-4 shadow-sm">
                            <Library className="w-6 h-6" />
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black text-ink font-fredoka mb-4">
                            Magical <span className="text-blue-500">Goal Tracking</span>
                        </h2>
                        <p className="text-lg md:text-xl text-ink-muted font-medium mb-6">
                            LumoMind helps you set personalized reading goals. Watch your child&apos;s confidence grow as they unlock new levels and badges.
                        </p>
                        <ul className="space-y-3 mb-8">
                            {["AI-recommended stories", "Personalized difficulty levels", "Growth progress & rewards"].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 text-ink-muted font-bold font-nunito">
                                    <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs">✓</div>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </motion.div>
                </div>

                {/* Feature 2: Reader */}
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    <div className="order-1 lg:order-2 perspective-1000 relative">
                        <motion.div className="absolute -top-12 -right-8 z-20 hidden lg:block" initial={{ y: 50, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} transition={{ delay: 0.5, type: "spring" }} viewport={{ once: true }}>
                            <LumoCharacter className="w-32 h-32" />
                        </motion.div>
                        <motion.div whileHover={{ rotateY: 5, scale: 1.02 }} className="relative aspect-auto md:aspect-[4/3] rounded-[2rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white transform transition-transform bg-amber-50/50 p-4 md:p-8">
                            <div className="relative w-full h-[320px] md:h-full">
                                <CachedImage src="/images/feature-reader.png" alt="Reader Interface" fill className="object-contain" />
                            </div>
                        </motion.div>
                    </div>
                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="order-2 lg:order-1 px-4 md:px-0">
                        <div className="inline-block p-3 rounded-2xl bg-amber-100 text-amber-600 mb-4 shadow-sm">
                            <Volume2 className="w-6 h-6" />
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black text-ink font-fredoka mb-4">
                            Interactive <span className="text-amber-500">Reading Buddy</span>
                        </h2>
                        <p className="text-lg md:text-xl text-ink-muted font-medium mb-6">
                            More than just text. Our AI companion listens, narrates, and explains tricky words instantly, making every story a learning moment.
                        </p>
                        <ul className="space-y-3 mb-8">
                            {["Natural AI voice narration", "Instant 'Magic Word' definitions", "Smart vocabulary highlighting"].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 text-ink-muted font-bold font-nunito">
                                    <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs">✓</div>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </motion.div>
                </div>

                {/* Feature 3: Story Maker */}
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    <div className="order-1 perspective-1000">
                        <motion.div whileHover={{ rotateY: -5, scale: 1.02 }} className="relative aspect-auto md:aspect-[4/3] rounded-[2rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white transform transition-transform bg-purple-50/50 p-4 md:p-8">
                            <div className="relative w-full h-[320px] md:h-full">
                                <CachedImage src="/images/feature-storymaker.png" alt="Story Maker Interface" fill className="object-contain" />
                            </div>
                        </motion.div>
                    </div>
                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="order-2 px-4 md:px-0">
                        <div className="inline-block p-3 rounded-2xl bg-purple-100 text-purple-600 mb-4 shadow-sm">
                            <PenTool className="w-6 h-6" />
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black text-ink font-fredoka mb-4">
                            Create <span className="text-purple-500">Your Own World</span>
                        </h2>
                        <p className="text-lg md:text-xl text-ink-muted font-medium mb-6">
                            Spark creativity by co-writing stories with AI. Your child becomes the hero, choosing themes and characters for endless unique adventures.
                        </p>
                        <ul className="space-y-3 mb-8">
                            {["Custom avatars & themes", "AI-generated illustrations", "Save & share your creations"].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 text-ink-muted font-bold font-nunito">
                                    <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs">✓</div>
                                    {item}
                                </li>
                            ))}
                        </ul>
                        <Link href="/story-maker" className="px-8 py-3 rounded-2xl bg-purple-500 text-white font-black font-fredoka shadow-clay-purple hover:scale-105 transition-transform inline-block">
                            Try Story Maker
                        </Link>
                    </motion.div>
                </div>

                <div className="text-center pt-4 md:pt-8 pb-4">
                    <p className="text-lg text-ink-muted font-medium">
                        Plus: <span className="font-bold text-ink">Word Collection</span> to review what you&apos;ve learned, and even <span className="text-purple-500 font-bold">More AI Features</span> coming soon!
                    </p>
                </div>
            </div>
        </section>
    );
}
