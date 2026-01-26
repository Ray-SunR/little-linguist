import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { safeHaptics, ImpactStyle } from "@/lib/core";
import { ME_PATHS, navItems } from "../nav-constants";

export function useNavNavigation() {
    const pathname = usePathname();
    const router = useRouter();
    const [pendingHref, setPendingHref] = useState<string | null>(null);
    const [libraryHref, setLibraryHref] = useState("/library");
    const [isExpanded, setIsExpanded] = useState(true);
    const pendingHrefRef = useRef<string | null>(null);

    const isReaderView = pathname.startsWith("/reader");

    // Update library href from session storage to restore state
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const last = sessionStorage.getItem('lastLibraryUrl');
            if (last) setLibraryHref(last);
        }
    }, [pathname]);

    const handleNavPointerDown = useCallback((event: React.PointerEvent<HTMLAnchorElement>, href: string) => {
        if (!event.isPrimary) return;
        if (event.pointerType === "mouse" && event.button !== 0) return;
        if (pendingHrefRef.current === href) return;
        pendingHrefRef.current = href;
        setPendingHref(href);
    }, []);

    const handleNavPointerUp = useCallback((event: React.PointerEvent<HTMLAnchorElement>, href: string) => {
        if (!event.isPrimary) return;
        if (event.pointerType !== "touch") return;
        if (pendingHrefRef.current === href) return;
        pendingHrefRef.current = href;
        setPendingHref(href);
    }, []);

    const handleNavPointerCancel = useCallback((event: React.PointerEvent<HTMLAnchorElement>, href: string) => {
        if (!event.isPrimary) return;
        if (pendingHrefRef.current !== href) return;
        pendingHrefRef.current = null;
        setPendingHref(null);
    }, []);

    const handleNavActivate = useCallback((href: string) => {
        if (pendingHrefRef.current !== href) {
            pendingHrefRef.current = href;
            setPendingHref(href);
        }
        safeHaptics.impact({ style: ImpactStyle.Light });
    }, []);

    // Prefetch main destinations
    useEffect(() => {
        navItems.forEach(item => router.prefetch(item.href));
        ME_PATHS.forEach(path => router.prefetch(path));
        if (libraryHref) router.prefetch(libraryHref);
    }, [router, libraryHref]);

    // Auto-fold in reader view
    useEffect(() => {
        if (isReaderView) {
            setIsExpanded(false);
        } else {
            setIsExpanded(true);
        }
    }, [pathname, isReaderView]);

    // Clear pending state when navigation completes
    useEffect(() => {
        if (pendingHref) {
            const targetPath = pendingHref.split('?')[0];
            if (pathname === targetPath || (targetPath !== '/' && pathname.startsWith(targetPath))) {
                pendingHrefRef.current = null;
                setPendingHref(null);
            }
        }
    }, [pathname, pendingHref]);

    useEffect(() => {
        if (!pendingHref) return;
        if (typeof window === "undefined") return;
        const timeout = window.setTimeout(() => {
            pendingHrefRef.current = null;
            setPendingHref(null);
        }, 6000);
        return () => window.clearTimeout(timeout);
    }, [pendingHref]);

    const isActive = useCallback((href: string) => pathname === href || (href !== "/" && pathname.startsWith(href)), [pathname]);

    return {
        pathname,
        router,
        pendingHref,
        libraryHref,
        isExpanded,
        setIsExpanded,
        handleNavPointerDown,
        handleNavPointerUp,
        handleNavPointerCancel,
        handleNavActivate,
        isActive,
    };
}
