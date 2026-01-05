"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { BookOpen, Sparkles, Brain, ArrowRight, Library, PenTool, Volume2 } from "lucide-react";

import SocialProof from "@/components/landing-page/SocialProof";
import MagicWord from "@/components/landing-page/MagicWord";

export default function LandingPageContent() {
  return (
    <main className="min-h-screen page-story-maker overflow-x-hidden bg-[--shell]">
      {/* 
        HERO SECTION 
        Split Layout: Text Left, Image Right
        Compacted padding
      */}
      <section className="relative min-h-[85vh] flex items-center px-6 lg:pl-28 py-8 lg:py-0 pb-32">
        {/* Background Decorative Blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-[10%] -left-[10%] w-[50vh] h-[50vh] bg-purple-200/30 rounded-full blur-3xl animate-float" />
            <div className="absolute top-[20%] right-[0%] w-[40vh] h-[40vh] bg-orange-100/40 rounded-full blur-3xl animate-float" style={{ animationDelay: "-3s" }} />
            <div className="absolute bottom-[0%] left-[20%] w-[30vh] h-[30vh] bg-blue-100/30 rounded-full blur-3xl animate-float" style={{ animationDelay: "-5s" }} />
			
			{/* Sunburst Effect behind Book */}
            <div className="absolute top-[10%] right-[-10%] w-[80vw] h-[80vw] md:w-[50vw] md:h-[50vw] opacity-20 animate-sunburst origin-center pointer-events-none z-0">
               <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                     <radialGradient id="grad1" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                        <stop offset="0%" style={{stopColor:"rgb(255,255,255)", stopOpacity:0}} />
                        <stop offset="100%" style={{stopColor:"rgb(251, 191, 36)", stopOpacity:1}} />
                     </radialGradient>
                  </defs>
                  {/* Rays */}
                  {Array.from({ length: 12 }).map((_, i) => (
                      <path key={i} d="M100 100 L120 0 L80 0 Z" fill="url(#grad1)" transform={`rotate(${i * 30} 100 100)`} />
                  ))}
               </svg>
            </div>
        </div>

        <div className="container max-w-7xl mx-auto grid lg:grid-cols-2 gap-8 lg:gap-16 items-center relative z-10">
            {/* Left: Text Content */}
            <motion.div 
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                className="text-left relative z-10"
            >
                <div className="relative">
                     {/* Floating 3D Letter A */}
                     <motion.div 
                        animate={{ y: [0, -15, 0], rotate: [0, 10, 0] }}
                        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                        className="absolute -top-12 -left-8 md:-left-16 text-6xl md:text-8xl font-black text-purple-200/20 md:text-purple-500/10 font-fredoka pointer-events-none select-none -z-10"
                    >
                        Aa
                    </motion.div>

                    <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 border border-orange-200 text-orange-600 font-bold font-fredoka text-sm mb-6 shadow-sm"
                    >
                        <Sparkles className="w-4 h-4 fill-current" />
                        <span>AI-Powered Language Learning</span>
                    </motion.div>
                </div>

                <h1 className="text-5xl lg:text-7xl font-black text-ink mb-6 font-fredoka tracking-tight leading-[1.1]">
                    Your Child's <br/>
                    <span className="relative inline-block text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500">
                        AI Companion
                        <motion.span 
                            className="absolute -top-6 -right-8 text-4xl"
                            animate={{ rotate: [0, 15, 0], scale: [1, 1.2, 1] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                        >
                            ✨
                        </motion.span>
                    </span>
                </h1>

                <p className="text-xl text-ink-muted font-medium font-nunito leading-relaxed max-w-lg mb-8">
                    Meet <span className="font-bold text-purple-600">LumoMind</span>, the magical AI reading buddy that grows with your child. Personalized stories, interactive goals, and language adventures await.
                </p>

                <div className="flex flex-wrap items-center gap-4">
                    <motion.a
                        href="/login"
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex items-center gap-3 px-8 py-4 rounded-[2rem] bg-gradient-to-r from-orange-400 to-amber-500 text-white shadow-clay-orange border-2 border-white/30 text-lg font-black font-fredoka transition-all cursor-pointer no-underline"
                    >
                        <BookOpen className="w-5 h-5" />
                        Start Adventure
                    </motion.a>
                    
                    <motion.button
                         whileHover={{ scale: 1.05, border: "2px solid rgba(147, 51, 234, 0.5)" }}
                         whileTap={{ scale: 0.98 }}
                         className="flex items-center gap-3 px-8 py-4 rounded-[2rem] bg-white text-purple-600 shadow-sm border-2 border-transparent text-lg font-black font-fredoka transition-all cursor-pointer"
                    >
                         <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
                            <span className="ml-0.5 text-xs">▶</span>
                         </div>
                         See How It Works
                    </motion.button>
                </div>

                {/* Quick Stats */}
                <div className="flex items-center gap-8 mt-12 pt-8 border-t border-ink/5">
                    {[
                        { label: "AI Companion", value: "24/7" },
                        { label: "Vocabulary", value: "Adaptive" },
                        { label: "Stories", value: "Infinite" }
                    ].map((stat, i) => (
                        <div key={i} className="flex flex-col">
                            <div className="text-2xl font-black text-amber-500 font-fredoka">{stat.value}</div>
                             <div className="text-xs font-bold text-ink-muted uppercase tracking-wider">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </motion.div>

            {/* Right: Hero Image */}
            <motion.div
                initial={{ opacity: 0, x: 30, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ duration: 1, type: "spring" }}
                className="relative hidden lg:block"
            >
                {/* Floating Image Container - SCALED UP */}
                <motion.div 
                    animate={{ y: [0, -20, 0] }} 
                    transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                    className="relative z-10"
                >
                     <div className="relative aspect-square w-full max-w-[700px] mx-auto scale-110"> {/* Scaled Up 10% more from original max, and added scale-110 utility */}
                         <img 
                            src="/images/hero-book.png" 
                            alt="Magical flying book emitting stories" 
                            className="w-full h-full object-contain drop-shadow-2xl"
                        />
                     </div>
                </motion.div>

                 {/* Floating 3D Letters B & C */}
                 <motion.div 
                    animate={{ y: [0, 20, 0], rotate: [0, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
                    className="absolute top-0 right-10 text-9xl font-black text-blue-500/10 font-fredoka pointer-events-none select-none -z-10"
                >
                    Bb
                </motion.div>
                <motion.div 
                    animate={{ y: [0, 15, 0], rotate: [0, 5, 0] }}
                    transition={{ repeat: Infinity, duration: 6, ease: "easeInOut", delay: 2 }}
                    className="absolute bottom-20 -left-10 text-8xl font-black text-pink-500/10 font-fredoka pointer-events-none select-none -z-10"
                >
                    Cc
                </motion.div>

                {/* Background Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[90%] bg-amber-200/20 blur-[90px] rounded-full -z-10" />
            </motion.div>
        </div>
        
        {/* Organic Wave Divider Bottom */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0]">
             <svg data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block h-[60px] md:h-[100px] w-[calc(100%+1.3px)] fill-white/40">
                <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"></path>
            </svg>
        </div>
      </section>

      {/* Social Proof Strip */}
      <SocialProof />

      {/* 
        FEATURE DEEP DIVE (ZIG-ZAG)
        Showcasing specific app capabilities
      */}
      <section className="relative py-16 px-6 lg:pl-28 bg-white/40 pt-24">
         {/* Organic Wave Top (Inverted or Matching flow) */}
         <div className="absolute top-0 left-0 w-full overflow-hidden leading-[0] rotate-180">
             <svg data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block h-[60px] md:h-[100px] w-[calc(100%+1.3px)] fill-white/10">
                <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"></path>
            </svg>
        </div>

        <div className="max-w-7xl mx-auto space-y-24">
            
            {/* Feature 1: Library */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
                <motion.div 
                    initial={{ opacity: 0, x: -50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="order-2 lg:order-1"
                >
                    <div className="inline-block p-3 rounded-2xl bg-blue-100 text-blue-600 mb-4 shadow-sm">
                        <Library className="w-6 h-6" />
                    </div>
                    <h2 className="text-4xl font-black text-ink font-fredoka mb-4">
                        Magical <span className="text-blue-500">Goal Tracking</span>
                    </h2>
                    <p className="text-xl text-ink-muted font-medium mb-6">
                        LumoMind helps you set personalized reading goals. Watch your child's confidence grow as they unlock new levels and badges.
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
                <div className="order-1 lg:order-2 perspective-1000">
                    <motion.div 
                        whileHover={{ rotateY: -5, scale: 1.02 }}
                        className="relative rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white transform transition-transform"
                    >
                        <img src="/images/feature-library.png" alt="Library Interface" className="w-full h-auto" />
                    </motion.div>
                </div>
            </div>

            {/* Feature 2: Reader (Reversed) */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="perspective-1000">
                    <motion.div 
                        whileHover={{ rotateY: 5, scale: 1.02 }}
                        className="relative rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white transform transition-transform"
                    >
                         <img src="/images/feature-reader.png" alt="Reader Interface" className="w-full h-auto" />
                    </motion.div>
                </div>
                <motion.div 
                    initial={{ opacity: 0, x: 50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                >
                     <div className="inline-block p-3 rounded-2xl bg-amber-100 text-amber-600 mb-4 shadow-sm">
                        <Volume2 className="w-6 h-6" />
                    </div>
                    <h2 className="text-4xl font-black text-ink font-fredoka mb-4">
                        Interactive <span className="text-amber-500">Reading Buddy</span>
                    </h2>
                    <p className="text-xl text-ink-muted font-medium mb-6">
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
                <motion.div 
                    initial={{ opacity: 0, x: -50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="order-2 lg:order-1"
                >
                     <div className="inline-block p-3 rounded-2xl bg-purple-100 text-purple-600 mb-4 shadow-sm">
                        <PenTool className="w-6 h-6" />
                    </div>
                    <h2 className="text-4xl font-black text-ink font-fredoka mb-4">
                        Create <span className="text-purple-500">Your Own World</span>
                    </h2>
                    <p className="text-xl text-ink-muted font-medium mb-6">
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
                </motion.div>
                <div className="order-1 lg:order-2 perspective-1000">
                    <motion.div 
                        whileHover={{ rotateY: -5, scale: 1.02 }}
                        className="relative rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white transform transition-transform"
                    >
                         <img src="/images/feature-storymaker.png" alt="Story Maker Interface" className="w-full h-auto" />
                    </motion.div>
                </div>
            </div>

             {/* Missing Feature / Coming Soon */}
             <div className="text-center pt-8">
                <p className="text-lg text-ink-muted font-medium">
                    Plus: <span className="font-bold text-ink">Word Collection</span> to review what you've learned, and even <span className="text-purple-500 font-bold">More AI Features</span> coming soon!
                </p>
            </div>


        </div>
      </section>


      {/* 
        HOW IT WORKS 
        Horizontal Step Flow
        Compacted padding
      */}
      <section className="relative py-16 px-6 lg:pl-28 overflow-hidden">
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
                 {/* Connecting Line (Desktop) */}
                 <div className="absolute top-12 left-0 w-full h-1 bg-gradient-to-r from-orange-200 via-purple-200 to-blue-200 hidden md:block rounded-full opacity-50" />

                 {[
                    { label: "01", title: "Set a Goal", icon: Brain, color: "bg-blue-500" },
                    { label: "02", title: "Read & Listen", icon: Volume2, color: "bg-purple-500" },
                    { label: "03", title: "Discover Words", icon: Sparkles, color: "bg-amber-500" },
                    { label: "04", title: "Grow Together", icon: BookOpen, color: "bg-rose-500" },
                 ].map((step, i) => (
                     <div key={i} className="relative flex flex-col items-center text-center">
                         {/* Icon Container */}
                        <div className="relative mb-6">
                            <motion.div
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                className="w-24 h-24 clay-card rounded-[2rem] flex items-center justify-center bg-white border-4 border-white relative z-10"
                            >
                                <step.icon className="w-10 h-10 text-ink" strokeWidth={1.5} />
                            </motion.div>
                            
                            {/* Number Badge */}
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

      {/* 
        BOTTOM CTA 
      */}
      <section className="py-16 px-6 lg:pl-28">
         <div className="max-w-5xl mx-auto clay-card p-10 md:p-16 bg-gradient-to-br from-purple-600 to-indigo-700 text-center relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('/noise.png')] opacity-20" />
            
            {/* Animated Stars */}
            <div className="absolute top-10 left-10 text-4xl animate-pulse">✨</div>
            <div className="absolute bottom-10 right-10 text-4xl animate-pulse" style={{ animationDelay: "1s" }}>✨</div>

            <div className="relative z-10">
                <h2 className="text-4xl md:text-5xl font-black text-white font-fredoka mb-6 drop-shadow-md">
                    Ready to Start?
                </h2>
                <p className="text-lg text-purple-100 font-medium mb-8 max-w-xl mx-auto">
                    Join thousands of young readers on their AI-powered language adventure today.
                </p>
                 <motion.a
                        href="/login"
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        className="inline-flex items-center gap-3 px-10 py-5 rounded-[2rem] bg-white text-purple-600 shadow-xl border-4 border-purple-200 text-xl font-black font-fredoka transition-all cursor-pointer no-underline"
                    >
                        Start Learning Free
                        <ArrowRight className="w-6 h-6" />
                </motion.a>
            </div>
         </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 lg:pl-28 border-t border-purple-100/50">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-ink-muted font-medium">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8">
               <img src="/logo.png" alt="LumoMind Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-fredoka font-bold text-ink">LumoMind</span>
          </div>
          <div className="flex items-center gap-6">
            <span>© 2026 LumoMind</span>
            <Link href="#" className="hover:text-purple-600 transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-purple-600 transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
