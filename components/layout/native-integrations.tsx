"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Keyboard } from "@capacitor/keyboard";
import { SplashScreen } from "@capacitor/splash-screen";

export function NativeIntegrations() {
    const pathname = usePathname();

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        // 0. Hide Splash Screen after mount - ONLY ONCE
        const hideSplash = async () => {
            try {
                // Ensure we only try to hide it once to avoid console noise or redundant calls
                if ((window as any)._splashHidden) return;
                
                await SplashScreen.hide({
                    fadeOutDuration: 500
                });
                (window as any)._splashHidden = true;
            } catch (err) { }
        };
        hideSplash();
    }, []); // Only on first mount

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        // 1. Status Bar Chameleon Logic
        const updateStatusBar = async () => {
            try {
                // Determine style based on route
                // Some pages might want light content (white text) on dark backgrounds
                const darkRoutes = ["/reader", "/story-maker"];
                const isDarkPage = darkRoutes.some(route => pathname.startsWith(route));

                if (isDarkPage) {
                    await StatusBar.setStyle({ style: Style.Light });
                } else {
                    await StatusBar.setStyle({ style: Style.Default });
                }
            } catch (err) {
                console.warn("StatusBar error:", err);
            }
        };

        // 2. Keyboard Management - Scroll to active input
        let showListener: any = null;
        const setupKeyboard = async () => {
            showListener = await Keyboard.addListener('keyboardWillShow', () => {
                const activeEl = document.activeElement as HTMLElement;
                if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
                    setTimeout(() => {
                        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 100);
                }
            });
        };

        updateStatusBar();
        setupKeyboard();

        return () => {
            if (showListener) {
                showListener.remove();
            }
        };
    }, [pathname]);

    return null;
}
