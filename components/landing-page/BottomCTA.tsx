"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { LumoCharacter } from "@/components/ui/lumo-character";

export function BottomCTA() {
    return (
        <section className="py-12 md:py-16 px-6 lg:pl-28">
            <div className="max-w-5xl mx-auto clay-card p-10 md:p-16 bg-gradient-to-br from-purple-600 to-indigo-700 text-center relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('/noise.png')] opacity-20" />
                <div className="absolute top-10 left-10 text-4xl animate-pulse">✨</div>
                <div className="absolute bottom-10 right-10 text-4xl animate-pulse" style={{ animationDelay: "1s" }}>✨</div>
                <div className="absolute top-0 right-10 z-0 opacity-20 md:opacity-100 md:scale-100 scale-75 transform translate-y-10 md:translate-y-0">
                    <motion.div animate={{ rotate: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}>
                        <LumoCharacter className="w-48 h-48" />
                    </motion.div>
                </div>
                <div className="relative z-10">
                    <h2 className="text-4xl md:text-5xl font-black text-white font-fredoka mb-6 drop-shadow-md">Ready to Start?</h2>
                    <p className="text-lg text-purple-100 font-medium mb-8 max-w-xl mx-auto">Join thousands of young readers on their AI-powered language adventure today.</p>
                    <motion.a href="/library" whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.98 }} className="inline-flex items-center gap-3 px-10 py-5 rounded-[2rem] bg-white text-purple-600 shadow-xl border-4 border-purple-200 text-xl font-black font-fredoka transition-all cursor-pointer no-underline">
                        Explore Library Free
                        <ArrowRight className="w-6 h-6" />
                    </motion.a>
                </div>
            </div>
        </section>
    );
}
