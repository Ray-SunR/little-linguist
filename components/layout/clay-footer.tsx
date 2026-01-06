'use client';

import { Sparkles } from 'lucide-react';

export function ClayFooter() {
  return (
    <footer className="w-full py-8 px-6 text-center text-ink-muted text-sm relative z-10">
      <div className="flex items-center justify-center gap-2 mb-2 font-fredoka font-bold text-accent">
        <Sparkles size={16} />
        <span>LumoMind</span>
      </div>
      <p>Making reading magical, one story at a time.</p>
      <p className="mt-2 text-xs opacity-60">
        © {new Date().getFullYear()} LumoMind. All rights reserved.
      </p>
    </footer>
  );
}
