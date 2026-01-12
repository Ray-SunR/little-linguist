"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

const REVIEWS = [
  { name: "Sarah J.", role: "Mom of 2", text: "My kids stopped asking for iPad games and started asking for stories!" },
  { name: "Mike T.", role: "Dad of 3", text: "The AI narration is surprisingly natural. Love it." },
  { name: "Emily R.", role: "Teacher", text: "A wonderful tool for vocabulary building. Highly recommend." },
  { name: "David L.", role: "Parent", text: "Finally, screen time I don't feel guilty about." },
  { name: "Jessica M.", role: "Homeschooler", text: "Perfect for our morning reading routine." },
  { name: "Chris P.", role: "Dad", text: "The custom stories feature is mind-blowing." },
];

export default function SocialProof() {
  return (
    <section className="py-10 border-y border-white/20 bg-white/10 backdrop-blur-sm overflow-hidden relative z-20">
      <div className="absolute inset-0 bg-gradient-to-r from-[--shell] via-transparent to-[--shell] z-10 pointer-events-none" />

      <div className="flex w-max animate-marquee hover:[animation-play-state:paused]">
        {[...REVIEWS, ...REVIEWS, ...REVIEWS].map((review, i) => (
          <div key={i} className="mx-4 flex items-center gap-4 px-6 py-4 rounded-2xl bg-white/40 border border-white/50 shadow-sm w-[350px] flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-sm">
              {review.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-1 mb-1">
                <span className="font-bold text-ink text-sm">{review.name}</span>
                <span className="text-xs text-ink-muted hidden md:inline">• {review.role}</span>
                <div className="flex ml-2">
                  {[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
                </div>
              </div>
              <p className="text-sm text-ink-muted leading-snug line-clamp-2">&quot;{review.text}&quot;</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
