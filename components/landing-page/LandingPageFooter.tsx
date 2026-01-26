"use client";

import Link from "next/link";
import { CachedImage } from "@/components/ui/cached-image";

export function LandingPageFooter() {
    return (
        <footer className="py-8 px-6 lg:pl-28 border-t border-purple-100/50">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-ink-muted font-medium">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 relative">
                        <CachedImage src="/logo.png" alt="LumoMind Logo" fill className="object-contain" />
                    </div>
                    <span className="font-fredoka font-bold text-ink">LumoMind</span>
                </div>
                <div className="flex items-center gap-6">
                    <span>© 2026 LumoMind</span>
                    <Link href="/support/faq" className="hover:text-purple-600 transition-colors">Support</Link>
                    <Link href="/support/contact" className="hover:text-purple-600 transition-colors">Contact</Link>
                    <Link href="/legal/privacy" className="hover:text-purple-600 transition-colors">Privacy</Link>
                    <Link href="/legal/terms" className="hover:text-purple-600 transition-colors">Terms</Link>
                </div>
            </div>
        </footer>
    );
}
