"use client";

import { motion } from "framer-motion";
import { Brain, Volume2, Sparkles, BookOpen } from "lucide-react";

export function HowItWorks() {
    return (
        <section className="relative py-12 md:py-16 px-6 lg:pl-28 overflow-hidden">
            <div className="max-w-7xl mx-auto relative z-10">
                <div className="text-center mb-12">
                    <h2 className="text-4xl md:text-5xl font-black text-ink font-fredoka mb-4">
                        How <span className="text-amber-500">LumoMind Works</span>
                    </h2>
                    <p className="max-w-2xl mx-auto text-xl text-ink-muted">
                        Four simple steps to transform reading into an enchanting journey.
                    </p>
                </div>

                <div className="grid md:grid-cols-4 gap-6 relative">
                    <div className="absolute top-12 left-0 w-full h-1 bg-gradient-to-r from-orange-200 via-purple-200 to-blue-200 hidden md:block rounded-full opacity-50" />
                    {[
                        { label: "01", title: "Set a Goal", icon: Brain, color: "bg-blue-500" },
                        { label: "02", title: "Read & Listen", icon: Volume2, color: "bg-purple-500" },
                        { label: "03", title: "Discover Words", icon: Sparkles, color: "bg-amber-500" },
                        { label: "04", title: "Grow Together", icon: BookOpen, color: "bg-rose-500" },
                    ].map((step, i) => (
                        <div key={i} className="relative flex flex-col items-center text-center">
                            <div className="relative mb-6">
                                <motion.div whileHover={{ scale: 1.1, rotate: 5 }} className="w-24 h-24 clay-card rounded-[2rem] flex items-center justify-center bg-white border-4 border-white relative z-10">
                                    <step.icon className="w-10 h-10 text-ink" strokeWidth={1.5} />
                                </motion.div>
                                <div className={`absolute -top-3 -right-3 w-8 h-8 rounded-full ${step.color} text-white font-black font-fredoka flex items-center justify-center text-xs shadow-md border-2 border-white z-20`}>
                                    {step.label}
                                </div>
                            </div>
                            <h3 className="text-xl font-black font-fredoka text-ink mb-2">{step.title}</h3>
                            <p className="text-sm text-ink-muted font-medium max-w-[200px]">
                                {i === 0 && "Your AI companion helps pick the perfect story for your level."}
                                {i === 1 && "Follow along with natural narration or read at your own pace."}
                                {i === 2 && "Tap magic words to unlock meanings and build vocabulary."}
                                {i === 3 && "Track progress and celebrate milestones with your AI buddy."}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
